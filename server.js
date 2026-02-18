const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const Employee = require('./models/Employee');
const employeeRoutes = require('./routes/employeeRoutes');

// Add with other requires
const uploadRoutes = require('./routes/uploadRoutes');



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employees', employeeRoutes);

// Add with other app.use
app.use('/api/upload', uploadRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Employee Management API is running' });
});

// Create default admin function
const createDefaultAdmin = async () => {
  try {
    const adminExists = await Employee.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      await Employee.create({
        name: 'Thabang Zwelisha Siwela',
        email: 'zwelishat@gmail.com',
        password: 'P@ssword1',
        role: 'admin',
        position: 'System Administrator',
        department: 'IT',
        phone: '079 776 0201'
      });
      console.log('✅ Default admin created with your credentials');
      console.log('📧 Email: zwelishat@gmail.com');
      console.log('🔑 Password: P@ssword1');
    } else {
      console.log('✅ Admin already exists in database');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  await testConnection();
  
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');
    
    // Create default admin
    await createDefaultAdmin();
    
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  }
});