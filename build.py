# run file to build the application.
# WIP
# need to decide build directory(s)

"""
pyinstaller --onefile penpals-backend/src/app.py
"""

"""
cd ../penpals-frontend
npm i
npx tauri build
"""

"""
cd ..
pyinstaller --onefile build_target.py
pyinstaller --onefile --name="PenPals" --icon --add-binary "./dist/app.exe;." --add-binary "./penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe;." build_target.py
"""

python_executable = "/dist/app.exe"
tauri_executable = "/penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe"

