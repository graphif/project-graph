; Inno Setup 6 installer for Project Graph.
; Build the Godot export first, then run this script from packaging/windows.

#define AppName "Project Graph"
#define AppVersion "1.0.0"
#define AppPublisher "Project Graph"
#define AppExeName "Project Graph.exe"
#define ExportDir "..\\..\\builds\\windows"

[Setup]
AppId={{B1E4F1D2-1A4E-4E44-9D9A-1A5F2FBD5B1D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Project Graph
DefaultGroupName={#AppName}
OutputDir=..\..\builds\installer
OutputBaseFilename=ProjectGraph-Setup-{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
; Add an .ico here when branding artwork is ready.
; SetupIconFile=assets\project-graph.ico

[Files]
Source: "{#ExportDir}\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ExportDir}\Project Graph.pck"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "assets\preview.png"; DestDir: "{app}\assets"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加快捷方式："

[Registry]
; Register .prg as Project Graph documents for double-click opening.
Root: HKCU; Subkey: "Software\Classes\.prg"; ValueType: string; ValueName: ""; ValueData: "ProjectGraph.Document"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\ProjectGraph.Document"; ValueType: string; ValueName: ""; ValueData: "Project Graph 文档"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\ProjectGraph.Document\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExeName},0"
Root: HKCU; Subkey: "Software\Classes\ProjectGraph.Document\shell\open\command"; ValueType: string; ValueName: ""; ValueData: "\"{app}\{#AppExeName}\" \"%1\""

[Run]
Filename: "{app}\{#AppExeName}"; Description: "启动 {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\assets"
