# run file to build the application.
# WIP
# need to decide build directory(s)

"""
pyinstaller --onefile penpals-backend/src/app.py
"""

"""
cd penpals-frontend
npm i
npx tauri build
"""

"""
cd ..
pyinstaller --onefile --name="PenPals" --icon "asset/image/Penpals.ico" --add-binary "./dist/app.exe;." --add-binary "./penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe;." build_target.py
"""

python_executable = "/dist/app.exe"
tauri_executable = "/penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe"

import subprocess
import os

def run_command(command):
    """Run a shell command and wait for it to complete."""
    try:
        result = subprocess.run(command, shell=True, check=True, text=True)
        print(f"Command '{command}' executed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"An error occurred while executing '{command}': {e}")

def main():
    # build backend
    run_command('pyinstaller --onefile penpals-backend/src/app.py')

    # Change to the penpals-frontend directory and run npm commands
    os.chdir('penpals-frontend')
    run_command('npm i')
    run_command('npx tauri build')

    # Go back up a directory and run PyInstaller commands
    os.chdir('..')  # Go back to the previous directory
    run_command('pyinstaller --onefile --name="PenPals" --icon "asset/image/Penpals.ico" '
                '--add-binary "./dist/app.exe;." '
                '--add-binary "./penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe;." '
                'build_target.py')

if __name__ == "__main__":
    main()
