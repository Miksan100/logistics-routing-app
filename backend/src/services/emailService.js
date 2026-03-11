const nodemailer = require('nodemailer');

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

async function sendWelcomeEmail({ adminEmail, adminFirstName, companyName, loginUrl, pdfBuffer }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[email] SMTP not configured — skipping welcome email');
    return;
  }
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"Fleeterzen" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `Welcome to Fleeterzen — Your ${companyName} Admin Account`,
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
}

module.exports = { sendWelcomeEmail };
