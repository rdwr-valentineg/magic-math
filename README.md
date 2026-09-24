# משחקי קסם (Magic Math platform)

A mobile-first, Hebrew (RTL) educational game platform for children ~3-7,
split into two layers:

- **`distribution/magic-math.html`** — a single, self-contained launcher
  file. This is the *only* file ever sent to a user directly (email,
  AirDrop, a download link). It has its own tiny loading screen and
  friendly error screen, and knows one thing: a URL to fetch the actual
  platform from (`DEFAULT_REMOTE_BASE`, overridable with `?base=...`).
- **`remote/`** — the real platform: a portable, installable, offline-
  capable PWA (config, platform code, games, and every character's
  art/audio), hosted on GitHub Pages (or any static host, or a custom
  domain — see "Portability" below). The launcher fetches it at runtime and
  boots it into itself, no iframe involved. **`remote/` can also be opened
  directly** (`remote/index.html`) as its own standalone, installable app.

This means the platform can be fixed, restyled, given new games/characters,
or reskinned by pushing to `remote/` and bumping a version number —
**without ever re-sending `magic-math.html` to anyone**.

## Architecture: platform, games, characters

The app is split into three independent layers plus a shared boot sequence:

```
remote/
  index.html              Standalone entry point (visit this directly to
                          install/use the PWA). Registers the service
                          worker; everything else is identical to what the
                          launcher boots.
  manifest.webmanifest    PWA manifest (relative start_url/scope: ".")
  sw.js                   Service worker: precaches the small app shell,
                          caches everything else opportunistically on first
                          fetch (so new games/characters need no SW changes).
  boot.js                 PlatformBoot.start(baseUrl, rootEl) — the ONE
                          shared bootstrap both distribution/magic-math.html
                          and remote/index.html call. Fetches config.json,
                          loads platform.css + the core platform scripts,
                          then Platform.init(...). Everything it loads is
                          relative to `baseUrl`, never to its own location —
                          that's what makes remote/ portable.
  config.json             { version, games[] (id/name/icon/enabled),
                          characters[] (id/name/theme) }

  js/
    core/
      math-core.js         Pure Math logic (question generator + the
                          scoring/streak state machine) — Node-testable,
                          zero DOM access. Lazy-loaded only when Math opens
                          (declared as a dependency in games/math/config.js).
      session-core.js        MagicMathSessionCore.SessionManager — the
                          reusable, game-agnostic session engine every
                          other game uses: scoring, streak, and "should the
                          session keep going" for all three session modes
                          (questions/score/time). Knows nothing about
                          exercises — see "Session configuration system"
                          below. Node-testable, zero DOM access, always
                          loaded (core platform script).
    platform:
      storage.js            Namespaced localStorage (magicMath.platform.*,
                          magicMath.games.<id>.*)
      audio-manager.js       Plays a random clip from an event's pool
                          (start/correct/wrong/streak/finish), never
                          repeating the same clip twice in a row
      theme-manager.js        Resolves which background to show for a
                          game+character+state — pure logic, Node-testable
                          (see remote/tests/theme-manager.test.js)
      character-manager.js     Loads/preloads a character's assets
      character-registry.js     Accessor over config.json's characters[]
      game-registry.js          Drives the Home screen from config.json's
                          games[]; lazy-loads a game's own code on demand
      ui.js                     Shared DOM helpers + chrome (exit/mute
                          buttons, confirm modal)
      session-ui.js             SessionUI — the reusable session settings
                          picker (mode tabs + presets + custom value) and
                          the one progress-bar renderer shared by every
                          session mode. Built on session-core.js.
      navigation.js             The screen state machine: Home → Character
                          Select → Settings → Play → Results. Home/
                          Character Select are platform-owned; Settings/
                          Play/Results are delegated to the active game
                          module's own renderSettings/renderPlay/
                          renderResults(ctx) — "the platform provides the
                          shell, the game provides the activity."

  games/
    math/
      config.js              Math's own settings: number range, operations,
                          totalQuestions, scoring, streak {threshold, bonus}
      game.js                 Math's UI: settings fields, exercise display,
                          numeric keypad — wired to js/core/math-core.js
    letters/
      config.js               Choice count, scoring, streak, session modes/
                          presets/limits, activities list (V1: First Letter
                          only)
      content.js               Data-driven word pool (word/firstLetter/
                          emoji placeholder/difficulty) + the base alphabet
                          and a confusable-letter-pairs list
      logic.js                  Pure-logic question/distractor generation
                          (Node-testable, see remote/tests/letters-logic.
                          test.js)
      game.js                    First Letter activity UI, wired to
                          content.js/logic.js + session-core.js/session-ui.js
    numbers/
      config.js               Range limits, per-activity practical quantity
                          caps, scoring, streak, session modes/presets/
                          limits, activities list (V1: Count the Objects +
                          Number to Quantity)
      content.js                Data-driven object types (emoji placeholder
                          per type)
      logic.js                   Pure-logic question generation for both
                          activities (Node-testable, see remote/tests/
                          numbers-logic.test.js)
      game.js                     Both activities' UI, the range picker
                          (dual slider + synced numeric fields), and the
                          shared quantity-grid renderer

  assets/
    global/
      icons/                   Platform-wide icons (PWA app icons, game
                          card icons) — today's are flat-color placeholders
    characters/<id>/           See "Character folder layout" below —
                          entirely independent of any game

  styles/
    platform.css              All shared styling (mobile-first, RTL,
                          safe-area aware, light/dark per-character theming)

  tests/
    game-logic.test.js         Node tests for math-core.js's scoring/streak
                          rules. Run: node remote/tests/game-logic.test.js
    theme-manager.test.js      Node tests for the layered background
                          fallback. Run: node remote/tests/theme-manager.test.js
```

## How the layered background/theme system works

A game defines a base "world" (backgrounds under `games/<id>/assets/`, once
any exist — Math has none yet, so it always falls through to the
character's own art). A character may optionally override any of it.
`ThemeManager.resolveBackground({ character, game, state })` walks:

1. `character.backgrounds[state]` — character's state-specific override
2. `character.backgrounds.game` — character's own default background
3. `game.backgrounds[state]` — game's state-specific background
4. `game.backgrounds.default` — game's default background
5. *(none)* — the app falls back to the CSS theme gradient

`state` is one of `idle | wrong | streak | finish`. No character needs
every optional background — a missing one just falls through to the next
layer, automatically, with zero code changes. Adding a `games/math/assets/
backgrounds/streak.webp` later immediately gives every character a shared
streak backdrop unless they already override it.

## Session configuration system

Letters and Numbers both use a shared, reusable session engine instead of
each hard-coding "10 questions" the way Math's `totalQuestions` does. It's
split the same way as the background system above: pure logic in
`js/core/session-core.js`, DOM in `js/platform/session-ui.js`.

A game declares which session modes it supports (and their presets/limits)
in its own `config.js`:

```js
session: {
  modes: ['questions', 'score', 'time'],
  presets: { questions: [10, 15, 20, 30], score: [10, 20, 30], time: [3, 5, 10] },
  limits: { questions: { min: 5, max: 100 }, score: { min: 5, max: 200 }, time: { min: 1, max: 30 } },
  defaultMode: 'questions',
  defaultValue: { questions: 10, score: 20, time: 5 }
}
```

`SessionUI.renderPicker(...)` turns that into the "משחקים לפי: שאלות /
ניקוד / זמן" settings UI (tabs + presets + a custom numeric field, synced),
and persists the choice per-game via `Storage`. At play time, the game
creates one `MagicMathSessionCore.SessionManager(sessionConfig, {scoring,
streak})` and calls exactly two methods:

- `manager.recordAnswer(correct)` — scoring + streak, same shape as
  `MagicMathCore.GameSession#submitAnswer` (score floored at 0, a streak
  event fires on every multiple of the configured `threshold`, resets
  immediately on a wrong answer).
- `manager.isOver()` — checked only at a safe boundary, right after an
  answer's feedback animation finishes, never mid-question. This is what
  makes time mode end gracefully: the session's elapsed time is only ever
  *asked about* between interactions, so a running feedback/celebration
  sequence always finishes before Results appears.

`manager.progressFraction()` (0..1) drives one shared progress-bar visual
(`SessionUI.renderProgress`) for all three modes — no per-mode progress UI
needed, and deliberately no numeric countdown for time mode.

The session engine is intentionally ignorant of exercises/questions: each
game still owns generating its own next question (see games/letters/
logic.js and games/numbers/logic.js) and only reports correct/incorrect.
Math has not been migrated to this system — it keeps its own
`MagicMathCore.GameSession` (fixed 10-question sessions) unchanged.

## The streak system

`GameSession` (in `js/core/math-core.js`) tracks `correctStreak`, which
resets to 0 immediately on any wrong answer. A **streak event** fires every
time `correctStreak` becomes a multiple of a configurable `threshold`
(default 3, set in `games/math/config.js`), awarding a configurable `bonus`
on top of the normal correct score. No code anywhere depends on the
specific numbers 3/6/9 — a character's celebration audio is just one pool
(`character.json`'s `audio.streak` array), and a random clip from it plays
on every streak event, whatever the streak count.

## Character folder layout

```
remote/assets/characters/<id>/
  character.json           Asset manifest for this character (paths below
                           are relative to this file's own folder).
  character/
    select.webp             Welcome-grid thumbnail
    idle.webp
    happy.webp
    tryAgain.webp (file: try-again.webp)
    celebration.webp
  backgrounds/
    game.webp                shown during normal play (the character's
                           "default" background layer)
    celebration.webp         shown on a streak event + on Results
    tryAgain.webp (file: try-again.webp)   shown briefly on a wrong answer
    distant.webp               optional soft backdrop layer (unused today)
  environment/, decorations/, icons/
                             Free-form themed art. `icons/progress-star.webp`
                           is used for the 10-step progress row if present
                           (falls back to a ⭐ emoji). Any `icons/bonus-*`
                           file is used as celebration confetti at a streak
                           event (falls back to sparkle emoji).
  audio/
    start-01.mp3, start-02.mp3, ...
    correct-01.mp3, correct-02.mp3, ...
    wrong-01.mp3, wrong-02.mp3, ...
    streak-01.mp3, streak-02.mp3, ...      (any number of clips)
    finish-01.mp3, finish-02.mp3, ...
```

`character.json` lists exactly which files exist per category. **Every
list entry is optional except the four `character/` poses and
`select.webp`** — a missing background, environment/decoration/icon, or
audio clip is simply skipped at runtime, never a crash. Educational content
(e.g. letter sounds for the future Letters game) belongs under
`games/<id>/assets/`, never under a character folder — characters own only
their own reactions, never a game's teaching material.

## How to add a game to the platform

1. Create `remote/games/<id>/config.js` — at minimum
   `window.GameConfigs = window.GameConfigs || {}; window.GameConfigs.<id> = { id: '<id>', enabled: false };`
   for a placeholder, or a full settings object (see `games/math/config.js`)
   plus a `scripts: [...]` array for any pure-logic dependency it needs
   loaded first (paths relative to the platform's own root).
2. Add `remote/games/<id>/game.js` that registers
   `window.Games.<id> = { renderSettings, renderPlay, renderResults }` (see
   `games/math/game.js` for the contract — each function receives a `ctx`
   with `baseUrl`/`version`/`characterId`/`characterManifest`/`session` and
   navigation callbacks, and returns a full `<section class="screen ...">`
   element). Only needed once the game is ready to be playable.
3. Add one entry to `remote/config.json`'s `games[]` array:
   `{ "id": "<id>", "name": "...", "icon": "assets/global/icons/....svg", "enabled": true }`.
4. Bump `version` in `config.json` and push.

No platform code needs to change — the Home screen is generated entirely
from `config.json`'s `games[]`.

## How to add a character

1. Create `remote/assets/characters/<id>/` following the layout above. At
   minimum you need `character.json` + the 5 `character/*.webp` poses.
2. Add an entry to `remote/config.json`'s `characters` array:
   ```json
   { "id": "robot", "name": "רובוט",
     "theme": { "from": "#e6f6ff", "to": "#dfe8ff", "accent": "#4fa8ff", "dark": false } }
   ```
   `theme.dark: true` switches the app's gradient screens to light-on-dark
   text — use it for a visually dark character.
3. Bump `version` in `config.json` and push.

No game or platform code ever needs to change — a character works with
every game automatically, and any game works with a character that has no
custom art at all (it just falls back to the game's own world, or the CSS
gradient).

## Portability — no domain/path is ever hardcoded in `remote/`

Everything under `remote/` is built from a `baseUrl` passed in at boot time
(`PlatformBoot.start(baseUrl, rootEl)`) — never from its own script
location, never from a hardcoded domain. The exact same `remote/` folder
can be:

- opened directly at `remote/index.html` (installable, offline-capable),
- served from GitHub Pages at any sub-path,
- served from a custom domain root,
- or fetched cross-origin by the launcher —

without editing a single line of application code. `manifest.webmanifest`
uses relative `start_url`/`scope` (`"."`) for the same reason.

The **only** intentional exception in the whole repo is
`distribution/magic-math.html` (and `distribution/share.html`), whose
entire job is to point at wherever `remote/` is actually hosted — that one
hardcoded `DEFAULT_REMOTE_BASE` constant is what a launcher fundamentally
needs to do its job, and is overridable with `?base=...` for local testing.

## Offline / PWA

Visiting `remote/index.html` directly registers `remote/sw.js`, which:

- precaches a small, fixed app-shell list (`index.html`, `boot.js`, the
  manifest, and the icons) on install;
- caches everything else (platform scripts, a game's own files, character
  assets) opportunistically the first time it's actually fetched — so
  adding a new game or character later needs **no changes to `sw.js`**;
- always fetches `config.json` network-fresh (never from the cache), since
  that's how the app itself detects a new version;
- serves the cached shell page for navigations when offline.

Because every platform/game/character asset URL already carries a
`?v=<config.version>` cache-busting query, bumping `version` naturally
fetches+caches fresh copies under the existing cache-first strategy — the
service worker's own cache *name* is only needed to invalidate `index.html`
and `boot.js`, the two files requested without that query.

The launcher (`distribution/magic-math.html`) never registers a service
worker — it's either opened via `file://` or lives on a different origin
than `remote/`, and same-origin is a hard requirement for SW registration.
Offline/installable applies to visiting the platform's real hosted URL
directly, by design.

## Preserving the Math game

The Math game's rules are unchanged from before this platform refactor:

- Range presets: 10 / 20 / 50 / 100 (via a dual-slider "practice between X
  and Y" picker).
- Operations: + − × ÷, one or multiple selectable.
- 10 questions per game, no timer.
- No negative subtraction answers; division always produces a whole number.
- Duplicate questions avoided where practical.
- A wrong answer allows another attempt on the same question (score -1,
  streak reset — never advances to the next question).

The only *behavioral* change is the streak system itself (see above): fixed
3/6/9 milestones became a configurable `threshold`/`bonus`, which happens
to reproduce the exact same 3-6-9 cadence with the shipped default of
`threshold: 3`.

## Local testing

`remote/` needs to be served with CORS enabled for a locally-opened
launcher to reach it (GitHub Pages does this automatically in production).
A plain `python3 -m http.server` does **not** send CORS headers, so for a
realistic local test, serve the repo root with a tiny wrapper that adds one:

```py
# serve-with-cors.py
import http.server, functools
class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
http.server.test(HandlerClass=functools.partial(CORSHandler, directory='.'), port=8899)
```

Then either:

- Open `http://localhost:8899/remote/index.html` directly (the standalone
  PWA path), or
- Open
  `distribution/magic-math.html?base=http://localhost:8899/remote/`
  (the launcher path) — or `file:///path/to/distribution/magic-math.html?base=http://localhost:8899/remote/`
  to test it exactly as a double-clicked emailed file would behave.

## Running the tests

```sh
node remote/tests/game-logic.test.js
node remote/tests/theme-manager.test.js
node remote/tests/session-core.test.js
node remote/tests/letters-logic.test.js
node remote/tests/numbers-logic.test.js
```

`game-logic.test.js` covers Math's scoring/streak rules (score floor at 0,
streak events firing on every multiple of the configured threshold,
resetting immediately on a wrong answer, fully configurable thresholds/
bonuses/scoring). `theme-manager.test.js` covers `ThemeManager`'s 5-layer
background fallback using fake manifests. `session-core.test.js` covers
`SessionManager`'s three session modes (questions/score/time ending at the
right moment) and its scoring/streak rules. `letters-logic.test.js` and
`numbers-logic.test.js` cover each game's pure-logic question/distractor
generation (correct answer always present exactly once, confusable letters
excluded, quantities respect the practical render cap, zero is reachable,
etc.).

## Deploying `remote/` to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, go to **Settings → Pages**, set **Source** to
   `Deploy from a branch`, choose `main` and `/ (root)`, then **Save**.
3. Once Pages is live, `remote/` is served at
   `https://<user>.github.io/<repo>/remote/`. Update
   `DEFAULT_REMOTE_BASE` in `distribution/magic-math.html` to match if you
   forked this under a different account/repo name — that constant is the
   one intentional exception described under "Portability" above.
4. To serve the platform from a custom subdomain instead, point it at
   `remote/` (or its contents, at the domain root) — no code changes are
   needed either way, since nothing under `remote/` hardcodes its own URL.

## Distributing the game

Send people `distribution/magic-math.html` — as an email attachment, a
download link, however you like. They can double-click it to open locally,
or you can host it anywhere (it does not need to live next to `remote/`).
As long as they have internet access on first open, the game loads.

Alternatively, share the direct URL to `remote/index.html` (wherever it's
hosted) — visitors can install it to their home screen and play offline
after the first load.
