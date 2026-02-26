const express = require('express');
const router = express.Router();
const {
  getTodayReport,
  getMonthlyReport,
  getLeaveReport,
  getDepartmentReport
} = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

// All report routes are admin only
router.get('/today', protect, admin, getTodayReport);
router.get('/monthly', protect, admin, getMonthlyReport);
router.get('/leaves', protect, admin, getLeaveReport);
router.get('/departments', protect, admin, getDepartmentReport);

module.exports = router;