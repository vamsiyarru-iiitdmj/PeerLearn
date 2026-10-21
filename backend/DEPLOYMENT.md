# PeerLearn Deployment & Free-Tier Strategy

## 1. Hosting Architecture (Zero-Cost Free Tier)

PeerLearn is engineered to run seamlessly within the **InsForge Free Tier**:

```text
Frontend: Vercel / Netlify / Cloudflare Pages (Free Tier)
Backend API: Render / Fly.io / Railway / InsForge Edge Functions (Free Tier)
Database & BaaS: InsForge Cloud (PostgreSQL, Auth, Storage, Realtime)
```

## 2. InsForge Cloud Infrastructure

- **Project:** `PeerLearn` (`861aa1ce-2838-4192-874c-0f53fe1a9ee4`)
- **API Base:** `https://c35py4a8.us-east.insforge.app`
- **Database:** PostgreSQL on AWS US-East with connection pooling enabled.
- **Migrations:** Applied via `npx @insforge/cli db migrations up --all`.

## 3. Scheduled Jobs (Cron)

Instead of maintaining a continuous high-cost server polling loop:
1. **Expired Doubts Cleanup:** Runs hourly (`0 * * * *`) invoking `close_expired_doubts()`.
2. **Weekly Ratings Release & Score Recompute:** Runs every Sunday at midnight (`0 0 * * 0`) invoking `/api/v1/ratings/recompute-weekly`.

## 4. Environment Variables Checklist

Ensure these variables are provided in production:

```env
NODE_ENV=production
PORT=3001
INSFORGE_URL=https://c35py4a8.us-east.insforge.app
INSFORGE_ANON_KEY=anon_c3225d1d37792ea21d479def5e79d7d9328e721e1a97a3c4007655e8393a8b53
INSFORGE_API_KEY=ik_fa11d50c13a48c14fcd786fd165ea331
FRONTEND_URL=https://peerlearn.vercel.app
INSTITUTE_EMAIL_DOMAIN=iiitdmj.ac.in
APP_TIMEZONE=UTC
MAX_FILE_SIZE_MB=10
DOUBT_DEFAULT_EXPIRY_HOURS=24
DOUBT_MAX_EXPIRY_HOURS=168
```

## 5. Verification Commands

```bash
# Verify NestJS build
npm run build

# Run comprehensive test suite
npm run test

# Health check probe
curl http://localhost:3001/api/v1/health
```
