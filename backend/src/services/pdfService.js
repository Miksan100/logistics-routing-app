const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { encryptPdf } = require('./pdfEncrypt');

async function generateWelcomePdf({ companyName, adminFirstName, adminLastName, adminEmail, adminPassword, loginUrl, idNumber }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]);
  const { width, height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.11, 0.24, 0.55);
  const dark = rgb(0.13, 0.13, 0.13);
  const mid  = rgb(0.4,  0.4,  0.4);

  // Header bar
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: blue });
  page.drawText('Fleeterzen', { x: 30, y: height - 44, font: bold, size: 26, color: rgb(1, 1, 1) });
  page.drawText('Fleet Management Platform', { x: 30, y: height - 62, font: regular, size: 10, color: rgb(0.75, 0.85, 1) });

  // Welcome
  page.drawText(`Welcome, ${adminFirstName} ${adminLastName}!`, { x: 30, y: height - 105, font: bold, size: 16, color: dark });
  page.drawText(`Your admin account for ${companyName} has been created.`, { x: 30, y: height - 125, font: regular, size: 11, color: mid });
  page.drawText('Use the credentials below to sign in to the Admin Portal.', { x: 30, y: height - 142, font: regular, size: 11, color: mid });

  // Credentials box
  page.drawRectangle({ x: 30, y: height - 270, width: width - 60, height: 110, color: rgb(0.96, 0.97, 1), borderColor: rgb(0.8, 0.85, 0.95), borderWidth: 1 });
  const labelX = 50;
  const valX   = 170;

  page.drawText('Login URL',  { x: labelX, y: height - 195, font: bold,    size: 10, color: mid });
  page.drawText(loginUrl,     { x: valX,   y: height - 195, font: regular, size: 10, color: blue });
  page.drawText('Email',      { x: labelX, y: height - 218, font: bold,    size: 10, color: mid });
  page.drawText(adminEmail,   { x: valX,   y: height - 218, font: regular, size: 10, color: dark });
  page.drawText('Password',   { x: labelX, y: height - 241, font: bold,    size: 10, color: mid });
  page.drawText(adminPassword,{ x: valX,   y: height - 241, font: regular, size: 10, color: dark });
  page.drawText('Portal',     { x: labelX, y: height - 264, font: bold,    size: 10, color: mid });
  page.drawText('Admin Portal',{ x: valX,  y: height - 264, font: regular, size: 10, color: dark });

  // Security note
  page.drawText('This PDF is password-protected with your ID / passport number.', { x: 30, y: height - 305, font: regular, size: 9, color: rgb(0.6, 0.6, 0.6) });
  page.drawText('Keep it confidential. Do not share this document.', { x: 30, y: height - 318, font: regular, size: 9, color: rgb(0.6, 0.6, 0.6) });

  // Footer
  page.drawLine({ start: { x: 30, y: 40 }, end: { x: width - 30, y: 40 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('© Fleeterzen  •  Confidential', { x: 30, y: 25, font: regular, size: 8, color: rgb(0.7, 0.7, 0.7) });
  page.drawText(`Generated for ${adminEmail}`, { x: width - 200, y: 25, font: regular, size: 8, color: rgb(0.7, 0.7, 0.7) });

  // Save without object streams so the encryptor can parse it
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

  // Apply PDF Standard Security Handler (40-bit RC4, pure JS)
  return encryptPdf(Buffer.from(pdfBytes), idNumber, idNumber + '_owner');
}

module.exports = { generateWelcomePdf };
