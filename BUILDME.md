Start at root.
`cd penpals-frontend`
`npm i`
`npx tauri build`
`PenPals\penpals-frontend\src-tauri\target\release\bundle\msi\penpals-frontend_0.1.0_x64_en-US.msi /passive`

installed exe will be at `C:\Program Files\penpals-frontend\app.exe`

`cd ../penpals-backend`
`pip install -r requirements.txt`
`cd/src`
`pyinstaller --onefile --exclude-module config --collect-all chromadb app.py`
`cd ../..` back to root

Open the `Inno Set Up Compiler` (download [here](https://jrsoftware.org/)), open and run `build.iss`
Intaller will be at `build/penpals_installer.exe`
