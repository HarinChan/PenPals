# Frontend Notes

  ## Figma Conversion

  How to turn figma-export into electron vite project: (outdated, as we using tauri now)
  - https://poe.com/s/qf77IosIZIAZfqx9eKoI
  - https://poe.com/s/ZPTF7P5ov7KswFbrVOA4
  
  How to turn figma-export into tauri project:
  1. Download Rust if you haven't already.
  2. Run `npm install -D @tauri-apps/cli`
  3. Run `npx tauri init`



  `package.json` notes
  ```json
  "main": "main.js",
      "description": "sample descriptoin edit please.",
      "author": "Harin Chan, Parm, i forgot",
      "scripts": {
            "dev": "vite",
            "start": "electron .",
            "build": "vite build && electron-builder",
            "dev:start": "concurrently \"npm run dev -- --host\" \"wait-on http://localhost:3000 && npm start\""
      },
  ```

  ## Dev Device Preparation Instruction (Windows)
  1. Download [Rust](https://rustup.rs/) if you haven't already.
  2. Make sure cargo is correctly installed with `cargo --version` and `rustc --version`
  3. Download `Visual Studio Community 2026` via `Visual Studido Installer`, making sure to include 
  3. run `cd penpals-frontend`- `npm i`

  

  When in doubt
  - run in `\penpals-frontend\src-tauri`:
    - `cargo clean`
    - `cargo build`
  
  ## Build and Run

  Dev: `npx tauri dev`

  Build: `npx tauri build`

  Build bundles:
  - `\penpals-frontend\src-tauri\target\release\bundle\msi\penpals-frontend_0.1.0_x64_en-US.msi`
  - `\penpals-frontend\src-tauri\target\release\bundle\nsis\penpals-frontend_0.1.0_x64-setup.exe`


# Backend Notes
  Relies on `http://localhost:5173`, need to prorga to find free ports themseleves as well