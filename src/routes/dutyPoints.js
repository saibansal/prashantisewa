const express = require('express');
const router = express.Router();
const { readLocalDb, writeLocalDb, generateUuid } = require('../config/localDb');
const { authenticateToken } = require('./auth');

// GET all duty points
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    const dutyPoints = [...data.duty_points].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
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

    const data = readLocalDb();
    const existingPoint = data.duty_points.find(p => p.main_point.toLowerCase() === mainPoint.trim().toLowerCase());

    if (existingPoint) {
      return res.status(400).json({ error: 'Duty Point with this Main Point already exists' });
    }

    const newPoint = {
      id: generateUuid(),
      main_point: mainPoint.trim(),
      sub_points: cleanSubPoints,
      created_at: new Date().toISOString()
    };

    data.duty_points.push(newPoint);
    writeLocalDb(data);

    res.status(201).json({ message: 'Duty Point added successfully', dutyPoint: newPoint });
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

    const data = readLocalDb();
    const existingPoint = data.duty_points.find(p => 
      p.main_point.toLowerCase() === mainPoint.trim().toLowerCase() && p.id !== req.params.id
    );

    if (existingPoint) {
      return res.status(400).json({ error: 'Another Duty Point with this Main Point already exists' });
    }

    const pointIndex = data.duty_points.findIndex(p => p.id === req.params.id);
    if (pointIndex === -1) {
      return res.status(404).json({ error: 'Duty Point not found' });
    }

    data.duty_points[pointIndex] = {
      ...data.duty_points[pointIndex],
      main_point: mainPoint.trim(),
      sub_points: cleanSubPoints
    };
    writeLocalDb(data);

    res.json({ message: 'Duty Point updated successfully', dutyPoint: data[pointIndex] });
  } catch (error) {
    console.error('Update duty point error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE Duty Point
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const data = readLocalDb();
    data.duty_points = data.duty_points.filter(p => p.id !== req.params.id);
    writeLocalDb(data);
    res.json({ message: 'Duty Point deleted successfully' });
  } catch (error) {
    console.error('Delete duty point error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
