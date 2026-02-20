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

// Send leave status notification email
const sendLeaveStatusEmail = async (employeeEmail, employeeName, leaveDetails) => {
  try {
    const transporter = createTransporter();
    
    const statusColor = leaveDetails.status === 'approved' ? '#10b981' : '#ef4444';
    const statusEmoji = leaveDetails.status === 'approved' ? '✅' : '❌';
    
    const mailOptions = {
      from: `"Employee Management System" <${process.env.EMAIL_USER}>`,
      to: employeeEmail,
      subject: `Leave Request ${leaveDetails.status.toUpperCase()} - ${leaveDetails.leaveType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Leave Request Update</h2>
          
          <p>Dear <strong>${employeeName}</strong>,</p>
          
          <p>Your leave request has been <strong style="color: ${statusColor};">${leaveDetails.status}</strong> ${statusEmoji}</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Leave Type:</strong> ${leaveDetails.leaveType}</p>
            <p><strong>Start Date:</strong> ${leaveDetails.startDate}</p>
            <p><strong>End Date:</strong> ${leaveDetails.endDate}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor};">${leaveDetails.status.toUpperCase()}</span></p>
            <p><strong>Comments:</strong> ${leaveDetails.comments}</p>
          </div>
          
          ${leaveDetails.status === 'approved' 
            ? '<p>Enjoy your time off!</p>' 
            : '<p>If you have questions, please contact your manager.</p>'}
          
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from the Employee Management System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Leave status email sent to ${employeeEmail}`);
    return { success: true, info };
    
  } catch (error) {
    console.error('❌ Error sending leave status email:', error);
    return { success: false, error: error.message };
  }
};

// Also add function for when employee submits leave request (optional)
const sendLeaveRequestEmail = async (adminEmail, employeeName, leaveDetails) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Employee Management System" <${process.env.EMAIL_USER}>`,
      to: adminEmail, // Send to admin
      subject: `New Leave Request from ${employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Leave Request</h2>
          
          <p><strong>${employeeName}</strong> has submitted a new leave request.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Leave Type:</strong> ${leaveDetails.leaveType}</p>
            <p><strong>Start Date:</strong> ${leaveDetails.startDate}</p>
            <p><strong>End Date:</strong> ${leaveDetails.endDate}</p>
            <p><strong>Reason:</strong> ${leaveDetails.reason || 'Not provided'}</p>
          </div>
          
          <p>Please review and respond to this request.</p>
          
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="color: #6b7280; font-size: 14px;">
            Employee Management System
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Leave request notification sent to admin`);
    return { success: true, info };
    
  } catch (error) {
    console.error('❌ Error sending leave request email:', error);
    return { success: false, error: error.message };
  }
};

// Don't forget to export the new functions
module.exports = { 
  sendWelcomeEmail, 
  sendLeaveStatusEmail,
  sendLeaveRequestEmail 
};