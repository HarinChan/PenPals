# Build Instructions

## 1. Build Frontend
Start at root.
`cd penpals-frontend`
`npm i`
`npx tauri build`
installation exe will be at `penpals-frontend\src-tauri\target\release\bundle\nsis\penpals-frontend_0.1.0_x64-setup.exe`


## 2. Build Backend
`cd ../penpals-backend`
`pip install -r requirements.txt`
`cd/src`

do
> a. `pyinstaller --onefile --exclude-module config --collect-all chromadb --name=penpals-backend app.py`

or

> b. `pyinstaller penpals-backend.spec` (prefered)
`cd ../..` back to root

## 3. Build Launcher
`pyinstaller penpals.spec` (builds launcher.py, which is the executable which launches the frontend and the backend)

# 4. Bundle Instruction
Open the `Inno Set Up Compiler` (download [here](https://jrsoftware.org/)), open and run `build.iss`
Intaller will be at `build/penpals_installer.exe`

# Dev Notes
Default Installation Path: `C:\Program Files (x86)\penpals`


##### Remaining issues:
1. Remove windows application registry. (need to specify where tauri is installed first)*[1]
2. ChromaDB does not create folder in working director, in AppData/Local instead*[2]

[1] minor issue, is not urgent to the installation's functionality.
[2] will absolutely affect the installation HOWever, chromadb will be removed from the Penpals application in the final product so this shouldn't be an issue in the future.