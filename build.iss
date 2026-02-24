#define AppName "Penpals"
#define AppVersion "0.1"
#define FrontendInstaller "penpals-frontend\src-tauri\target\release\bundle\msi\penpals-frontend_0.1.0_x64_en-US.msi"
#define BackendExe "penpals-backend\src\dist\penpals-backend.exe"
#define LauncherExe "dist/penpals.exe"
#define ReadMe "README.md"
#define License "license.md"

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
SetupIconFile=asset\icon\Penpals.ico

[Files]
Source: "{#FrontendInstaller}"; DestDir: "{app}"; 
// Flags: deleteafterinstall
Source: "{#BackendExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#LauncherExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ReadMe}"; DestDir: "{app}"; Flags: isreadme
Source: "{#License}"; DestDir: "{app}"
[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\penpals.exe"; Tasks: create_shortcut
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\penpals.exe"; Tasks: create_shortcut

[Tasks]
Name: "create_shortcut"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons"

[UninstallDelete]
Type: files; Name: "{app}\Wrapper.bat"
Type: files; Name: "{app}\app.exe"
Type: files; Name: "{app}\penpals.exe"
Type: filesandordirs; Name: "{app}\penpals_db"
Type: filesandordirs; Name: "{app}\chroma_db"
Type: filesandordirs; Name: "{localappdata}\{#AppName}\penpals_db"
Type: filesandordirs; Name: "{localappdata}\{#AppName}\chroma_db"


[InstallDelete]
Type: filesandordirs; Name: "{app}"

[Run]
; Run the frontend installer in silent mode
Filename: "msiexec"; Parameters: "/i ""{app}\penpals-frontend_0.1.0_x64_en-US.msi"" INSTALLDIR=""{app}"" DESKTOPSHORTCUT=0 /quiet"; Flags: waituntilterminated

[UninstallRun]
; Run the frontend uninstaller
Filename: "cmd"; Parameters: "/C ""{app}\Uninstall penpals-frontend.lnk"""; Flags: runhidden

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  StartMenuDir: string;
  LastSeparatorPos: Integer;
  Path: TArrayOfString;
  BackendStartMenuPath: string;
begin 
  if CurStep = ssDone then // right before the installer terminates
  begin
    // ExpandConstant('{group}') -> C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Penpals
    Path := StringSplit(ExpandConstant('{group}'), ['\'], stExcludeEmpty); // just gotta remove'penpals-frontend', 16 characters exlcuding '/'
    SetLength(Path, Length(Path)-1);  
    StartMenuDir := StringJoin('\',Path);
    
    BackendStartMenuPath := StringJoin('', [StartMenuDir, '\penpals-frontend\penpals-frontend.lnk']);
    
    // delete shortcuts created by tauri
    DeleteFile(BackendStartMenuPath)
    DeleteFile(ExpandConstant('{userdesktop}\penpals-frontend.lnk'))
    
    Log(BackendStartMenuPath);
    Log(ExpandConstant('{userdesktop}\penpals-frontend.lnk'));
         
  end;  
end;
