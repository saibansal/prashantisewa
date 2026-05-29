const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('./auth');

// GET all duty points
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: dutyPoints, error } = await supabase
      .from('duty_points')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(dutyPoints);
  } catch (error) {
    console.error('Fetch duty points error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST Add new duty point
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { mainPoint, subPoints } = req.body;

    if (!mainPoint || !subPoints || !Array.isArray(subPoints) || subPoints.length === 0) {
      return res.status(400).json({ error: 'Main Point and at least one Sub Point are required' });
    }

    const cleanSubPoints = subPoints
      .map(p => {
        const name = p.name ? p.name.trim() : '';
        const requiredStaff = parseInt(p.requiredStaff, 10) || 1;
        return { name, required_staff: requiredStaff };
      })
      .filter(p => p.name.length > 0);

    if (cleanSubPoints.length === 0) {
      return res.status(400).json({ error: 'At least one valid non-empty Sub Point with requirement is required' });
    }

    const { data: existingPoint, error: checkError } = await supabase
      .from('duty_points')
      .select('id')
      .eq('main_point', mainPoint.trim())
      .maybeSingle();

    if (existingPoint) {
      return res.status(400).json({ error: 'Duty Point with this Main Point already exists' });
    }

    const { data, error } = await supabase
      .from('duty_points')
      .insert([
        {
          main_point: mainPoint.trim(),
          sub_points: cleanSubPoints
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Duty Point added successfully', dutyPoint: data[0] });
  } catch (error) {
    console.error('Add duty point error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT Update duty point
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { mainPoint, subPoints } = req.body;

    if (!mainPoint || !subPoints || !Array.isArray(subPoints) || subPoints.length === 0) {
      return res.status(400).json({ error: 'Main Point and at least one Sub Point are required' });
    }

    const cleanSubPoints = subPoints
      .map(p => {
        const name = p.name ? p.name.trim() : '';
        const requiredStaff = parseInt(p.requiredStaff, 10) || 1;
        return { name, required_staff: requiredStaff };
      })
      .filter(p => p.name.length > 0);

    if (cleanSubPoints.length === 0) {
      return res.status(400).json({ error: 'At least one valid non-empty Sub Point with requirement is required' });
    }

    const { data: existingPoint, error: checkError } = await supabase
      .from('duty_points')
      .select('id')
      .eq('main_point', mainPoint.trim())
      .neq('id', req.params.id)
      .maybeSingle();

    if (existingPoint) {
      return res.status(400).json({ error: 'Another Duty Point with this Main Point already exists' });
    }

    const { data, error } = await supabase
      .from('duty_points')
      .update({
        main_point: mainPoint.trim(),
        sub_points: cleanSubPoints
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({ message: 'Duty Point updated successfully', dutyPoint: data[0] });
  } catch (error) {
    console.error('Update duty point error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE Duty Point
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('duty_points')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Duty Point deleted successfully' });
  } catch (error) {
    console.error('Delete duty point error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
