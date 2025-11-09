import nodemailer from 'nodemailer';
import { CONFIG } from './config';

// Email configuration from CONFIG
const EMAIL_CONFIG = CONFIG.EMAIL;

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASSWORD || !EMAIL_CONFIG.FROM_EMAIL) {
    console.warn('Email configuration incomplete. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.HOST,
    port: EMAIL_CONFIG.PORT,
    secure: EMAIL_CONFIG.SECURE,
    auth: {
      user: EMAIL_CONFIG.USER,
      pass: EMAIL_CONFIG.PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates for development
    },
  });
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.error('Email transporter not configured. Skipping email send.');
    return false;
  }

  try {
    const mailOptions = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Generate a random verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send company email verification code
export async function sendCompanyVerificationEmail(
  email: string, 
  verificationCode: string,
  companyName?: string
): Promise<boolean> {
  const subject = companyName 
    ? `Verify your ${companyName} email address` 
    : 'Verify your company email address';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 0; 
            background-color: #f9fafb;
          }
          .container {
            background: white;
            margin: 20px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f97316, #ea580c); 
            color: white; 
            text-align: center; 
            padding: 32px 24px; 
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content { 
            padding: 32px 24px; 
            background: white;
          }
          .verification-code { 
            background: #fef3c7; 
            color: #92400e; 
            padding: 20px; 
            text-align: center; 
            font-size: 32px; 
            font-weight: 700; 
            margin: 24px 0; 
            border-radius: 8px; 
            letter-spacing: 4px; 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            border: 2px solid #f59e0b;
          }
          .footer { 
            text-align: center; 
            margin-top: 32px; 
            color: #6b7280; 
            font-size: 14px; 
            padding: 24px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
          .note { 
            background: #f0f9ff; 
            border: 1px solid #bae6fd; 
            color: #0c4a6e; 
            padding: 16px; 
            border-radius: 8px; 
            margin: 24px 0; 
            font-size: 14px;
          }
          .company-name {
            color: #f97316;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
            <p>${companyName ? `Verify your ${companyName} email` : 'Verify your company email'}</p>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            
            <p>We received a request to verify your email address <strong>${email}</strong> on Anonn.</p>
            
            <p>Here's your verification code:</p>
            
            <div class="verification-code">
              ${verificationCode}
            </div>
            
            <div class="note">
              <strong>Note:</strong> This code expires in 10 minutes. If you didn't request this verification, you can safely ignore this email.
            </div>
            
            <p>After verification, your posts will show your company affiliation, helping build credibility in our community.</p>
            
            <p>Questions? Just reply to this email.</p>
            
            <p>Thanks,<br>The Anonn Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Anonn. If you didn't request this verification, please ignore it.</p>
            <p>&copy; 2024 Anonn</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Email Verification

Hi there,

We received a request to verify your email address ${email} on Anonn.

Your verification code is: ${verificationCode}

This code expires in 10 minutes.

After verification, your posts will show your company affiliation, helping build credibility in our community.

If you didn't request this verification, you can safely ignore this email.

Questions? Just reply to this email.

Thanks,
The Anonn Team
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}

// Extract domain from email address
export function extractDomain(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    throw new Error('Invalid email address');
  }
  return domain;
}

// Check if email domain is a valid company domain (not personal email providers)
export function isCompanyDomain(domain: string): boolean {
  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'protonmail.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
    'tutanota.com',
    'fastmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'tempmail.org',
    'mailinator.com',
  ];
  
  // For testing: allow all Gmail domains (regular gmail.com and subdomains)
  if (domain.toLowerCase() === 'gmail.com' || domain.toLowerCase().endsWith('.gmail.com')) {
    return true;
  }
  
  return !personalDomains.includes(domain.toLowerCase());
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
