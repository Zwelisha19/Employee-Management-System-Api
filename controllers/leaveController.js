const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const { sendLeaveStatusEmail , sendLeaveRequestEmail} = require('../services/emailService');
const { Op } = require('sequelize');

// @desc    Request leave (Employee)
// @route   POST /api/leave/request
const requestLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employeeId = req.employee.id;

    // Validation 1: Check if all required fields are present
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['leaveType', 'startDate', 'endDate', 'reason']
      });
    }

    // Validation 2: Validate leave type against allowed values
    const allowedLeaveTypes = ['annual', 'sick', 'family', 'maternity', 'paternity', 'unpaid'];
    if (!allowedLeaveTypes.includes(leaveType)) {
      return res.status(400).json({ 
        message: 'Invalid leave type',
        allowedTypes: allowedLeaveTypes
      });
    }

    // Validation 3: Check if dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Validation 4: Start date cannot be in the past
    if (start < today) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }

    // Validation 5: End date must be after start date
    if (start > end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validation 6: Maximum leave duration check (optional - 30 days max)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays > 30) {
      return res.status(400).json({ message: 'Leave request cannot exceed 30 days' });
    }

    // Validation 7: Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      where: {
        employeeId,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json({ 
        message: 'You already have a pending or approved leave request for these dates' 
      });
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'pending',
      documentUrl: null,
      documentName: null
    });

    // Get employee details for response
    const employee = await Employee.findByPk(employeeId, {
      attributes: ['name', 'email', 'department']
    });

    // Notify admin via email
    try {
      const admin = await Employee.findOne({ where: { role: 'admin' } });
      if (admin) {
        await sendLeaveRequestEmail(
          admin.email,
          employee.name,
          {
            leaveType,
            startDate,
            endDate,
            reason: reason || 'Not provided'
          }
        );
        console.log(`✅ Admin notified about leave request from ${employee.name}`);
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: leaveRequest.id,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'pending',
        documentUrl: leaveRequest.documentUrl,
        documentName: leaveRequest.documentName,
        employee: employee
      }
    });

  } catch (error) {
    console.error('❌ Error in requestLeave:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get my leave requests (Employee)
// @route   GET /api/leave/my-requests
const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { status, year, month } = req.query;

    let whereClause = { employeeId };

    if (status) {
      whereClause.status = status;
    }

    // Filter by year/month
    if (year && month) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
      
      whereClause.startDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (year) {
      whereClause.startDate = {
        [Op.startsWith]: year
      };
    }

    const leaveRequests = await LeaveRequest.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    // Calculate summary
    const summary = {
      total: leaveRequests.length,
      pending: leaveRequests.filter(lr => lr.status === 'pending').length,
      approved: leaveRequests.filter(lr => lr.status === 'approved').length,
      rejected: leaveRequests.filter(lr => lr.status === 'rejected').length
    };

    // Calculate total days requested
    const totalDays = leaveRequests.reduce((sum, request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    summary.totalDays = totalDays;

    res.json({ leaveRequests, summary });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all leave requests (Admin)
// @route   GET /api/leave/all
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, department, startDate, endDate } = req.query;

    let whereClause = {};
    let employeeWhereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (department) {
      employeeWhereClause.department = department;
    }

    // Date range filter
    if (startDate && endDate) {
      whereClause.startDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const leaveRequests = await LeaveRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'department', 'position'],
          where: employeeWhereClause
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Summary stats
    const stats = {
      pending: leaveRequests.filter(lr => lr.status === 'pending').length,
      approved: leaveRequests.filter(lr => lr.status === 'approved').length,
      rejected: leaveRequests.filter(lr => lr.status === 'rejected').length,
      total: leaveRequests.length
    };

    // Calculate total days
    const totalDays = leaveRequests.reduce((sum, request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    stats.totalDays = totalDays;

    res.json({ leaveRequests, stats });

  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve/Reject leave request (Admin)
// @route   PUT /api/leave/:id
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    const adminId = req.employee.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leaveRequest = await LeaveRequest.findByPk(id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['name', 'email']
      }]
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: `This request is already ${leaveRequest.status}` });
    }

    // Validation: Check if dates are still valid (for approval)
    if (status === 'approved') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(leaveRequest.startDate);
      
      if (startDate < today) {
        return res.status(400).json({ 
          message: 'Cannot approve past leave requests. The start date has already passed.' 
        });
      }
    }

    // Update status
    leaveRequest.status = status;
    leaveRequest.approvedBy = adminId;
    leaveRequest.approvedAt = new Date();
    if (comments) leaveRequest.comments = comments;
    
    await leaveRequest.save();

    // Send email notification to employee
    try {
      await sendLeaveStatusEmail(
        leaveRequest.employee.email,
        leaveRequest.employee.name,
        {
          leaveType: leaveRequest.leaveType,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          status: leaveRequest.status,
          comments: comments || 'No comments provided'
        }
      );
      console.log(`✅ Email sent to ${leaveRequest.employee.email}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: `Leave request ${status}`,
      leaveRequest: {
        id: leaveRequest.id,
        employee: leaveRequest.employee.name,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        status: leaveRequest.status,
        comments: leaveRequest.comments
      }
    });

  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel leave request (Employee - only if pending)
// @route   DELETE /api/leave/:id
const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.employee.id;

    const leaveRequest = await LeaveRequest.findOne({
      where: { id, employeeId }
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel ${leaveRequest.status} request. Only pending requests can be cancelled.` 
      });
    }

    // Check if start date is too soon (optional - e.g., cannot cancel 24 hours before)
    const today = new Date();
    const startDate = new Date(leaveRequest.startDate);
    const hoursUntilStart = (startDate - today) / (1000 * 60 * 60);
    
    if (hoursUntilStart < 24) {
      return res.status(400).json({ 
        message: 'Cannot cancel leave request less than 24 hours before start date. Please contact admin.' 
      });
    }

    await leaveRequest.destroy();

    // Notify admin about cancellation (optional)
    try {
      const admin = await Employee.findOne({ where: { role: 'admin' } });
      if (admin) {
        // You could add a cancellation email function here
        console.log(`✅ Leave request cancelled by employee: ${leaveRequest.id}`);
      }
    } catch (emailError) {
      console.error('❌ Admin notification failed:', emailError);
    }

    res.json({ message: 'Leave request cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get leave balance (Employee)
// @route   GET /api/leave/balance
const getLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const currentYear = new Date().getFullYear();

    // Get all approved leave requests for current year
    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        employeeId,
        status: 'approved',
        startDate: {
          [Op.startsWith]: currentYear.toString()
        }
      }
    });

    // Calculate total days taken
    const totalDaysTaken = approvedLeaves.reduce((sum, request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Default leave allocations (can be customized per employee)
    const leaveAllocations = {
      annual: 20, // 20 days annual leave
      sick: 10,   // 10 days sick leave
      family: 5,  // 5 days family responsibility
      maternity: 120, // 4 months
      paternity: 10,  // 10 days
      unpaid: 0    // unlimited but tracked
    };

    // Calculate remaining balance by type
    const balance = {};
    for (const type of Object.keys(leaveAllocations)) {
      const taken = approvedLeaves
        .filter(l => l.leaveType === type)
        .reduce((sum, request) => {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      
      balance[type] = {
        allocated: leaveAllocations[type],
        taken,
        remaining: leaveAllocations[type] - taken
      };
    }

    res.json({
      year: currentYear,
      totalDaysTaken,
      balance
    });

  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  requestLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
  cancelLeaveRequest,
  getLeaveBalance
};