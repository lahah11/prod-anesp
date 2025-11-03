const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const secure = String(env.SMTP_SECURE).toLowerCase() === 'true';
  const isDevelopment = env.NODE_ENV === 'development';
  
  // Options communes pour ignorer les certificats SSL en développement
  const tlsOptions = isDevelopment ? {
    rejectUnauthorized: false
  } : {};
  
  if (env.SMTP_SERVICE) {
    transporter = nodemailer.createTransport({
      service: env.SMTP_SERVICE,
      secure,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        : undefined,
      tls: tlsOptions
    });
  } else if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        : undefined,
      tls: tlsOptions
    });
  } else {
    transporter = {
      async sendMail(options) {
        console.log('[MAILER] Simulated email:', {
          to: options.to,
          subject: options.subject,
          hasAttachments: options.attachments && options.attachments.length > 0
        });
        return { accepted: [options.to] };
      }
    };
  }
  return transporter;
}

async function sendEmail({ to, subject, html, attachments }) {
  const mailer = getTransporter();
  const mailOptions = {
    from: env.EMAIL_FROM,
    to,
    subject,
    html
  };
  
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }
  
  try {
    return await mailer.sendMail(mailOptions);
  } catch (error) {
    const responseCode = error && error.responseCode;
    if (responseCode === 535) {
      console.error(
        '[MAILER] SMTP authentication failed (535). Vérifiez le mot de passe ou créez un mot de passe d’application Outlook pour',
        env.SMTP_USER
      );
    } else {
      console.error('[MAILER] Failed to send email:', error.message || error);
    }
    throw error;
  }
}

module.exports = { sendEmail };
