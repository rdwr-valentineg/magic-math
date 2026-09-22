# חשבון קסם (Magic Math)

A mobile-first, Hebrew (RTL) math game for first-grade children, split into
two layers:

- **`distribution/magic-math.html`** — a single, self-contained launcher
  file. This is the *only* file ever sent to a user. It has its own tiny
  loading screen and friendly error screen, and knows one thing: a URL to
  fetch the actual game from.
- **`remote/`** — the real game (config, code, styles, and every
  character's art/audio), hosted on GitHub Pages. The launcher fetches it
  at runtime and boots it into itself, no iframe involved.

This means the game can be fixed, restyled, or given new characters by
pushing to `remote/` and bumping a version number — **without ever
re-sending `magic-math.html` to anyone**.

## How it works

1. `magic-math.html` shows "מכינים את הקסם..." and fetches
   `remote/config.json` (always network-fresh, cache-busted).
2. It reads `config.version` from that file, then loads `remote/app.js`
   and `remote/styles.css` with that version as a cache-busting query
   param, and calls `MagicMathApp.init(...)`.
3. From there the remote app owns the whole experience: Welcome (character
   picker) → Settings (range + operations) → Game (10 questions) → Results.
4. If any of this fails (offline, DNS down, GitHub Pages unreachable), the
   launcher shows a friendly Hebrew message and a "נסו שוב" retry button —
   never a technical error, never a blank screen.

Because `magic-math.html` can be opened straight from disk (`file://`),
nothing here depends on a Service Worker being available. Offline play
after the first load is a "nice if the browser's HTTP cache still has it"
bonus, not something the app relies on — the remote game genuinely needs a
network connection to start.

Every fresh launch of the launcher always starts at the Welcome screen.
Previously chosen character/range/operations are remembered and shown
pre-selected, but the child (or parent) must always actively continue past
Welcome — it is never auto-skipped.

## Repository structure

```
distribution/
  magic-math.html        The one file users receive. Self-contained:
                          own inline CSS/JS, loading + error UI, and the
                          hardcoded remote base URL (overridable with
                          ?base=... for local testing/staging).

remote/
  config.json             { version, numberRanges, operations, characters[] }
                           characters[] only needs id/name/theme — enough
                           to render the Welcome grid without fetching
                           anything per-character yet.
  app.js                  The entire game: math generator, scoring/streak
                           state machine (MagicMathCore — also runnable
                           under Node, see remote/tests/), character asset
                           loader, and all screen rendering (MagicMathApp).
  styles.css               All visual styling (mobile-first, RTL, safe-area
                           aware, light/dark per-character theming).
  global/                  Assets shared by the whole app (e.g. a future
                           global/welcome.webp background). Empty today —
                           the Welcome screen falls back to a CSS gradient
                           until one is added.
  characters/<id>/         See "Character folder layout" below.
  tests/
    game-logic.test.js     Plain Node test (no deps) for the scoring/streak
                           rules. Run: node remote/tests/game-logic.test.js
```

## Character folder layout

```
remote/characters/<id>/
  character.json           Asset manifest for this character (paths below
                           are relative to this file's own folder).
  character/
    select.webp             Welcome-grid thumbnail
    idle.webp
    happy.webp
    try-again.webp
    celebration.webp
  backgrounds/
    game.webp                shown during normal play
    celebration.webp         shown on a streak milestone + on Results
    try-again.webp            shown briefly on a wrong answer
    distant.webp               optional soft backdrop layer (unused today)
  environment/, decorations/, icons/
                             Free-form themed art. `icons/progress-star.webp`
                           is used for the 10-step progress row if present
                           (falls back to a ⭐ emoji). Any `icons/bonus-*`
                           file is used as celebration confetti at a streak
                           milestone (falls back to sparkle emoji).
  audio/
    start-01.mp3, start-02.mp3
    correct-01.mp3, correct-02.mp3, correct-03.mp3
    wrong-01.mp3, wrong-02.mp3
    bonus-03.mp3, bonus-06.mp3, bonus-09.mp3
    finish-01.mp3, finish-02.mp3
```

`character.json` lists exactly which files exist per category (see any
existing character for the exact shape). **Every list entry is optional
except the four `character/` poses and `select.webp`** — a missing
background, environment/decoration/icon, or audio clip is simply skipped
at runtime, never a crash. This is what let the dragon character ship
today with only `start`/`correct` audio recorded (no `wrong`/`bonus`/
`finish` yet) — the game just plays nothing for those moments.

### Current roster

| id | status |
|---|---|
| `unicorn`, `princess` | full art + full 12-clip audio set |
| `kitten`, `rainbow`, `race-car` | full art, no audio yet (silent reactions) |
| `dragon` | full art, partial audio (`start`, `correct` only) |
| `dinosaur` | audio recorded, **no art yet** — not in `config.json`, not selectable |
| `robot` | nothing produced yet — not in `config.json` |

Add `dinosaur`/`robot` (or any brand-new character) to the roster the same
way described below once their art exists.

## How to add a new character

No changes to `app.js` are needed — the whole pipeline is data-driven.

1. Create `remote/characters/<id>/` following the layout above. At minimum
   you need `character.json` + the 5 `character/*.webp` poses.
2. Add an entry to `remote/config.json`'s `characters` array:
   ```json
   { "id": "robot", "name": "רובוט",
     "theme": { "from": "#e6f6ff", "to": "#dfe8ff", "accent": "#4fa8ff", "dark": false } }
   ```
   `theme.dark: true` switches the app's gradient screens (Welcome,
   Settings, Results) to light-on-dark text — use it for a visually dark
   character (like `dragon`).
3. Bump `version` in `config.json` (see "Version update process" below).
4. Push. Every launcher in the wild picks this up automatically on next
   launch — nothing is redistributed.

## How to replace character graphics or audio

Overwrite the file(s) under `remote/characters/<id>/` (same filenames), and
if `character.json`'s asset lists changed (e.g. you added a background
that didn't exist before), update that file too. Then bump `version` in
`config.json` — **this step is required**: without it, browsers that
already cached the old file at the old `?v=` URL will keep serving it
indefinitely.

## Asset naming rules

- Lowercase English filenames only, hyphens for multi-word names
  (`race-car`, `bonus-03.mp3`) — no Hebrew in filenames.
- `.webp` for all images, `.mp3` for all audio.
- Character ids match the folder name and `character.json`'s own `"id"`.

## Version update process

`remote/config.json`'s `"version"` is the single switch that controls
whether returning visitors see new content:

1. Make your change(s) under `remote/` (code, styles, config, or any
   character's assets).
2. Bump `version` (e.g. `"1.0.0"` → `"1.0.1"`).
3. Push to the branch GitHub Pages serves.

The launcher always fetches `config.json` fresh (no caching), reads the new
version, and uses it to cache-bust every other remote URL it builds
(`app.js?v=1.0.1`, `characters/unicorn/character.json?v=1.0.1`, etc.), so
the browser is guaranteed to fetch the new files instead of reusing old
cached ones. If you only change a character's assets and forget to bump
the version, browsers may keep serving the old cached copies.

## Deploying `remote/` to GitHub Pages

1. Push this repository to GitHub (`origin` is already configured as
   `rdwr-valentineg/magic-math`).
2. In the repository, go to **Settings → Pages**, set **Source** to
   `Deploy from a branch`, choose `main` and `/ (root)`, then **Save**.
3. Once Pages is live, `remote/` is served at
   `https://rdwr-valentineg.github.io/magic-math/remote/` — this exact URL
   is the `DEFAULT_REMOTE_BASE` hardcoded in `distribution/magic-math.html`.
   If you fork this under a different GitHub account/repo name, update
   that constant to match.

GitHub Pages serves every file with a permissive CORS header, which is
what lets `magic-math.html` — opened from `file://`, email, anywhere — call
`fetch()` on `remote/config.json` across origins.

## Distributing the game

Send people `distribution/magic-math.html` — as an email attachment, a
download link, however you like. They can double-click it to open locally,
or you can host it anywhere (it does not need to live next to `remote/`).
As long as they have internet access on first open, the game loads. There
is nothing else to distribute, ever, for a content update.

## Local testing

`remote/` needs to be served with CORS enabled for a locally-opened
launcher to reach it (GitHub Pages does this automatically in production).
A plain `python3 -m http.server` does **not** send CORS headers, so for a
realistic local test, serve `remote/` with a tiny wrapper that adds one:

```py
# serve-remote-with-cors.py
import http.server, functools
class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
http.server.test(HandlerClass=functools.partial(CORSHandler, directory='remote'), port=8899)
```

Then open `distribution/magic-math.html` directly (`file://...`, or served
from any other port) with `?base=http://localhost:8899/` appended to the
URL, e.g.:

```
file:///path/to/magic-math/distribution/magic-math.html?base=http://localhost:8899/
```

## Running the game-logic tests

```sh
node remote/tests/game-logic.test.js
```

Covers scoring, the score-floor-at-0 rule, and — the critical fix in this
version — that celebration bonuses trigger on **consecutive** correct
answers only, resetting to 0 immediately on any wrong answer (so
`correct, correct, wrong, correct, correct, correct` bonuses at streak 3,
never at "5 total correct").
