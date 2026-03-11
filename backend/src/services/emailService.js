const nodemailer = require('nodemailer');
const { query } = require('../config/database');

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendWelcomeEmail({ adminEmail, adminFirstName, adminLastName, companyName, loginUrl, pdfBuffer }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[email] SMTP not configured — skipping welcome email');
    return;
  }
  const transporter = createTransport();
  const subject = `Welcome to Fleeterzen — Your ${companyName} Admin Account`;
  const toName = `${adminFirstName || ''} ${adminLastName || ''}`.trim();
  try {
    await transporter.sendMail({
      from: `"Fleeterzen" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#1c3d8b;padding:24px 30px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">Fleeterzen</h1>
            <p style="color:#b3c8f5;margin:4px 0 0;font-size:13px">Fleet Management Platform</p>
          </div>
          <div style="background:#f9fafb;padding:28px 30px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
            <p style="margin:0 0 14px;font-size:15px;color:#111">Hi ${adminFirstName},</p>
            <p style="margin:0 0 14px;font-size:14px;color:#444">
              Your admin account for <strong>${companyName}</strong> on Fleeterzen has been set up and is ready to use.
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#444">
              Your login credentials are in the <strong>password-protected PDF</strong> attached to this email.<br>
              The PDF password is your <strong>ID number or passport number</strong>.
            </p>
            <a href="${loginUrl}" style="display:inline-block;background:#1c3d8b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
              Go to Admin Portal
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">
              If you did not expect this email, please contact your Fleeterzen vendor.<br>
              © Fleeterzen — Confidential
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `fleeterzen-credentials-${companyName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    console.log(`[email] Welcome email sent to ${adminEmail}`);
    await query(
      `INSERT INTO email_logs (to_email, to_name, subject, company_name, email_type, status)
       VALUES ($1, $2, $3, $4, 'welcome', 'sent')`,
      [adminEmail, toName, subject, companyName]
    ).catch(err => console.error('[email-log] Failed to log:', err.message));
  } catch (err) {
    await query(
      `INSERT INTO email_logs (to_email, to_name, subject, company_name, email_type, status, error_message)
       VALUES ($1, $2, $3, $4, 'welcome', 'failed', $5)`,
      [adminEmail, toName, subject, companyName, err.message]
    ).catch(() => {});
    throw err;
  }
}

module.exports = { sendWelcomeEmail };
