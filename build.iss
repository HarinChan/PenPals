#define AppName "penpals"
#define AppVersion "1.0"
#define AppPublisher "Your Name"
#define AppPublisherURL "http://yourwebsite.com"
#define FrontendInstaller "penpals-frontend\src-tauri\target\release\bundle\nsis\penpals-frontend_0.1.0_x64-setup.exe"
#define BackendExe "penpals-backend\src\dist\app.exe"

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
Source: "{#FrontendInstaller}"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "{#BackendExe}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\app.exe"; Tasks: create_shortcut

[Tasks]
Name: "choose_directory"; Description: "Choose Installation Directory"; GroupDescription: "Directory Options"
Name: "create_shortcut"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons"

[Run]
; Run the frontend installer in silent mode
Filename: "msiexec"; Parameters: "/i ""{tmp}\{#FrontendInstaller}"" INSTALLDIR=""{app}"" /quiet"; Flags: waituntilterminated
; Create a small wrapper executable to run the backend and then the app
Filename: "{app}\CreateWrapper.bat"; Parameters: ""; Flags: runhidden

[Code]
procedure CreateWrapper;
var
  Wrapper: string;
  BackendExePath: string;
  AppExePath: string;
  ResultCode: Integer;
begin
  BackendExePath := ExpandConstant('{app}\backend.exe');
  AppExePath := ExpandConstant('{app}\app.exe');
  Wrapper := ExpandConstant('{tmp}\RunBackendAndApp.bat');

  // Create the batch file to run backend and app
  SaveStringToFile(Wrapper,
    'start "" "' + BackendExePath + '"' + #13#10 +
    'timeout /t 10' + #13#10 + // Wait for 10 seconds (adjust as needed)
    'start "" "' + AppExePath + '"', True);

  // Execute the wrapper
  Exec(Wrapper, '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  InstallDir: string;
begin
  // choose directory
  if CurStep = ssInstall then
  begin
    if MsgBox('Do you want to customize the installation directory?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      // SelectDirectory('Select Installation Directory', '', NewDir)
      // InstallDir := SelectDirectory(ExpandConstant('{pf}\{#AppName}')); // Prompt to select new directory
      // WizardForm.DirectoryEdit.Text := InstallDir; // Set directory to user-selected
    end;
  end;
  
  // post install
  if CurStep = ssPostInstall then
  begin
    CreateWrapper; // Ensure this line exists
  end;
end;
