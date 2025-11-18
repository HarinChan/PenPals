# Frontend Notes

  How to turn figma-export into electron vite project:
  - https://poe.com/s/qf77IosIZIAZfqx9eKoI
  - https://poe.com/s/ZPTF7P5ov7KswFbrVOA4
  
  first go to dir:
  `cd penpals-frontend`

  To run, type:
  `npm run dev:start`
  install dependencies if needed via `npm install` / `npm i`

  ## build set up
  then `npm install electron-builder --save-dev`
  Add to `package.json`
  ``` json
    "build": {
      "appId": "com.yourapp.id",
      "productName": "YourAppName",
      "files": [
        "dist/**/*",
        "main.js"
      ],
      "directory": "build",
      "mac": {
        "category": "public.app-category.utility"
      },
      "win": {
        "target": [
          "nsis"
        ]
      },
      "linux": {
        "target": [
          "AppImage"
        ]
      }
    },
    "devDependencies": {
      "electron": "^<latest-version>",
      "electron-builder": "^<latest-version>"
    }
  ```

  To build, execute this command with admin privil `npm run build`.
  Currently built image is, bleh.
  distrubtion methods:
  - build/win-unpacked -> zip it up for distribution
  - build/App Name Setup.exe -> just that is enough for set up

  does it currently work? no not really bleh.

  Currently Relies on port `http://localhost:3000`. Please keep this port free during development. Will have to make it so it'll find and use free ports. Do not finalize this change until figma frontend is finalized.

# Backend Notes
  Relies on `http://localhost:5173`, need to prorga to find free ports themseleves as well