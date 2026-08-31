---
name: Capacitor CLI tar ESM fix
description: @capacitor/cli v5 breaks with tar v7 in pnpm monorepos due to ESM/CJS interop mismatch
---

## The Rule
When using `@capacitor/cli` v5 in a pnpm monorepo with Node 20, `npx cap add android` and `npx cap sync` will throw `Cannot read properties of undefined (reading 'extract')` because `tar` v7 ships as an ESM module (`__esModule: true`, no `.default`), and the CLI's CJS code calls `tslib.__importDefault(require('tar')).default.extract(...)` which resolves to `undefined`.

**Why:** pnpm's strict isolation means the root `node_modules/tar` (v7, ESM) is found by Node's module resolution walk, but `tslib.__importDefault` treats it as an ESM module and returns it as-is — and there's no `.default.extract` property.

**How to apply:**
1. Add `"tar": "x.x.x"` to `devDependencies` in the Capacitor app's `package.json` (so pnpm keeps it accessible).
2. Patch `node_modules/@capacitor/cli/dist/util/template.js` to resolve `tar` robustly:
   ```js
   const tar = require("tar");
   const extractor = (tar && tar.extract) ? tar : (tar && tar.default && tar.default.extract) ? tar.default : tar;
   await extractor.extract({ file: src, cwd: dir });
   ```
3. To bootstrap the android directory without `cap add android` (if CLI fails), manually extract the template tarball using a Node script:
   ```js
   const tar = require('/path/to/root/node_modules/tar');
   tar.extract({ file: '.../cli/assets/android-template.tar.gz', cwd: './android' });
   ```
4. Then run `npx cap sync android` — copy step works without tar if assets already exist from a prior failed run.

Note: The root `node_modules/.bin/cap` requires Node >=22, so always use the local `npx cap` (v5.7.x) which works with Node 20.
