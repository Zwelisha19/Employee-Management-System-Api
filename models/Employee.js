const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Personal info
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' },
      len: {
        args: [2, 100],
        msg: 'Name must be between 2 and 100 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' },
      notEmpty: { msg: 'Email is required' }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    validate: {
      is: {
        args: /^[0-9]{10}$/,
        msg: 'Phone number must be exactly 10 digits'
      }
    }
  },
  profilePic: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Login credentials
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: {
        args: [8, 100],
        msg: 'Password must be at least 8 characters long'
      },
      isStrongPassword(value) {
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecial) {
          throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        }
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'employee'),
    defaultValue: 'employee',
    validate: {
      isIn: {
        args: [['admin', 'employee']],
        msg: 'Role must be either admin or employee'
      }
    }
  },
  
  // Job info - Department as ENUM (dropdown options)
  position: {
    type: DataTypes.STRING(100),
    validate: {
      len: {
        args: [0, 100],
        msg: 'Position cannot exceed 100 characters'
      }
    }
  },
  department: {
    type: DataTypes.ENUM(
      'HR',
      'Logistics', 
      'ICT',
      'Admin',
      'Finance',
      'Marketing',
      'Sales',
      'Operations',
      'Customer Service',
      'Management'
    ),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'HR',
          'Logistics',
          'ICT', 
          'Admin',
          'Finance',
          'Marketing',
          'Sales',
          'Operations',
          'Customer Service',
          'Management'
        ]],
        msg: 'Please select a valid department'
      }
    }
  },
  joinDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    validate: {
      isDate: { msg: 'Join date must be a valid date' }
    }
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    validate: {
      isIn: {
        args: [['active', 'inactive']],
        msg: 'Status must be either active or inactive'
      }
    }
  }
}, {
  hooks: {
    beforeCreate: async (employee) => {
      if (employee.password) {
        const salt = await bcrypt.genSalt(10);
        employee.password = await bcrypt.hash(employee.password, salt);
      }
    },
    beforeUpdate: async (employee) => {
      if (employee.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        employee.password = await bcrypt.hash(employee.password, salt);
      }
    }
  }
});

// Instance method to check password
Employee.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Employee;