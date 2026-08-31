# Galaxy Voice Chat

## Overview
Galaxy Voice Chat is a dual-platform project comprising `Galaxy Mobile` (React Native/Expo) and `Galaxy Web` (React/Vite). Both applications share a single Firebase project (`chalotalk-67106`). The project aims to provide a rich, interactive voice chat experience with a strong emphasis on real-time communication, social features, and a distinctive visual design.

**Serving Path:** The web app is served at the root `/` (both development and production). The APK build also uses `BASE_PATH=/` via the `build:android` script.

**Key Capabilities:**
- Real-time voice chat powered by Agora RTC.
- Comprehensive social features including user profiles, following, friend requests, "Moments" grid feed, and "Explore" vertical feed with video auto-play.
- Advanced chat functionalities with typing indicators, image/voice messages, and reactions.
- Dynamic gift system with leaderboards and animated presentations.
- Robust user management with multi-auth options, a unique 9-digit user ID system, and administrative controls.
- Theming: "Midnight Nebula" for mobile and "Dark Galaxy" for web.

## User Preferences
I prefer iterative development with a focus on delivering working features incrementally. Please ask before making any major architectural changes or introducing new external dependencies. I value clear and concise explanations, avoiding jargon where possible. I expect the agent to be proactive in identifying potential issues and suggesting improvements, especially regarding performance and user experience.

## System Architecture

### UI/UX Decisions
- **HomePage**: ChalTalk-inspired premium design with: auto-sliding banner carousel (AI-generated images: golden portal, gaming room, treasure chest), glassmorphism search bar, game cards grid (Carrom, Truth&Dare, Yummy Crush, Ludo with AI images), online users section, top gifters leaderboard, find friends grid with user IDs, live rooms list. Components: `src/components/home/Header.tsx`, `SearchBar.tsx`, `BannerCarousel.tsx`, `GameCard.tsx`, `FriendCard.tsx`. AI images in `public/banner*.png` and `public/game_*.png`.
- **Galaxy Web Theme**: Dark galaxy theme with purple/teal glowing borders, glassmorphism elements, and specific animations (giftFly, logoGlow, speaking-ring, confetti, etc.).
- **Galaxy Mobile Theme**: "Midnight Nebula" with dark gradients (`#050112 → #0e0520 → #1a0b2e`).
- **Color Palette**: Primary accents in purple (`#6C5CE7`, `#A29BFE`), gold for VIP/host elements (`#FFD700`), and live green (`#00e676`).
- **Typography**: Inter font.
- **Interactive Elements**: Button animations (scale+ripple), card hover/press states, skeleton shimmer for loading states, page transitions.
- **Voice Room Layout**: Dedicated classes for room containers, seat grids, chat sections, and bottom control bars.
- **Anti-Screenshot Protection**: Implemented via CSS on sensitive pages (Profile, Voice Room).

### Technical Implementations
- **Frameworks**: React + Vite + TypeScript for Web, React Native (Expo) for Mobile.
- **State Management**: Firebase Realtime Database for all core data, ensuring real-time synchronization across clients.
- **Authentication**: Firebase Email/Password, Google Auth, Phone OTP (demo), and Guest (anonymous) login.
- **Voice Communication**: Agora Web SDK (`agora-rtc-sdk-ng`) for Galaxy Web, `react-native-agora` for Galaxy Mobile, featuring AEC (echo cancellation), ANS (noise suppression), AGC (automatic gain control), speech_standard encoder config, auto-reconnect with exponential backoff (up to 5 attempts), connection state monitoring, network quality detection, and graceful track cleanup.
- **User Management**:
    - Unique 9-digit `userId` generated and reserved atomically via Firebase transactions.
    - Online presence tracking using Firebase `onDisconnect`.
    - Comprehensive user profiles including coins, level, achievements, transactions, blocked users, friends, friend requests, and privacy settings.
    - Mutual follow OR friendship system to gate chat access (friends can chat without gift).
    - Super Admin system with specific user IDs.
    - **Ban/Unban System**: Super Admin (userId `306623582`) exclusive feature. Can ban users for 4 hours, 24 hours, 7 days, or permanently. Ban data stored at `users/{uid}/isBanned`, `banUntil`, `bannedBy`, `banReason`. Banned users see "Account Suspended" screen with ban duration and Sign Out button. Auto-expiry check via `isUserBanned()` (client-side time comparison). Unban restores access immediately. User management cards now include: Remove Ban, Device Ban, Remove Device Ban, Shadow Ban, Lift Shadow Ban buttons, plus ban status badges (BANNED/DEVICE BANNED/SHADOW BANNED/ACTIVE).
    - **Super Admin Powers** (all gated to userId `306623582`):
      - **Wallet Admin**: Edit any user's coin balance via Admin Panel (lookup by User ID, set new balance).
      - **Profile Moderator**: "Delete DP" and "Reset Name" buttons on other users' profile bottom sheets.
      - **Global Notice**: Send scrolling alert banner visible to all users (stored at `globalAlerts/` in RTDB, auto-expires after 24h). Clear all alerts option.
      - **Room Master**: Super Admin has full owner-level control in every voice room (mute, kick, ban, settings, admin management) regardless of room ownership.
    - **God Mode Control Panel** (15 features, full-screen panel via "God Mode Control Panel" button on Profile):
      1. **Device ID Ban**: Permanently ban a device; stored at `bannedDevices/{deviceId}` in RTDB.
      2. **Shadow Ban**: User can still use app but messages hidden from others; `users/{uid}/shadowBanned`.
      3. **Room Hijack**: SA bypasses all room passwords and joins as Owner automatically (always active).
      4. **Coin Tracker**: View any user's coin balance, level, XP, VIP status, and transaction history.
      5. **Mass DM**: Send notification to ALL users at once; stored at `notifications/{uid}/`.
      6. **Server Maintenance**: Toggle maintenance mode; non-SA users see maintenance screen. Stored at `appConfig/maintenance`.
      7. **ID Transfer**: Transfer coins, inventory, level, XP, equipped items between two users.
      8. **VIP ID Generator**: Assign custom short/VIP user IDs (e.g. "007", "1") via atomic transaction. Stored at `userIds/{customId}`.
      9. **Ghost Mode**: SA appears invisible in rooms; seat shows empty to others, faint to self.
      10. **Live Store Editor**: Override store item prices or disable items in real-time. Stored at `appConfig/storeOverrides`.
      11. **Level Booster**: Set any user's level and XP directly; auto-grants VIP at level 10+.
      12. **Custom Badge Tool**: Add/remove custom emoji badges on any user; stored at `users/{uid}/customBadges/`.
      13. **Anti-Screenshot**: Toggle CSS watermark overlay to deter screenshots.
      14. **Vanish Chat**: Clear all messages in any room by Room ID.
      15. **IP Tracker**: View user's device ID, user agent, last login, and account creation date.
    - **Official Room Manager** (inside Admin Panel, SA-only):
      - Manages Room 11111 ("New Friends Zone") — an always-live official room created via `ensureOfficialRoom()`.
      - **Room Name**: Editable live via `updateRoomSettings()`.
      - **Background Theme**: Select from ROOM_THEMES (Galaxy, Ocean, Sunset, Forest, Crimson, Midnight).
      - **Seat Limit**: Set to 8/10/12/16/20 via `setRoomSeatCount()` (dynamically adds/trims seat array).
      - **Lock Room (Official Only)**: Toggle `micPermission` between "all" and "admin_only".
      - **Auto-Entry**: Toggle `appConfig/autoEntryRoom` — new users auto-join Room 11111 on login.
      - **Wipe Test Rooms**: Delete all rooms with 0 listeners (except Room 11111) via `wipeDummyRooms()`.
- **Room Management**:
    - 12-seat grid (4x3) with host and co-host roles.
    - Real-time room listeners, seat management, and room messages.
    - Host controls for muting, kicking, locking seats, and setting co-hosts.
    - Enter permissions (Everyone/Invite Only) and mic seat limits.
- **Chat System**:
    - Real-time conversations with typing indicators.
    - Support for text, emoji, image, and voice messages.
    - Seen/delivered message statuses.
    - Double-tap chat reactions.
    - Media uploads via Cloudinary (images auto-optimized with `w_400,h_400,c_fill,q_auto,f_auto` transformations).
- **Gift System**:
    - Animated gift sending with coin deduction.
    - Daily/weekly/monthly gift leaderboards.
    - Gift history tracking.
- **Notification System**: In-app notifications for various events (follows, gifts, friend requests, messages, room invites, system alerts).
- **Store & Backpack System** (`storeService.ts`):
    - In-app store with Avatar Frames (PNG + Animated), Entry Effects, and Room Themes.
    - Items have rarity tiers: Common, Rare, Epic, Legendary (color-coded).
    - Purchase with coins, equip/unequip from Backpack.
    - **PNG Frames**: Divine Wing (`ur.1.png`) and Crystal Pink (`ur.2.png`) — image overlay frames.
    - **Animated Frames** (10 premium, 1000 coins each): Golden Crown, Neon Glow, Inferno Blaze, Ice Crystal, Angel Wings, Dark Aura, Pink Love, Electric Storm, Galaxy Vortex, Diamond Royal — CSS animated rotating conic-gradient rings with unique glow/particle effects per frame.
    - `FrameAvatar` component (`components/frames/FrameAvatar.tsx`) renders animated frames on profile avatar and voice room seats.
    - `FramePreview` component shows animated previews in Store and Backpack grids.
    - Frame colors and animation config stored in `FRAME_COLORS` map in `storeService.ts`.
    - Equipped entry effects trigger custom system messages when joining rooms.
    - User inventory stored at `users/{uid}/inventory/` with `equippedFrame`, `equippedEntry`, `equippedTheme` fields.
- **i18n System** (`i18n.ts`): 4-language translation system (English, Arabic, Hindi, Urdu) with RTL support for Arabic/Urdu. Language stored in `localStorage.galaxy_lang`.
- **Report System** (`reportService.ts`): User-submitted reports with admin review queue. Categories: harassment, spam, inappropriate content, fake profile, underage, scam, hate speech. Admin can approve/reject/dismiss. Accessible from Profile page (admin only).
- **Family/Agency System** (`familyService.ts`): Create/join families, transfer leadership, remove members. Families stored at `families/{id}`, member's `familyId` stored at `users/{uid}/familyId`.
- **PK Battle System** (`pkBattleService.ts`): Room-vs-room gift battles with timed duration (3/5/10/15/30 min). PK invite flow, real-time score tracking, auto-end on timer. Active PK battles show overlay banner in voice rooms. Host can initiate PK challenges to other active rooms.
- **Mystery Box** (`giftService.ts`): 100-coin mystery box with weighted rarity (common 50%, rare 30%, epic 15%, legendary 5%). Win up to 5,000 coins. Animated opening UI in voice rooms.
- **Room Waitlist** (`roomService.ts`): Queue system for full rooms. Users can join/leave waitlist. Admins can admit users from waitlist. Waitlist stored at `roomWaitlist/{roomId}/{key}`.
- **Background Music** (`musicService.ts`): 10 background music tracks across categories (Chill, Jazz, Ambient, Piano, Acoustic, EDM, R&B, Arabic, Indian, Nature). Room hosts can play/pause/stop music with volume control.
- **Voice Effects** (`voiceService.ts`): 5 effects (Normal, Deep, High, Robot, Echo) using AudioContext Web API. Accessible to seated users in voice rooms.
- **Blocked User Filtering**: Blocked users' posts and comments hidden in Explore page. Blocked users filtered from search results.
- **Agora Token Server** (`server.mjs`): POST `/api/agora-token` endpoint for secure token generation. Returns null token in demo mode (no certificate).
- **Recharge/Payment API** (`server.mjs`): GET `/api/recharge-packages` and POST `/api/recharge` endpoints for coin purchases.
- **Daily Rewards & Achievements**: System for rewarding user engagement and progress.
- **Support System**: Integrated feedback form and help center articles.
- **Toast Notifications**: Global system for user feedback (success/error/info/warning).

### System Design Choices
- **Data Persistence**: Firebase Realtime Database for core data; Cloudinary for all image/media uploads (Cloud Name: `dz1bhfpkc`, Upload Preset: `Profile_pic`). No reliance on `localStorage` for core data.
- **Modular Services**: Codebase organized into distinct service modules (e.g., `userService`, `roomService`, `chatService`, `voiceService`) for maintainability and separation of concerns.
- **Real-time Focus**: Extensive use of Firebase real-time listeners for dynamic UI updates across all features.
- **Security**: Firebase App Check with reCAPTCHA Enterprise, user blocking, reporting system, and permission enforcement for room actions.

## External Dependencies

- **Firebase**:
    - **Project ID**: `chalotalk-67106`
    - **Services**: Realtime Database, Authentication.
- **Agora.io**:
    - **App ID**: `5a9957fd6a8047f48310fd0e5345d42c` (Web), `5a9957fd6a8047f48310fd0e5545d42c` (Mobile)
    - **SDKs**: `agora-rtc-sdk-ng` (Web), `react-native-agora` (Mobile)
- **React/Vite**: For Galaxy Web frontend development.
- **React Native/Expo**: For Galaxy Mobile frontend development.
- **Expo Libraries**: `expo-router`, `expo-linear-gradient`, `react-native-reanimated`.