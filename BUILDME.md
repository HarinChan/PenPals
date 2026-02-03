# Build Instructions

## Build Frontend
Start at root.
`cd penpals-frontend`
`npm i`
`npx tauri build`
installation exe will be at `penpals-frontend\src-tauri\target\release\bundle\nsis\penpals-frontend_0.1.0_x64-setup.exe`


## Build Backend
`cd ../penpals-backend`
`pip install -r requirements.txt`
`cd/src`

do
> `pyinstaller --onefile --exclude-module config --collect-all chromadb --name=penpals-backend app.py`
or
> `pyinstaller penpals-backend.spec` (prefered)
`cd ../..` back to root

## Build Launcher
`pyinstaller penpals.spec` (builds launcher.py, which launches the frontend and the backend)

# Bundle Instruction
Open the `Inno Set Up Compiler` (download [here](https://jrsoftware.org/)), open and run `build.iss`
Intaller will be at `build/penpals_installer.exe`

# Dev Notes
Default Installation Path: `C:\Program Files (x86)\penpals`
relative file write paths that shouldve been in local low or appdata:
-  `penpals-backend\src\main.py` -> line 37 `db_uri = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///penpals_db/penpals.db')`
-  `penpals-backend\src\main.py` -> line 67 `db_uri = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///penpals_db/penpals.db')`

Remove shortcuts produced by tauri frontend:
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\penpals-frontend\penpals-frontend.exe` NEED ADMIN
- `C:\Users\Public\Desktop\penpals-frontend.lnk`