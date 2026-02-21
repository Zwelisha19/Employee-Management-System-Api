const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// @desc    Get today's attendance summary
// @route   GET /api/reports/today
const getTodayReport = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get total employees (active)
    const totalEmployees = await Employee.count({
      where: { status: 'active' }
    });

    // Get today's attendance
    const todayAttendance = await Attendance.findAll({
      where: { date: today },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'department']
      }]
    });

    // Calculate stats
    const checkedIn = todayAttendance.length;
    const late = todayAttendance.filter(a => a.status === 'late').length;
    const present = todayAttendance.filter(a => a.status === 'present').length;
    const absent = totalEmployees - checkedIn;

    // Get employees on leave today
    const onLeave = await LeaveRequest.count({
      where: {
        status: 'approved',
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      }
    });

    res.json({
      date: today,
      summary: {
        totalEmployees,
        checkedIn,
        present,
        late,
        absent,
        onLeave
      },
      details: todayAttendance.map(a => ({
        name: a.employee.name,
        department: a.employee.department,
        checkIn: a.checkIn,
        status: a.status
      }))
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get monthly attendance report
// @route   GET /api/reports/monthly
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const selectedMonth = month || new Date().getMonth() + 1;
    const selectedYear = year || new Date().getFullYear();
    
    // Get first and last day of month
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

    // Get all active employees
    const employees = await Employee.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'department']
    });

    // Get attendance for the month
    const attendance = await Attendance.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Calculate stats per employee
    const employeeStats = employees.map(emp => {
      const empAttendance = attendance.filter(a => a.employeeId === emp.id);
      const present = empAttendance.filter(a => a.status === 'present').length;
      const late = empAttendance.filter(a => a.status === 'late').length;
      const absent = lastDay - (present + late);
      
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        present,
        late,
        absent,
        attendanceRate: ((present + late) / lastDay * 100).toFixed(1) + '%'
      };
    });

    // Department summary
    const departments = {};
    employeeStats.forEach(emp => {
      if (!departments[emp.department]) {
        departments[emp.department] = {
          total: 0,
          present: 0,
          late: 0,
          absent: 0
        };
      }
      departments[emp.department].total++;
      departments[emp.department].present += emp.present;
      departments[emp.department].late += emp.late;
      departments[emp.department].absent += emp.absent;
    });

    res.json({
      month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
      workingDays: lastDay,
      summary: {
        totalEmployees: employees.length,
        totalPresent: attendance.filter(a => a.status === 'present').length,
        totalLate: attendance.filter(a => a.status === 'late').length,
        averageAttendance: (attendance.length / (employees.length * lastDay) * 100).toFixed(1) + '%'
      },
      byEmployee: employeeStats,
      byDepartment: departments
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get leave summary report
// @route   GET /api/reports/leaves
const getLeaveReport = async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = {};
    
    if (status) whereClause.status = status;

    // Get all leave requests with employee details
    const leaves = await LeaveRequest.findAll({
      where: whereClause,
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'department']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Summary by type
    const byType = {
      annual: leaves.filter(l => l.leaveType === 'annual').length,
      sick: leaves.filter(l => l.leaveType === 'sick').length,
      family: leaves.filter(l => l.leaveType === 'family').length,
      maternity: leaves.filter(l => l.leaveType === 'maternity').length,
      paternity: leaves.filter(l => l.leaveType === 'paternity').length,
      unpaid: leaves.filter(l => l.leaveType === 'unpaid').length
    };

    // Summary by status
    const byStatus = {
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length
    };

    // Total days requested
    const totalDays = leaves.reduce((sum, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    res.json({
      summary: {
        totalRequests: leaves.length,
        totalDays,
        byType,
        byStatus
      },
      details: leaves.map(l => ({
        id: l.id,
        employee: l.employee.name,
        department: l.employee.department,
        type: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        reason: l.reason,
        documentUrl: l.documentUrl
      }))
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get department overview
// @route   GET /api/reports/departments
const getDepartmentReport = async (req, res) => {
  try {
    // Get all employees grouped by department
    const employees = await Employee.findAll({
      where: { status: 'active' },
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('department')), 'count']
      ],
      group: ['department']
    });

    // Get today's attendance by department
    const today = new Date().toISOString().split('T')[0];
    
    const departmentDetails = await Promise.all(
      employees.map(async (dept) => {
        const department = dept.department;
        
        // Employees in this department
        const deptEmployees = await Employee.findAll({
          where: { department, status: 'active' }
        });

        // Today's attendance for this department
        const todayAttendance = await Attendance.findAll({
          where: {
            date: today,
            employeeId: deptEmployees.map(e => e.id)
          }
        });

        return {
          department,
          totalEmployees: deptEmployees.length,
          checkedIn: todayAttendance.length,
          present: todayAttendance.filter(a => a.status === 'present').length,
          late: todayAttendance.filter(a => a.status === 'late').length,
          employees: deptEmployees.map(e => ({
            id: e.id,
            name: e.name,
            position: e.position,
            status: todayAttendance.find(a => a.employeeId === e.id)?.status || 'absent'
          }))
        };
      })
    );

    res.json({
      date: today,
      departments: departmentDetails,
      summary: {
        totalDepartments: departmentDetails.length,
        totalEmployees: departmentDetails.reduce((sum, d) => sum + d.totalEmployees, 0)
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTodayReport,
  getMonthlyReport,
  getLeaveReport,
  getDepartmentReport
};