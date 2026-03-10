const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  
  await apiInstance.sendTransacEmail({
    sender: { name: 'Employee Management System', email: process.env.EMAIL_USER },
    to: [{ email: toEmail, name: toName }],
    subject: subject,
    htmlContent: htmlContent
  });
};

const sendWelcomeEmail = async (employee, temporaryPassword) => {
  try {
    await sendEmail(
      employee.email,
      employee.name,
      'Welcome to the Company - Your Account Details',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, ${employee.name}!</h2>
        <p>Your account has been created. Here are your login details:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Email:</strong> ${employee.email}</p>
          <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        </div>
        <p style="color: #dc2626;"><strong>Please change your password after first login.</strong></p>
        <p>Login here: <a href="${process.env.FRONTEND_URL}/login">Employee Portal</a></p>
      </div>`
    );
    console.log('✅ Welcome email sent to', employee.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    return { success: false, error: error.message };
  }
};

const sendLeaveStatusEmail = async (employeeEmail, employeeName, leaveDetails) => {
  try {
    const statusColor = leaveDetails.status === 'approved' ? '#10b981' : '#ef4444';
    
    await sendEmail(
      employeeEmail,
      employeeName,
      `Leave Request ${leaveDetails.status.toUpperCase()}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Leave Request Update</h2>
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>Your leave has been <strong style="color: ${statusColor};">${leaveDetails.status}</strong></p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Leave Type:</strong> ${leaveDetails.leaveType}</p>
          <p><strong>Start Date:</strong> ${leaveDetails.startDate}</p>
          <p><strong>End Date:</strong> ${leaveDetails.endDate}</p>
          <p><strong>Comments:</strong> ${leaveDetails.comments || 'No comments'}</p>
        </div>
      </div>`
    );
    console.log('✅ Leave status email sent to', employeeEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Leave status email failed:', error);
    return { success: false, error: error.message };
  }
};

const sendLeaveRequestEmail = async (adminEmail, employeeName, leaveDetails) => {
  try {
    await sendEmail(
      adminEmail,
      'Admin',
      `New Leave Request from ${employeeName}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Leave Request</h2>
        <p><strong>${employeeName}</strong> submitted a leave request.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Leave Type:</strong> ${leaveDetails.leaveType}</p>
          <p><strong>Start Date:</strong> ${leaveDetails.startDate}</p>
          <p><strong>End Date:</strong> ${leaveDetails.endDate}</p>
          <p><strong>Reason:</strong> ${leaveDetails.reason || 'Not provided'}</p>
        </div>
      </div>`
    );
    console.log('✅ Leave request email sent to admin');
    return { success: true };
  } catch (error) {
    console.error('❌ Leave request email failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendWelcomeEmail, sendLeaveStatusEmail, sendLeaveRequestEmail };

