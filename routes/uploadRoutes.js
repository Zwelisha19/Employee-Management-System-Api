const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/authMiddleware');

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

module.exports = router;