---
name: Galaxy project setup on Replit
description: How the Galaxy Voice Chat project was set up — blocked packages, workarounds
---

# Galaxy Setup Notes

## tar Package Blocked
- Replit package firewall blocks ALL versions of `tar` (6.x and 7.x)
- `@capacitor/cli` and `@capacitor/android` depend on `tar` — must be removed from root and galaxy-web deps for dev server to work
- Removed from: root `package.json` dependencies, `artifacts/galaxy-web/package.json` dependencies
- Removed `"tar": "7.5.11"` from pnpm overrides (was breaking install)
- Deleted `pnpm-lock.yaml` and regenerated to clear stale tar references

**Why:** The Capacitor packages are only needed for Android APK builds, not the web dev server.

## Workflows
- `artifacts/galaxy-web: web` → `pnpm --filter @workspace/galaxy-web run dev` (port from $PORT)
- `artifacts/galaxy-admin: web` → `pnpm --filter @workspace/galaxy-admin run dev` (requires $PORT and $BASE_PATH)

## Version Conflicts
- galaxy-web package.json has `"vite": "^5.4.15"` but root override forces `6.4.2` — works fine
- galaxy-admin uses catalog versions (workspace-wide pnpm catalog)
