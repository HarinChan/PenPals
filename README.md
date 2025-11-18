# PenPals

A Windows WinUI 3 application built with C# and .NET 8.

## Project Structure

```
PenPals/
├── PenPals.sln              # Solution file
├── README.md                # This file
├── src/
│   └── PenPals/            # Main application project
│       ├── PenPals.csproj  # Project file
│       ├── Program.cs      # Application entry point
│       ├── App.xaml        # Application definition
│       ├── App.xaml.cs     # Application code-behind
│       ├── MainWindow.xaml # Main window UI
│       ├── MainWindow.xaml.cs # Main window code-behind
│       ├── app.manifest    # Windows application manifest
│       └── Assets/         # Application assets (icons, images)
├── bin/                    # Build output (generated)
└── obj/                    # Build intermediates (generated)
```

## Prerequisites

- Windows 10 version 1809 (build 17763) or later
- .NET 8 SDK
- Windows App SDK
- Visual Studio 2022 with "Windows application development" workload

## Building and Running

### Command Line
```bash
# Restore dependencies
dotnet restore

# Build the project
dotnet build

# Run the application
dotnet run --project src/PenPals
```

### Visual Studio
1. Open `PenPals.sln`
2. Set `PenPals` as startup project
3. Press F5 to build and run

## Architecture

This is a standard WinUI 3 application using:
- **Microsoft.WindowsAppSDK** for Windows-specific features
- **WinUI 3** for modern Windows UI components
- **.NET 8** runtime with Windows-specific targeting