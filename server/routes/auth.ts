import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.ts';
import { dbStatus } from '../db.ts';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth.ts';
import { 
  normalizeIndianMobile, 
  isValidEmail, 
  MOBILE_ERROR_MESSAGE, 
  EMAIL_ERROR_MESSAGE 
} from '../utils/validators.ts';

const router = Router();

// In-memory rate limiter for login attempts (15 attempts per minute per IP)
const loginAttemptMap = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ipOrKey: string): boolean {
  const now = Date.now();
  const entry = loginAttemptMap.get(ipOrKey);

  if (!entry || now > entry.resetAt) {
    loginAttemptMap.set(ipOrKey, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Middleware to ensure MongoDB is ready
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({
      error: 'Database connection unavailable'
    });
    return;
  }
  next();
};

router.use(ensureDb);

// Register new user (STRICTLY FARMER REGISTRATION ONLY)
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }

    // Strict Indian mobile validation
    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      res.status(400).json({ error: MOBILE_ERROR_MESSAGE });
      return;
    }

    // Strict Email validation
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!isValidEmail(cleanEmail, false)) {
      res.status(400).json({ error: EMAIL_ERROR_MESSAGE });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Password and Confirm Password do not match.' });
      return;
    }

    // Security Mandate: Public registration is strictly for Farmers only.
    const assignedRole = 'farmer';

    // Check duplicate mobile or email
    const existingUser = await UserModel.findOne({
      $or: [
        { email: cleanEmail },
        { phone: normalizedPhone },
        { phone: `+91 ${normalizedPhone}` },
        { phone: `+91${normalizedPhone}` }
      ]
    });

    if (existingUser) {
      const isEmailDup = existingUser.email === cleanEmail;
      res.status(409).json({ 
        error: isEmailDup 
          ? 'An account with this email address already exists.' 
          : 'An account with this mobile number already exists.' 
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: assignedRole,
      status: 'active',
      counterNumber: null,
      assignedService: ''
    });

    const token = generateToken({
      _id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status,
      counterNumber: newUser.counterNumber
    });

    res.status(201).json({
      message: 'Farmer account registered successfully in MongoDB',
      token,
      user: {
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        counterNumber: newUser.counterNumber
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      res.status(400).json({ error: 'Please enter your email or phone and password.' });
      return;
    }

    // Rate limiting check
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkLoginRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many login attempts. Please wait a minute before trying again.' });
      return;
    }

    const rawInput = emailOrPhone.trim();
    const queryEmail = rawInput.toLowerCase();
    const normalizedMobile = normalizeIndianMobile(rawInput);

    const orConditions: any[] = [{ email: queryEmail }, { phone: rawInput }];
    if (normalizedMobile) {
      orConditions.push(
        { phone: normalizedMobile },
        { phone: `+91 ${normalizedMobile}` },
        { phone: `+91${normalizedMobile}` }
      );
    }

    const user = await UserModel.findOne({ $or: orConditions });

    if (!user) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }

    // Check account status
    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }

    const token = generateToken({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || 'active',
      counterNumber: user.counterNumber
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status || 'active',
        counterNumber: user.counterNumber,
        assignedService: user.assignedService
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error during login.' });
  }
});

// Current User Me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await UserModel.findById(req.user._id).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User profile not found in MongoDB.' });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated.' });
      return;
    }

    res.json({
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status || 'active',
        counterNumber: user.counterNumber,
        assignedService: user.assignedService
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile.' });
  }
});

// Update Profile (Name & Phone)
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Full name cannot be empty.' });
      return;
    }

    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      res.status(400).json({ error: MOBILE_ERROR_MESSAGE });
      return;
    }

    // Check duplicate phone with another user
    const duplicate = await UserModel.findOne({
      _id: { $ne: req.user._id },
      $or: [
        { phone: normalizedPhone },
        { phone: `+91 ${normalizedPhone}` }
      ]
    });

    if (duplicate) {
      res.status(409).json({ error: 'This mobile number is already in use by another user.' });
      return;
    }

    const updated = await UserModel.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), phone: normalizedPhone },
      { new: true }
    ).select('-password');

    if (!updated) {
      res.status(404).json({ error: 'User not found in MongoDB' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        status: updated.status || 'active',
        counterNumber: updated.counterNumber,
        assignedService: updated.assignedService
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

export default router;
