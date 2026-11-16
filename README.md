# Dubbing Vidans Releases

Official distribution repository for Dubbing Vidans desktop application.

---

## English

### Overview
Dubbing Vidans is a Windows desktop application designed for automated and semi-automated video dubbing to Persian. It handles audio transcription, contextual translation, voice synthesis, timeline synchronization, and final video rendering in a unified workflow.

This repository serves as the official distribution channel for installer packages, update manifests, and release checksums.

### Downloads and Installation
1. Go to the **Releases** tab of this repository.
2. Under the latest release, download `Dubbing-Vidans-Setup.exe`.
3. Run the installer and follow the setup wizard.
4. Launch Dubbing Vidans from the desktop shortcut or Start menu.

### System Requirements
- Operating System: Windows 10 or Windows 11 (64-bit)
- Processor: Intel Core i5 / AMD Ryzen 5 or higher recommended
- Memory (RAM): 8 GB minimum (16 GB recommended)
- Disk Space: 3 GB free space for models, runtimes, and project cache

### Automatic Updates
The application includes a built-in update client. When a new stable version is published to this repository:
- The software checks for updates on startup or when manually requested from the settings menu.
- If an update is available, you will be prompted with the changelog and an option to download and install.
- The installer is downloaded securely to your user temporary directory, verified against SHA-256 and Ed25519 signatures, and applied automatically.
- Your offline license and project settings remain preserved across all updates.

### Integrity Verification
Each release includes two verification files alongside the installer:
- `sha256sums.txt`: Contains the SHA-256 cryptographic hash of `Dubbing-Vidans-Setup.exe`.
- `update-manifest.json`: Contains metadata, release notes, and Ed25519 digital signature.

To manually verify the installer file on Windows PowerShell:
```powershell
Get-FileHash Dubbing-Vidans-Setup.exe -Algorithm SHA256
```
Compare the output hash with the one listed in `sha256sums.txt`.

### Licensing
Dubbing Vidans uses a permanent offline license tied to your machine hardware.
- If you are setting up the software for the first time, open the License section in the application to generate your machine activation request file (`.vidansreq`).
- Send the request file to support to receive your signed license file (`.vidanslic`).
- Future updates will never require re-activation.

---

## فارسی (Persian)

### معرفی نرم‌افزار
دوبله ویدانس یک نرم‌افزار ویندوزی برای دوبله خودکار و نیمه‌خودکار ویدیوها به زبان فارسی است. این برنامه کلیه مراحل استخراج صوت، تبدیل گفتار به متن (پیاده‌سازی متن فیلم)، ترجمه روان مناسب دوبله، تولید صدای گویندگان با هوش مصنوعی و همگام‌سازی تایم‌لاین با ویدیو را در یک محیط یکپارچه انجام می‌دهد.

این مخزن به عنوان مرجع رسمی انتشار فایل‌های نصبی، مانیفست‌های اعتبارسنجی و فایل‌های به‌روزرسانی دوبله ویدانس مورد استفاده قرار می‌گیرد.

### نحوه دانلود و نصب
۱. به بخش **Releases** در همین صفحه بروید.
۲. از جدیدترین نسخه منتشرشده، فایل `Dubbing-Vidans-Setup.exe` را دانلود کنید.
۳. فایل نصب را اجرا کرده و مراحل نصاب را طی کنید.
۴. برنامه را از طریق آیکون دسکتاپ یا منوی استارت اجرا نمایید.

### حداقل سیستم مورد نیاز
- سیستم عامل: ویندوز ۱۰ یا ویندوز ۱۱ (نسخه ۶۴ بیتی)
- پردازنده: Intel Core i5 یا AMD Ryzen 5 به بالا
- حافظه رم: حداقل ۸ گیگابایت (۱۶ گیگابایت توصیه می‌شود)
- فضای دیسک: حداقل ۳ گیگابایت فضای خالی برای مدل‌ها، ران‌تایم و فایل‌های موقت

### سیستم به‌روزرسانی خودکار
برنامه دارای سیستم بررسی و دریافت خودکار نسخه‌های جدید است:
- هنگام باز شدن نرم‌افزار یا با کلیک روی دکمه بررسی آپدیت، نسخه شما با این مخزن مقایسه می‌شود.
- در صورت وجود نسخه جدیدتر، پنجره حاوی توضیحات تغییرات و دکمه دانلود نمایش داده می‌شود.
- فایل آپدیت در پس‌زمینه دانلود شده، با امضای دیجیتال و هش امنیتی اعتبارسنجی می‌شود و با تایید شما نصب خواهد شد.
- لایسنس فعال‌شده و تنظیمات پروژه‌های شما در تمام فرآیندهای به‌روزرسانی کاملاً حفظ می‌شوند و نیازی به فعال‌سازی مجدد نیست.

### بررسی سلامت و اصالت فایل‌ها
کنار فایل نصبی هر نسخه، دو فایل اعتبارسنجی قرار داده می‌شود:
- `sha256sums.txt`: هش رمزنگاری‌شده SHA-256 فایل اجرایی.
- `update-manifest.json`: مشخصات نسخه، امضای دیجیتال Ed25519 و یادداشت‌های انتشار.

برای اعتبارسنجی دستی فایل نصبی در پاورشل ویندوز:
```powershell
Get-FileHash Dubbing-Vidans-Setup.exe -Algorithm SHA256
```
کد خروجی را با مقدار موجود در فایل `sha256sums.txt` مطابقت دهید.

### لایسنس و فعال‌سازی
دوبله ویدانس از لایسنس دائمی آفلاین مبتنی بر سخت‌افزار سیستم استفاده می‌کند:
- در اولین نصب، از بخش لایسنس برنامه فایل درخواست فعال‌سازی (`.vidansreq`) را دریافت کرده و برای پشتیبانی ارسال نمایید.
- فایل لایسنس دریافتی (`.vidanslic`) را در برنامه وارد کنید تا تمام قابلیت‌ها فعال شوند.
- با دریافت آپدیت‌های بعدی، لایسنس فعال می‌ماند و نیازی به ثبت مجدد نخواهد بود.
