# Nourish — Product Brief

*This is the refined version of the original idea — kept as the source of truth for what the app is and why.*

## The improved prompt

> Build **Nourish**, a mobile-first web app that makes eating well feel effortless and a little bit delightful. The core interaction is radically simple: the user snaps a photo of what they're about to eat, optionally snaps the nutrition label, and the app's AI works out the rest — what it is, roughly what's in it, and how nourishing it is. Every log quietly builds toward a single **Day Score (0–100)** that blends what was eaten, how much water was drunk, and the day's fasting rhythm. The app should feel warm, editorial, and intentional — closer to a beautiful paper journal than a clinical calorie counter — with small moments of surprise and delight (animated score ring, water that visibly fills, confetti on wins, a live fasting timer). It must work beautifully on a phone in the browser, and still be pleasant on a desktop.

## Concept

A photo-first food journal. No searching databases, no weighing food, no forms. Point, shoot, done. The AI does the accounting; the human just eats and glances at one honest number.

## Core loop

1. Tap the camera button.
2. Photo of the food → optional photo of the nutrition label → AI analyzes in the background.
3. A result card reveals: name, calories, macros, a 0–10 health score, a one-line why, and one kind tip.
4. Log it. The Day Score ring ticks upward. Water and fasting fill in the rest of the picture.

## Features

- **F1 — Photo capture**: native camera/library picker on mobile; images downscaled client-side before upload.
- **F2 — AI meal analysis**: Claude vision reads the meal photo (and label photo when provided, scaling label values to the visible portion). Returns structured JSON — never free text.
- **F3 — Day Score**: a transparent 0–100 score (see below) with an animated ring and per-pillar breakdown.
- **F4 — Hydration tracking**: tappable glasses with a fill animation; configurable daily goal; celebration on reaching it.
- **F5 — Fasting rhythm**: a live timer since the last logged meal, with milestone markers (12h / 14h / 16h); overnight fast feeds the score.
- **F6 — Journal**: a 7-day score chart plus per-day detail (meals, water, breakdown) and a streak counter.
- **F7 — Demo mode**: with no API key the app still works end-to-end using realistic sample analyses, clearly badged "demo".
- **F8 — Onboarding & profile**: a skippable, one-question-per-screen first-run flow captures name, sex, age, height, weight (metric/imperial), goal (ease down / hold steady / build up) and activity level. From it the app derives a daily calorie target (Mifflin-St Jeor × activity, nudged by goal), suggests a water goal from body weight, greets the user by name, and quietly passes goal context to the AI so meal tips are tailored. Editable anytime from Settings; all of it stays on-device.

## The Day Score (0–100)

| Pillar | Points | How it's earned |
|---|---|---|
| 🥗 Nourish | 50 | Average of the day's meal health scores (each 0–10, from the AI) |
| 💧 Hydrate | 25 | Water logged vs. daily goal (default 8 glasses) |
| ⏱ Rhythm | 25 | Overnight fast length vs. a 14h target (falls back to eating-window length when there's no prior-day data) |

The score builds through the day — it starts at zero each morning and grows with every good choice. A streak counts consecutive days at 70+.

## AI analysis contract

One backend endpoint, `POST /api/analyze`, takes base64 meal + optional label images and returns:

`is_food, name, description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, health_score (0–10), health_summary, tip, confidence, used_label`

Tone rules: warm, encouraging, zero moralizing. The tip reads like a knowledgeable friend.

## Design language & delight moments

- Warm cream canvas, deep botanical green accent, gold and terracotta as supporting tones; serif display type for headings. Full dark mode.
- Score ring animates with a count-up; pillar micro-meters underneath.
- Water glasses fill with a liquid animation; light haptic buzz on log (where supported).
- Confetti bursts for hydration goals and 8+ scoring meals.
- Analyzing state: a scan-line shimmer over the photo with rotating playful status lines.
- Time-of-day greeting; staggered card entrances; respectful of `prefers-reduced-motion`.

## Tech

- **Frontend**: React + Vite, hand-rolled CSS design system (no UI framework), mobile-first with a two-column desktop layout.
- **Backend**: Node + Express. Single `/api/analyze` endpoint proxying the Anthropic API (`claude-opus-4-8`, vision + structured JSON output). API key stays server-side in `.env`.
- **Storage**: `localStorage` (photos stored as small thumbnails; 60-day retention). No accounts, no server database in v1.

## Out of scope (v1) — ideas for later

Accounts & cloud sync · barcode scanning · meal reminders / notifications · weekly AI insights ("your week in review") · Apple Health export · social/shared streaks.
