const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { readLocalDb, writeLocalDb, generateUuid } = require('../config/localDb');
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
    const data = readLocalDb();
    const sortedUsers = [...data.users].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json(sortedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST Add new user
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

    if (!fullName || !state || !district || !city || !zipcode || !saiConnectId || !dateOfBirth || !joiningDate) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All fields except photo are strictly required' });
    }

    const data = readLocalDb();
    const existingUser = data.users.find(u => u.sai_connect_id === saiConnectId);

    if (existingUser) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Sai Connect ID already exists' });
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const newUser = {
      id: generateUuid(),
      full_name: fullName,
      state,
      district,
      city,
      zipcode,
      sai_connect_id: saiConnectId,
      photo_url: photoUrl,
      date_of_birth: dateOfBirth,
      joining_date: joiningDate,
      created_at: new Date().toISOString()
    };

    data.users.push(newUser);
    writeLocalDb(data);

    res.status(201).json({ message: 'User added successfully', user: newUser });
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

    if (!fullName || !state || !district || !city || !zipcode || !saiConnectId || !dateOfBirth || !joiningDate) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'All fields except photo are required' });
    }

    const data = readLocalDb();
    const userIndex = data.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data.users[userIndex];

    let photoUrl = user.photo_url;
    if (req.file) {
      if (user.photo_url) {
        const oldFileName = user.photo_url.replace('/uploads/', '');
        const oldFilePath = path.join(__dirname, '../../uploads', oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      photoUrl = `/uploads/${req.file.filename}`;
    }

    data.users[userIndex] = {
      ...user,
      full_name: fullName,
      state,
      district,
      city,
      zipcode,
      sai_connect_id: saiConnectId,
      photo_url: photoUrl,
      date_of_birth: dateOfBirth,
      joining_date: joiningDate
    };
    writeLocalDb(data);

    res.json({ message: 'User updated successfully', user: data[userIndex] });
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
    const data = readLocalDb();
    const user = data.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.photo_url) {
      const fileName = user.photo_url.replace('/uploads/', '');
      const filePath = path.join(__dirname, '../../uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    data.users = data.users.filter(u => u.id !== userId);
    // Also cleanup assignments related to this user to avoid orphan constraint issues
    data.user_assignments = data.user_assignments.filter(a => a.user_id !== userId);
    
    writeLocalDb(data);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
