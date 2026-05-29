const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const dutyPointsRouter = require('./routes/dutyPoints');
const assignmentsRouter = require('./routes/assignments');
const sewaPeriodsRouter = require('./routes/sewaPeriods');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded profile photos statically
app.use('/uploads', express.static(uploadsDir));

// Serve Admin Panel UI statically
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRouter);

app.use('/api/users', usersRouter);
app.use('/api/duty-points', dutyPointsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/sewa-periods', sewaPeriodsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start Server (Only locally, Vercel will handle it in production)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Duty Checks Backend Admin Panel Server is running!`);
    console.log(`Port: ${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
