const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getTodayAttendance
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

// Employee routes
router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.get('/my-attendance', protect, getMyAttendance);

// Admin routes
router.get('/', protect, admin, getAllAttendance);
router.get('/today', protect, admin, getTodayAttendance);

module.exports = router;