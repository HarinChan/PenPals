import subprocess
import time

python_executable = "/dist/app.exe"
tauri_executable = "/penpals-frontend/src-tauri/target/release/bundle/nsis/penpals-frontend_0.1.0_x64-setup.exe"

# Start the Python application
python_process = subprocess.Popen([python_executable])
# Wait for a few seconds to ensure the Python app is running
time.sleep(1)
# Start the Tauri application
subprocess.run([tauri_executable])