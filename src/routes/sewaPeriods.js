const express = require('express');
const router = express.Router();
const { readLocalDb, writeLocalDb, generateUuid } = require('../config/localDb');
const { authenticateToken } = require('./auth');

// GET all sewa periods
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    const periods = [...data.sewa_periods].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    res.json(periods);
  } catch (error) {
    console.error('Fetch sewa periods error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST Create new sewa period
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { state, startDate, endDate } = req.body;

    if (!state || !startDate || !endDate) {
      return res.status(400).json({ error: 'state, startDate, and endDate are strictly required' });
    }

    const data = readLocalDb();
    const existing = data.sewa_periods.find(p => p.state === state && p.start_date === startDate && p.end_date === endDate);

    if (existing) {
      return res.status(400).json({ error: 'This Prashanti Sewa period is already configured' });
    }

    const newPeriod = {
      id: generateUuid(),
      state: state,
      start_date: startDate,
      end_date: endDate,
      created_at: new Date().toISOString()
    };

    data.sewa_periods.push(newPeriod);
    writeLocalDb(data);

    res.status(201).json({ message: 'Sewa period saved successfully', period: newPeriod });
  } catch (error) {
    console.error('Create sewa period error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE a sewa period
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    data.sewa_periods = data.sewa_periods.filter(p => p.id !== req.params.id);
    writeLocalDb(data);
    res.json({ message: 'Sewa period deleted successfully' });
  } catch (error) {
    console.error('Delete sewa period error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
