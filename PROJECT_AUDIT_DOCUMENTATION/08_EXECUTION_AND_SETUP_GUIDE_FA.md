# بخش ۸: راهنمای عملیاتی اجرا، بیلد و راه‌اندازی (Dubbing Vidans)

## ۱. پیش‌نیازهای سیستمی
- **ویندوز ۱۰ یا ۱۱ نسخه ۶۴ بیتی (x64)**.
- **Node.js نگارش ۱۸ یا ۲۲ LTS**.
- **پایتون نسخه ۳.۱۱ یا ۳.۱۲ (۶۴ بیتی)**.
- **ابزار FFmpeg و FFprobe در متغیر PATH** یا استقرار در پوشه `runtime\ffmpeg`.

---

## ۲. مراحل راه‌اندازی و اجرای پروژه

### گام اول: نصب وابستگی‌های جاوااسکریپت
```bash
npm ci
```

### گام دوم: ساخت محیط مجازی پایتون و نصب کتابخانه‌ها
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install faster-whisper cryptography soundfile numpy
```

### گام سوم: تنظیم فایل محیطی
یک کپی از فایل نمونه بسازید:
```powershell
cp .env.example .env
```
در صورت تمایل به استفاده از هوش مصنوعی هرمز یا گوگل جمنای، کلیدهای مربوطه را در فایل `.env` وارد کنید (در غیر این صورت برنامه در حالت ۱۰۰٪ آفلاین عمل می‌کند).

---

## ۳. روش‌های اجرای استودیو

### روش اول: حالت توسعه‌دهنده (Development با لایو ریلود)
```bash
npm run dev
```
سپس آدرس `http://localhost:3000` را در مرورگر باز کنید.

### روش دوم: اجرای برنامه دسکتاپ بومی ویندوز
روی فایل `DubbingVidans.exe` در ریشه پروژه دابل‌کلیک کنید یا در پاورشل اجرا نمایید:
```powershell
.\DubbingVidans.exe
```
این لانچر سرور را به صورت پس‌زمینه اجرا کرده و پنجره اختصاصی وب‌اپلیکیشن را در مرورگر Edge یا Chrome باز می‌کند.

### روش سوم: اجرای اسکریپت دسته‌ای ویندوز
روی فایل `Start-DubbingVidans.bat` دابل‌کلیک کنید.

---

## ۴. اجرای آزمون‌های خودکار (تست‌ها)

- **اجرای تست‌های سریع CI (شامل ۸ سوئیت تست بدون نیاز به کلید ابری)**:
  ```bash
  npm run test:ci
  ```
- **اجرای تست‌های یکپارچگی (شامل رندر واقعی FFmpeg و تست آفلاین)**:
  ```bash
  npm run test:integration
  ```
- **اجرای تمام تست‌ها**:
  ```bash
  npm test
  ```

---

## ۵. بیلد پروژه و ساخت نصاب ویندوز

### مرحله ۱: کامپایل فرانت‌اند و باندل سرور
```bash
npm run build
```
این دستور کدهای وب را در `dist/` و سرور بک‌اند را در `server.cjs` تولید می‌کند.

### مرحله ۲: کامپایل لانچر سی‌شارپ
```powershell
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /win32icon:assets\Vidans.ico /out:DubbingVidans.exe launcher.cs
```

### مرحله ۳: کامپایل فایل نصاب Inno Setup
```powershell
$iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
& $iscc "/DMyAppVersion=1.0.1" "installer\DubbingVidans_Setup.iss"
```
نصاب خروجی با حجم تقریبی ۳۴۸ مگابایت در مسیر `dist-installer\Dubbing-Vidans-Setup.exe` ایجاد می‌گردد.

### مرحله ۴: امضای دیجیتال بسته نصاب
```powershell
python tools\update-signer\sign_release.py "dist-installer\Dubbing-Vidans-Setup.exe" "1.0.1" "stable" "dist-installer"
```
این دستور فایل‌های `update-manifest.json` و `sha256sums.txt` را ایجاد می‌نماید.

---

## ۶. فرآیند صدور لایسنس دائمی برای مشتریان

1. مشتری در نرم‌افزار روی دکمه **فعال‌سازی لایسنس** کلیک کرده و گزینه **دریافت فایل درخواست (.vidansreq)** را می‌زند.
2. مالک نرم‌افزار ابزار لایسنس را باز می‌کند:
   ```powershell
   python tools\license-generator\license_generator_gui.py
   # یا اجرای مستقیم فایل:
   .\tools\license-generator\dist\LicenseGenerator.exe
   ```
3. فایل `.vidansreq` مشتری را لود کرده، نام مشتری را می‌نویسد و دکمه **تولید و ذخیره لایسنس (.vidanslic)** را کلیک می‌کند.
4. فایل لایسنس تولید شده برای مشتری ارسال می‌شود و او با یک کلیک در تب وارد کردن لایسنس، استودیو را برای همیشه فعال می‌کند.
