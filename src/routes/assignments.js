const express = require('express');
const router = express.Router();
const { readLocalDb, writeLocalDb, generateUuid } = require('../config/localDb');
const { authenticateToken } = require('./auth');

// GET all assignments (with joined user and duty point details)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    
    // Perform manual join
    const assignments = data.user_assignments.map(a => {
      const userObj = data.users.find(u => u.id === a.user_id);
      const dpObj = data.duty_points.find(dp => dp.id === a.duty_point_id);
      return {
        id: a.id,
        assigned_sub_point: a.assigned_sub_point,
        assigned_at: a.assigned_at,
        user_id: a.user_id,
        duty_point_id: a.duty_point_id,
        sewa_start_date: a.sewa_start_date,
        sewa_end_date: a.sewa_end_date,
        sewa_state: a.sewa_state,
        user: userObj ? {
          full_name: userObj.full_name,
          sai_connect_id: userObj.sai_connect_id,
          state: userObj.state,
          district: userObj.district,
          city: userObj.city
        } : null,
        duty_point: dpObj ? {
          main_point: dpObj.main_point
        } : null
      };
    });

    const sortedAssignments = [...assignments].sort((a, b) => new Date(b.assigned_at || 0) - new Date(a.assigned_at || 0));
    res.json(sortedAssignments);
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
    const data = readLocalDb();

    // Check if user is already assigned to ANY duty point during this sewa batch
    const existingAssignment = data.user_assignments.find(a => 
      a.user_id === userId &&
      a.sewa_start_date === (sewaStartDate || todayStr) &&
      a.sewa_end_date === (sewaEndDate || todayStr)
    );

    if (existingAssignment) {
      return res.status(400).json({ error: 'This user is already assigned to a duty point for this sewa period' });
    }

    const newAssignment = {
      id: generateUuid(),
      user_id: userId,
      duty_point_id: dutyPointId,
      assigned_sub_point: assignedSubPoint.trim(),
      sewa_start_date: sewaStartDate || todayStr,
      sewa_end_date: sewaEndDate || todayStr,
      sewa_state: sewaState || 'Other',
      assigned_at: new Date().toISOString()
    };

    data.user_assignments.push(newAssignment);
    writeLocalDb(data);

    res.status(201).json({ message: 'User assigned successfully', assignment: newAssignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT Update assignment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { dutyPointId, assignedSubPoint } = req.body;

    if (!dutyPointId || !assignedSubPoint) {
      return res.status(400).json({ error: 'dutyPointId and assignedSubPoint are required' });
    }

    const data = readLocalDb();
    const assignmentIndex = data.user_assignments.findIndex(a => a.id === req.params.id);

    if (assignmentIndex === -1) {
      return res.status(404).json({ error: 'Assignment not found with the given ID' });
    }

    data.user_assignments[assignmentIndex] = {
      ...data.user_assignments[assignmentIndex],
      duty_point_id: dutyPointId,
      assigned_sub_point: assignedSubPoint.trim()
    };
    writeLocalDb(data);

    res.json({ message: 'Assignment updated successfully', assignment: data[assignmentIndex] });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE/Remove assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    data.user_assignments = data.user_assignments.filter(a => a.id !== req.params.id);
    writeLocalDb(data);
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Remove assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
