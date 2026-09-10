# 🌾 Kisan Queue (किसान कतार)

**A MERN Stack Web Application to Manage Queues and Inventory at Agricultural Service Centers (Krishi Seva Kendras) and Reduce Crowding.**

Designed for real-world agricultural operations, Krishi Seva Kendra service desks, token-based queue management, and inventory stock tracking.

---

## 📌 Architecture & Database Configuration

### 🗄️ MongoDB Atlas as the ONLY Database
- **No in-memory database fallback**: All application data (Users, Tokens, Services, Products, Purchases, Sales, and Stock Movements) is stored and persisted exclusively in MongoDB via Mongoose.
- **Server Startup Requirement**: The server requires a valid `MONGODB_URI` to start. If `MONGODB_URI` is missing or unreachable, the server terminates with an explicit, descriptive configuration error.

---

## ⚙️ Environment Variables & MONGODB_URI Setup

Create a `.env` file in the project root directory (based on `.env.example`):

```env
# MongoDB Atlas Connection URI (Required)
# Format: mongodb+srv://<username>:<password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
MONGODB_URI="mongodb+srv://kisan_admin:YourSecurePassword@cluster0.mongodb.net/kisan_queue?retryWrites=true&w=majority"

# JWT Secret for Session Tokens (Required)
JWT_SECRET="kisan_queue_secret_key_change_in_production"
```

### MongoDB Atlas Setup Guide:
1. **Create a Free Cluster**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and deploy a free M0 cluster.
2. **Database User**: Create a database user with read and write privileges (under *Security > Database Access*).
3. **Network Access / IP Whitelist**: In *Security > Network Access*, add `0.0.0.0/0` (Allow access from anywhere) so that Cloud Run and hosting containers can establish connections.
4. **Connection String**: Copy the standard connection string (`mongodb+srv://...`), replace `<username>` and `<password>` with your database user credentials, and assign it to `MONGODB_URI`.

---

## 🚀 Roles & Security Model

### 1. 🌾 Farmer
- **Registration & Login**: Farmers can self-register using their Name, Mobile Number, Email, and Password.
- **Service Selection**: Choose from agricultural services (Fertilizer Subsidies, Seed Distribution, Soil Health Card, Kisan Credit Card Loans, PM Crop Insurance, Machinery Rental).
- **Token Generation**: Generates unique incremental token numbers (e.g., `KQ-101`, `KQ-102`).
- **Duplicate Protection**: Strictly prevents duplicate active tokens for the same farmer.
- **Live Status**: Real-time queue position tracking, estimated wait time, and notification when called to a counter.
- **Cancellation**: Option to cancel waiting tokens if leaving early.
- **Visit History**: Log of past completed visits and transactions.

### 2. 📋 Staff Officer (Login-Only)
- **Restricted Access**: Staff accounts **cannot** self-register. Staff accounts can **only be created by an Admin** in the Admin Console.
- **Counter Operations**:
  - **Call Next Token**: Pulls the next waiting farmer to the active counter.
  - **Complete Token**: Marks the service as finished and clears the counter.
  - **Skip Token**: Marks the farmer absent/no-show if they do not respond.
- **Inventory & Billing Management**:
  - Direct POS billing interface with farmer details.
  - Add items to bill, specify quantities, and record sales.
  - Real-time stock alerts preventing overselling.
  - Printable sales invoice receipts.
  - Inward purchase entry register to increase warehouse stock.

### 3. 🛡️ Administrator (Login-Only)
- **Initial Bootstrapped Admin Account**:
  - **Email**: `admin@kisanqueue.com`
  - **Password**: `Admin@123`
  *(Created automatically in MongoDB on first startup if no admin exists).*
- **Admin Capabilities**:
  - Center-wide analytics: Total Farmers, Total Tokens, Waiting Queue, Completed Tokens, Active Desks.
  - **User Management**: View all users, create new Staff Officers, and manage accounts.
  - **Queue Management**: Reset daily queue sequence, clear finished tokens.
  - **Full Token Audit Log**: Search, filter, and review all token records.

### 4. 📺 Live Public Display Board (Krishi Seva TV Mode)
- Full-screen digital display screen designed for service center lobby TVs.
- Big high-contrast "NOW SERVING" counters with token numbers, upcoming queue list, and advisory ticker.

---

## 📦 Inventory Management & Safeguards

### 1. Complete Overselling Prevention
- **Strict Stock Verification**: Before confirming a sale, the backend checks that every item's requested quantity does not exceed available warehouse stock.
- **Clear Error Feedback**: If requested quantity exceeds stock, the system rejects the sale with a clear error:
  `"Insufficient stock for \"<Product Name>\". Available stock: X, requested: Y. Stock cannot be reduced below zero."`
- **Atomic Stock Decrement**: Uses atomic MongoDB `$inc` operations with `{ stock: { $gte: quantity } }` conditions, ensuring concurrent sales cannot reduce stock below zero or race each other.
- **Schema Validation**: The `Product` model enforces `min: 0` on stock quantities.

### 2. Safely Unique Invoice Numbers
- **Collision-Proof Sales Invoices**: Automatically generated with date and random entropy (e.g., `INV-20260905-18429301`), and explicitly verified against MongoDB to guarantee uniqueness.
- **Purchase Invoices**: User-entered invoices are validated for uniqueness against existing records; auto-generated purchase invoices use collision-free unique strings (e.g., `PUR-20260905-18429301`).

---

## 🛠️ Tech Stack

- **MongoDB & Mongoose**: Schemas and models for `User`, `Token`, `Service`, `Product`, `Purchase`, `Sale`, and `StockMovement`.
- **Express.js**: REST API endpoints, JWT authentication, and Vite development middleware.
- **React 18**: Single-Page Application with TypeScript, Tailwind CSS, and Lucide React icons.
- **Node.js**: Modern ES modules and TypeScript execution.

---

## 📂 Project Structure

```text
kisan-queue/
├── server.ts                    # Express entry point & Vite middleware
├── server/
│   ├── db.ts                    # MongoDB connection & initial admin seeding
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication & role authorization
│   ├── models/
│   │   ├── User.ts              # User schema & model
│   │   ├── Token.ts             # Token schema & model
│   │   ├── Service.ts           # Service schema & model
│   │   ├── Product.ts           # Inventory Product schema (min: 0 stock)
│   │   ├── Purchase.ts          # Inward Purchase register (unique invoices)
│   │   ├── Sale.ts              # Outward Sale register (unique invoices)
│   │   └── StockMovement.ts     # Audit log for all stock changes
│   └── routes/
│       ├── auth.ts              # Register, Login, Me endpoints
│       ├── tokens.ts            # Queue operations (generate, call-next, complete, skip)
│       ├── admin.ts             # Admin metrics, user management, queue reset
│       └── inventory.ts         # Products, purchases, sales, stock movement APIs
├── src/
│   ├── components/
│   │   ├── Navbar.tsx           # Navigation bar with live queue indicator
│   │   ├── AuthModal.tsx        # Farmer registration & login, Staff/Admin login
│   │   ├── FarmerDashboard.tsx  # Farmer token tracking & service selection
│   │   ├── StaffDashboard.tsx   # Desk operations, POS billing, stock register
│   │   ├── AdminDashboard.tsx   # Analytics, staff creation, queue reset
│   │   └── PublicDisplayBoard.tsx # Lobby TV display screen
│   ├── context/
│   │   └── AuthContext.tsx      # Auth state & JWT token management
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── App.tsx                  # Main React container
│   ├── main.tsx                 # React DOM root entry
│   └── index.css                # Tailwind CSS imports
├── .env.example                 # Environment variables specification
├── package.json                 # Dependencies & build scripts
└── README.md                    # Project documentation
```

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Farmer self-registration (name, phone, email, password).
- `POST /api/auth/login` — Sign in with email or phone + password.
- `GET /api/auth/me` — Retrieve currently logged-in user profile.

### Queue & Tokens (`/api/tokens`)
- `GET /api/tokens/services` — List available center services.
- `GET /api/tokens/live-queue` — Live queue metrics (waiting count, currently serving, next tokens).
- `GET /api/tokens/farmer/my-token` — Active token and visit history for logged-in farmer.
- `POST /api/tokens/generate` — Generate new token (prevents duplicate active tokens).
- `POST /api/tokens/cancel/:id` — Farmer cancels waiting token.
- `POST /api/tokens/staff/call-next` — Staff calls next waiting token to counter.
- `POST /api/tokens/staff/complete/:id` — Staff marks token as completed.
- `POST /api/tokens/staff/skip/:id` — Staff marks token as skipped/no-show.

### Inventory & Billing (`/api/inventory`)
- `GET /api/inventory/products` — List all products with current stock and threshold status.
- `POST /api/inventory/products` — Add or update product details (Staff/Admin).
- `PUT /api/inventory/products/:id/stock` — Adjust product stock manually with audit movement log.
- `GET /api/inventory/sales` — View sales records and search by invoice or farmer.
- `POST /api/inventory/sales` — Record new sale with overselling protection and unique invoice generation.
- `GET /api/inventory/purchases` — View inward purchase records.
- `POST /api/inventory/purchases` — Record inward purchase and increment stock.
- `GET /api/inventory/movements` — Audit trail of all stock movements.

### Admin Operations (`/api/admin`)
- `GET /api/admin/stats` — Center metrics (total farmers, tokens, waiting, completed).
- `GET /api/admin/users` — List registered users.
- `POST /api/admin/users` — Create new Staff Officer account.
- `DELETE /api/admin/users/:id` — Delete a user account.
- `GET /api/admin/tokens` — Full token audit trail with filters.
- `POST /api/admin/reset-queue` — Clear finished tokens or reset daily queue sequence.

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set MONGODB_URI and JWT_SECRET
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```
