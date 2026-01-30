#define AppName "penpals"
#define AppVersion "1.0"
#define AppPublisher "Your Name"
#define AppPublisherURL "http://yourwebsite.com"
#define FrontendInstaller "penpals-frontend\src-tauri\target\release\bundle\msi\penpals-frontend_0.1.0_x64_en-US.msi"
#define BackendExe "penpals-backend\src\dist\penpals-backend.exe"

[Setup]
AppId={{E5D25EA9-1D87-4C56-83C3-5E6B06C4B9DD}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={pf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=./build/.
OutputBaseFilename=penpals_installer
UninstallDisplayIcon={app}\app.exe
Compression=lzma
SolidCompression=yes
SetupIconFile=penpals-frontend\src-tauri\icons\icon.ico

[Files]
Source: "{#FrontendInstaller}"; DestDir: "{app}"; 
// Flags: deleteafterinstall
Source: "{#BackendExe}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\Wrapper.bat"; Tasks: create_shortcut

[Tasks]
Name: "choose_directory"; Description: "Choose Installation Directory"; GroupDescription: "Directory Options"
Name: "create_shortcut"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons"

[UninstallDelete]
Type: files; Name: "{app}\Wrapper.bat"
Type: files; Name: "{app}\app.exe"
Type: filesandordirs; Name: "{app}\penpals_db"
Type: filesandordirs; Name: "{app}\chroma_db"


[Run]
; Run the frontend installer in silent mode
Filename: "msiexec"; Parameters: "/i ""{app}\penpals-frontend_0.1.0_x64_en-US.msi"" INSTALLDIR=""{app}"" DESKTOPSHORTCUT=0 /quiet"; Flags: waituntilterminated

[Code]

procedure CreateWrapper;
var
  Wrapper: string;
  BackendExePath: string;
  AppExePath: string;
  ResultCode: Integer;
begin
  BackendExePath := ExpandConstant('{app}\penpals-backend.exe');
  AppExePath := ExpandConstant('{app}\app.exe');
  Wrapper := ExpandConstant('{app}\Wrapper.bat');

  // Create the batch file to run backend and app
  SaveStringToFile(Wrapper,
    'start "" "' + BackendExePath + '"' + #13#10 +
    'timeout /t 10' + #13#10 + // Wait for 10 seconds (adjust as needed)
    'start /B "" "' + AppExePath + '"', True);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  InstallDir: string;
  ResultCode: Integer;
  Wrapper: String;
begin 
  // install
  if CurStep = ssInstall then
  begin
    CreateWrapper;
  end;
  
  if CurStep = ssDone then
  begin // Execute the wrapper
    Wrapper := ExpandConstant('{app}\Wrapper.bat');
    Exec(Wrapper, '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
  
end;
