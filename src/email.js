import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  transporter.verify((err) => {
    if (err) {
      console.error('SMTP connection failed:', err.message);
    } else {
      console.log('SMTP ready — emails will be sent from', smtpUser);
    }
  });
}

export async function sendOtpEmail({ to, otp, name }) {
  if (!transporter) {
    console.log('========================================');
    console.log(`📧 OTP for ${to} (${name || 'User'}): ${otp}`);
    console.log('========================================');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Stackr" <${smtpUser}>`,
      to,
      subject: 'Your OTP Code - Stackr',
      text: `Hi ${name || 'User'},\n\nYour OTP code is: ${otp}\n\nThis code expires in ${parseInt(process.env.OTP_EXPIRY, 10) || 300} seconds.\n\nIf you did not request this, please ignore this email.`,
      html: `<p>Hi ${name || 'User'},</p>
<p>Your OTP code is:</p>
<h1 style="letter-spacing:5px; font-size:32px; background:#f5f5f5; padding:12px 20px; display:inline-block; border-radius:6px;">${otp}</h1>
<p>This code expires in ${parseInt(process.env.OTP_EXPIRY, 10) || 300} seconds.</p>
<p>If you did not request this, please ignore this email.</p>`,
    });
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    console.log('========================================');
    console.log(`📧 OTP fallback for ${to} (${name || 'User'}): ${otp}`);
    console.log('========================================');
  }
}
