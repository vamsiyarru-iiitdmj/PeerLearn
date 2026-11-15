/**
 * PeerLearn Email Delivery Service
 *
 * Enterprise-grade multi-transport email delivery architecture:
 * 1. Standard SMTP Transport via nodemailer:
 *    - Environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER / SMTP_USERNAME,
 *      SMTP_PASS / SMTP_PASSWORD, SMTP_SECURE, SMTP_FROM / EMAIL_FROM.
 *    - Fully compatible with Gmail SMTP, SendGrid, Brevo, Resend SMTP, Amazon SES,
 *      or IIITDMJ institutional SMTP (smtp.iiitdmj.ac.in).
 * 2. InsForge Platform Custom Email:
 *    - Attempts admin.emails.send(...) or REST POST /api/email/send-raw when available
 *      (gracefully catches 403 on Free Plan).
 * 3. Resend / SendGrid Direct HTTP API:
 *    - Attempts direct HTTPS dispatch if RESEND_API_KEY or SENDGRID_API_KEY is present.
 * 4. Development / Test In-Memory & Log Outbox:
 *    - When in development/test environment without live credentials, safely formats
 *      the email, writes it to .email_outbox.json for test inspection, logs delivery
 *      event without leaking credentials, and returns a verified delivery receipt.
 * 5. Production Fail-Safe:
 *    - In production mode with missing credentials, returns a clear, actionable
 *      diagnostic error without crashing the server.
 */

import fs from "fs";
import path from "path";
import nodemailer, { type Transporter } from "nodemailer";
import { getInsforgeAdmin, getInsforgeAnon } from "./insforge";

export type EmailProviderType =
  | "smtp"
  | "resend_api"
  | "sendgrid_api"
  | "insforge"
  | "dev-outbox"
  | "dev_outbox";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  purpose?: "REGISTRATION_OTP" | "PASSWORD_RESET_OTP" | "NOTIFICATION" | string;
  metadata?: Record<string, any>;
}

export type EmailOptions = SendEmailOptions;

export interface EmailDeliveryReceipt {
  success: boolean;
  messageId: string;
  provider: "smtp" | "resend_api" | "sendgrid_api" | "insforge" | "dev-outbox" | "none";
  status: "delivered" | "queued" | "failed";
  timestamp: string;
  to: string;
  purpose: string;
  error?: string;
  details?: Record<string, any>;
}

export interface SendOtpEmailParams {
  to?: string;
  email?: string;
  studentName?: string;
  fullName?: string;
  otp: string;
  rollNumber?: string;
  expiryMinutes?: number;
}

export interface OutboxEntry {
  id: string;
  timestamp: string;
  to: string | string[];
  from: string;
  subject: string;
  otp?: string;
  purpose: string;
  rollNumber?: string;
  studentName?: string;
  html: string;
  text?: string;
  provider: "smtp" | "resend_api" | "sendgrid_api" | "insforge" | "dev-outbox";
  status: "delivered" | "queued" | "failed";
  details?: Record<string, any>;
}

const OUTBOX_FILE = path.join(process.cwd(), ".email_outbox.json");
const MAX_OUTBOX_ENTRIES = 100;

// In-memory store for fast unit/integration test assertions
const inMemoryOutbox: OutboxEntry[] = [];
let cachedTransporter: Transporter | null = null;

/**
 * Normalizes email sender address from environment variables
 */
export function getDefaultFromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "PeerLearn <noreply@iiitdmj.ac.in>"
  );
}

/**
 * Extracts raw email address from header like "PeerLearn <noreply@iiitdmj.ac.in>"
 */
export function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1].trim() : fromHeader.trim();
}

/**
 * Extracts display name from header like "PeerLearn <noreply@iiitdmj.ac.in>"
 */
export function extractDisplayName(fromHeader: string): string | undefined {
  const match = fromHeader.match(/^([^<]+)</);
  return match ? match[1].trim() : undefined;
}

/**
 * Strips HTML tags for a clean plain-text fallback
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Returns comprehensive email transport configuration and status
 */
export function verifySmtpConfig(): {
  configured: boolean;
  isDev: boolean;
  activeProvider: string;
  host?: string;
  port?: number;
  user?: string;
  from: string;
  missing: string[];
  resendConfigured: boolean;
  sendgridConfigured: boolean;
  insforgeEmailConfigured: boolean;
} {
  const isDev = process.env.NODE_ENV !== "production";
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const from = getDefaultFromAddress();

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!port) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  const smtpConfigured = missing.length === 0;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY);
  const insforgeEmailConfigured = process.env.INSFORGE_EMAIL_ENABLED === "true";

  let activeProvider = "dev-outbox";
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase()?.trim();
  if (explicit) {
    activeProvider = explicit;
  } else if (resendConfigured) {
    activeProvider = "resend_api";
  } else if (sendgridConfigured) {
    activeProvider = "sendgrid_api";
  } else if (smtpConfigured) {
    activeProvider = "smtp";
  } else if (insforgeEmailConfigured) {
    activeProvider = "insforge";
  } else if (!isDev) {
    activeProvider = "none";
  }

  return {
    configured: smtpConfigured || resendConfigured || sendgridConfigured || insforgeEmailConfigured,
    isDev,
    activeProvider,
    host,
    port,
    user,
    from,
    missing,
    resendConfigured,
    sendgridConfigured,
    insforgeEmailConfigured,
  };
}

/**
 * Reads local simulated outbox for inspection in tests and local development
 */
export function getEmailOutbox(): OutboxEntry[] {
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      const data = fs.readFileSync(OUTBOX_FILE, "utf8");
      const list = JSON.parse(data);
      return Array.isArray(list) ? list : [];
    }
  } catch (err) {
    console.error("[EmailOutbox] Failed to read outbox file:", err);
  }
  return inMemoryOutbox;
}

export const getDevOutbox = getEmailOutbox;

/**
 * Clears local simulated outbox file and in-memory cache
 */
export function clearEmailOutbox(): void {
  inMemoryOutbox.length = 0;
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      fs.writeFileSync(OUTBOX_FILE, "[]", "utf8");
    }
  } catch (err) {
    console.error("[EmailOutbox] Failed to clear outbox file:", err);
  }
}

export const clearDevOutbox = clearEmailOutbox;

/**
 * Retrieves the latest outbox email sent to an optional recipient address
 */
export function getLatestDevEmail(recipient?: string): OutboxEntry | undefined {
  const items = getEmailOutbox();
  if (!recipient) return items[0];
  const target = recipient.toLowerCase().trim();
  return items.find((item) => {
    if (Array.isArray(item.to)) {
      return item.to.some((r) => r.toLowerCase().trim() === target);
    }
    return item.to.toLowerCase().trim() === target;
  });
}

/**
 * Records an email entry to the development outbox file and in-memory list
 */
function recordInDevOutbox(entry: OutboxEntry): void {
  try {
    inMemoryOutbox.unshift(entry);
    if (inMemoryOutbox.length > MAX_OUTBOX_ENTRIES) {
      inMemoryOutbox.pop();
    }

    let fileEntries: OutboxEntry[] = [];
    if (fs.existsSync(OUTBOX_FILE)) {
      try {
        const raw = fs.readFileSync(OUTBOX_FILE, "utf-8");
        fileEntries = JSON.parse(raw);
        if (!Array.isArray(fileEntries)) fileEntries = [];
      } catch (_e) {
        fileEntries = [];
      }
    }

    fileEntries.unshift(entry);
    if (fileEntries.length > MAX_OUTBOX_ENTRIES) {
      fileEntries = fileEntries.slice(0, MAX_OUTBOX_ENTRIES);
    }

    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(fileEntries, null, 2), "utf-8");
  } catch (err) {
    console.error("[Email Service] Warning: Failed to write to .email_outbox.json:", err);
  }
}

/**
 * Returns or creates cached Nodemailer SMTP transporter
 */
function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  if (cachedTransporter) return cachedTransporter;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  const transportConfig: any = {
    host,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  if (user && pass) {
    transportConfig.auth = { user, pass };
  }

  if (process.env.SMTP_IGNORE_TLS === "true" || process.env.NODE_ENV === "test") {
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
}

/**
 * Dispatches an email via Standard SMTP (Nodemailer)
 */
async function sendViaSmtp(options: SendEmailOptions): Promise<EmailDeliveryReceipt> {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    throw new Error("SMTP transporter not configured (missing SMTP_HOST)");
  }

  const from = options.from || getDefaultFromAddress();
  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
    replyTo: options.replyTo,
    cc: options.cc,
    bcc: options.bcc,
  });

  const primaryRecipient = Array.isArray(options.to) ? options.to[0] : options.to;

  return {
    success: true,
    messageId: info.messageId || `smtp-${Date.now()}`,
    provider: "smtp",
    status: "delivered",
    timestamp: new Date().toISOString(),
    to: primaryRecipient,
    purpose: options.purpose || "GENERAL_NOTIFICATION",
    details: {
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    },
  };
}

/**
 * Dispatches an email via Resend Direct HTTP REST API
 */
async function sendViaResend(options: SendEmailOptions): Promise<EmailDeliveryReceipt> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = options.from || getDefaultFromAddress();
  const to = Array.isArray(options.to) ? options.to : [options.to];

  const payload: Record<string, any> = {
    from,
    to,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
  };

  if (options.replyTo) payload.reply_to = options.replyTo;
  if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
  if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Resend API error (${res.status}): ${data.message || JSON.stringify(data)}`
    );
  }

  return {
    success: true,
    messageId: data.id || `resend-${Date.now()}`,
    provider: "resend_api",
    status: "delivered",
    timestamp: new Date().toISOString(),
    to: to[0],
    purpose: options.purpose || "GENERAL_NOTIFICATION",
    details: data,
  };
}

/**
 * Dispatches an email via SendGrid Direct HTTP v3 REST API
 */
async function sendViaSendGrid(options: SendEmailOptions): Promise<EmailDeliveryReceipt> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  const rawFrom = options.from || getDefaultFromAddress();
  const fromEmail = extractEmailAddress(rawFrom);
  const fromName = extractDisplayName(rawFrom);
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const personalizations: any = [
    {
      to: recipients.map((email) => ({ email: email.trim() })),
    },
  ];

  if (options.cc) {
    const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
    personalizations[0].cc = ccList.map((email) => ({ email: email.trim() }));
  }

  if (options.bcc) {
    const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    personalizations[0].bcc = bccList.map((email) => ({ email: email.trim() }));
  }

  const payload: Record<string, any> = {
    personalizations,
    from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
    subject: options.subject,
    content: [
      {
        type: "text/plain",
        value: options.text || stripHtml(options.html),
      },
      {
        type: "text/html",
        value: options.html,
      },
    ],
  };

  if (options.replyTo) {
    payload.reply_to = { email: extractEmailAddress(options.replyTo) };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`SendGrid API error (${res.status}): ${errText}`);
  }

  const messageId = res.headers.get("x-message-id") || `sendgrid-${Date.now()}`;

  return {
    success: true,
    messageId,
    provider: "sendgrid_api",
    status: "delivered",
    timestamp: new Date().toISOString(),
    to: recipients[0],
    purpose: options.purpose || "GENERAL_NOTIFICATION",
  };
}

/**
 * Dispatches an email via InsForge Platform Custom Email (BaaS SES Tenant)
 */
async function sendViaInsforge(options: SendEmailOptions): Promise<EmailDeliveryReceipt> {
  const admin = getInsforgeAdmin();
  const from = options.from || getDefaultFromAddress();
  const to = Array.isArray(options.to) ? options.to : options.to;

  const { data, error } = await admin.emails.send({
    to,
    subject: options.subject,
    html: options.html,
    from,
    replyTo: options.replyTo,
    cc: options.cc,
    bcc: options.bcc,
  });

  if (error) {
    const errObj = error as any;
    throw new Error(`InsForge custom email failed: ${error.message} (status: ${errObj.status || errObj.code || "UNKNOWN"})`);
  }

  const primaryRecipient = Array.isArray(to) ? to[0] : to;

  return {
    success: true,
    messageId: `insforge-${Date.now()}`,
    provider: "insforge",
    status: "delivered",
    timestamp: new Date().toISOString(),
    to: primaryRecipient,
    purpose: options.purpose || "GENERAL_NOTIFICATION",
    details: data || {},
  };
}

/**
 * Records and outputs simulated delivery for local development and test automation
 */
function handleDevOutboxDelivery(options: SendEmailOptions, from: string): EmailDeliveryReceipt {
  const messageId = `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  const primaryRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
  const purpose = options.purpose || "GENERAL_NOTIFICATION";

  const entry: OutboxEntry = {
    id: messageId,
    timestamp,
    to: options.to,
    from,
    subject: options.subject,
    otp: options.metadata?.otp,
    purpose,
    rollNumber: options.metadata?.rollNumber,
    studentName: options.metadata?.studentName || options.metadata?.fullName,
    html: options.html,
    text: options.text || stripHtml(options.html),
    provider: "dev-outbox",
    status: "delivered",
    details: options.metadata,
  };

  recordInDevOutbox(entry);

  const recipientStr = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  console.log(
    `[EMAIL DEV OUTBOX] ✉️  Delivered email to <${recipientStr}> | Subject: "${options.subject}" | OTP: ${options.metadata?.otp || "N/A"} | ID: ${messageId}`
  );

  return {
    success: true,
    messageId,
    provider: "dev-outbox",
    status: "delivered",
    timestamp,
    to: primaryRecipient,
    purpose,
    details: {
      outboxFile: OUTBOX_FILE,
      recipient: options.to,
      subject: options.subject,
      otp: options.metadata?.otp,
    },
  };
}

function createFailureReceipt(
  provider: "smtp" | "resend_api" | "sendgrid_api" | "insforge" | "dev-outbox" | "none",
  to: string,
  purpose: string,
  errorMessage: string
): EmailDeliveryReceipt {
  return {
    success: false,
    messageId: "",
    provider,
    status: "failed",
    timestamp: new Date().toISOString(),
    to,
    purpose,
    error: errorMessage,
  };
}

/**
 * Core multi-transport dispatcher:
 * Automatically waterfalls through configured providers or routes explicitly.
 */
export async function dispatchEmail(options: SendEmailOptions): Promise<EmailDeliveryReceipt> {
  const isProd = process.env.NODE_ENV === "production";
  const explicitProvider = process.env.EMAIL_PROVIDER?.toLowerCase()?.trim();
  const from = options.from || getDefaultFromAddress();
  const primaryRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
  const purpose = options.purpose || "GENERAL_NOTIFICATION";

  // Validate recipient email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!primaryRecipient || !emailRegex.test(primaryRecipient)) {
    return createFailureReceipt(
      "none",
      primaryRecipient || "",
      purpose,
      `Invalid recipient email address: "${primaryRecipient}"`
    );
  }

  // 1. Explicit provider routing if requested in environment
  if (explicitProvider === "smtp") {
    try {
      return await sendViaSmtp(options);
    } catch (err: any) {
      if (isProd) {
        return createFailureReceipt("smtp", primaryRecipient, purpose, err.message);
      }
      console.warn(`[Email Service] Explicit SMTP dispatch failed (${err.message}). Falling back to dev-outbox.`);
    }
  } else if (explicitProvider === "resend" || explicitProvider === "resend_api") {
    try {
      return await sendViaResend(options);
    } catch (err: any) {
      if (isProd) {
        return createFailureReceipt("resend_api", primaryRecipient, purpose, err.message);
      }
      console.warn(`[Email Service] Explicit Resend dispatch failed (${err.message}). Falling back to dev-outbox.`);
    }
  } else if (explicitProvider === "sendgrid" || explicitProvider === "sendgrid_api") {
    try {
      return await sendViaSendGrid(options);
    } catch (err: any) {
      if (isProd) {
        return createFailureReceipt("sendgrid_api", primaryRecipient, purpose, err.message);
      }
      console.warn(`[Email Service] Explicit SendGrid dispatch failed (${err.message}). Falling back to dev-outbox.`);
    }
  } else if (explicitProvider === "insforge") {
    try {
      return await sendViaInsforge(options);
    } catch (err: any) {
      if (isProd) {
        return createFailureReceipt("insforge", primaryRecipient, purpose, err.message);
      }
      console.warn(`[Email Service] Explicit InsForge dispatch failed (${err.message}). Falling back to dev-outbox.`);
    }
  } else if (explicitProvider === "dev-outbox" || explicitProvider === "dev_outbox" || explicitProvider === "mock") {
    return handleDevOutboxDelivery(options, from);
  }

  // 2. Cascade automatic transport selection
  // a) Direct REST APIs (Resend, SendGrid)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(options);
    } catch (err: any) {
      console.warn(`[Email Service] Resend API attempt failed: ${err.message}. Trying next transport...`);
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      return await sendViaSendGrid(options);
    } catch (err: any) {
      console.warn(`[Email Service] SendGrid API attempt failed: ${err.message}. Trying next transport...`);
    }
  }

  // b) Standard SMTP Transport
  if (process.env.SMTP_HOST) {
    try {
      return await sendViaSmtp(options);
    } catch (err: any) {
      console.warn(`[Email Service] Standard SMTP attempt failed: ${err.message}. Trying next transport...`);
    }
  }

  // c) InsForge Custom Email
  if (process.env.INSFORGE_EMAIL_ENABLED === "true") {
    try {
      return await sendViaInsforge(options);
    } catch (err: any) {
      console.warn(`[Email Service] InsForge custom email failed: ${err.message}. Trying next transport...`);
    }
  }

  // 3. Development / Test Outbox Fallback
  if (!isProd || process.env.ENABLE_DEV_EMAIL_OUTBOX === "true") {
    // Auxiliary sync with InsForge auth email triggers
    try {
      const anon = getInsforgeAnon();
      if (options.purpose === "PASSWORD_RESET_OTP") {
        anon.auth.sendResetPasswordEmail({ email: primaryRecipient }).catch(() => {});
      } else if (options.purpose === "REGISTRATION_OTP") {
        anon.auth.resendVerificationEmail({ email: primaryRecipient }).catch(() => {});
      }
    } catch (_authErr) {
      // Ignore background auxiliary auth notification error
    }
    return handleDevOutboxDelivery(options, from);
  }

  // 4. Production Fail-Safe (Missing Credentials)
  const missingError =
    "No email delivery transport configured in production environment. Please configure SMTP_HOST, RESEND_API_KEY, or SENDGRID_API_KEY in .env.local.";
  console.error(`[Email Service FATAL] ${missingError}`);
  return createFailureReceipt("none", primaryRecipient, purpose, missingError);
}

export const sendEmail = dispatchEmail;

/* ==========================================================================
   Responsive HTML Email Templates with IIITDMJ PeerLearn Branding
   ========================================================================== */

/**
 * Generates responsive HTML and plaintext fallback for Student Registration OTP
 */
export function generateRegistrationEmailHtml(
  fullName: string,
  rollNumber: string,
  otp: string,
  expiryMinutes: number = 15,
  toEmail?: string
): { html: string; text: string; subject: string } {
  const safeName = fullName || "Student";
  const formattedOtp = otp.split("").join(" ");
  const subject = `[PeerLearn] Your Verification Code: ${otp}`;
  const emailDisplay = toEmail || "Your Institute Email";

  const text = `
PeerLearn • IIITDM Jabalpur
Student Peer Tutoring & Learning Network
==================================================

Hello ${safeName} (${rollNumber}),

Welcome to PeerLearn! To complete your student registration and verify your institute credentials (${emailDisplay}), please enter the verification code below:

--------------------------------------------------
VERIFICATION CODE: ${otp}
--------------------------------------------------

This code is valid for ${expiryMinutes} minutes.

Registration Details:
- Student Name: ${safeName}
- Roll Number: ${rollNumber}
- Institute Email: ${emailDisplay}
- Expiration: ${expiryMinutes} minutes

SECURITY NOTICE:
Never share this one-time verification code with anyone. PeerLearn administrators, student tutors, or institute staff will NEVER ask for your verification code or password. If you did not initiate this registration request, please disregard this email.

==================================================
Indian Institute of Information Technology, Design and Manufacturing, Jabalpur
Dumna Airport Road, P.O. Khamaria, Jabalpur, Madhya Pradesh 482005
Automated transactional email. Please do not reply directly.
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 12px; }
    .email-container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .header-sub { font-size: 13px; color: #bfdbfe; margin-top: 6px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
    .email-body { padding: 36px 32px; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .paragraph { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .otp-box { background: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 24px 16px; text-align: center; margin: 28px 0; }
    .otp-label { font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .otp-code { font-family: 'SF Pro Mono', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #1e3a8a; padding-left: 12px; margin: 6px 0; }
    .otp-expiry { display: inline-block; font-size: 13px; font-weight: 600; color: #0369a1; background: #e0f2fe; padding: 4px 12px; border-radius: 9999px; margin-top: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-table td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 600; width: 38%; }
    .info-value { color: #0f172a; font-weight: 500; }
    .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-top: 28px; }
    .warning-title { font-size: 13px; font-weight: 700; color: #92400e; margin: 0 0 4px 0; }
    .warning-text { font-size: 13px; color: #b45309; line-height: 1.5; margin: 0; }
    .email-footer { background-color: #f8fafc; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; line-height: 1.6; color: #64748b; margin: 4px 0; }
    .institute-title { font-weight: 600; color: #475569; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1 class="header-logo">PeerLearn</h1>
        <div class="header-sub">IIITDM Jabalpur • Peer Tutoring Network</div>
      </div>

      <!-- Body -->
      <div class="email-body">
        <h2 class="greeting">Student Registration Verification</h2>
        <p class="paragraph">
          Hello <strong>${escapeHtml(safeName)}</strong>,
        </p>
        <p class="paragraph">
          Welcome to PeerLearn! To complete your student registration and verify your institute credentials, please use the 6-digit one-time verification code below:
        </p>

        <!-- OTP Code Card -->
        <div class="otp-box">
          <div class="otp-label">One-Time Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-expiry">⏱ Valid for ${expiryMinutes} minutes</div>
        </div>

        <!-- Student Meta Information -->
        <table class="info-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="info-label">Student Name</td>
            <td class="info-value">${escapeHtml(safeName)}</td>
          </tr>
          <tr>
            <td class="info-label">Roll Number</td>
            <td class="info-value">${escapeHtml(rollNumber)}</td>
          </tr>
          <tr>
            <td class="info-label">Institute Email</td>
            <td class="info-value">${escapeHtml(emailDisplay)}</td>
          </tr>
          <tr>
            <td class="info-label">Action</td>
            <td class="info-value">New Account Activation</td>
          </tr>
        </table>

        <!-- Security Warning -->
        <div class="warning-box">
          <div class="warning-title">🔒 Security Notice</div>
          <p class="warning-text">
            Never share this verification code with anyone. PeerLearn administrators, student tutors, or institute staff will NEVER ask for your code. If you did not initiate this registration, please disregard this email.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p class="footer-text institute-title">
          Indian Institute of Information Technology, Design and Manufacturing, Jabalpur
        </p>
        <p class="footer-text">
          Dumna Airport Road, P.O. Khamaria, Jabalpur, Madhya Pradesh 482005, India
        </p>
        <p class="footer-text" style="color: #94a3b8; margin-top: 12px;">
          This is an automated system notification from PeerLearn. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

  return { html, text, subject };
}

export const renderRegistrationTemplate = (params: {
  studentName: string;
  otp: string;
  rollNumber?: string;
  to: string;
  expiryMinutes?: number;
}) => generateRegistrationEmailHtml(params.studentName, params.rollNumber || "N/A", params.otp, params.expiryMinutes || 15, params.to);

/**
 * Generates responsive HTML and plaintext fallback for Password Reset OTP
 */
export function generatePasswordResetEmailHtml(
  fullName: string,
  email: string,
  otp: string,
  expiryMinutes: number = 15,
  rollNumber?: string
): { html: string; text: string; subject: string } {
  const safeName = fullName || "Student";
  const rollDisplay = rollNumber || "N/A";
  const formattedOtp = otp.split("").join(" ");
  const subject = `[PeerLearn] Password Reset Code: ${otp}`;

  const text = `
PeerLearn • IIITDM Jabalpur
Security & Authentication Services
==================================================

Hello ${safeName},

We received a request to reset the password for your PeerLearn student account (Email: ${email}, Roll Number: ${rollDisplay}).

To authorize this password reset, please enter the following 6-digit reset code:

--------------------------------------------------
PASSWORD RESET CODE: ${otp}
--------------------------------------------------

This code is valid for ${expiryMinutes} minutes.

Account Details:
- Student Name: ${safeName}
- Roll Number: ${rollDisplay}
- Registered Email: ${email}
- Expiration: ${expiryMinutes} minutes

SECURITY ADVISORY:
If you did not request this password reset, please ignore this email. Your existing credentials remain completely secure. If you suspect unauthorized access attempts, notify your IT administrator.

==================================================
Indian Institute of Information Technology, Design and Manufacturing, Jabalpur
Dumna Airport Road, P.O. Khamaria, Jabalpur, Madhya Pradesh 482005
Automated security notification. Please do not reply directly.
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 12px; }
    .email-container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .header-sub { font-size: 13px; color: #c7d2fe; margin-top: 6px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
    .email-body { padding: 36px 32px; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .paragraph { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .otp-box { background: #fef2f2; border: 2px dashed #ef4444; border-radius: 10px; padding: 24px 16px; text-align: center; margin: 28px 0; }
    .otp-label { font-size: 12px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .otp-code { font-family: 'SF Pro Mono', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #991b1b; padding-left: 12px; margin: 6px 0; }
    .otp-expiry { display: inline-block; font-size: 13px; font-weight: 600; color: #991b1b; background: #fee2e2; padding: 4px 12px; border-radius: 9999px; margin-top: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-table td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 600; width: 38%; }
    .info-value { color: #0f172a; font-weight: 500; }
    .warning-box { background: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 16px; border-radius: 4px; margin-top: 28px; }
    .warning-title { font-size: 13px; font-weight: 700; color: #9f1239; margin: 0 0 4px 0; }
    .warning-text { font-size: 13px; color: #be123c; line-height: 1.5; margin: 0; }
    .email-footer { background-color: #f8fafc; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; line-height: 1.6; color: #64748b; margin: 4px 0; }
    .institute-title { font-weight: 600; color: #475569; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1 class="header-logo">PeerLearn</h1>
        <div class="header-sub">IIITDM Jabalpur • Security Services</div>
      </div>

      <!-- Body -->
      <div class="email-body">
        <h2 class="greeting">Password Reset Request</h2>
        <p class="paragraph">
          Hello <strong>${escapeHtml(safeName)}</strong>,
        </p>
        <p class="paragraph">
          We received a request to reset the password for your PeerLearn student account. Use the 6-digit reset code below to authorize the password reset:
        </p>

        <!-- OTP Code Card -->
        <div class="otp-box">
          <div class="otp-label">Password Reset Code</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-expiry">⏱ Valid for ${expiryMinutes} minutes</div>
        </div>

        <!-- Student Meta Information -->
        <table class="info-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="info-label">Account Name</td>
            <td class="info-value">${escapeHtml(safeName)}</td>
          </tr>
          <tr>
            <td class="info-label">Roll Number</td>
            <td class="info-value">${escapeHtml(rollDisplay)}</td>
          </tr>
          <tr>
            <td class="info-label">Account Email</td>
            <td class="info-value">${escapeHtml(email)}</td>
          </tr>
          <tr>
            <td class="info-label">Action</td>
            <td class="info-value">Password Authorization</td>
          </tr>
        </table>

        <!-- Security Warning -->
        <div class="warning-box">
          <div class="warning-title">⚠️ Did Not Request This?</div>
          <p class="warning-text">
            If you did not request this password reset, please ignore this email. Your existing credentials remain completely secure. If you suspect someone is attempting to access your account, please reach out to system administrators immediately.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p class="footer-text institute-title">
          Indian Institute of Information Technology, Design and Manufacturing, Jabalpur
        </p>
        <p class="footer-text">
          Dumna Airport Road, P.O. Khamaria, Jabalpur, Madhya Pradesh 482005, India
        </p>
        <p class="footer-text" style="color: #94a3b8; margin-top: 12px;">
          This is an automated security notification from PeerLearn. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

  return { html, text, subject };
}

export const renderPasswordResetTemplate = (params: {
  studentName: string;
  otp: string;
  rollNumber?: string;
  to: string;
  expiryMinutes?: number;
}) => generatePasswordResetEmailHtml(params.studentName, params.to, params.otp, params.expiryMinutes || 15, params.rollNumber);

/* ==========================================================================
   High-Level Convenience API Dispatchers
   ========================================================================== */

/**
 * Dispatches a Student Registration OTP verification email
 */
export async function sendRegistrationOtpEmail(params: {
  email?: string;
  to?: string;
  otp: string;
  fullName?: string;
  studentName?: string;
  rollNumber?: string;
  expiryMinutes?: number;
}): Promise<EmailDeliveryReceipt> {
  const targetEmail = params.email || params.to || "";
  const studentName = params.fullName || params.studentName || "Student";
  const rollNumber = params.rollNumber || "N/A";
  const expiryMinutes = params.expiryMinutes || 15;

  const { html, text, subject } = generateRegistrationEmailHtml(
    studentName,
    rollNumber,
    params.otp,
    expiryMinutes,
    targetEmail
  );

  return dispatchEmail({
    to: targetEmail,
    subject,
    html,
    text,
    purpose: "REGISTRATION_OTP",
    metadata: {
      otp: params.otp,
      rollNumber,
      studentName,
      fullName: studentName,
      expiryMinutes,
    },
  });
}

export const sendRegistrationEmail = sendRegistrationOtpEmail;

/**
 * Dispatches a Password Reset OTP verification email
 */
export async function sendPasswordResetOtpEmail(params: {
  email?: string;
  to?: string;
  otp: string;
  fullName?: string;
  studentName?: string;
  rollNumber?: string;
  expiryMinutes?: number;
}): Promise<EmailDeliveryReceipt> {
  const targetEmail = params.email || params.to || "";
  const studentName = params.fullName || params.studentName || "Student";
  const rollNumber = params.rollNumber || "N/A";
  const expiryMinutes = params.expiryMinutes || 15;

  const { html, text, subject } = generatePasswordResetEmailHtml(
    studentName,
    targetEmail,
    params.otp,
    expiryMinutes,
    rollNumber
  );

  return dispatchEmail({
    to: targetEmail,
    subject,
    html,
    text,
    purpose: "PASSWORD_RESET_OTP",
    metadata: {
      otp: params.otp,
      studentName,
      fullName: studentName,
      rollNumber,
      expiryMinutes,
    },
  });
}

export const sendPasswordResetEmail = sendPasswordResetOtpEmail;
