const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { registerEmployee, loginEmployee, getMe } = require('../controllers/EmpController');
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

// Update employee
router.put('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Employees can only update themselves, admins can update anyone
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await employee.update(req.body);
    
    res.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      phone: employee.phone,
      status: employee.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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