# משחקי קסם (Magic Math platform)

A mobile-first, Hebrew (RTL) educational game platform for children ~3-7:
a portable, installable, offline-capable PWA (config, platform code, games,
and every character's art/audio), hosted on GitHub Pages at
**https://games.valice.uk**.

To share the game, send that link. Push changes to `main` and every player
gets them on their next open — nobody ever needs to clear anything in their
browser (see "Offline / PWA" and "Releasing changes" below).

## Repo layout

The repo root **is** the site. Besides the app itself (see "Architecture"
below), a few files exist for hosting and housekeeping only:

```
CNAME                The custom domain for GitHub Pages (games.valice.uk).
                    Required while Pages deploys from the main branch —
                    deleting it drops the custom domain.
.nojekyll            Tells GitHub Pages not to run Jekyll processing, so
                    files are served exactly as committed.
remote/              Legacy stub. The app lived at /remote/ until 2.10.0;
                    remote/index.html redirects old bookmarks/home-screen
                    installs to "/", and remote/sw.js retires the old
                    /remote/ service worker. Safe to delete once nobody
                    opens /remote/ any more.
.github/workflows/   bump-version.yml (auto version bump, see "Releasing
                    changes") and tests.yml (runs tests/ on every push/PR).
tests/               Plain-Node tests (served publicly too; harmless).
```

## Architecture: platform, games, characters

The app is split into three independent layers plus a shared boot sequence:

```
(repo root = site root)
  index.html              The entry point. Shows the loading screen
                          (#app-loading: assets/global/backgrounds/
                          loading[-mobile].webp + a progress bar, all static
                          so it paints before any script runs), boots the
                          platform, registers the service worker, and
                          carries the link-preview (og:) tags used by
                          WhatsApp/Messages/Telegram.
  manifest.webmanifest    PWA manifest (relative start_url/scope: ".")
  sw.js                   Service worker: precaches the small app shell,
                          caches everything else opportunistically on first
                          fetch (so new games/characters need no SW changes).
                          See "Offline / PWA".
  boot.js                 PlatformBoot.start(baseUrl, rootEl, { splash }),
                          called by index.html. Fetches config.json, loads
                          platform.css + the core platform scripts,
                          preloads the images Home and Character Select
                          show (logo, welcome background, game icons,
                          character thumbnails), then Platform.init(...)
                          and fades the loading screen out (shown at least
                          1.2s). Each step advances the loading bar; on
                          failure it shows a retry button instead.
                          Everything it loads is relative to `baseUrl`,
                          never to a hardcoded domain or path.
  config.json             { version, logo, welcomeBackground, games[]
                          (id/name/icon/enabled), characters[] (id/name/theme) }
                          `logo` is drawn top-centre on every screen by
                          navigation.js (on the play screen, inside the
                          game's .game-topbar between exit and mute).

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
                          (see tests/theme-manager.test.js)
      character-manager.js     Loads/preloads a character's assets
      character-registry.js     Accessor over config.json's characters[]
      game-registry.js          Drives the Home screen from config.json's
                          games[]; lazy-loads a game's own code on demand
      ui.js                     Shared DOM helpers + chrome (exit/mute
                          buttons, confirm modal)
      scene.js                  Screen backgrounds: fill the screen (cover),
                          pick portrait/landscape art, crop around a focus
                          point and stand the character on the art's stage
                          point (see "layered background/theme system")
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
    letters-core/
      logic.js                 LettersCoreLogic — pure-logic engine shared
                          by EVERY letter/word game: content-set filtering
                          (all/custom letters), unique-target-word tracking
                          for a session, and the three activities' choice/
                          distractor builders (Node-testable, see
                          tests/letters-core-logic.test.js)
      engine.js                 LettersCoreEngine.createGame(options) — the
                          shared UI (settings/play/results) for all three
                          activities (First Letter, Entire Word,
                          Letter → Image), the content-set picker, and the
                          Show Word toggle. Takes a language's own
                          config/content and returns a fresh, independently
                          stateful {renderSettings,renderPlay,renderResults}
                          module — see "Letter/Word games" below.
    hebrew-letters/
      config.js                Hebrew's own knobs (direction: 'rtl',
                          activities, choice count, scoring, streak,
                          session modes/presets/limits)
      content.js                Hebrew word/letter dataset (several words
                          per base letter, so a session can ask more
                          questions than there are letters without
                          repeating a target) + the base alphabet, final
                          forms, and a confusable-letter-pairs list
      game.js                    ~10 lines: calls LettersCoreEngine.
                          createGame({id, cfg, content}) and registers the
                          result
    english-letters/
      config.js                English's own knobs (direction: 'ltr'),
                          otherwise mirrors hebrew-letters/config.js
      content.js                English word/letter dataset (several words
                          per letter A-Z), same shape as Hebrew's
      game.js                    Same one-call wiring as hebrew-letters/
                          game.js, against the English config/content
    numbers/
      config.js               Range limits, per-activity practical quantity
                          caps, scoring, streak, session modes/presets/
                          limits, activities list (V1: Count the Objects +
                          Number to Quantity)
      content.js                Data-driven object types (emoji placeholder
                          per type)
      logic.js                   Pure-logic question generation for both
                          activities (Node-testable, see tests/
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
                          rules. Run: node tests/game-logic.test.js
    theme-manager.test.js      Node tests for the layered background
                          fallback. Run: node tests/theme-manager.test.js
    scene.test.js              Node tests for background layout (cover
                          crop, stage clamping, portrait variants, settings
                          state). Run: node tests/scene.test.js
```

## Letter/Word games (Hebrew Letters, English Letters)

Hebrew Letters and English Letters are two entries in the Game Registry
that share one engine. All gameplay logic — the three activities, the
content-set picker, Show Word, unique-target tracking, distractor
generation — lives once in `games/letters-core/`. A language is nothing
more than a `config.js` (direction + gameplay knobs) and a `content.js`
(alphabet + word dataset) passed into `LettersCoreEngine.createGame(...)`:

```js
// games/hebrew-letters/game.js (english-letters/game.js is the same shape)
window.Games['hebrew-letters'] = LettersCoreEngine.createGame({
  id: 'hebrew-letters',
  cfg: window.GameConfigs['hebrew-letters'],
  content: window.HebrewLettersContent
});
```

Adding a third language later is exactly this: a new `games/<lang>/
{config.js,content.js,game.js}` folder plus one `config.json` entry — no
change to `letters-core/` itself.

**The three activities** (First Letter, Entire Word, Letter → Image) all
generate their question from the same concept, a "target word", picked
once per question and never repeated within a session:

- **First Letter** — show the word's illustration (+ the written word if
  Show Word is on), child taps its first letter among a few letter choices.
- **Entire Word** — show the illustration (+ the word as a non-selectable
  hint if Show Word is on), child taps the matching written word among a
  few word choices.
- **Letter → Image** — show one big letter, child taps the one image among
  several whose word starts with it (never any text labels on the images).

**Direction.** Each language's `config.js` sets `direction: 'rtl'|'ltr'`.
`LettersCoreEngine` stamps that as a `dir` attribute on the specific
containers it renders (word text, choice grids, the content-set letter
grid) — never on `<html>` — so English content reads LTR inside the
still-RTL app shell, the same technique `.exercise`/`.keypad` already use
for Math's digits.

**Content sets (spec: all letters vs. a custom selection).** Settings
persist `contentMode: 'all'|'custom'` and, for custom, a `selectedLetters`
array; `LettersCoreLogic.resolveActiveLetters(...)` turns that into the
active letter set every other function filters against. An empty custom
selection is treated as "all" rather than silently generating zero
questions.

**Show Word** is a plain on/off pill (`settings.showWord`, only rendered
for the activities listed in `cfg.showWordActivities`) sitting in the same
pill row as the "all letters"/"custom selection" buttons — an independent
toggle, not mutually exclusive with them, just placed there to stay
compact. It only affects First Letter/Entire Word (Letter → Image never
reveals a word).

**Unique target words per session (spec: no repeats).** A session-scoped
`usedIds` set (reset every time a session starts) is checked by
`pickNextTargetWord` before every question; a wrong answer never marks a
word used (spec: the child keeps trying the same question). When the
eligible pool runs out before the session's own end condition
(`SessionManager#isOver()`), the engine ends the session right there —
internally this is a "content exhausted" ending rather than a repeated
target, but Results looks and feels exactly like any other completion.

**Session length vs. available words.** For "questions" mode, the settings
screen computes how many unique words the current content selection can
supply and narrows the session picker's presets/limits to that (the same
technique `games/numbers/game.js` already uses for its practical-quantity
hint) — so you can never configure "30 questions" against 18 available
words. Score/time modes aren't pre-validated this way; they simply end
early via content exhaustion if they run out.

The `settings-hint` note ("X unique words available...") only renders when
the pool is actually smaller than the largest preset on offer (i.e. it
would really constrain a choice) — with enough words in the pool to cover
every preset, the note is irrelevant and stays hidden rather than showing
as permanent clutter.

**Distractors.** Letter choices, word choices, and image choices are all
drawn from the *active* content set first, widening to the full language
dataset only if that set is too small to supply enough distinct
distractors (`LettersCoreLogic.candidatePool`) — this is what keeps a
narrow custom letter selection from ever making a question impossible to
generate. Letter → Image additionally guarantees exactly one correct image
is ever shown (distractor images are always words with a *different*
first letter).

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

`state` is one of `idle | wrong | streak | finish | settings` (`settings`
maps to the character's `distant` background, shown blurred behind the
settings screen). No character needs
every optional background — a missing one just falls through to the next
layer, automatically, with zero code changes. Adding a `games/math/assets/
backgrounds/streak.webp` later immediately gives every character a shared
streak backdrop unless they already override it.

**Feedback state persists until the next answer.** Each game's play screen
keeps its own `playUi.characterPose`/`playUi.bgState` (`idle` at session
start, `happy`/`celebration`+`streak` on a correct answer, `tryAgain`+
`wrong` on an incorrect one). Neither is reset back to `idle` on a timer —
the brief `setTimeout` after an answer only unlocks input and advances the
question; the last result's pose/background stay exactly as they were
until the *next* recorded answer overwrites them. This is deliberate: it
reads as continuous feedback ("still happy" / "still stuck") rather than
flickering back to neutral between questions.

### Fitting every screen: portrait art, focus and stage

Backgrounds always fill the whole screen (`object-fit: cover`), so nothing
is letterboxed — the overflow is cropped instead. Three optional
`character.json` fields control how (all points are `[x, y]` fractions of
the image, `0..1`):

```json
"backgroundsPortrait": {
  "game": "backgrounds/game-mobile.webp",
  "tryAgain": "backgrounds/try-again-mobile.webp"
},
"backgroundLayout": {
  "game": { "focus": [0.5, 0.4], "stage": [0.5, 0.55] }
},
"backgroundLayoutPortrait": {
  "game": { "focus": [0.5, 0.3], "stage": [0.5, 0.56] }
}
```

- `backgroundsPortrait` — used instead of `backgrounds[key]` whenever the
  screen is taller than wide (phones, upright tablets); swapped live on
  rotation. A missing portrait file falls back to the landscape one.
- `focus` — the point kept in view when the image is cropped
  (object-position). Default: centre.
- `stage` — where the character's feet stand on the play screen. The
  character is moved there, but never over the progress row above it or
  the question card below it. Without a `stage` the character keeps its
  normal place.

`backgroundLayout` applies to the landscape images, `backgroundLayoutPortrait`
to the portrait ones. Open the app with `?stagedebug` to see a red dot on
the stage point while tuning. `config.json`'s `welcomeBackground`
(`{ "src", "focus", "portrait": { "src", "focus" } }`) is shown behind Home
and Character Select. See `BACKGROUND-ART.md` for the art rules.

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
ניקוד / זמן" settings UI (mode tabs + a preset grid) and persists the
choice per-game via `Storage`. The custom numeric field renders as one more
chip inline in that same preset grid (styled identically to the preset
buttons, highlighted only when the value doesn't match a preset) rather
than as a separate row below it. At play time, the game
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
game still owns generating its own next question (see games/letters-core/
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
assets/characters/<id>/
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
    distant.webp               blurred behind the Settings screen
    *-mobile.webp              optional portrait (9:16) versions of the
                           above, listed in `backgroundsPortrait`
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
(e.g. future letter/word pronunciation audio for Hebrew Letters or English
Letters) belongs under
`games/<id>/assets/`, never under a character folder — characters own only
their own reactions, never a game's teaching material.

## How to add a game to the platform

1. Create `games/<id>/config.js` — at minimum
   `window.GameConfigs = window.GameConfigs || {}; window.GameConfigs.<id> = { id: '<id>', enabled: false };`
   for a placeholder, or a full settings object (see `games/math/config.js`)
   plus a `scripts: [...]` array for any pure-logic dependency it needs
   loaded first (paths relative to the platform's own root).
2. Add `games/<id>/game.js` that registers
   `window.Games.<id> = { renderSettings, renderPlay, renderResults }` (see
   `games/math/game.js` for the contract — each function receives a `ctx`
   with `baseUrl`/`version`/`characterId`/`characterManifest`/`session` and
   navigation callbacks, and returns a full `<section class="screen ...">`
   element). Only needed once the game is ready to be playable.
3. Add one entry to `config.json`'s `games[]` array:
   `{ "id": "<id>", "name": "...", "icon": "assets/global/icons/....svg", "enabled": true }`.
4. Push. (`version` is bumped automatically — see "Releasing changes".)

No platform code needs to change — the Home screen is generated entirely
from `config.json`'s `games[]`.

## How to add a character

1. Create `assets/characters/<id>/` following the layout above. At
   minimum you need `character.json` + the 5 `character/*.webp` poses.
2. Add an entry to `config.json`'s `characters` array:
   ```json
   { "id": "robot", "name": "רובוט",
     "theme": { "from": "#e6f6ff", "to": "#dfe8ff", "accent": "#4fa8ff", "dark": false } }
   ```
   `theme.dark: true` switches the app's gradient screens to light-on-dark
   text — use it for a visually dark character.
3. Push. (`version` is bumped automatically — see "Releasing changes".)

No game or platform code ever needs to change — a character works with
every game automatically, and any game works with a character that has no
custom art at all (it just falls back to the game's own world, or the CSS
gradient).

## Portability — no domain/path is ever hardcoded

Everything is built from a `baseUrl` passed in at boot time
(`PlatformBoot.start('./', rootEl)`) — never from a hardcoded domain. The
same files work unchanged at a custom domain root, at any GitHub Pages
sub-path (`https://<user>.github.io/<repo>/`), or opened from a local
server. `manifest.webmanifest` uses relative `start_url`/`scope` (`"."`)
for the same reason.

The one intentional exception is the link-preview tags in `index.html`
(`og:url`, `og:image`): chat apps require absolute URLs there, so they name
`https://games.valice.uk/`. Update them if the site ever moves.

## Offline / PWA

`index.html` registers `sw.js` (scope: the site root), which:

- precaches a small, fixed app-shell list (`index.html`, `boot.js`, the
  manifest, the icons, and the loading-screen art) on install;
- caches everything else (platform scripts, a game's own files, character
  assets) opportunistically the first time it's actually fetched — so
  adding a new game or character later needs **no changes to `sw.js`**;
- always fetches `config.json` network-fresh (never from the cache), since
  that's how the app itself detects a new version;
- fetches every request without a `?v=` query network-first — navigations
  (`index.html`), `boot.js`, the loading-screen art and icons that
  `index.html` references before `config.json` is known, and game-card
  icons — falling back to the cache when offline.

Every platform/game/character asset URL carries a `?v=<config.version>`
cache-busting query, so a new `version` means new URLs, fetched fresh and
cached under the existing cache-first strategy. The cache *name* also
carries the version, so the previous cache is dropped when the worker
updates.

## Releasing changes

**The version bump is automatic.** `.github/workflows/bump-version.yml`
raises the patch number in `config.json` (e.g. 2.10.0 → 2.10.1) on every
push to `main` that changes the app, unless that push already changed
`version` itself. So: push, and everyone gets the change on their next
open. Bump by hand only for a minor/major jump — the workflow then skips
that push. The bot's commit lands on GitHub, so `git pull` before your next
local commit.

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

Serve the repo root with any static server and open it:

```sh
python3 -m http.server 8899
# then open http://localhost:8899/
```

## Running the tests

```sh
node --test tests/*.test.js
```

(Each file also runs on its own, e.g. `node tests/game-logic.test.js`.)
The same suite runs on GitHub for every push and pull request
(`.github/workflows/tests.yml`).

`game-logic.test.js` covers Math's scoring/streak rules (score floor at 0,
streak events firing on every multiple of the configured threshold,
resetting immediately on a wrong answer, fully configurable thresholds/
bonuses/scoring). `theme-manager.test.js` covers `ThemeManager`'s 5-layer
background fallback using fake manifests. `session-core.test.js` covers
`SessionManager`'s three session modes (questions/score/time ending at the
right moment) and its scoring/streak rules. `letters-core-logic.test.js`
covers the shared Letter/Word engine (content-set filtering, unique-target
selection and content exhaustion, and all three activities' distractor
builders — including Letter → Image's "exactly one correct image"
invariant) shared by both Hebrew Letters and English Letters.
`numbers-logic.test.js` covers Numbers' pure-logic question generation
(quantities respect the practical render cap, zero is reachable, etc.).
`scene.test.js` covers background layout. `character-audio.test.js` checks
every character in `config.json`: all five audio events have clips, every
listed file exists, nothing in `audio/` is unlisted, and no event lists the
same file twice; clips shared byte-for-byte between characters are printed
as a warning.

## Deploying to GitHub Pages

1. In the repository, go to **Settings → Pages**, set **Source** to
   `Deploy from a branch`, choose `main` and `/ (root)`, then **Save**.
2. Keep `CNAME` in the repo for the custom domain (games.valice.uk).
3. Pages redeploys on every push to `main`, including the version-bump
   bot's commits.

If forked to another account/repo, the site works as-is at
`https://<user>.github.io/<repo>/`; only the `og:` link-preview URLs in
`index.html` (and `CNAME`) name the domain.
