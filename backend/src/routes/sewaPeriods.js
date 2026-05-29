const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('./auth');

// GET all sewa periods
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: periods, error } = await supabase
      .from('sewa_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
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

    // Check if duplicate period already exists
    const { data: existing, error: checkError } = await supabase
      .from('sewa_periods')
      .select('id')
      .eq('state', state)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'This Prashanti Sewa period is already configured' });
    }

    const { data, error } = await supabase
      .from('sewa_periods')
      .insert([
        {
          state: state,
          start_date: startDate,
          end_date: endDate
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Sewa period saved successfully', period: data[0] });
  } catch (error) {
    console.error('Create sewa period error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE a sewa period
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('sewa_periods')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Sewa period deleted successfully' });
  } catch (error) {
    console.error('Delete sewa period error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
