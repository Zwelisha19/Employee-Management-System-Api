const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const Employee = require('./models/Employee');
const employeeRoutes = require('./routes/employeeRoutes');


const uploadRoutes = require('./routes/uploadRoutes');

const attendanceRoutes = require('./routes/attendanceRoutes');

const leaveRoutes = require('./routes/leaveRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employees', employeeRoutes);

// Add with other app.use
app.use('/api/upload', uploadRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/leave', leaveRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Employee Management API is running' });
});



// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  await testConnection();
  
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');
    
    
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  }
});