# 🥗 Nourish

A photo-first food journal. Snap what you're eating (and optionally the nutrition label), let AI do the accounting, and watch your **Day Score** build from what you ate, how much water you drank, and your fasting rhythm.

See [BRIEF.md](BRIEF.md) for the full product brief.

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

The app works immediately in **demo mode** — meal photos get realistic sample analyses so you can feel the whole flow before wiring up AI.

## Enable real AI analysis

1. Copy `.env.example` to `.env`
2. Add your Anthropic API key: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart `npm run dev`

The Settings sheet (gear icon) shows whether you're in `live · Claude` or `demo mode`. Photos are sent to the local Express server, which calls Claude's vision API — your key never touches the browser.

## Use it on your phone

Nourish is an installable web app (PWA): it has an app icon, launches full-screen without browser chrome, and the shell loads offline. Two ways to get it onto your phone:

### Option A — home Wi-Fi (instant, free)

1. Run `npm run dev` on your computer — Vite prints a `Network:` URL like `http://192.168.1.x:5173`
2. Open that URL in your phone's browser (same Wi-Fi)
3. **iPhone**: Share button → *Add to Home Screen*. **Android**: menu → *Add to Home screen / Install app*

Caveat: it only works while your computer is awake and on the same network. Note that the installed app has its own storage, separate from the browser tab — set up your profile inside the installed app.

### Option B — the live Firebase deployment (works anywhere)

The app is deployed on Firebase: **https://nourish-fez.web.app**

Open it on your phone → *Add to Home Screen*. The camera button uses the native photo picker, so on iOS/Android you'll get the "Take Photo / Photo Library" choice directly.

## Firebase architecture

| Piece | What |
|---|---|
| Hosting | serves `dist/`, SPA rewrite, `/api/**` → the `api` Cloud Function |
| Auth | Google sign-in (enable the provider in the Firebase console) |
| Firestore (`australia-southeast1`) | `users/{uid}` (profile/settings) + `users/{uid}/days/{date}` — rules restrict everyone to their own data |
| Cloud Function `api` (`us-central1`) | the Claude analysis endpoint; needs the Blaze plan + the `ANTHROPIC_API_KEY` secret |

**Sync model**: localStorage stays the source of truth for instant UX. Signed in, every change is mirrored to Firestore (debounced write-through) and remote changes stream back live; conflicts resolve last-write-wins per day. Signed out, the app is fully local. Until the Cloud Function is deployed, photo analysis falls back to client-side demo estimates.

Deploy commands:

```bash
npm run build
npx firebase deploy --only hosting,firestore     # site + rules
npx firebase functions:secrets:set ANTHROPIC_API_KEY   # paste key when prompted (Blaze plan required)
npx firebase deploy --only functions             # the analyze API
```

## Production build

```bash
npm run build
npm start        # serves the built app + API on http://localhost:3001
```

## How the Day Score works

| Pillar | Points | Source |
|---|---|---|
| 🥗 Nourish | 50 | Average of the day's meal health scores (0–10 each, from AI) |
| 💧 Hydrate | 25 | Glasses of water vs. your goal (default 8, adjustable in Settings) |
| ⏱ Rhythm | 25 | Overnight fast vs. a 14h target (or eating window when there's no prior day) |

Data lives in your browser's `localStorage` — nothing is stored server-side.

## Stack

React + Vite · Express · Anthropic API (`claude-opus-4-8`, vision + structured JSON output) · hand-rolled CSS design system with full dark mode.
