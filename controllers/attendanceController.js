const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

// @desc    Check In
// @route   POST /api/attendance/checkin
const checkIn = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      where: {
        employeeId,
        date: today
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        message: 'Already checked in today',
        checkIn: existingAttendance.checkIn
      });
    }

    // Determine status (late if after 9:00 AM)
    const checkInTime = currentTime;
    const status = checkInTime > '09:00:00' ? 'late' : 'present';

    // Create attendance record
    const attendance = await Attendance.create({
      employeeId,
      date: today,
      checkIn: currentTime,
      status
    });

    res.json({
      message: 'Checked in successfully',
      attendance: {
        date: today,
        checkIn: currentTime,
        status
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Check Out
// @route   POST /api/attendance/checkout
const checkOut = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Find today's attendance
    const attendance = await Attendance.findOne({
      where: {
        employeeId,
        date: today
      }
    });

    if (!attendance) {
      return res.status(400).json({ message: 'You need to check in first' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ 
        message: 'Already checked out today',
        checkOut: attendance.checkOut
      });
    }

    // Update check out time
    attendance.checkOut = currentTime;
    await attendance.save();

    res.json({
      message: 'Checked out successfully',
      attendance: {
        date: today,
        checkIn: attendance.checkIn,
        checkOut: currentTime
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get My Attendance (Employee view)
// @route   GET /api/attendance/my-attendance
const getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { month, year } = req.query;

    let whereClause = { employeeId };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    // Calculate summary
    const summary = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length
    };

    res.json({ attendance, summary });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get All Attendance (Admin view)
// @route   GET /api/attendance
const getAllAttendance = async (req, res) => {
  try {
    const { date, department } = req.query;
    let whereClause = {};

    // Filter by date
    if (date) {
      whereClause.date = date;
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'email', 'department', 'position'],
        where: department ? { department } : {}
      }],
      order: [['date', 'DESC']]
    });

    res.json(attendance);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Today's Attendance (Admin view)
// @route   GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findAll({
      where: { date: today },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'department', 'position']
      }]
    });

    const totalEmployees = await Employee.count();
    const checkedIn = attendance.length;

    res.json({
      date: today,
      summary: {
        totalEmployees,
        checkedIn,
        notCheckedIn: totalEmployees - checkedIn,
        late: attendance.filter(a => a.status === 'late').length
      },
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getTodayAttendance
};