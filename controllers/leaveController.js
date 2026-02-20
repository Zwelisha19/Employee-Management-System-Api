const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const { sendLeaveStatusEmail , sendLeaveRequestEmail} = require('../services/emailService');
const { Op } = require('sequelize');

// @desc    Request leave (Employee)
// @route   POST /api/leave/request
// @desc    Request leave (Employee)
// @route   POST /api/leave/request
const requestLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employeeId = req.employee.id;

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check for overlapping leave requests
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
      return res.status(400).json({ message: 'You already have a leave request for these dates' });
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'pending'
    });

    // Get employee details for response
    const employee = await Employee.findByPk(employeeId, {
      attributes: ['name', 'email', 'department']
    });

    // ✅ ADD THIS CODE - Notify admin via email
    const admin = await Employee.findOne({ where: { role: 'admin' } });
    
    if (admin) {
      // You need to import sendLeaveRequestEmail at the top
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

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: leaveRequest.id,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'pending',
        employee: employee
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get my leave requests (Employee)
// @route   GET /api/leave/my-requests
const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { status, year } = req.query;

    let whereClause = { employeeId };

    if (status) {
      whereClause.status = status;
    }

    if (year) {
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

    res.json({ leaveRequests, summary });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all leave requests (Admin)
// @route   GET /api/leave/all
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, department } = req.query;

    let whereClause = {};
    let employeeWhereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (department) {
      employeeWhereClause.department = department;
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

    res.json({ leaveRequests, stats });

  } catch (error) {
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

    // Update status
    leaveRequest.status = status;
    leaveRequest.approvedBy = adminId;
    leaveRequest.approvedAt = new Date();
    if (comments) leaveRequest.comments = comments;
    
    await leaveRequest.save();

    // ✅ SEND EMAIL NOTIFICATION TO EMPLOYEE
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
      return res.status(400).json({ message: `Cannot cancel ${leaveRequest.status} request` });
    }

    await leaveRequest.destroy();

    res.json({ message: 'Leave request cancelled successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  requestLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
  cancelLeaveRequest
};