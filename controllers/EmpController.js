const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../services/emailService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new employee (Admin only)
// @route   POST /api/employees
const registerEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, position, department, role } = req.body;

    // Check if employee exists
    const employeeExists = await Employee.findOne({ where: { email } });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee already exists' });
    }

    // Store the plain password temporarily for email
    const plainPassword = password;

    // Create employee (password will be hashed by hook)
    const employee = await Employee.create({
      name,
      email,
      password,  // This gets hashed automatically
      phone,
      position,
      department,
      role: role || 'employee'
    });

    // Send welcome email (don't await - let it run in background)
    sendWelcomeEmail(employee, plainPassword)
      .then(result => {
        if (result.success) {
          console.log(`Email sent to ${employee.email}`);
        } else {
          console.log(`Email failed: ${result.error}`);
        }
      });

    res.status(201).json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      message: 'Employee created successfully. Welcome email sent.',
      token: generateToken(employee.id)
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login employee
// @route   POST /api/auth/login
const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('=================================');
    console.log('🔍 LOGIN ATTEMPT');
    console.log('📧 Email:', email);
    console.log('🔑 Password provided:', password ? 'Yes' : 'No');
    console.log('=================================');

    // Find employee
    const employee = await Employee.findOne({ where: { email } });
    if (!employee) {
      console.log('❌ Employee not found with email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ Employee found:', employee.email);
    console.log('👤 Role:', employee.role);
    console.log('🔐 Stored password hash:', employee.password ? employee.password.substring(0, 20) + '...' : 'NO PASSWORD');
    console.log('🔐 Stored password length:', employee.password ? employee.password.length : 0);

    // Check if password exists
    if (!employee.password) {
      console.log('❌ No password stored for user');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password using bcrypt directly first
    const bcrypt = require('bcryptjs');
    console.log('🧪 Testing bcrypt.compare directly...');
    
    let directCompare = false;
    try {
      directCompare = await bcrypt.compare(password, employee.password);
      console.log('📊 Direct bcrypt.compare result:', directCompare);
    } catch (bcryptError) {
      console.log('❌ bcrypt.compare error:', bcryptError.message);
    }

    // Then try using model method
    console.log('🧪 Testing employee.comparePassword...');
    let modelCompare = false;
    try {
      modelCompare = await employee.comparePassword(password);
      console.log('📊 Model compare result:', modelCompare);
    } catch (modelError) {
      console.log('❌ Model compare error:', modelError.message);
    }

    const isPasswordMatch = directCompare || modelCompare;
    console.log('📊 Final result:', isPasswordMatch ? '✅ MATCH' : '❌ NO MATCH');

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if active
    if (employee.status === 'inactive') {
      console.log('❌ Account is inactive');
      return res.status(401).json({ message: 'Account is inactive' });
    }

    console.log('✅ Login successful for:', employee.email);
    console.log('=================================');

    res.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      token: generateToken(employee.id)
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current employee profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.employee.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ NEW: Update employee (Admin or Self)
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { name, phone, position, department, role, status } = req.body;
    
    // Find employee
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permission: Admin can update anyone, Employees can only update themselves
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: 'Not authorized to update this employee' });
    }

    // Employees cannot change their own role, department, or status
    if (req.employee.role === 'employee') {
      // Only allow updating name and phone for employees
      employee.name = name || employee.name;
      employee.phone = phone || employee.phone;
    } else {
      // Admin can update everything
      employee.name = name || employee.name;
      employee.phone = phone || employee.phone;
      employee.position = position || employee.position;
      employee.department = department || employee.department;
      employee.role = role || employee.role;
      employee.status = status || employee.status;
    }

    await employee.save();

    res.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      role: employee.role,
      status: employee.status,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ NEW: Update password (Admin or Self)
// @route   PUT /api/employees/:id/password
// @desc    Update password (Admin or Self)
// @route   PUT /api/employees/:id/password
const updatePassword = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Password update request for employee ID:', employeeId);
    console.log('📝 New password provided:', newPassword ? 'Yes' : 'No');

    // Find employee
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permission
    if (req.employee.role !== 'admin' && req.employee.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: 'Not authorized to update password' });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check password strength using your model's validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecial) {
      return res.status(400).json({ 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    // If employee changing own password, verify current password
    if (req.employee.id === parseInt(employeeId)) {
      const isPasswordMatch = await employee.comparePassword(currentPassword);
      if (!isPasswordMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Directly set the password and save WITHOUT hooks
    // This bypasses the beforeUpdate hook which would double-hash
    await employee.update({ password: hashedPassword }, { 
      hooks: false,  // Important: disable hooks to prevent double hashing
      individualHooks: false 
    });
    
    // Verify the password was set correctly
    const verifyPassword = await bcrypt.compare(newPassword, employee.password);
    console.log('🔍 Password verification:', verifyPassword ? 'PASSED' : 'FAILED');

    console.log(`✅ Password updated successfully for employee ID: ${employeeId}`);

    res.json({ 
      message: 'Password updated successfully',
      success: true 
    });

  } catch (error) {
    console.error('❌ Error updating password:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = { 
  registerEmployee, 
  loginEmployee, 
  getMe,
  updateEmployee,  // ✅ Added
  updatePassword   // ✅ Added
};