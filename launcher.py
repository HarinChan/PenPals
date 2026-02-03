import subprocess
import time
import os

def run_launcher():
    # Define the paths

    app_path = os.path.join(os.getcwd())  # Assuming the current directory is where the app folder is
    backend_exe_path = os.path.join(app_path, 'penpals-backend.exe')
    app_exe_path = os.path.join(app_path, 'app.exe')

    # Start the backend executable
    subprocess.Popen(
        backend_exe_path,
        # stdout=log_file,       # Redirect standard output to the log file
        # stderr=log_file,       # Redirect standard error to the log file
        creationflags=subprocess.CREATE_NO_WINDOW  # Suppress command window on Windows
    )

    # Wait for 10 seconds (adjust as needed)
    time.sleep(10)

    # Start the app executable in the background
    subprocess.Popen(
        app_exe_path,
        # stdout=log_file,       # Redirect standard output to the log file
        # stderr=log_file,       # Redirect standard error to the log file
        creationflags=subprocess.CREATE_NO_WINDOW  # Suppress command window on Windows
    )




run_launcher()