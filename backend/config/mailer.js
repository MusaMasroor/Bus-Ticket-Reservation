import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on server start.
 * Logs success or warning — does NOT crash the server if email is misconfigured.
 */
export const verifyMailer = async () => {
  // Skip verification if SMTP credentials are placeholders
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('your_email')) {
    console.warn('⚠️  SMTP credentials not configured. Email notifications disabled.');
    return;
  }

  try {
    await transporter.verify();
    console.log(`✅ SMTP connected: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  } catch (err) {
    console.warn(`⚠️  SMTP verification failed: ${err.message}`);
    console.warn('   Email notifications may not work. Check SMTP credentials in .env');
  }
};

/**
 * Send an email.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('your_email')) {
    console.log(`[Email skipped - SMTP not configured] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Email send failed to ${to}: ${err.message}`);
    // Don't throw — email failure should not break booking flow
  }
};

export default transporter;
