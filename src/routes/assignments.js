const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('./auth');

// GET all assignments (with joined user and duty point details)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: assignments, error } = await supabase
      .from('user_assignments')
      .select(`
        id,
        assigned_sub_point,
        assigned_at,
        user_id,
        duty_point_id,
        sewa_start_date,
        sewa_end_date,
        sewa_state,
        user:users (
          full_name,
          sai_connect_id,
          state,
          district,
          city
        ),
        duty_point:duty_points (
          main_point
        )
      `)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    res.json(assignments);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST Create new assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, dutyPointId, assignedSubPoint, sewaStartDate, sewaEndDate, sewaState } = req.body;

    if (!userId || !dutyPointId || !assignedSubPoint) {
      return res.status(400).json({ error: 'userId, dutyPointId, and assignedSubPoint are required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user is already assigned to ANY duty point during this sewa batch
    const { data: existingAssignment, error: checkError } = await supabase
      .from('user_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('sewa_start_date', sewaStartDate || todayStr)
      .eq('sewa_end_date', sewaEndDate || todayStr)
      .maybeSingle();

    if (existingAssignment) {
      return res.status(400).json({ error: 'This user is already assigned to a duty point for this sewa period' });
    }

    // Insert assignment
    const { data, error } = await supabase
      .from('user_assignments')
      .insert([
        {
          user_id: userId,
          duty_point_id: dutyPointId,
          assigned_sub_point: assignedSubPoint.trim(),
          sewa_start_date: sewaStartDate || todayStr,
          sewa_end_date: sewaEndDate || todayStr,
          sewa_state: sewaState || 'Other'
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'User assigned successfully', assignment: data[0] });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE/Remove assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_assignments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Remove assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
