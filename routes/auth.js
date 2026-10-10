const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../services/db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '88451250603-kbn9pbjdmpadjujk14bnqtrvk0672pol.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper to sanitize user object
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// GET /api/auth/config - Public configuration for client-side integrations
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID
  });
});

// POST /api/auth/google - Authenticate using verified Google Identity Services ID Token
router.post('/google', async (req, res) => {
  try {
    const { credential, idToken } = req.body;
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify) {
      return res.status(400).json({ error: 'Google ID token (credential) is required' });
    }

    const currentClientId = process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: currentClientId
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ error: 'Invalid, expired, or malformed Google token: ' + verifyErr.message });
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    // Verify token issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      return res.status(401).json({ error: 'Invalid token issuer' });
    }

    if (payload.aud !== currentClientId) {
      return res.status(401).json({ error: 'Token audience does not match configured Client ID' });
    }

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email address is not verified' });
    }

    const googleId = payload.sub;
    const cleanEmail = payload.email.toLowerCase().trim();
    const name = (payload.name || payload.given_name || 'Google User').trim();
    const avatar = payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7,3b82f6,6366f1`;

    // 1. Look up user by googleId
    let user = await db.findOne('users', { googleId });

    // 2. If not found by googleId, check by email
    if (!user) {
      const existingUserByEmail = await db.findOne('users', { email: cleanEmail });

      if (existingUserByEmail) {
        // Account exists with email/password and no linked googleId
        if (existingUserByEmail.password && !existingUserByEmail.googleId) {
          return res.status(409).json({
            error: 'An account with this email already exists. Please log in using your standard email and password.'
          });
        }
        user = existingUserByEmail;
      } else {
        // Create new user with strictly CUSTOMER role
        const newUserId = `usr_google_${googleId.slice(-6)}_${Date.now().toString(36)}`;
        user = await db.insert('users', {
          id: newUserId,
          googleId,
          name,
          email: cleanEmail,
          role: 'CUSTOMER', // Strictly enforce CUSTOMER role
          membership: 'Standard Member',
          phone: '',
          avatar,
          address: '',
          licenseNumber: '',
          licenseExpiry: '',
          profileCompletion: 50,
          status: 'Active',
          authProvider: 'google',
          totalBookings: 0,
          totalSpent: 0
        });

        // Log registration activity
        await db.insert('activities', {
          type: 'user_register_google',
          user: user.email,
          userName: user.name,
          action: 'New user registered via Google Sign-In',
          description: `${user.name} (${user.email}) created an account with Google`,
          icon: 'user-plus',
          time: 'Just now'
        });
      }
    }

    // Check account status
    if (user.status === 'Disabled') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Update last login
    await db.updateById('users', user.id, { lastLogin: new Date().toISOString() });

    // Log login activity
    await db.insert('activities', {
      type: 'user_login_google',
      user: user.email,
      userName: user.name,
      action: 'User logged in via Google',
      description: `${user.name} logged into ${user.role.toLowerCase()} portal via Google`,
      icon: 'log-in',
      time: 'Just now'
    });

    // Issue DriveEase JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Google authentication successful',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Google authentication failed: ' + err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.findOne('users', { email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Public registration always assigns CUSTOMER role
    const assignedRole = 'CUSTOMER';

    const newUser = await db.insert('users', {
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || '',
      role: assignedRole,
      membership: assignedRole === 'ADMIN' ? 'Administrator' : 'Standard Member',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7,3b82f6,6366f1`,
      address: '',
      licenseNumber: '',
      licenseExpiry: '',
      profileCompletion: 40,
      status: 'Active',
      totalBookings: 0,
      totalSpent: 0
    });

    // Log activity
    await db.insert('activities', {
      type: 'user_register',
      user: newUser.email,
      userName: newUser.name,
      action: 'New user registered',
      description: `${newUser.name} (${newUser.email}) created an account`,
      icon: 'user-plus',
      time: 'Just now'
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.findOne('users', { email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'Disabled') {
      return res.status(403).json({ error: 'Account disabled. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.updateById('users', user.id, { lastLogin: new Date().toISOString() });

    // Log activity
    await db.insert('activities', {
      type: 'user_login',
      user: user.email,
      userName: user.name,
      action: 'User logged in',
      description: `${user.name} logged into ${user.role.toLowerCase()} portal`,
      icon: 'log-in',
      time: 'Just now'
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, address, licenseNumber, licenseExpiry, avatar } = req.body;
    
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Full name cannot be empty' });
    }

    // Calculate profile completion percentage
    let completedFields = 0;
    const totalFields = 6;
    const newName = name !== undefined ? name.trim() : req.user.name;
    const newPhone = phone !== undefined ? String(phone).trim() : (req.user.phone || '');
    const newAddress = address !== undefined ? String(address).trim() : (req.user.address || '');
    const newLicense = licenseNumber !== undefined ? String(licenseNumber).trim() : (req.user.licenseNumber || '');
    const newAvatar = avatar !== undefined ? String(avatar).trim() : (req.user.avatar || '');

    if (newName) completedFields++;
    if (req.user.email) completedFields++;
    if (newPhone) completedFields++;
    if (newAddress) completedFields++;
    if (newLicense) completedFields++;
    if (newAvatar) completedFields++;
    const profileCompletion = Math.min(100, Math.round((completedFields / totalFields) * 100));

    const updated = await db.updateById('users', req.user.id, {
      ...(name !== undefined && { name: newName }),
      ...(phone !== undefined && { phone: newPhone }),
      ...(address !== undefined && { address: newAddress }),
      ...(licenseNumber !== undefined && { licenseNumber: newLicense }),
      ...(licenseExpiry !== undefined && { licenseExpiry: String(licenseExpiry).trim() }),
      ...(avatar !== undefined && { avatar: newAvatar }),
      profileCompletion
    });

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateById('users', req.user.id, { password: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password update failed: ' + err.message });
  }
});

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  emailNotifications: true,
  smsNotifications: true,
  marketingOffers: true,
  securityAlerts: true,
  currency: 'INR',
  unitSystem: 'metric',
  language: 'English'
};

// GET /api/auth/preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      ...(req.user.preferences || {})
    };
    res.json({ preferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve preferences: ' + err.message });
  }
});

// PUT /api/auth/preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const {
      theme,
      emailNotifications,
      smsNotifications,
      marketingOffers,
      securityAlerts,
      currency,
      unitSystem,
      language
    } = req.body;

    const current = {
      ...DEFAULT_PREFERENCES,
      ...(req.user.preferences || {})
    };

    const updatedPreferences = {
      theme: theme !== undefined ? String(theme).trim() : current.theme,
      emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : current.emailNotifications,
      smsNotifications: smsNotifications !== undefined ? Boolean(smsNotifications) : current.smsNotifications,
      marketingOffers: marketingOffers !== undefined ? Boolean(marketingOffers) : current.marketingOffers,
      securityAlerts: securityAlerts !== undefined ? Boolean(securityAlerts) : current.securityAlerts,
      currency: currency !== undefined ? String(currency).trim() : current.currency,
      unitSystem: unitSystem !== undefined ? String(unitSystem).trim() : current.unitSystem,
      language: language !== undefined ? String(language).trim() : current.language
    };

    const updated = await db.updateById('users', req.user.id, {
      preferences: updatedPreferences
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences,
      user: sanitizeUser(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences: ' + err.message });
  }
});

module.exports = router;

