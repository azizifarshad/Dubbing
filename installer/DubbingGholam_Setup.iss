; ==============================================================================
; Inno Setup Script: Dubbing Gholam (دوبله غلام)
; Fully Offline Windows Desktop Application with Permanent Hardware-Bound Licensing
; ==============================================================================

#define MyAppName "دوبله غلام - Dubbing Gholam"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "Dubbing Gholam Studio"
#define MyAppExeName "Start-DubbingGholam.bat"
#define MyAppURL "https://github.com/azizifarshad/Dubbing-Gholam"

[Setup]
AppId={{5E973349-BDC5-44CA-835A-83B8122DE13B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\DubbingGholam
DefaultGroupName=دوبله غلام
DisableProgramGroupPage=yes
LicenseFile=
OutputDir=..\dist-installer
OutputBaseFilename=DubbingGholam_Offline_Setup_v2.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Dirs]
; Machine-wide shared licensing directory across all Windows accounts
Name: "{commonappdata}\DubbingGholam"; Permissions: users-modify
Name: "{commonappdata}\DubbingGholam\models"; Permissions: users-modify

[Files]
; Compiled Web Application Frontend Assets
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Offline Speech Recognition Models (Faster-Whisper base model, ~145MB)
Source: "..\models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs

; Application Server and Offline Python Engines
Source: "..\server.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\local_whisper.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\mux_video.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\vite.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs

; Desktop Startup Batch File & Documentation
Source: "..\Start-DubbingGholam.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Install-DubbingGholam.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\DOCS\CUSTOMER_GUIDE.md"; DestDir: "{app}\DOCS"; Flags: ignoreversion

; CRITICAL SECURITY REQUIREMENT:
; The software owner's private key and License Generator tool are strictly EXCLUDED:
; - tools\license-generator\* MUST NEVER be distributed to customers
; - *.dblic, *.dbreq MUST NEVER be packaged

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\راهنمای فعال‌سازی آفلاین"; Filename: "{app}\DOCS\CUSTOMER_GUIDE.md"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent
