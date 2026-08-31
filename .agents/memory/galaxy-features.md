---
name: Galaxy Voice Chat feature architecture
description: Key patterns for agency/host system, admin demo mode, official host frame, games management in Galaxy Voice Chat
---

# Galaxy Feature Architecture

## Firebase Paths
- `hostApplications/{id}` — host applications (status: pending/approved/rejected)
- `agencyApplications/{id}` — agency applications
- `agencies/{id}` — approved agencies
- `appConfig/games/{id}` — game configs (enabled, url, icon, order, comingSoon)
- `appConfig/frames/{id}` — dynamic PNG frames with imageUrl

## Admin Demo Mode
- Demo credentials hardcoded in App.tsx as `DEMO_USERNAME = "demo"`, `DEMO_PASSWORD = "demo123"` (NOT env vars — intentionally cannot be changed)
- `isDemo` flag in AuthContext blocks all write actions (pages check `isDemo` before Firebase updates)
- Session stored in `galaxy_admin_demo` sessionStorage key (separate from `galaxy_admin_auth`)

## Official Host Frame
- Users with `globalRole === "official"` get automatic gold spinning ring + HOST badge in AvatarFrame
- Pass `globalRole` prop to AvatarFrame — no equip needed, auto-displayed everywhere
- Frame extends to `size + 14` to fit outside avatar circle

## Dynamic Frame Fix
- Previously used `overflow: hidden` which clipped PNG frame inside avatar
- Fixed: container uses `wrapperSize = size + 12`, avatar div absolutely centered at `size`, frame img covers full `wrapperSize` with `objectFit: contain`
- **Why:** Transparent PNG frames need to extend outside the circular avatar boundary

## Games Admin → App Pipeline
- Admin panel GamesPage writes to `appConfig/games/{id}`
- GameCard.tsx reads from Firebase on mount, falls back to STATIC_GAMES if empty
- Games have: enabled flag, comingSoon badge, order sort, url (route or https)

## Host/Agency Apply
- `agencyService.ts` handles Firebase writes for both host and agency applications
- `HostAgencyApply.tsx` component — full-screen panel opened from ProfilePage "Be a Host" button
- Sends notification to `notifications/super_admin_306623582/` when application submitted

**How to apply:**
