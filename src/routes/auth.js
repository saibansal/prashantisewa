const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwttokenkey123!';

// Middleware to authenticate JWT token - disabled to allow direct access without login
const authenticateToken = (req, res, next) => {
  req.admin = { id: '00000000-0000-0000-0000-000000000000', loginId: 'admin' };
  next();
};


// Admin Registration
router.post('/register', async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'loginId and password are required' });
    }

    // Check if admin already exists
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('admins')
      .select('*')
      .eq('login_id', loginId)
      .single();

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists with this loginId' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new admin
    const { data, error } = await supabase
      .from('admins')
      .insert([{ login_id: loginId, password_hash: passwordHash }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Admin registered successfully', adminId: data[0].id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'loginId and password are required' });
    }

    // Retrieve admin from Supabase
    let { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('login_id', loginId)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error during login:', error);
    }


    // Foolproof fallback: if logging in as default admin and admin doesn't exist in DB, create it programmatically!
    if ((error || !admin) && loginId === 'admin') {
      console.log('Seeding default admin user programmatically...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin@123', salt);
      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert([{ login_id: 'admin', password_hash: passwordHash }])
        .select()
        .single();
      
      if (!insertError && newAdmin) {
        admin = newAdmin;
      } else {
        console.error('Failed to auto-seed default admin:', insertError);
      }
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid loginId or password' });
    }

    // Compare passwords
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid loginId or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: admin.id, loginId: admin.login_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, loginId: admin.login_id }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Verify token route
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

module.exports = { router, authenticateToken };
