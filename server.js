
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ✅ FIXED: Use sequelize, not initDatabase
const { sequelize, testConnection } = require('./config/database');

const Employee = require('./models/Employee');
const employeeRoutes = require('./routes/employeeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/reports', reportRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Employee Management API is running' });
});

// Start server
const PORT = process.env.PORT || 5000;

// Initialize everything
const startServer = async () => {
  try {
    // ✅ REMOVED: const sequelize = await initDatabase();
    // (sequelize is already available from the import)
    
    // Test connection
    await testConnection();
    
    // Sync database
    await sequelize.sync();
    console.log('✅ Database synced');
    
    // Import User model
    const Employee = require('./models/Employee');
    
    // Check if admin exists
    const adminExists = await Employee.findOne({ 
      where: { email: 'zwelishat@gmail.com' } 
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('P@ssword1', 10);
      
      await Employee.create({
        name: 'Thabang Zwelisha Siwela',
        email: 'zwelishat@gmail.com',
        password: 'P@ssword1',
        phone: '0797760201',
        profileImage: 'default.jpg',
        role: 'admin',
        position: 'System Administrator',
        department: null,
        status: 'active'
      });
      
      console.log('✅ Admin "Thabang Zwelisha Siwela" created in TiDB!');
    } else {
      console.log('✅ Admin already exists in TiDB');
    }
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

// Call the start function
startServer();