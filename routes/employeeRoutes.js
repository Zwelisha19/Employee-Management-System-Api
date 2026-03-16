const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { 
  registerEmployee, 
  loginEmployee, 
  getMe,
  updateEmployee,    // ✅ Import the new controller functions
  updatePassword     // ✅ Import the new controller functions
} = require('../controllers/EmpController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginEmployee);

// Protected routes
router.get('/me', protect, getMe);

// Admin only routes
router.post('/', protect, admin, registerEmployee);

// Get all employees (admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const employees = await Employee.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single employee
router.get('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Employees can only view themselves, admins can view anyone
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// TEMPORARY DEBUG ROUTE - Remove after testing
router.get('/debug/password/:id', protect, admin, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check if password exists and its length
    const passwordInfo = {
      id: employee.id,
      email: employee.email,
      hasPassword: !!employee.password,
      passwordLength: employee.password ? employee.password.length : 0,
      passwordStartsWith: employee.password ? employee.password.substring(0, 10) + '...' : null
    };
    
    res.json(passwordInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ UPDATED: Update employee (using controller function)
router.put('/:id', protect, updateEmployee);

// ✅ NEW: Update password route
router.put('/:id/password', protect, updatePassword);

// Delete employee (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;