# Flasher — Telegram Mini App & Render Production Release

Transform the Flasher smartphone firmware flashing simulator into a battle-tested, production-ready Telegram Mini App and standalone web platform ready for 1-click deployment on Render.com.

> [!IMPORTANT]
> **Root Cause Fixed**: Currently `run.py` was mounting the obsolete `/static` HTML/JS prototype which caused BotFather to display the old mockup. The production architecture replaces this by compiling the modern React Vite app into `/dist` and having FastAPI serve `/dist` directly, ensuring 100% feature parity between standalone web and Telegram.

---

## 1. Overview & Core Concept

- **What It Does**: An authentic interactive workshop simulator where players acquire, diagnose, unlock, wipe, flash custom ROMs, jailbreak, and trade 15 real-world smartphones (Samsung Odin, Xiaomi Mi Unlock, Apple DFU checkm8, Pixel Fastboot) with true hardware mechanics, bootloop risks, and an in-depth virtual economy.
- **Dual-Platform Architecture**:
  1. **Telegram Mini App**: Automatically binds to the active Telegram user account (`window.Telegram.WebApp`), reads user ID, username, and avatar, enforces the 3-hour hardware claim cooldown, activates Telegram native haptic feedback, and grants admin privileges to ID `7674443928`.
  2. **Standalone Web App**: Functions as a responsive, high-performance web app in any browser (desktop or mobile) with seamless local state persistence and full desktop workstation views.
- **Deployment Target**: Render.com Web Service combining the compiled Vite React frontend, FastAPI backend, SQLite database, and optional Aiogram Telegram bot in a single unified process.

---

## 2. User Experience & Telegram Integration

### Telegram Mini App Lifecycle
- **Initialization**: Automatically calls `Telegram.WebApp.ready()`, `Telegram.WebApp.expand()`, and requests full viewport presence.
- **Theme & Safe Areas**: Syncs header and background colors to `#020617` (slate-950) and respects mobile notch and home indicator safe areas.
- **User Identity Binding**:
  - Automatically loads Telegram `user.id`, `@username`, `first_name`, and profile avatar from `initDataUnsafe`.
  - Profile tab displays genuine Telegram badges and authenticated status.
  - Automatically identifies user `7674443928` as Owner/Admin, unlocking the administrative controls tab.
- **Native Haptics**: Uses `Telegram.WebApp.HapticFeedback` for physical tactile feedback during button holding (DFU / Fastboot key combos), flashing success, brick warnings, and card selling.
- **Browser Fallback**: When launched directly in Chrome/Safari/Firefox outside Telegram, provides an elegant fallback with customizable handle and session memory without throwing script errors.

---

## 3. Technical Architecture & Render Deployment

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER INTERFACE                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Telegram Mini App (Webview)   │  │   Desktop / Mobile Browser  │  │
│  │  - Telegram.WebApp SDK          │  │  - Full Viewport (20:9 phone│  │
│  │  - Native Haptic Feedback       │  │    chassis, 96vw workstation)│  │
│  │  - User identity auto-binding   │  │  - LocalStorage fallback    │  │
│  └────────────────┬────────────────┘  └──────────────┬──────────────┘  │
└───────────────────┼──────────────────────────────────┼─────────────────┘
                    │                                  │
                    ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         RENDER.COM WEB SERVICE                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                FastAPI Application (Port $PORT)                  │  │
│  │                                                                  │  │
│  │  [Static Mount: /dist]                                           │  │
│  │  ├── index.html (SPA entry with Telegram WebApp script)          │  │
│  │  └── assets/*.js, *.css (Compiled Vite bundles)                  │  │
│  │                                                                  │  │
│  │  [REST API: /api/*]                                              │  │
│  │  ├── /api/me (Returns user profile, cooldown, balance)           │  │
│  │  ├── /api/claim-phone (3-hour cooldown enforced)                 │  │
│  │  ├── /api/collection & /api/shop (Hardware economy)              │  │
│  │  └── /api/phone/{id}/* (Instructions, progress, finalization)   │  │
│  └────────────────────────┬─────────────────────────────────────────┘  │
│                           │                                            │
│  ┌────────────────────────▼────────┐  ┌─────────────────────────────┐  │
│  │      SQLite Database (data/)    │  │  Aiogram 3 Bot (Background) │  │
│  │  - Users, Phones, Inventory     │  │  - /start, /id, WebApp button│  │
│  │  - Async SQLAlchemy + aiosqlite │  │  - Polls when BOT_TOKEN set │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Strategy
1. **Frontend Integration (`src/App.tsx`, `index.html`)**:
   - Inject Telegram WebApp script `<script src="https://telegram.org/js/telegram-web-app.js"></script>` and mobile viewport meta tags (`viewport-fit=cover, maximum-scale=1.0, user-scalable=no`).
   - Add `useTelegramUser` hook to bind user profile, avatar, username, and ID dynamically.
   - Enforce 3-hour persistent countdown with formatted display (`02:59:58`).
   - Remove obsolete Ukrainian text remnants from HTML meta tags and placeholders.
2. **FastAPI Static Serving (`run.py`)**:
   - Replace `/static` mount with `/dist` static file server.
   - If `/dist` is not yet built, build it or provide clean HTML fallback.
   - Add single-page application (SPA) catch-all route so client-side navigation never returns 404s.
3. **Backend Telegram Authentication (`app/security.py`)**:
   - Accept Telegram user ID and `initData` from headers/parameters.
   - Auto-create or fetch user in SQLite when connecting via Telegram.
4. **Render.com Deployment Configuration**:
   - Provide `render.yaml` with build and start commands:
     - Build: `npm install && npm run build && pip install -r requirements.txt`
     - Start: `python run.py`
   - Create clean `.env.example` with documented variables (`BOT_TOKEN`, `ADMIN_IDS=7674443928`, `WEBAPP_URL`, `PORT=10000`).

---

## 4. Verification & Readiness Plan

1. **Telegram WebApp SDK Testing**: Verify Telegram SDK loads without errors and user ID `7674443928` is recognized with Admin badge.
2. **Build Verification**: Run `npm run build` and ensure `dist/` contains all assets.
3. **FastAPI Serving Verification**: Run `python3 -m py_compile` on all backend files and test FastAPI routing to `/dist/index.html`.
4. **Cooldown Check**: Verify 10,800-second (3-hour) cooldown countdown functions across browser reloads and backend API responses.
