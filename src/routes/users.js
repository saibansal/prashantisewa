const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/supabase');
const { authenticateToken } = require('./auth');

// Configure Multer storage for profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET all users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST Add new user (with single photo upload)
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const {
      fullName,
      state,
      district,
      city,
      zipcode,
      saiConnectId,
      dateOfBirth,
      joiningDate
    } = req.body;

    // Validate fields
    if (!fullName || !state || !district || !city || !zipcode || !saiConnectId || !dateOfBirth || !joiningDate) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All fields except photo are strictly required' });
    }

    // Check if saiConnectId already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('sai_connect_id', saiConnectId)
      .maybeSingle();

    if (existingUser) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Sai Connect ID already exists' });
    }

    // Set up photo URL (relative to backend endpoint)
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Insert user into Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          full_name: fullName,
          state,
          district,
          city,
          zipcode,
          sai_connect_id: saiConnectId,
          photo_url: photoUrl,
          date_of_birth: dateOfBirth,
          joining_date: joiningDate
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'User added successfully', user: data[0] });
  } catch (error) {
    console.error('Add user error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT Update User
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      fullName,
      state,
      district,
      city,
      zipcode,
      saiConnectId,
      dateOfBirth,
      joiningDate
    } = req.body;

    // Validate fields
    if (!fullName || !state || !district || !city || !zipcode || !saiConnectId || !dateOfBirth || !joiningDate) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'All fields except photo are required' });
    }

    // Retrieve current user to find old photo
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    // Process new photo
    let photoUrl = user.photo_url;
    if (req.file) {
      // Delete old photo locally if it existed
      if (user.photo_url) {
        const oldFileName = user.photo_url.replace('/uploads/', '');
        const oldFilePath = path.join(__dirname, '../../uploads', oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        state,
        district,
        city,
        zipcode,
        sai_connect_id: saiConnectId,
        photo_url: photoUrl,
        date_of_birth: dateOfBirth,
        joining_date: joiningDate
      })
      .eq('id', userId)
      .select();

    if (error) throw error;

    res.json({ message: 'User updated successfully', user: data[0] });
  } catch (error) {
    console.error('Update user error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE User

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Retrieve user to check photo path
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('photo_url')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete photo locally if exists
    if (user.photo_url) {
      const fileName = user.photo_url.replace('/uploads/', '');
      const filePath = path.join(__dirname, '../../uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete user from Supabase
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
