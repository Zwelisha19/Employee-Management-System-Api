const express = require('express');
const router = express.Router();
const { upload, cloudinary } = require('../config/cloudinary'); // Make sure cloudinary is exported
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest'); // ✅ ADD THIS
const { protect, admin } = require('../middleware/authMiddleware'); // ✅ ADD admin

// Upload profile picture
router.post('/profile-pic/:id', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permission (admin or self)
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update profile picture URL
    employee.profilePic = req.file.path;
    await employee.save();

    res.json({ 
      message: 'Profile picture uploaded successfully',
      profilePic: req.file.path
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete profile picture
router.delete('/profile-pic/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permission
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete from Cloudinary if exists
    if (employee.profilePic) {
      const publicId = employee.profilePic.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`employee-profiles/${publicId}`);
    }

    // Remove from database
    employee.profilePic = null;
    await employee.save();

    res.json({ message: 'Profile picture removed' });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ NEW: Upload leave document (sick note, etc)
router.post('/leave-document/:leaveId', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const leaveRequest = await LeaveRequest.findOne({
      where: { 
        id: req.params.leaveId,
        employeeId: req.employee.id  // Ensure employee owns this request
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update leave request with document info
    leaveRequest.documentUrl = req.file.path;
    leaveRequest.documentName = req.file.originalname;
    await leaveRequest.save();

    res.json({ 
      message: 'Document uploaded successfully',
      documentUrl: req.file.path,
      documentName: req.file.originalname
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ NEW: Get document for leave request (admin only)
router.get('/leave-document/:leaveId', protect, admin, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.leaveId);

    if (!leaveRequest || !leaveRequest.documentUrl) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ 
      documentUrl: leaveRequest.documentUrl,
      documentName: leaveRequest.documentName 
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;