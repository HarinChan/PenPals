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
  3. Download `Visual Studio Community 2026` via `Visual Studido Installer`, making sure to include `Desktop Development with C++` in installation.
  3. run `cd penpals-frontend`- `npm i`

  

  When in doubt
  - run in `\penpals-frontend\src-tauri`:
    - `cargo clean`
    - `cargo build`
  
  ## Build

  ok new build plan
  KEEP all the backend source code as is
  
  frontend and backend both failts to build WHY.

  run `build.py`
  app is located in `


# Backend Notes
  Relies on `http://localhost:5173`, need to prorga to find free ports themseleves as well