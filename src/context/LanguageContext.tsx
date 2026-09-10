import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'hi' | 'en' | 'pa' | 'mr' | 'gu' | 'bn' | 'te';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  badge: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', badge: 'हि' },
  { code: 'en', name: 'English', nativeName: 'English', badge: 'EN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', badge: 'ਪੰ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', badge: 'म' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', badge: 'ગુ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', badge: 'বা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', badge: 'తె' },
];

// Translations dictionary
const translations: Record<SupportedLanguage, Record<string, string>> = {
  hi: {
    // Brand & Header
    'app.title': 'किसान कतार',
    'app.subtitle': 'कृषि सेवा केंद्र टोकन व बिलिंग पोर्टल',
    'nav.services': 'सेवाएं',
    'nav.howItWorks': 'यह कैसे काम करता है',
    'nav.liveQueue': 'लाइव कतार',
    'nav.signIn': 'लॉग इन करें',
    'nav.getToken': 'टोकन प्राप्त करें',
    'nav.myDesk': 'मेरा टोकन डेस्क',
    'nav.adminPanel': 'प्रशासन पैनल',
    'nav.signOut': 'लॉग आउट',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.active': 'सक्रिय',

    // Landing Page
    'hero.badge': 'डिजिटल भारत • कृषि एवं किसान कल्याण मंत्रालय',
    'hero.title': 'कृषि सेवा केंद्र डिजिटल टोकन एवं कतार प्रणाली',
    'hero.desc': 'लंबी कतारों से मुक्ति पाएं। घर बैठे या केंद्र पर आकर डिजिटल टोकन लें, लाइव काउंटर स्थिति देखें और बिना परेशानी के खाद-बीज प्राप्त करें।',
    'hero.btnToken': 'नया टोकन प्राप्त करें',
    'hero.btnLive': 'लाइव कतार बोर्ड देखें',
    'hero.metricWait': 'अनुमानित प्रतीक्षा समय',
    'hero.metricWaiting': 'कतार में प्रतीक्षारत किसान',
    'hero.metricCounters': 'सक्रिय काउंटर डेस्क',
    'hero.metricServed': 'आज सेवा प्राप्त किसान',

    // Services
    'services.heading': 'कृषि सेवा केंद्र की प्रमुख सेवाएं',
    'services.subheading': 'सब्सिडी दर पर खाद, प्रमाणित बीज, कीटनाशक व कृषि उपकरण प्राप्त करें',
    'services.tokenPrefix': 'टोकन कोड',
    'services.avgWait': 'औसत समय',
    'services.counter': 'काउंटर',
    'services.bookBtn': 'टोकन बुक करें',

    // Roles & Auth
    'auth.portal': 'कृषि सेवा केंद्र पोर्टल',
    'auth.roleSelect': 'खाता प्रकार चुनें',
    'auth.farmer': 'किसान',
    'auth.farmerSub': 'टोकन व सेवाएं',
    'auth.staff': 'स्टाफ',
    'auth.staffSub': 'काउंटर ऑपरेटर',
    'auth.admin': 'अधिकारी / एडमिन',
    'auth.adminSub': 'केंद्र अधीक्षक',
    'auth.signIn': 'लॉग इन',
    'auth.register': 'किसान पंजीकरण',
    'auth.demoBtn': 'डेमो क्रेडेंशियल भरें',
    'auth.demoFarmer': 'किसान डेमो',
    'auth.demoStaff': 'स्टाफ डेमो',
    'auth.demoAdmin': 'एडमिन डेमो',
    'auth.mobileOrEmail': 'मोबाइल नंबर या ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूरा नाम',
    'auth.confirmPassword': 'पासवर्ड की पुष्टि करें',
    'auth.newFarmer': 'केंद्र पर नए किसान हैं?',
    'auth.registerNow': 'निःशुल्क टोकन के लिए पंजीकरण करें',
    'auth.alreadyAccount': 'पहले से पंजीकृत हैं?',
    'auth.signInBtn': 'किसान के रूप में लॉग इन करें',
    'auth.registerBtn': 'पंजीकरण करें और टोकन लें',

    // Farmer Dashboard
    'farmer.title': 'किसान सेवा डेस्क',
    'farmer.subtitle': 'डिजिटल टोकन जनरेट करें और अपनी बारी ट्रैक करें',
    'farmer.generateNew': 'नया टोकन जनरेट करें',
    'farmer.selectService': 'आवश्यक सेवा का चयन करें',
    'farmer.yourTokens': 'आपके सक्रिय एवं पिछले टोकन',
    'farmer.currentToken': 'आपका वर्तमान टोकन',
    'farmer.nowServing': 'काउंटर पर वर्तमान टोकन',
    'farmer.assignedCounter': 'निर्दिष्ट काउंटर',
    'farmer.estWait': 'अनुमानित प्रतीक्षा',
    'farmer.statusWaiting': 'प्रतीक्षारत',
    'farmer.statusServing': 'सेवा जारी है',
    'farmer.statusCompleted': 'पूर्ण',
    'farmer.statusSkipped': 'छूट गया',
    'farmer.printSlip': 'पर्ची प्रिंट करें',

    // Live Board
    'board.title': 'सार्वजनिक कतार प्रदर्शन बोर्ड',
    'board.subtitle': 'कृषि सेवा केंद्र — लाइव काउंटर स्थिति',
    'board.nowServing': 'वर्तमान सेवा',
    'board.nextInQueue': 'कतार में अगले किसान',
    'board.counter': 'काउंटर',
    'board.token': 'टोकन',
    'board.farmer': 'किसान',
    'board.service': 'सेवा',
    'board.announcement': 'कृपया अपना टोकन नंबर पुकारे जाने पर निर्दिष्ट काउंटर पर पधारें',

    // Common
    'common.refresh': 'रिफ्रेश',
    'common.minutes': 'मिनट',
    'common.save': 'सुरक्षित करें',
    'common.cancel': 'रद्द करें',
    'common.close': 'बंद करें',
    'common.search': 'खोजें...',
    'common.print': 'प्रिंट करें',
    'common.language': 'भाषा'
  },

  en: {
    'app.title': 'KISAN QUEUE',
    'app.subtitle': 'Krishi Seva Kendra Token & Queue Portal',
    'nav.services': 'Services',
    'nav.howItWorks': 'How It Works',
    'nav.liveQueue': 'Live Queue',
    'nav.signIn': 'Sign In',
    'nav.getToken': 'Get Token',
    'nav.myDesk': 'My Token Desk',
    'nav.adminPanel': 'Admin Panel',
    'nav.signOut': 'Sign Out',
    'nav.profile': 'Profile',
    'nav.active': 'active',

    'hero.badge': 'Digital India • Ministry of Agriculture & Farmers Welfare',
    'hero.title': 'Digital Queue & Token Management for Krishi Seva Kendra',
    'hero.desc': 'No more waiting in long chaotic lines. Generate your digital queue token online or at the kiosk, monitor live counter progress, and get your subsidized farm supplies faster.',
    'hero.btnToken': 'Generate Token Now',
    'hero.btnLive': 'View Live Display Board',
    'hero.metricWait': 'Estimated Wait Time',
    'hero.metricWaiting': 'Farmers in Queue',
    'hero.metricCounters': 'Active Counter Desks',
    'hero.metricServed': 'Farmers Served Today',

    'services.heading': 'Krishi Seva Kendra Services',
    'services.subheading': 'Subsidized fertilizers, certified seeds, pesticides, and government agricultural schemes',
    'services.tokenPrefix': 'Token Code',
    'services.avgWait': 'Avg. Wait',
    'services.counter': 'Counter',
    'services.bookBtn': 'Book Token',

    'auth.portal': 'Krishi Seva Kendra Portal',
    'auth.roleSelect': 'Select Account Role',
    'auth.farmer': 'Farmer',
    'auth.farmerSub': 'Tokens & Service',
    'auth.staff': 'Staff',
    'auth.staffSub': 'Counter Operator',
    'auth.admin': 'Admin',
    'auth.adminSub': 'Kendra In-Charge',
    'auth.signIn': 'Sign In',
    'auth.register': 'Farmer Register',
    'auth.demoBtn': 'Auto-fill Demo',
    'auth.demoFarmer': 'Farmer Demo',
    'auth.demoStaff': 'Staff Demo',
    'auth.demoAdmin': 'Admin Demo',
    'auth.mobileOrEmail': 'Mobile Number or Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.newFarmer': 'New farmer to Kendra?',
    'auth.registerNow': 'Register for Free Token',
    'auth.alreadyAccount': 'Already registered?',
    'auth.signInBtn': 'Sign In as Farmer',
    'auth.registerBtn': 'Register & Get Digital Token',

    'farmer.title': 'Farmer Token Portal',
    'farmer.subtitle': 'Generate digital tokens and track your queue status',
    'farmer.generateNew': 'Generate New Token',
    'farmer.selectService': 'Select Kendra Service',
    'farmer.yourTokens': 'Your Active & Past Tokens',
    'farmer.currentToken': 'Your Current Token',
    'farmer.nowServing': 'Currently Serving',
    'farmer.assignedCounter': 'Designated Counter',
    'farmer.estWait': 'Estimated Wait',
    'farmer.statusWaiting': 'Waiting',
    'farmer.statusServing': 'Serving',
    'farmer.statusCompleted': 'Completed',
    'farmer.statusSkipped': 'Skipped',
    'farmer.printSlip': 'Print Slip',

    'board.title': 'Live Public Display Board',
    'board.subtitle': 'Krishi Seva Kendra — Real-Time Queue Status',
    'board.nowServing': 'Now Serving',
    'board.nextInQueue': 'Next in Queue',
    'board.counter': 'Counter',
    'board.token': 'Token',
    'board.farmer': 'Farmer',
    'board.service': 'Service',
    'board.announcement': 'Please proceed to the designated counter when your token number is announced',

    'common.refresh': 'Refresh',
    'common.minutes': 'min',
    'common.save': 'Save Changes',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.search': 'Search...',
    'common.print': 'Print',
    'common.language': 'Language'
  },

  pa: {
    'app.title': 'ਕਿਸਾਨ ਕਤਾਰ',
    'app.subtitle': 'ਕ੍ਰਿਸ਼ੀ ਸੇਵਾ ਕੇਂਦਰ ਟੋਕਨ ਤੇ ਬਿਲਿੰਗ ਪੋਰਟਲ',
    'nav.services': 'ਸੇਵਾਵਾਂ',
    'nav.howItWorks': 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
    'nav.liveQueue': 'ਲਾਈਵ ਕਤਾਰ',
    'nav.signIn': 'ਲਾਗਇਨ ਕਰੋ',
    'nav.getToken': 'ਟੋਕਨ ਲਵੋ',
    'nav.myDesk': 'ਮੇਰਾ ਟੋਕਨ ਡੈਸਕ',
    'nav.adminPanel': 'ਐਡਮਿਨ ਪੈਨਲ',
    'nav.signOut': 'ਲਾਗਆਉਟ',
    'nav.profile': 'ਪ੍ਰੋਫਾਈਲ',
    'nav.active': 'ਸਰਗਰਮ',

    'hero.badge': 'ਡਿਜੀਟਲ ਭਾਰਤ • ਖੇਤੀਬਾੜੀ ਅਤੇ ਕਿਸਾਨ ਭਲਾਈ ਮੰਤਰਾਲਾ',
    'hero.title': 'ਕ੍ਰਿਸ਼ੀ ਸੇਵਾ ਕੇਂਦਰ ਡਿਜੀਟਲ ਟੋਕਨ ਅਤੇ ਕਤਾਰ ਪ੍ਰਬੰਧਨ',
    'hero.desc': 'ਲੰਬੀਆਂ ਕਤਾਰਾਂ ਤੋਂ ਛੁਟਕਾਰਾ ਪਾਓ। ਡਿਜੀਟਲ ਟੋਕਨ ਲਵੋ, ਲਾਈਵ ਕਾਊਂਟਰ ਦੀ ਸਥਿਤੀ ਦੇਖੋ ਅਤੇ ਬਿਨਾਂ ਮੁਸ਼ਕਿਲ ਤੋਂ ਖਾਦ-ਬੀਜ ਪ੍ਰਾਪਤ ਕਰੋ।',
    'hero.btnToken': 'ਨਵਾਂ ਟੋਕਨ ਪ੍ਰਾਪਤ ਕਰੋ',
    'hero.btnLive': 'ਲਾਈਵ ਬੋਰਡ ਦੇਖੋ',
    'hero.metricWait': 'ਅੰਦਾਜ਼ਨ ਉਡੀਕ ਸਮਾਂ',
    'hero.metricWaiting': 'ਕਤਾਰ ਵਿੱਚ ਉਡੀਕ ਕਰ ਰਹੇ ਕਿਸਾਨ',
    'hero.metricCounters': 'ਸਰਗਰਮ ਕਾਊਂਟਰ ਡੈਸਕ',
    'hero.metricServed': 'ਅੱਜ ਸੇਵਾ ਪ੍ਰਾਪਤ ਕਿਸਾਨ',

    'services.heading': 'ਕ੍ਰਿਸ਼ੀ ਸੇਵਾ ਕੇਂਦਰ ਦੀਆਂ ਸੇਵਾਵਾਂ',
    'services.subheading': 'ਸਬਸਿਡੀ ਵਾਲੀ ਖਾਦ, ਪ੍ਰਮਾਣਿਤ ਬੀਜ ਅਤੇ ਕੀਟਨਾਸ਼ਕ',
    'services.tokenPrefix': 'ਟੋਕਨ ਕੋਡ',
    'services.avgWait': 'ਔਸਤ ਸਮਾਂ',
    'services.counter': 'ਕਾਊਂਟਰ',
    'services.bookBtn': 'ਟੋਕਨ ਬੁੱਕ ਕਰੋ',

    'auth.portal': 'ਕ੍ਰਿਸ਼ੀ ਸੇਵਾ ਕੇਂਦਰ ਪੋਰਟਲ',
    'auth.roleSelect': 'ਖਾਤਾ ਚੁਣੋ',
    'auth.farmer': 'ਕਿਸਾਨ',
    'auth.farmerSub': 'ਟੋਕਨ ਤੇ ਸੇਵਾ',
    'auth.staff': 'ਸਟਾਫ਼',
    'auth.staffSub': 'ਕਾਊਂਟਰ ਆਪਰੇਟਰ',
    'auth.admin': 'ਐਡਮਿਨ',
    'auth.adminSub': 'ਕੇਂਦਰ ਇੰਚਾਰਜ',
    'auth.signIn': 'ਲਾਗਇਨ',
    'auth.register': 'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ',
    'auth.demoBtn': 'ਡੈਮੋ ਭਰੋ',
    'auth.demoFarmer': 'ਕਿਸਾਨ ਡੈਮੋ',
    'auth.demoStaff': 'ਸਟਾਫ਼ ਡੈਮੋ',
    'auth.demoAdmin': 'ਐਡਮਿਨ ਡੈਮੋ',
    'auth.mobileOrEmail': 'ਮੋਬਾਈਲ ਜਾਂ ਈਮੇਲ',
    'auth.password': 'ਪਾਸਵਰਡ',
    'auth.fullName': 'ਪੂਰਾ ਨਾਮ',
    'auth.confirmPassword': 'ਪਾਸਵਰਡ ਪੁਸ਼ਟੀ',
    'auth.newFarmer': 'ਨਵੇਂ ਕਿਸਾਨ ਹੋ?',
    'auth.registerNow': 'ਮੁਫ਼ਤ ਟੋਕਨ ਲਈ ਰਜਿਸਟਰ ਕਰੋ',
    'auth.alreadyAccount': 'ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰ ਹੋ?',
    'auth.signInBtn': 'ਕਿਸਾਨ ਵਜੋਂ ਲਾਗਇਨ ਕਰੋ',
    'auth.registerBtn': 'ਰਜਿਸਟਰ ਕਰੋ ਅਤੇ ਟੋਕਨ ਲਵੋ',

    'farmer.title': 'ਕਿਸਾਨ ਸੇਵਾ ਡੈਸਕ',
    'farmer.subtitle': 'ਡਿਜੀਟਲ ਟੋਕਨ ਲਵੋ ਅਤੇ ਆਪਣੀ ਵਾਰੀ ਟਰੈਕ ਕਰੋ',
    'farmer.generateNew': 'ਨਵਾਂ ਟੋਕਨ ਲਵੋ',
    'farmer.selectService': 'ਸੇਵਾ ਚੁਣੋ',
    'farmer.yourTokens': 'ਤੁਹਾਡੇ ਟੋਕਨ',
    'farmer.currentToken': 'ਤੁਹਾਡਾ ਮੌਜੂਦਾ ਟੋਕਨ',
    'farmer.nowServing': 'ਮੌਜੂਦਾ ਸੇਵਾ',
    'farmer.assignedCounter': 'ਕਾਊਂਟਰ',
    'farmer.estWait': 'ਅੰਦਾਜ਼ਨ ਉਡੀਕ',
    'farmer.statusWaiting': 'ਉਡੀਕ ਵਿੱਚ',
    'farmer.statusServing': 'ਸੇਵਾ ਜਾਰੀ',
    'farmer.statusCompleted': 'ਮੁਕੰਮਲ',
    'farmer.statusSkipped': 'ਛੱਡਿਆ ਗਿਆ',
    'farmer.printSlip': 'ਪਰਚੀ ਪ੍ਰਿੰਟ ਕਰੋ',

    'board.title': 'ਲਾਈਵ ਕਤਾਰ ਬੋਰਡ',
    'board.subtitle': 'ਕ੍ਰਿਸ਼ੀ ਸੇਵਾ ਕੇਂਦਰ — ਰੀਅਲ ਟਾਈਮ ਸਥਿਤੀ',
    'board.nowServing': 'ਮੌਜੂਦਾ ਸੇਵਾ',
    'board.nextInQueue': 'ਕਤਾਰ ਵਿੱਚ ਅਗਲਾ',
    'board.counter': 'ਕਾਊਂਟਰ',
    'board.token': 'ਟੋਕਨ',
    'board.farmer': 'ਕਿਸਾਨ',
    'board.service': 'ਸੇਵਾ',
    'board.announcement': 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਟੋਕਨ ਨੰਬਰ ਦੇ ਬੋਲੇ ਜਾਣ ਤੇ ਕਾਊਂਟਰ ਤੇ ਪਹੁੰਚੋ',

    'common.refresh': 'ਤਾਜ਼ਾ ਕਰੋ',
    'common.minutes': 'ਮਿੰਟ',
    'common.save': 'ਸੰਭਾਲੋ',
    'common.cancel': 'ਰੱਦ ਕਰੋ',
    'common.close': 'ਬੰਦ ਕਰੋ',
    'common.search': 'ਖੋਜ ਕਰੋ...',
    'common.print': 'ਪ੍ਰਿੰਟ ਕਰੋ',
    'common.language': 'ਭਾਸ਼ਾ'
  },

  mr: {
    'app.title': 'किसान रांग',
    'app.subtitle': 'कृषी सेवा केंद्र टोकन आणि बिलिंग पोर्टल',
    'nav.services': 'सेवा',
    'nav.howItWorks': 'हे कसे कार्य करते',
    'nav.liveQueue': 'थेट रांग (Live Queue)',
    'nav.signIn': 'साइन इन',
    'nav.getToken': 'टोकन मिळवा',
    'nav.myDesk': 'माझा टोकन डेस्क',
    'nav.adminPanel': 'प्रशासक पॅनेल',
    'nav.signOut': 'साइन आउट',
    'nav.profile': 'प्रोफाइल',
    'nav.active': 'सक्रिय',

    'hero.badge': 'डिजिटल भारत • कृषी व शेतकरी कल्याण मंत्रालय',
    'hero.title': 'कृषी सेवा केंद्र डिजिटल टोकन आणि रांग व्यवस्थापन',
    'hero.desc': 'लांबच लांब रांगांपासून सुटका मिळवा. डिजिटल टोकन मिळवा, थेट काउंटर स्थिती तपासा आणि सहजतेने खते-बियाणे मिळवा.',
    'hero.btnToken': 'नवीन टोकन मिळवा',
    'hero.btnLive': 'थेट रांग फलक पहा',
    'hero.metricWait': 'अंदाजे प्रतीक्षा वेळ',
    'hero.metricWaiting': 'रांगेत प्रतीक्षेत शेतकरी',
    'hero.metricCounters': 'सक्रिय काउंटर डेस्क',
    'hero.metricServed': 'आज सेवा दिलेले शेतकरी',

    'services.heading': 'कृषी सेवा केंद्र सेवा',
    'services.subheading': 'सब्सिडी दरातील खते, प्रमाणित बियाणे आणि शेती अवजारे',
    'services.tokenPrefix': 'टोकन कोड',
    'services.avgWait': 'सरासरी वेळ',
    'services.counter': 'काउंटर',
    'services.bookBtn': 'टोकन बुक करा',

    'auth.portal': 'कृषी सेवा केंद्र पोर्टल',
    'auth.roleSelect': 'खाते प्रकार निवडा',
    'auth.farmer': 'शेतकरी',
    'auth.farmerSub': 'टोकन व सेवा',
    'auth.staff': 'कर्मचारी',
    'auth.staffSub': 'काउंटर ऑपरेटर',
    'auth.admin': 'प्रशासक',
    'auth.adminSub': 'केंद्र प्रमुख',
    'auth.signIn': 'साइन इन',
    'auth.register': 'शेतकरी नोंदणी',
    'auth.demoBtn': 'डेमो भरा',
    'auth.demoFarmer': 'शेतकरी डेमो',
    'auth.demoStaff': 'स्टाफ डेमो',
    'auth.demoAdmin': 'अॅडमिन डेमो',
    'auth.mobileOrEmail': 'मोबाईल किंवा ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूर्ण नाव',
    'auth.confirmPassword': 'पासवर्ड पुष्टी',
    'auth.newFarmer': 'केंद्रावर नवीन शेतकरी आहात?',
    'auth.registerNow': 'मोफत टोकनसाठी नोंदणी करा',
    'auth.alreadyAccount': 'आधीच नोंदणीकृत आहात?',
    'auth.signInBtn': 'शेतकरी म्हणून साइन इन करा',
    'auth.registerBtn': 'नोंदणी करा आणि टोकन मिळवा',

    'farmer.title': 'शेतकरी सेवा डेस्क',
    'farmer.subtitle': 'डिजिटल टोकन मिळवा आणि आपली पाळी तपासा',
    'farmer.generateNew': 'नवीन टोकन मिळवा',
    'farmer.selectService': 'सेवा निवडा',
    'farmer.yourTokens': 'आपले टोकन',
    'farmer.currentToken': 'आपले चालू टोकन',
    'farmer.nowServing': 'सध्याची सेवा',
    'farmer.assignedCounter': 'काउंटर',
    'farmer.estWait': 'अंदाजे वेळ',
    'farmer.statusWaiting': 'प्रतीक्षेत',
    'farmer.statusServing': 'सेवा चालू',
    'farmer.statusCompleted': 'पूर्ण',
    'farmer.statusSkipped': 'वगळले',
    'farmer.printSlip': 'पावती प्रिंट करा',

    'board.title': 'थेट रांग प्रदर्शन फलक',
    'board.subtitle': 'कृषी सेवा केंद्र — थेट स्थिती',
    'board.nowServing': 'सध्याची सेवा',
    'board.nextInQueue': 'रांगेतील पुढील',
    'board.counter': 'काउंटर',
    'board.token': 'टोकन',
    'board.farmer': 'शेतकरी',
    'board.service': 'सेवा',
    'board.announcement': 'कृपया आपला टोकन नंबर पुकारल्यावर संबंधित काउंटरवर उपस्थित राहावे',

    'common.refresh': 'रिफ्रेश',
    'common.minutes': 'मि',
    'common.save': 'जतन करा',
    'common.cancel': 'रद्द करा',
    'common.close': 'बंद करा',
    'common.search': 'शोधा...',
    'common.print': 'प्रिंट',
    'common.language': 'भाषा'
  },

  gu: {
    'app.title': 'કિસાન કતાર',
    'app.subtitle': 'કૃષિ સેવા કેન્દ્ર ટોકન અને બિલિંગ પોર્ટલ',
    'nav.services': 'સેવાઓ',
    'nav.howItWorks': 'તે કેવી રીતે કામ કરે છે',
    'nav.liveQueue': 'લાઈવ કતાર',
    'nav.signIn': 'સાઇન ઇન',
    'nav.getToken': 'ટોકન મેળવો',
    'nav.myDesk': 'મારું ટોકન ડેસ્ક',
    'nav.adminPanel': 'એડમિન પેનલ',
    'nav.signOut': 'સાઇન આઉટ',
    'nav.profile': 'પ્રોફાઇલ',
    'nav.active': 'સક્રિય',

    'hero.badge': 'ડિજિટલ ભારત • કૃષિ અને ખેડૂત કલ્યાણ મંત્રાલય',
    'hero.title': 'કૃષિ સેવા કેન્દ્ર ડિજિટલ ટોકન અને કતાર વ્યવસ્થાપન',
    'hero.desc': 'લાંબી લાઈનોથી મુક્તિ મેળવો. ડિજિટલ ટોકન મેળવો, લાઈવ કાઉન્ટરની સ્થિતિ જુઓ અને ખાતર-બિયારણ સરળતાથી મેળવો.',
    'hero.btnToken': 'નવું ટોકન મેળવો',
    'hero.btnLive': 'લાઈવ બોર્ડ જુઓ',
    'hero.metricWait': 'અંદાજિત પ્રતીક્ષા સમય',
    'hero.metricWaiting': 'કતારમાં પ્રતીક્ષા કરતા ખેડૂતો',
    'hero.metricCounters': 'સક્રિય કાઉન્ટર ડેસ્ક',
    'hero.metricServed': 'આજે સેવા મેળવેલ ખેડૂતો',

    'services.heading': 'કૃષિ સેવા કેન્દ્રની સેવાઓ',
    'services.subheading': 'સબસિડીવાળું ખાતર, પ્રમાણિત બિયારણ અને જંતુનાશકો',
    'services.tokenPrefix': 'ટોકન કોડ',
    'services.avgWait': 'સરેરાશ સમય',
    'services.counter': 'કાઉન્ટર',
    'services.bookBtn': 'ટોકન બુક કરો',

    'auth.portal': 'કૃષિ સેવા કેન્દ્ર પોર્ટલ',
    'auth.roleSelect': 'ખાતું પસંદ કરો',
    'auth.farmer': 'ખેડૂત',
    'auth.farmerSub': 'ટોકન અને સેવાઓ',
    'auth.staff': 'સ્ટાફ',
    'auth.staffSub': 'કાઉન્ટર ઓપરેટર',
    'auth.admin': 'એડમિન',
    'auth.adminSub': 'કેન્દ્ર ઇન્ચાર્જ',
    'auth.signIn': 'સાઇન ઇન',
    'auth.register': 'ખેડૂત નોંધણી',
    'auth.demoBtn': 'ડેમો વિગતો ભરો',
    'auth.demoFarmer': 'ખેડૂત ડેમો',
    'auth.demoStaff': 'સ્ટાફ ડેમો',
    'auth.demoAdmin': 'એડમિન ડેમો',
    'auth.mobileOrEmail': 'મોબાઈલ અથવા ઈમેલ',
    'auth.password': 'પાસવર્ડ',
    'auth.fullName': 'પૂરું નામ',
    'auth.confirmPassword': 'પાસવર્ડ ખાતરી',
    'auth.newFarmer': 'નવા ખેડૂત છો?',
    'auth.registerNow': 'મફત ટોકન માટે નોંધણી કરો',
    'auth.alreadyAccount': 'પહેલેથી નોંધાયેલા છો?',
    'auth.signInBtn': 'ખેડૂત તરીકે સાઇન ઇન કરો',
    'auth.registerBtn': 'નોંધણી કરો અને ટોકન લો',

    'farmer.title': 'ખેડૂત સેવા ડેસ્ક',
    'farmer.subtitle': 'ડિજિટલ ટોકન મેળવો અને તમારો વારો ટ્રેક કરો',
    'farmer.generateNew': 'નવું ટોકન મેળવો',
    'farmer.selectService': 'સેવા પસંદ કરો',
    'farmer.yourTokens': 'તમારા ટોકન',
    'farmer.currentToken': 'તમારું વર્તમાન ટોકન',
    'farmer.nowServing': 'હાલની સેવા',
    'farmer.assignedCounter': 'કાઉન્ટર',
    'farmer.estWait': 'અંદાજિત પ્રતીક્ષા',
    'farmer.statusWaiting': 'પ્રતીક્ષામાં',
    'farmer.statusServing': 'સેવા ચાલુ',
    'farmer.statusCompleted': 'સંપૂર્ણ',
    'farmer.statusSkipped': 'છૂટી ગયું',
    'farmer.printSlip': 'પહોંચ પ્રિન્ટ કરો',

    'board.title': 'લાઈવ કતાર બોર્ડ',
    'board.subtitle': 'કૃષિ સેવા કેન્દ્ર — રીઅલ-ટાઇમ સ્થિતિ',
    'board.nowServing': 'હાલની સેવા',
    'board.nextInQueue': 'કતારમાં આગળ',
    'board.counter': 'કાઉન્ટર',
    'board.token': 'ટોકન',
    'board.farmer': 'ખેડૂત',
    'board.service': 'સેવા',
    'board.announcement': 'કૃપા કરીને તમારો ટોકન નંબર બોલાય ત્યારે કાઉન્ટર પર પધારો',

    'common.refresh': 'રીફ્રેશ',
    'common.minutes': 'મિનિટ',
    'common.save': 'સાચવો',
    'common.cancel': 'રદ કરો',
    'common.close': 'બંધ કરો',
    'common.search': 'શોધો...',
    'common.print': 'પ્રિન્ટ કરો',
    'common.language': 'ભાષા'
  },

  bn: {
    'app.title': 'কিষাণ কিউ',
    'app.subtitle': 'কৃষি সেবা কেন্দ্র টোকেন ও বিলিং পোর্টাল',
    'nav.services': 'সেবাসমূহ',
    'nav.howItWorks': 'কীভাবে কাজ করে',
    'nav.liveQueue': 'লাইভ সারি',
    'nav.signIn': 'সাইন ইন',
    'nav.getToken': 'টোকেন নিন',
    'nav.myDesk': 'আমার টোকেন ডেস্ক',
    'nav.adminPanel': 'অ্যাডমিন প্যানেল',
    'nav.signOut': 'সাইন আউট',
    'nav.profile': 'প্রোফাইল',
    'nav.active': 'সক্রিয়',

    'hero.badge': 'ডিজিটাল ইন্ডিয়া • কৃষি ও কৃষক কল্যাণ মন্ত্রক',
    'hero.title': 'কৃষি সেবা কেন্দ্র ডিজিটাল টোকেন ও কিউ ম্যানেজমেন্ট',
    'hero.desc': 'দীর্ঘ লাইনে দাঁড়ানোর ঝামেলা দূর করুন। ডিজিটাল টোকেন নিন, লাইভ কাউন্টার অগ্রগতি ট্র্যাক করুন এবং সময় বাঁচান।',
    'hero.btnToken': 'নতুন টোকেন নিন',
    'hero.btnLive': 'লাইভ ডিসপ্লে দেখুন',
    'hero.metricWait': 'আনুমানিক অপেক্ষার সময়',
    'hero.metricWaiting': 'সারিতে অপেক্ষারত কৃষক',
    'hero.metricCounters': 'সক্রিয় কাউন্টার ডেস্ক',
    'hero.metricServed': 'আজ সেবা প্রাপ্ত কৃষক',

    'services.heading': 'কৃষি সেবা কেন্দ্রের সেবাসমূহ',
    'services.subheading': 'ভর্তুকিযুক্ত সার, উন্নত বীজ এবং কৃষি সরঞ্জামাদি',
    'services.tokenPrefix': 'টোকেন কোড',
    'services.avgWait': 'গড় সময়',
    'services.counter': 'কাউন্টার',
    'services.bookBtn': 'টোকেন বুক করুন',

    'auth.portal': 'কৃষি সেবা কেন্দ্র পোর্টাল',
    'auth.roleSelect': 'অ্যাকাউন্টের ধরন নির্বাচন করুন',
    'auth.farmer': 'কৃষক',
    'auth.farmerSub': 'টোকেন ও সেবা',
    'auth.staff': 'কর্মী',
    'auth.staffSub': 'কাউন্টার অপারেটর',
    'auth.admin': 'অ্যাডমিন',
    'auth.adminSub': 'কেন্দ্র ইন-চার্জ',
    'auth.signIn': 'সাইন ইন',
    'auth.register': 'কৃষক নিবন্ধন',
    'auth.demoBtn': 'ডেমো তথ্য পূরণ করুন',
    'auth.demoFarmer': 'কৃষক ডেমো',
    'auth.demoStaff': 'কর্মী ডেমো',
    'auth.demoAdmin': 'অ্যাডমিন ডেমো',
    'auth.mobileOrEmail': 'মোবাইল বা ইমেল',
    'auth.password': 'পাসওয়ার্ড',
    'auth.fullName': 'পুরো নাম',
    'auth.confirmPassword': 'পাসওয়ার্ড নিশ্চিতকরণ',
    'auth.newFarmer': 'কেন্দ্রে নতুন কৃষক?',
    'auth.registerNow': 'বিনামূল্যে টোকেনের জন্য নিবন্ধন করুন',
    'auth.alreadyAccount': 'আগে থেকেই নিবন্ধিত?',
    'auth.signInBtn': 'কৃষক হিসেবে সাইন ইন করুন',
    'auth.registerBtn': 'নিবন্ধন করুন এবং টোকেন নিন',

    'farmer.title': 'কৃষক সেবা ডেস্ক',
    'farmer.subtitle': 'ডিজিটাল টোকেন নিন এবং নিজের পালা ট্র্যাক করুন',
    'farmer.generateNew': 'নতুন টোকেন নিন',
    'farmer.selectService': 'সেবা নির্বাচন করুন',
    'farmer.yourTokens': 'আপনার টোকেনসমূহ',
    'farmer.currentToken': 'আপনার বর্তমান টোকেন',
    'farmer.nowServing': 'চলমান সেবা',
    'farmer.assignedCounter': 'কাউন্টার',
    'farmer.estWait': 'আনুমানিক অপেক্ষা',
    'farmer.statusWaiting': 'অপেক্ষারত',
    'farmer.statusServing': 'সেবা চলছে',
    'farmer.statusCompleted': 'সম্পন্ন',
    'farmer.statusSkipped': 'বাদ পড়েছে',
    'farmer.printSlip': 'রসিদ প্রিন্ট করুন',

    'board.title': 'লাইভ কিউ ডিসপ্লে বোর্ড',
    'board.subtitle': 'কৃষি সেবা কেন্দ্র — লাইভ স্ট্যাটাস',
    'board.nowServing': 'চলমান সেবা',
    'board.nextInQueue': 'সারিতে পরবর্তী',
    'board.counter': 'কাউন্টার',
    'board.token': 'টোকেন',
    'board.farmer': 'কৃষক',
    'board.service': 'সেবা',
    'board.announcement': 'আপনার টোকেন নম্বর ডাকার পর অনুগ্রহ করে কাউন্টারে আসুন',

    'common.refresh': 'রিফ্রেশ',
    'common.minutes': 'মিনিট',
    'common.save': 'সংরক্ষণ',
    'common.cancel': 'বাতিল',
    'common.close': 'বন্ধ',
    'common.search': 'অনুসন্ধান...',
    'common.print': 'প্রিন্ট',
    'common.language': 'ভাষা'
  },

  te: {
    'app.title': 'కిసాన్ క్యూ',
    'app.subtitle': 'కృషి సేవా కేంద్ర టోకెన్ & బిల్లింగ్ పోర్టల్',
    'nav.services': 'సేవలు',
    'nav.howItWorks': 'ఇది ఎలా పనిచేస్తుంది',
    'nav.liveQueue': 'లైవ్ క్యూ',
    'nav.signIn': 'సైన్ ఇన్',
    'nav.getToken': 'టోకెన్ పొందండి',
    'nav.myDesk': 'నా టోకెన్ డెస్క్',
    'nav.adminPanel': 'అడ్మిన్ ప్యానెల్',
    'nav.signOut': 'సైన్ అవుట్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.active': 'క్రియాశీలక',

    'hero.badge': 'డిజిటల్ ఇండియా • వ్యవసాయ & రైతు సంక్షేమ మంత్రిత్వ శాఖ',
    'hero.title': 'కృషి సేవా కేంద్ర డిజిటల్ టోకెన్ & క్యూ నిర్వహణ',
    'hero.desc': 'పొడవైన లైన్లలో వేచి ఉండాల్సిన అవసరం లేదు. డిజిటల్ టోకెన్ పొందండి, లైవ్ కౌంటర్ పురోగతిని ట్రాక్ చేయండి మరియు విత్తనాలు-ఎరువులు సులభంగా పొందండి.',
    'hero.btnToken': 'కొత్త టోకెన్ పొందండి',
    'hero.btnLive': 'లైవ్ డిస్‌ప్లే బోర్డు చూడండి',
    'hero.metricWait': 'సుమారు వేచి ఉండే సమయం',
    'hero.metricWaiting': 'క్యూలో ఉన్న రైతులు',
    'hero.metricCounters': 'యాక్టివ్ కౌంటర్ డెస్క్‌లు',
    'hero.metricServed': 'ఈరోజు సేవ పొందిన రైతులు',

    'services.heading': 'కృషి సేవా కేంద్ర సేవలు',
    'services.subheading': 'రాయితీ ఎరువులు, ధృవీకరించబడిన విత్తనాలు మరియు పురుగుమందులు',
    'services.tokenPrefix': 'టోకెన్ కోడ్',
    'services.avgWait': 'సగటు సమయం',
    'services.counter': 'కౌంటర్',
    'services.bookBtn': 'టోకెన్ బుక్ చేయండి',

    'auth.portal': 'కృషి సేవా కేంద్ర పోర్టల్',
    'auth.roleSelect': 'ఖాతా రకం ఎంచుకోండి',
    'auth.farmer': 'రైతు',
    'auth.farmerSub': 'టోకెన్లు & సేవలు',
    'auth.staff': 'సిబ్బంది',
    'auth.staffSub': 'కౌంటర్ ఆపరేటర్',
    'auth.admin': 'అడ్మిన్',
    'auth.adminSub': 'కేంద్ర ఇన్‌ఛార్జ్',
    'auth.signIn': 'సైన్ ఇన్',
    'auth.register': 'రైతు నమోదు',
    'auth.demoBtn': 'డెమో వివరాలు నింపండి',
    'auth.demoFarmer': 'రైతు డెమో',
    'auth.demoStaff': 'సిబ్బంది డెమో',
    'auth.demoAdmin': 'అడ్మిన్ డెమో',
    'auth.mobileOrEmail': 'మొబైల్ లేదా ఈమెయిల్',
    'auth.password': 'పాస్‌వర్డ్',
    'auth.fullName': 'పూర్తి పేరు',
    'auth.confirmPassword': 'పాస్‌వర్డ్ నిర్ధారణ',
    'auth.newFarmer': 'కొత్త రైతులా?',
    'auth.registerNow': 'ఉచిత టోకెన్ కోసం నమోదు చేసుకోండి',
    'auth.alreadyAccount': 'ఇప్పటికే నమోదై ఉన్నారా?',
    'auth.signInBtn': 'రైతుగా సైన్ ఇన్ చేయండి',
    'auth.registerBtn': 'నమోదు చేసుకుని టోకెన్ పొందండి',

    'farmer.title': 'రైతు సేవా డెస్క్',
    'farmer.subtitle': 'డిజిటల్ టోకెన్ పొందండి మరియు మీ వంతును ట్రాక్ చేయండి',
    'farmer.generateNew': 'కొత్త టోకెన్ పొందండి',
    'farmer.selectService': 'సేవను ఎంచుకోండి',
    'farmer.yourTokens': 'మీ టోకెన్లు',
    'farmer.currentToken': 'మీ ప్రస్తుత టోకెన్',
    'farmer.nowServing': 'ప్రస్తుత సేవ',
    'farmer.assignedCounter': 'కౌంటర్',
    'farmer.estWait': 'సుమారు వేచి ఉండే సమయం',
    'farmer.statusWaiting': 'వేచి ఉన్నారు',
    'farmer.statusServing': 'సేవ అందుతోంది',
    'farmer.statusCompleted': 'పూర్తయింది',
    'farmer.statusSkipped': 'వదిలివేయబడింది',
    'farmer.printSlip': 'రసీదు ప్రింట్ చేయండి',

    'board.title': 'లైవ్ క్యూ డిస్‌ప్లే బోర్డ్',
    'board.subtitle': 'కృషి సేవా కేంద్ర — లైవ్ స్థితి',
    'board.nowServing': 'ప్రస్తుత సేవ',
    'board.nextInQueue': 'క్యూలో తదుపరి',
    'board.counter': 'కౌంటర్',
    'board.token': 'టోకెన్',
    'board.farmer': 'రైతు',
    'board.service': 'సేవ',
    'board.announcement': 'దయచేసి మీ టోకెన్ నంబర్ పిలిచినప్పుడు సంబంధిత కౌంటర్‌కు వెళ్లండి',

    'common.refresh': 'రిఫ్రెష్',
    'common.minutes': 'నిమిషాలు',
    'common.save': 'భద్రపరచు',
    'common.cancel': 'రద్దు చేయి',
    'common.close': 'మూసివేయి',
    'common.search': 'శోధించండి...',
    'common.print': 'ప్రింట్',
    'common.language': 'భాష'
  }
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('kisan_queue_lang');
      if (saved && ['hi', 'en', 'pa', 'mr', 'gu', 'bn', 'te'].includes(saved)) {
        return saved as SupportedLanguage;
      }
    } catch (e) {
      // ignore
    }
    return 'hi'; // Default to Hindi as preferred Indian agricultural language
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('kisan_queue_lang', lang);
    } catch (e) {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.hi;
    if (langDict[key]) {
      return langDict[key];
    }
    // Fallback to Hindi or English
    if (translations.hi[key]) return translations.hi[key];
    if (translations.en[key]) return translations.en[key];
    return fallback || key;
  };

  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
