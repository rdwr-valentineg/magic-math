# Background art — what to make and the rules it must follow

The game fills the whole screen with the background and crops whatever doesn't
fit. Phones and upright tablets get a **portrait** image, PCs and sideways
tablets get a **landscape** one. The rules below come from measuring the
real layout on a phone (390×844), tablets (820×1180 and 1180×820) and a PC
(1440×900).

Unicorn is done (landscape + `-mobile`). Use it as the reference.

## Images to make

Each character needs 8 files in `remote/assets/characters/<id>/backgrounds/`:

| File | Size | Shown when |
|---|---|---|
| `game.webp` | 1920×1080 (min 1600×900) | normal play |
| `try-again.webp` | 1920×1080 | right after a wrong answer |
| `celebration.webp` | 1920×1080 | streak + results screen |
| `distant.webp` | 1920×1080 | blurred behind the settings screen |
| `game-mobile.webp` | 1080×1920 | same as above, portrait screens |
| `try-again-mobile.webp` | 1080×1920 | |
| `celebration-mobile.webp` | 1080×1920 | |
| `distant-mobile.webp` | 1080×1920 | |

Checklist:

- [ ] **dinosaur** — 8 files
- [ ] **dragon** — 8 files
- [ ] **kitten** — 8 files
- [ ] **princess** — 8 files
- [ ] **race-car** — 8 files
- [ ] **robot** — 8 files
- [ ] **rainbow** — 8 files (its current 4 are byte-identical copies of unicorn's; skip only if that's intended)
- [ ] **global welcome** — `remote/assets/global/backgrounds/welcome.webp` (1920×1080) and `welcome-mobile.webp` (1080×1920), behind Home and Character Select. Already wired in `config.json`; until the files exist the gradient shows.

58 images total. Export as WebP (quality ~85). Portrait and landscape of the same
state should be the same scene recomposed, not two different places.

## Rules for every image

1. **No text, no signs, no characters, no UI.** The old art had Hebrew signs and
   the character painted in. The game draws the character and the UI on top,
   and text gets cropped on some screen. Mood objects (a sad cloud, confetti) are fine.
2. **A clear standing spot** just below the middle of the image (see the zones
   below): flat ground, a path or soft clouds, with nothing important behind it.
   The character stands there.
3. **Bottom ~40% is hidden** behind the question card and answer buttons. Put
   plain ground or clouds there, not details.
4. **Main features go in the upper part**: castle, volcano, rainbow, the sad cloud.

### Landscape (1920×1080)

```
 0% ┌───────────────────────────────────────────┐
    │  top bar (buttons)                        │  keep ~7% calm
 7% │                                           │
    │   MAIN FEATURES: top 35%, and the left /  │
    │   right sides                             │
35% │            ┌─────────────┐                │
    │            │ character   │  x 40–60%      │
55% │            └──── feet ───┘  stands here   │
    │                                           │
65% │       ┌───────────────────────┐           │
    │       │ question card +       │  x 30–70% │
    │       │ answer buttons        │  hidden   │
100%└───────┴───────────────────────┴───────────┘
 Sideways tablets crop ~9% off each side, PCs ~6%.
```

### Portrait (1080×1920)

```
 0% ┌─────────────────────┐
    │ top bar             │ keep ~6% calm
 6% │                     │
    │ MAIN FEATURE        │ 8–40% high, centred
    │ (castle / cloud)    │ (phones crop ~9% off each side)
40% │    ┌─────────┐      │
    │    │character│      │ x 30–70%
56% │    └──feet───┘      │ stands here
60% │ ┌─────────────────┐ │
    │ │ question card + │ │ hidden
    │ │ answer buttons  │ │
100%└─┴─────────────────┴─┘
 Upright tablets also crop ~6% top and ~13% bottom.
```

### Per state

- **game**: the character's world, calm and inviting, with a path leading to the standing spot.
- **try-again**: the same world but softer or gloomier, with one gentle "oops" object (a small sad cloud, etc.) in the upper centre. Nothing scary.
- **celebration**: festive (confetti, rainbow, fireworks, a trophy stage). The standing spot is the stage floor.
- **distant**: a wide, calm view of the world with no busy foreground. It's shown blurred behind the settings buttons, so large simple shapes work best.

## ChatGPT prompt template

Attach the character's old background (or unicorn's new one as a style
reference) and use:

> Create a {1920×1080 landscape | 1080×1920 portrait} background for a kids'
> math game, in a bright, soft 3D storybook style. World: {WORLD}. State:
> {game | try-again | celebration | distant}, {one line from "Per state" above}.
> No text, no signs, no letters, no characters, no animals, no UI.
> Main features in the upper third. A clear flat standing spot at the centre,
> just below the middle. The bottom 40% is simple ground or clouds with no
> details. Nothing important within 10% of the left and right edges.

Worlds, taken from the current art:

| id | WORLD |
|---|---|
| dinosaur | lush jungle valley, smoking volcano, waterfalls, stepping stones with dino footprints, a pterodactyl in the sky |
| dragon | dramatic crystal and lava land, glowing lava river, stepping stones, floating castle, a treasure glint |
| kitten | cozy flower garden by a lake town, paw-print path, flower arches, soft cushions and yarn |
| princess | pink fairytale castle on cliffs, rose-garden terrace, heart-shaped stones, rainbow, waterfalls |
| race-car | winding racetrack through green hills and a stone-bridge town, checkered flags, tyre stacks |
| robot | futuristic floating city, glass domes, white towers, a glowing tech path with blue arrows |
| rainbow | a rainbow sky-land of its own: rainbow bridges, colour-splash clouds, prism crystals, not unicorn's castle |

## After uploading: add to `character.json`

Add this block next to `"backgrounds"` (the same values as unicorn). If the art
follows the zones above, it works without tuning:

```json
"backgroundsPortrait": {
  "game": "backgrounds/game-mobile.webp",
  "celebration": "backgrounds/celebration-mobile.webp",
  "tryAgain": "backgrounds/try-again-mobile.webp",
  "distant": "backgrounds/distant-mobile.webp"
},
"backgroundLayout": {
  "game": { "focus": [0.5, 0.4], "stage": [0.5, 0.55] },
  "tryAgain": { "focus": [0.5, 0.4], "stage": [0.5, 0.55] },
  "celebration": { "focus": [0.5, 0.4], "stage": [0.5, 0.6] },
  "distant": { "focus": [0.5, 0.4] }
},
"backgroundLayoutPortrait": {
  "game": { "focus": [0.5, 0.3], "stage": [0.5, 0.56] },
  "tryAgain": { "focus": [0.5, 0.3], "stage": [0.5, 0.56] },
  "celebration": { "focus": [0.5, 0.35], "stage": [0.5, 0.6] },
  "distant": { "focus": [0.5, 0.3] }
},
```

- `focus` = the point that stays in view when cropping.
- `stage` = where the character's feet go. Both are fractions of the image (0–1).
- To tune them, open the game with `?stagedebug` at the end of the URL. A red dot shows the stage point.
- If a `-mobile` file is missing, the landscape image is used on phones instead.
