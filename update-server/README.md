# Dubbing Update Gateway (سرور امن توزیع به‌روزرسانی دوبله)

## Overview (نمای کلی)

**English:**
The Dubbing Update Gateway is a secure, standalone proxy and release distribution service. It allows end users of the Dubbing desktop software to check for, verify, and download application updates without needing a GitHub account and without granting public access to the private repository (`https://github.com/azizifarshad/Dubbing.git`).

**فارسی:**
سامانه درگاه به‌روزرسانی نرم‌افزار دوبله، یک وب‌سرویس امن و مستقل برای توزیع نسخه‌های جدید برنامه است. این سرویس به کاربران نرم‌افزار اجازه می‌دهد بدون نیاز به داشتن حساب کاربری گیت‌هاب و بدون اینکه مخزن خصوصی برنامه عمومی شود، آپدیت‌های جدید را استعلام، بررسی امنیتی و دریافت کنند.

---

## Security Architecture (معماری امنیتی)

1. **Zero Client Credentials (عدم نیاز به کلید در کلاینت):**
   GitHub authentication tokens (`GITHUB_TOKEN`) reside strictly on this server and are never exposed to desktop binaries or end users.
2. **Streamed Binary Proxy (پروکسی استریم امن):**
   Application packages (`.exe`) are streamed directly from private GitHub release assets through this gateway to the user.
3. **Optional License Gate (اعتبارسنجی اختیاری لایسنس):**
   Can restrict downloads to machines with active hardware fingerprints via the `X-Hardware-Fingerprint` header (`REQUIRE_LICENSE_AUTH=true`).
4. **Built-in Rate Limiting & Caching (کنترل ترافیک و کش حافظه):**
   Responses are cached in-memory for 3 minutes to avoid hitting GitHub API rate limits.

---

## API Endpoints (نقاط پایانی API)

- `GET /health`: Health and configuration check.
- `GET /api/updates/check?version=X.Y.Z&channel=stable&os=win&arch=x64`: Checks if a newer version is published in the private repository.
- `GET /api/updates/download/:assetId`: Streams the authenticated release package securely.

---

## Quick Deployment (راه‌اندازی و استقرار سریع)

### 1. Local Run
```bash
cd update-server
npm install
cp .env.example .env
# Edit .env and set GITHUB_TOKEN
npm run dev
```

### 2. Docker Run
```bash
docker build -t dubbing-update-gateway .
docker run -p 4000:4000 -e GITHUB_TOKEN="ghp_xxx" dubbing-update-gateway
```

### 3. Deploy to Cloud (Render / Railway / VPS / Fly.io)
Deploy this repository's `update-server` directory as a Node service and configure the environment variable `GITHUB_TOKEN`.
