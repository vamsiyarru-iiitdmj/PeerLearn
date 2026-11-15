# PeerLearn Email Provider Configuration Guide

This guide provides exhaustive, production-tested instructions for configuring transactional email delivery in **PeerLearn**. It covers **Gmail**, **Resend**, **SendGrid**, **Brevo**, **Amazon SES**, and the **IIITDMJ Institutional SMTP relay**, along with the **InsForge CLI** configuration workflow.

---

## 1. Problem Root-Cause Analysis

During the system audit, registration and password-reset verification emails failed to arrive due to three interrelated issues:

1. **InsForge Platform Free-Plan Boundary (HTTP 403)**:
   Calling the InsForge Custom Email SES API (`POST /api/email/send-raw` or `client.emails.send()`) on an InsForge Free Plan returns:
   ```json
   { "message": "Custom email service is not available for free plan. Please upgrade to use this feature.", "status": 403 }
   ```
2. **Disabled SMTP in `insforge.toml`**:
   The backend project configuration file (`insforge.toml`) had SMTP disabled and empty credentials:
   ```toml
   [auth.smtp]
   enabled = false
   host = ""
   port = 465
   username = ""
   sender_email = ""
   ```
3. **Missing Dispatch Call in API Routes**:
   In `app/api/v1/[...path]/route.ts`, OTP verification codes were generated and stored in `pending_registrations`, but no email dispatch function was ever triggered.

### The Remediation: Multi-Transport Email Delivery Service (`lib/email.ts`)
To eliminate single points of failure, PeerLearn implements an **enterprise multi-transport cascade**:

```
                  +----------------------------------+
                  | API Call: dispatchEmail(options) |
                  +----------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+------------------+     +--------------------+    +-------------------+
| 1. Direct REST   |     | 2. Standard SMTP   |    | 3. InsForge BaaS  |
| Resend / SendGrid|     | Nodemailer (Gmail, |    | Custom Email API  |
| Direct HTTPS     |     | SES, Brevo, IIITDM)|    | (Paid Plan SES)   |
+------------------+     +--------------------+    +-------------------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   | (If no credentials configured)
                                   v
             +---------------------------------------------+
             | Is NODE_ENV !== "production"?               |
             +---------------------------------------------+
                     /                             \
                    / YES                           \ NO
                   v                                 v
    +------------------------------+     +----------------------------+
    | 4. Development Outbox        |     | 5. Production Fail-Safe    |
    | Writes to .email_outbox.json |     | Returns actionable error   |
    | Emits console event receipt  |     | without crashing server    |
    +------------------------------+     +----------------------------+
```

---

## 2. Environment Variables Quick Reference

All settings can be placed in `.env.local` for local execution or supplied as environment variables in production (Vercel, Docker, ECS).

| Variable | Required In Prod? | Description | Example |
| :--- | :--- | :--- | :--- |
| `SMTP_HOST` | Yes (for SMTP) | Outgoing mail server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Yes (for SMTP) | Port (usually 587 for STARTTLS, 465 for SSL) | `587` |
| `SMTP_SECURE` | Optional | Force SSL/TLS (`true` for port 465, `false` for 587) | `false` |
| `SMTP_USER` | Yes (for SMTP) | SMTP username or API account identifier | `noreply.peerlearn@gmail.com` |
| `SMTP_PASS` | Yes (for SMTP) | SMTP password or App Password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Yes | Display name and sender email | `PeerLearn <noreply@iiitdmj.ac.in>` |
| `RESEND_API_KEY` | Optional | Direct Resend HTTPS API Key | `re_1234567890abcdef` |
| `SENDGRID_API_KEY` | Optional | Direct SendGrid HTTP v3 API Key | `SG.xxxxxxxxxxxxxxxxxxxx` |
| `INSFORGE_EMAIL_ENABLED` | Optional | Enables InsForge BaaS Custom SES | `false` (default on free plan) |
| `ENABLE_DEV_EMAIL_OUTBOX`| Optional | Force write to `.email_outbox.json` | `true` |

---

## 3. Provider Configuration Guides

---

### Provider 1: Gmail SMTP (Fastest for Development & Testing)

Google allows sending transactional emails through Gmail using a secure **Google App Password**.

#### Step 1: Generate an App Password
1. Sign in to your Google Account (or departmental Google account).
2. Go to **Google Account Settings** &rarr; **Security**.
3. Under "How you sign in to Google", ensure **2-Step Verification** is turned **ON**.
4. Search for or navigate to **App passwords** (`https://myaccount.google.com/apppasswords`).
5. In the "App name" field, enter `PeerLearn Portal` and click **Create**.
6. Google will display a **16-character password** (e.g. `abcd efgh ijkl mnop`). Copy it immediately.

#### Step 2: Configure `.env.local`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_department_email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=PeerLearn <your_department_email@gmail.com>
```

#### Step 3: Configure via InsForge CLI (`insforge.toml`)
Update `insforge.toml`:
```toml
[auth.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
username = "your_department_email@gmail.com"
sender_email = "your_department_email@gmail.com"
sender_name = "PeerLearn"
min_interval_seconds = 60
```
Deploy configuration to InsForge BaaS:
```bash
npx @insforge/cli config apply
```

---

### Provider 2: Resend (Recommended for Serverless & Next.js)

Resend provides low-latency REST API delivery and high deliverability.

#### Method A: Direct HTTPS API (Recommended — Zero SMTP Handshake Overhead)
1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys** &rarr; **Create API Key** (Permission: "Full Access").
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_1234567890abcdef
   # Before adding custom domain, use onboarding address:
   SMTP_FROM=PeerLearn <onboarding@resend.dev>
   # After verifying iiitdmj.ac.in in Resend:
   # SMTP_FROM=PeerLearn <noreply@iiitdmj.ac.in>
   ```

#### Method B: Resend SMTP Relay
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_1234567890abcdef
SMTP_FROM=PeerLearn <onboarding@resend.dev>
```

---

### Provider 3: Twilio SendGrid (High-Throughput Enterprise)

#### Method A: Direct HTTP v3 REST API
1. Sign up at [sendgrid.com](https://sendgrid.com).
2. Navigate to **Settings** &rarr; **API Keys** &rarr; **Create API Key**.
3. Select "Restricted Access" &rarr; Grant "Mail Send" full access.
4. Add to `.env.local`:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SMTP_FROM=PeerLearn <noreply@iiitdmj.ac.in>
   ```

#### Method B: SendGrid SMTP Relay
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=PeerLearn <noreply@iiitdmj.ac.in>
```

#### Step 3: InsForge CLI Configuration
```toml
[auth.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
username = "apikey"
sender_email = "noreply@iiitdmj.ac.in"
sender_name = "PeerLearn"
min_interval_seconds = 60
```
Deploy:
```bash
npx @insforge/cli config apply
```

---

### Provider 4: Brevo / Sendinblue (Free 300 Emails/Day)

Brevo provides a generous free tier (300 emails/day) without requiring a credit card.

1. Sign up at [brevo.com](https://www.brevo.com).
2. In the top right menu, click your account name &rarr; **SMTP & API**.
3. Under the **SMTP** tab, locate:
   - SMTP Server: `smtp-relay.brevo.com`
   - Port: `587`
   - Login: Your Brevo login email
   - Generate a new Master SMTP Key for the password.
4. Add to `.env.local`:
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_brevo_login@example.com
   SMTP_PASS=xsmtpsib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SMTP_FROM=PeerLearn <your_verified_sender@example.com>
   ```

---

### Provider 5: Amazon SES (Production Institutional AWS Tenant)

Amazon SES is the cost-effective industry standard for institutional email delivery.

#### Step 1: Create SMTP Credentials in AWS SES
1. Open the **Amazon SES Console** in your target region (e.g. `us-east-1` or `ap-south-1`).
2. Go to **SMTP Settings** &rarr; Click **Create SMTP Credentials**.
3. Enter an IAM user name (e.g., `peerlearn-ses-smtp-user`).
4. Copy the generated **SMTP Username** (`AKIA...`) and **SMTP Password** (`BPk...`).
5. Ensure the sender domain (`iiitdmj.ac.in`) or sender email (`noreply@iiitdmj.ac.in`) is verified in **Identities**.

#### Step 2: Configure `.env.local`
```env
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=BPkXYZ1234567890abcdefghijklmnopqrstuvwxyz
SMTP_FROM=PeerLearn <noreply@iiitdmj.ac.in>
```

#### Step 3: InsForge CLI Configuration
```toml
[auth.smtp]
enabled = true
host = "email-smtp.ap-south-1.amazonaws.com"
port = 587
username = "AKIAIOSFODNN7EXAMPLE"
sender_email = "noreply@iiitdmj.ac.in"
sender_name = "PeerLearn"
min_interval_seconds = 60
```
Deploy:
```bash
npx @insforge/cli config apply
```

---

### Provider 6: IIITDMJ Institutional SMTP Relay (`smtp.iiitdmj.ac.in`)

For deployment on campus intranet or official IIITDMJ servers:

1. Obtain official system account credentials from the IIITDMJ Computer Center (CC).
2. Verify network routing to `smtp.iiitdmj.ac.in` over port `587` or `465`.
3. Add to `.env.local`:
   ```env
   SMTP_HOST=smtp.iiitdmj.ac.in
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=peerlearn@iiitdmj.ac.in
   SMTP_PASS=YourInstitutionalSecretPassword
   SMTP_FROM=PeerLearn <noreply@iiitdmj.ac.in>
   SMTP_IGNORE_TLS=false
   ```

---

## 4. Local Development & Automated Test Outbox

When developing locally or running automated regression tests, no external network connection or live SMTP provider is required.

### How the Simulated Outbox Works
1. In development (`NODE_ENV=development` or `NODE_ENV=test`), when live SMTP credentials are not present, `lib/email.ts` routes all dispatches to `.email_outbox.json`.
2. A structured delivery event is logged to the server console:
   ```text
   [EMAIL DEV OUTBOX] ✉️  Delivered email to <21bd1a1234@iiitdmj.ac.in> | Subject: "[PeerLearn] Your Verification Code: 492018" | OTP: 492018 | ID: dev-msg-1731671234-a1b2c3
   ```
3. The complete formatted HTML, plaintext fallback, OTP, student metadata, and timestamp are saved to `.email_outbox.json` (retaining the 100 most recent dispatches).
4. Automated tests can inspect captured OTPs directly using the exported helper:
   ```typescript
   import { getLatestDevEmail, clearEmailOutbox } from "@/lib/email";

   // Clean outbox before test
   clearEmailOutbox();

   // Trigger registration endpoint
   // ...

   // Retrieve latest captured email
   const email = getLatestDevEmail("21bd1a1234@iiitdmj.ac.in");
   console.log("Captured OTP:", email?.otp);
   ```

---

## 5. Troubleshooting & Diagnostics

### Common Error Codes and Solutions

| Error Message / Code | Probable Cause | Actionable Fix |
| :--- | :--- | :--- |
| `EAUTH: Invalid login` | Incorrect username/password or regular password used instead of App Password | For Gmail: Use a 16-character **App Password**, not your main account password. For SendGrid: Verify username is literally the string `apikey`. |
| `ETIMEDOUT` / Connection timeout | Outbound port 587 or 465 blocked by firewall/ISP | Switch `SMTP_PORT` between `587` (STARTTLS) and `465` (SSL). Alternatively, use the **Resend** or **SendGrid HTTP API** which uses standard port 443 (HTTPS). |
| `Custom email service is not available for free plan` | Calling InsForge platform SES on Free Plan | Do not rely on InsForge Platform SES. Use our `lib/email.ts` multi-transport service by setting `SMTP_HOST` or `RESEND_API_KEY` in `.env.local`. |
| `self-signed certificate in certificate chain` | Self-signed or intranet SSL certificate on custom campus relay | Set `SMTP_IGNORE_TLS=true` in `.env.local` to allow self-signed certificates in staging environments. |
| `Invalid recipient email address` | Empty or malformed recipient string passed | Ensure the registration request contains a valid, well-formed student email (e.g. `roll@iiitdmj.ac.in`). |

---

## 6. Verifying Email Delivery Health

To verify your configured email provider from the terminal, run the built-in diagnostic test:

```bash
node --input-type=module -e "
import { verifySmtpConfig, sendRegistrationOtpEmail } from './lib/email.ts';
console.log('Provider Status:', verifySmtpConfig());
const receipt = await sendRegistrationOtpEmail({
  email: 'test@iiitdmj.ac.in',
  otp: '123456',
  fullName: 'Test Student',
  rollNumber: '21BD1A1234'
});
console.log('Dispatch Receipt:', receipt);
"
```
You will receive an immediate receipt confirming the active provider (`smtp`, `resend_api`, `sendgrid_api`, or `dev-outbox`) and delivery status.
