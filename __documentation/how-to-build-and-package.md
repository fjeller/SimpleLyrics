# How to build, test and package

This guide is for developers. The full list of scripts is in [Commands, stack and code map](reference-commands-and-code-map.md).

## Run in development mode

```powershell
npm install
npm run dev
```

The renderer reloads on changes (HMR). Changes in the main process restart the app.

## Run the tests

```powershell
npm test
```

The tests cover the repositories, the file handling and export/import. They run in plain Node, using better-sqlite3 directly.

## Check types and build

```powershell
npm run typecheck
npm run build
```

`npm run build` runs the typecheck first, then the production build into `out/`.

## Create a package

| Goal | Command | Result |
|---|---|---|
| Unpacked Windows app | `npm run pack` | `dist/win-unpacked` |
| Windows installer | `npm run dist:win` | NSIS installer |
| macOS image | `npm run dist:mac` | dmg |
| Linux packages | `npm run dist:linux` | AppImage and deb |

All commands run the build first. Only the Windows `--dir` build (`npm run pack`) has been verified. The macOS and Linux targets are configured in [electron-builder.yml](../electron-builder.yml) but untested.

The packaged app includes the `drizzle/` folder as a resource (the migrations) and keeps `*.node` files outside of the asar archive, so better-sqlite3 can load its native module.

## `.sng` file association

The association is configured in `electron-builder.yml` (`fileAssociations`). The app handles files passed on the command line, the macOS `open-file` event, and a second instance started with a file.

## Fix a missing Electron binary

npm 11 skips install scripts. If `electron.exe` is missing after `npm install`, run:

```powershell
node node_modules/electron/install.js
```

## See also

- [Design decisions and gotchas](explanation-design-decisions.md)
