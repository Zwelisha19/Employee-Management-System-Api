const nodemailer = require('nodemailer');


const createTransporter = () => {

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,     
      pass: process.env.EMAIL_PASS       
    }
  });
  

};

// Send welcome email with credentials
const sendWelcomeEmail = async (employee, temporaryPassword) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Employee Management System" <${process.env.EMAIL_USER}>`,
      to: employee.email,
      subject: 'Welcome to the Company - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to the Company, ${employee.name}!</h2>
          
          <p>Your employee account has been created. Here are your login details:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${employee.email}</p>
            <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          
          <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after first login.</p>
          
          <p>Login here: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Employee Portal</a></p>
          
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${employee.email}: ${info.messageId}`);
    return { success: true, info };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendWelcomeEmail };