; Inno Setup Script: Dubbing Vidans

#define MyAppName "Dubbing Vidans"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "Vidans Studio"
#define MyAppExeName "DubbingVidans.exe"
#define MyAppURL "https://github.com/azizifarshad/Dubbing"

[Setup]
AppId={{5E973349-BDC5-44CA-835A-83B8122DE13B}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Dubbing Vidans
DefaultGroupName={#MyAppName}
DisableWelcomePage=no
LicenseFile=license.txt
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
AlwaysShowDirOnReadyPage=yes
AlwaysShowGroupOnReadyPage=yes
SetupIconFile=..\public\Vidans.ico
UninstallDisplayIcon={app}\DubbingVidans.exe
WizardImageFile=wizard_banner.bmp
WizardSmallImageFile=wizard_small.bmp
OutputDir=..\dist-installer
OutputBaseFilename=Dubbing-Vidans-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Dirs]
; Shared licensing directories
Name: "{commonappdata}\DubbingVidans"
Name: "{commonappdata}\DubbingVidans\models"

[Files]
; Main launcher
Source: "..\DubbingVidans.exe"; DestDir: "{app}"; Flags: ignoreversion

; Frontend build
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Media and brand assets
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; Offline Whisper model
Source: "..\models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs

; Runtimes
Source: "..\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend and scripts
Source: "..\server.cjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\server.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\launcher.cs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\local_whisper.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\mux_video.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\vite.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launch scripts and docs
Source: "..\Start-DubbingVidans.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Install-DubbingVidans.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DOCS\CUSTOMER_GUIDE.md"; DestDir: "{app}\DOCS"; Flags: ignoreversion
Source: "..\DOCS\LICENSING_ARCHITECTURE.md"; DestDir: "{app}\DOCS"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\DubbingVidans.exe"; WorkingDir: "{app}"
Name: "{group}\راهنمای فعال‌سازی آفلاین Vidans"; Filename: "{app}\DOCS\CUSTOMER_GUIDE.md"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\DubbingVidans.exe"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\DubbingVidans.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
