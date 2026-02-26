const express = require('express');
const router = express.Router();
const {
  requestLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
  cancelLeaveRequest
} = require('../controllers/leaveController');
const { protect, admin } = require('../middleware/authMiddleware');

// Employee routes
router.post('/request', protect, requestLeave);
router.get('/my-requests', protect, getMyLeaveRequests);
router.delete('/:id', protect, cancelLeaveRequest);

// Admin routes
router.get('/all', protect, admin, getAllLeaveRequests);
router.put('/:id', protect, admin, updateLeaveStatus);

module.exports = router;