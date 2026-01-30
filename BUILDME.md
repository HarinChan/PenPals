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

# Bundle Instruction
Open the `Inno Set Up Compiler` (download [here](https://jrsoftware.org/)), open and run `build.iss`
Intaller will be at `build/penpals_installer.exe`

# Dev Notes
Default Installation Path: `C:\Program Files (x86)\penpals`