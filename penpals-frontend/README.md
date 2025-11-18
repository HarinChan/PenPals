
  # Map Interface with Sidebar (Copy)

  This is a code bundle for Map Interface with Sidebar (Copy). The original project is available at https://www.figma.com/design/wX8zWSPmsqXykPVQCGU7qS/Map-Interface-with-Sidebar--Copy-.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server. # use `npm run dev -- --host` instead

  ^ existing notes that came with fignma export

  # Harin's Notes

  How to turn figma-export into electron vite project:
  - https://poe.com/s/qf77IosIZIAZfqx9eKoI
  - https://poe.com/s/ZPTF7P5ov7KswFbrVOA4
  
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
