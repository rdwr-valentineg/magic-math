# חשבון קסום (Magic Math)

A mobile-first, Hebrew (RTL), offline-first PWA math game for first-grade
children. No backend, no database, no runtime API calls, no external CDNs —
everything ships as static files and runs entirely on-device after the first
successful load.

## How it works

- On first load the app shows a loading screen and downloads every game
  asset (HTML/CSS/JS, icons, and every character's images/audio) into the
  Cache Storage API via `service-worker.js`. Only once that finishes does the
  game let the player continue.
- On every later visit (online or offline) the service worker serves
  everything from cache first, so the game works with no network at all.
- The child picks a character, then a number range (0–10 / 0–20 / 0–50 /
  0–100) and one or more operations (+ − × ÷), then presses a big play
  button.
- Each game is 10 questions, answered with a large on-screen numeric keypad.
  Correct answers are worth +2 points, wrong answers −1 (score never goes
  below 0), and every 3rd correct answer (3rd/6th/9th) triggers a bigger
  bonus + celebration.
- Selected character, last-used settings, and the high score are stored in
  `localStorage` on the device — nothing leaves the browser.

## Project structure

```
index.html              Single-page app shell (all screens)
manifest.webmanifest     PWA manifest
service-worker.js        Offline caching (installs + serves the cache)
css/style.css             All styling (mobile-first, RTL, reduced-motion aware)
js/assets-manifest.js     Single source of truth: core files + character roster
js/storage.js             localStorage helpers (character, settings, high score)
js/audio.js                Random-clip playback with graceful fallback
js/questions.js            Math exercise generator (per-operation rules)
js/game.js                 Game session state machine (score, progress, milestones)
js/ui.js                   Screen rendering + event wiring
js/app.js                  Boot sequence: SW registration + loading progress
icons/                     App icons (generated from the unicorn artwork)
characters/<id>/images/    idle.webp, happy.webp, try-again.webp, celebration.webp
characters/<id>/audio/     start/correct/wrong/bonus/finish clips (mp3)
```

## Adding a new character

Everything about a character is data-driven from
`js/assets-manifest.js` — no game logic needs to change.

1. Create `characters/<id>/images/` with `idle.webp`, `happy.webp`,
   `try-again.webp`, `celebration.webp` (matching aspect ratio, e.g. 768×512
   works well with the existing layout).
2. Create `characters/<id>/audio/` with as many of the following as you
   have: `start-01.mp3`, `start-02.mp3`, `correct-01.mp3`, `correct-02.mp3`,
   `correct-03.mp3`, `wrong-01.mp3`, `wrong-02.mp3`, `bonus-03.mp3`,
   `bonus-06.mp3`, `bonus-09.mp3`, `finish-01.mp3`, `finish-02.mp3`.
   Audio is optional per-category — if a clip is missing, that moment simply
   plays silently instead of breaking anything.
3. Add an entry to the `CHARACTERS` array in `js/assets-manifest.js`:

   ```js
   {
     id: 'dragon',
     name: 'דרקון',
     basePath: './characters/dragon/',
     images: {
       idle: 'images/idle.webp',
       happy: 'images/happy.webp',
       tryAgain: 'images/try-again.webp',
       celebration: 'images/celebration.webp'
     },
     audio: {
       start: ['audio/start-01.mp3', 'audio/start-02.mp3'],
       correct: ['audio/correct-01.mp3', 'audio/correct-02.mp3', 'audio/correct-03.mp3'],
       wrong: ['audio/wrong-01.mp3', 'audio/wrong-02.mp3'],
       bonus3: ['audio/bonus-03.mp3'],
       bonus6: ['audio/bonus-06.mp3'],
       bonus9: ['audio/bonus-09.mp3'],
       finish: ['audio/finish-01.mp3', 'audio/finish-02.mp3']
     }
   }
   ```

4. Bump `CACHE_VERSION` at the top of `js/assets-manifest.js` (e.g.
   `magic-math-v2`) so returning visitors' service workers pick up the new
   files instead of serving a stale cache.

That's it — the character automatically appears on the character-select
screen and its assets are automatically added to the offline cache list.

## Deploying to GitHub Pages

The app only uses **relative** paths (`./...`), so it works whether it's
served from the root of a domain or from a GitHub Pages project subpath
(`https://<user>.github.io/<repo>/`).

1. Push this repository to GitHub.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the branch (e.g. `main`) and the folder `/ (root)`, then **Save**.
5. Wait for the Pages build to finish (check the **Actions** tab or the
   green checkmark in Settings → Pages). GitHub will show the live URL,
   typically `https://<user>.github.io/<repo>/`.
6. Open that URL. On first load you'll see the loading screen while all
   assets are cached; once it says "מוכנים!" the game is fully cached and
   will keep working offline from then on (including after closing the tab,
   restarting the phone, or turning on airplane mode).

### Installing on a phone

- **iPhone (Safari):** open the Pages URL → Share → "Add to Home Screen".
- **Android (Chrome):** open the Pages URL → menu (⋮) → "Add to Home
  screen" / "Install app".

### Updating the deployed game later

Because the service worker aggressively caches everything, browsers won't
automatically pick up new files unless the service worker itself changes.
Whenever you change any cached file (HTML/CSS/JS, images, audio), bump
`CACHE_VERSION` in `js/assets-manifest.js`. That changes the cache name, so
the next visit installs a new service worker, re-caches everything, and
deletes the old cache in the `activate` event.

## Local testing

Any static file server works (service workers require `http://localhost` or
HTTPS — `file://` will not work):

```sh
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed `localhost` URL in a browser.
