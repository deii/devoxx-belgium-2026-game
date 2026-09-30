# How generative AI was used

The whole game was built in one day with **Claude Code** (model: Claude Opus 5.5) as the main
tool — for research, game design, architecture and code. This file records how the tool was
directed: the key prompts, the iterations, and what was corrected by hand.

Every prompt submitted during development is also captured automatically by a Claude Code
`UserPromptSubmit` hook ([.claude/hooks/record-prompt.js](../.claude/hooks/record-prompt.js)). The full, trimmed log is
published in [PROMPTS.md](PROMPTS.md).

## 1. Research and concept (before any code)

**Prompt (summary):** "Investigate the competition rules, constraints, judging criteria and
submission process. My idea is Robo Rally in a Devoxx theme, vanilla JS. Do not code yet — research,
challenge my assumptions, propose architecture, delivery plan and backlog."

**What the model found:** the deadline was the same day (30 Sep 2026, 23:59 CEST) — about 13 hours
left. Judging: Originality 40, Realism 20, Playability 15, All three robots 10, Sense of place 10,
GenAI craft 5.

**How the idea changed:**

| Idea | Verdict | Why |
|------|---------|-----|
| Classic Robo Rally reskin | Rejected | A known board game scores low on originality; grid moves work against the "weight and momentum" realism criterion; card UI too costly for one day. |
| Robo Rally + hidden saboteur (Among Us style) | Rejected | Judges play alone from a link — social deduction needs 4+ people; online multiplayer infeasible in hours; conflicts with "all three robots matter". |
| **Real-time co-op puzzle in a physically simulated Kinepolis** | **Chosen** | Each robot's mass *is* its role; dark cinema lighting serves realism; the keynote-room mission is instantly recognisable to Devoxx attendees. |
| **"Heisenbug"** — one of your own robots is secretly glitched each run | **Chosen as stretch** | Keeps the hidden-role tension single-player: diagnose which robot is faulty from its behaviour, then patch it. A debugging mystery every developer knows. |

**Technology decision:** 2D Canvas, vanilla ES modules, no build and no dependencies. three.js was
considered (better lighting for realism) and rejected for delivery risk within the time box.

## 2. Implementation log

### M0 — repository (11:30)
Claude Code created the public repo with `gh`, MIT licence, README and this log, and enabled
GitHub Pages. **Fixed by hand / redirected:** the `gh` git protocol was SSH and the push failed;
switched the remote to HTTPS with `gh` as credential helper. Commit e-mail set to the GitHub
noreply address so no corporate address ends up in public history.

### M1 + M2 — robots in the venue (12:40)
**Prompt:** "Go ahead with next step" (M1: loop, input, physics, Voxxy driving with inertia in the
foyer traced from the floor plan, plus the Heisenbug command filter).

- The model downloaded the official floor plan and model sheets, looked at them, and traced the
  walkable area (foyer, central corridor, lobby above the grand staircase, Room 8) by hand into
  `levels/cinema-floor.js` in plan pixels (1 px ≈ 10 cm).
- Robots are drawn as top-down canvas vectors built from the model sheets — nothing from the
  Robot Lab reference is shipped.
- One shared drive model, three parameter sets (mass, motor force, drag, braking, spool-up,
  turn acceleration, lateral grip). Because M2 cost little on top, all three robots and
  mass-weighted robot-to-robot collisions landed in the same step.
- Every command passes through `applyGlitch()` (a no-op for now) so Heisenbug needs no rework.

**Verification:** Playwright drove the game in a browser; a Node script simulated the drive model
headlessly. Measured: Voxxy 4.5 m/s after ~1 s, stops in 0.7 m; Droid 2.8 m/s, stops in 0.5 m;
Biggy 2.1 m/s after 5 s, coasts 2 m; Biggy at 2.5 m/s hitting a resting Voxxy keeps 2.26 m/s and
launches Voxxy at 2.49 m/s.

**What went wrong:** `curl` downloads of the model sheets failed on a certificate revocation check
(corporate Windows); re-downloaded with `--ssl-no-revoke`. Browser tests showed a robot moving
with no input — traced to keyboard state leaking between scripted Playwright runs, not the game.
The model sheets are kept out of the repository (`assets/reference/` is git-ignored); only the
floor plan is shipped, with attribution.

### M3 — the playable mission (12:50)
**Prompt:** "Go ahead".

- The model designed the mission so that each robot's physics *is* its role: crate collisions use
  an effective-mass override (a crate is immovable for any robot under 300 kg, a normal 300 kg body
  for Biggy); the speakers' lounge barrier gap is sized from the robot radii (1.25 m: Voxxy needs
  1.1 m, Droid 1.3 m) — Voxxy's radius was reduced from 0.45 to 0.4 m to make the margin readable.
- Mission logic is in `src/mission.js`; props, clock and objectives in the level data.

**Iterations caught by a headless Node simulation of the real modules:**
1. First crate placement put three of five crates directly above the toilet block — there was
   nowhere to shove them. Moved the crate wall 4 m south, into the corridor mouth.
2. The crate row then sat on the first pair of corridor pillars; Biggy could not push through.
   The first pillar rows were removed from the level.
3. "Crates cleared" was first a crate count; the simulation showed Voxxy slipping through while the
   count still said blocked. Replaced by the width of the widest free gap (≥ 2 m, Biggy is 1.7 m).
4. Prompts: a dropped adapter hid Droid's own "open the door" prompt. Prompts and actions now
   prefer what the *active* robot can do.

**Verified:** Voxxy and Droid cannot pass the crates; Biggy opens a path on its second push;
only Voxxy passes the barriers; the fuse panel and door react only to Droid, the door only with
power; win on delivery; loss when the clock runs out (6 real minutes).

### M3.5 — Heisenbug (13:05)
**Prompt:** "Played by hand and fine. Agree with swap. Go ahead" — i.e. Heisenbug before lighting,
because originality is worth 40 points and realism 20.

Design decisions the model made and why:
- **The robot is the mystery, not the symptom.** Every glitch kind can hit any robot, and log lines
  say "unit ██". If each robot had its own glitch, the log would give the answer away.
- **The best clue is physical:** while you drive someone else, the culprit twitches on its own
  (the "phantom" glitch) — visible only if it is on screen.
- **Escalation** (interval × 0.85 per glitch, 14 s down to 5 s) turns an optional side quest into
  something worth solving; **a wrong diagnosis costs 30 s** so guessing blindly is not free.
- No visual tell on the robot itself (no sparks) — that would end the deduction instantly. The
  whole screen flickers instead.
- The `applyGlitch()` hook planned in M1 needed no change to the game loop; the maintenance-bay
  action consumes the interact key so it cannot also drop the adapter.

**Verified:** 3 000 runs give an even culprit split (953/1033/1014); only the culprit's commands
are altered; wrong guess −30 s, right guess patches and stops all further glitches; leaving the bay
aborts the self-test; browser run shows the log, progress ring and the verdict on the end screen.
**Caught in testing:** a seeded test RNG always picked the same culprit — a flaw of the test's
generator (tiny first value), confirmed by re-running against `Math.random`.

### M4 — light and weight (13:20)
**Prompt:** "Glitches are noticeable — not frustrating. Go ahead."

- Lighting is a darkness mask on an offscreen canvas with lights cut out (`destination-out`),
  then a thin additive pass for coloured glow. Lights come from level data: facade daylight,
  exit signs, emergency lights, ceiling lamps (power only), Room 8 house lights and the projector.
- Robots are light sources with character: Droid's eyes are a 10 m torch cone, Voxxy's visor a
  small glow, Biggy only its antenna. A Heisenbug sensor blackout also turns the culprit's lights
  off — a fair clue, visible only while you drive the culprit.
- Effects are driven by the physics: sideways slip → skid dust, distance walked → Biggy footfalls,
  impact speed × mass → dust burst and camera shake with distance falloff.

**Caught in screenshots and fixed by hand-directed iterations:**
1. The idle projector beam rendered as an opaque blue slab — the glow pass replaced the alpha with
   the full intensity instead of scaling it; the beam helper now takes an RGB triple and an alpha.
2. The start screen was too gloomy: daylight did not reach the spawn and the floor colour was so
   dark that lit areas still looked dark. Added foyer skylights, a warm daylight glow and a lighter
   floor.
3. The Room 8 label sat on top of the robots; moved to the top of the room.
4. Dust was too faint to read; bigger, more opaque particles.

**Measured:** 61 fps in Chromium at 1366×800 with all lights on.

### M5 — sound, solid seat rows, replay polish (13:35)
**Prompt:** "Go ahead" (with the proposed order: sound → seat rows → polish).

- **Sound** (`src/audio.js`) is synthesised with Web Audio: one continuous motor voice per robot
  (oscillator → low-pass → gain, pitch and volume from speed and distance to the camera) and
  one-shot sounds detected by diffing state between frames — no other module had to change.
  The model cannot listen to its own output; the sound design was checked by a human.
- **Seat rows** became real geometry with a single source of truth in the level data, used by both
  rendering and collision. A simulated drive confirmed Voxxy and Biggy reach the stage through the
  south aisle (9 s / 19 s from the door) and neither can cut through the rows. The first simulated
  route failed for Biggy — the waypoint hugged the row ends; the aisle itself was wide enough.
- **Replay:** best time per browser in `localStorage` (guarded for private windows), an opening tip
  that points first-time players at Biggy, and the README screenshots (taken with Playwright).

### M6 — the robots' idols (14:20)
**Prompt (first version):** style the robots *after* three conference speakers — Voxxy as Josh
Long, Droid as Dr. Venkat Subramaniam, Biggy as Victor Rentea.

**The model pushed back before building anything:** real, named people in a public, MIT-licensed
entry that could be demoed on the Devoxx keynote stage need their consent; mapping Biggy's traits
("heavy, short legs, slow, can't take the stairs") onto a named person reads as a body joke; and
the brief requires the three robots themselves to appear, so a rename or reskin would cost points.
It offered: ask the speakers first, use speaker archetypes, or go ahead with softened wording.

**Prompt (refined by the author):** "Instead of personifying the robot, the robots could look up to
these speakers as idols because of the abilities mentioned. Voxxy could say 'Bootiful' when he
likes something."

- Implemented as a fan tribute: an "Idol:" line per robot on the title screen and event-driven
  speech bubbles (`src/speech.js`), detected by diffing state like the audio.
- Rule the model kept: robots speak in their own words. The only borrowed phrase is Josh Long's
  public catchphrase "Bootiful"; no quote is invented and attributed to a speaker. Biggy admires
  Victor Rentea for unstoppable *refactoring*, not for anything physical.
- README carries a short fan-tribute / no-affiliation note.
- Caught in a screenshot: the longer title panel nearly filled a 768 px screen — it now scrolls.

### Playtest tweak — crate run-up (14:30)
**Prompt:** "Move boxes a bit lower so Biggy can get a moment after the corner around the wall."
The crate wall moved 5 m south (y 40.5 → 45.5 m) and the first corridor pillars moved with it, so
the crates are not shoved straight into them. Simulated: Biggy now reaches the crates at 2.15 m/s
instead of about 1 m/s and opens a path in one push; Voxxy and Droid are still blocked.

### M7 — the exhibition hall and the service lift (14:55)
**Prompt:** "Go ahead with elevator" — option A from the model's proposal: give Biggy's "cannot take
the stairs" a real consequence by moving part of the mission to the ground floor.

- A second area, the exhibition hall, traced over the ground-floor plan. `src/level.js` now loads
  several areas, each with its own scale and offset (the hall sits 150 m east, out of view).
- `src/travel.js`: the stairs are instant for Voxxy and Droid and refuse Biggy with an explanation;
  the service lift takes anyone but rides for 2.5 s. The camera snaps instead of panning 150 m.
- The fuse panel upstairs became the main breaker in the hall's electrical room, behind a fallen
  sponsor booth that only Biggy can move — so Biggy has to take the lift, and Droid depends on it.
  The real-time limit went from 6 to 7.5 minutes for the extra trip.
- Found by simulation, not by eye: the booth first sat in the doorway and wedged there; the lift was
  so far from the booth that Biggy needed about a minute (moved: now 13 s); one pillar from the
  plan stood exactly where the booth has to go (left out, with a comment).
- **A physics bug surfaced:** pushed bodies stuck to walls because wall friction removed 15 % of the
  sliding speed every step regardless of how hard the body pressed. Replaced with Coulomb friction
  proportional to the normal impulse. That changed how the crates spread, so the "bottleneck
  cleared" check was re-tuned (1.4 m gap) and re-verified: Biggy still clears the crates, Voxxy and
  Droid still cannot.

### Playtest fix — no lift without power (15:15)
**Prompt:** "It does not make sense that the lift is working when the electricity is off. Robots can
start in the basement."

- The robots now start in the exhibition hall. The lift refuses to move until the main breaker is
  reset, and says why; the objectives were reordered: booth → breaker → lift up → crates →
  adapter → door → delivery.
- The crates are now pushed from the corridor side. Before changing the level, the model checked by
  simulation that they still matter: every stair and lift exit upstairs lies south of the crates,
  and the speakers' lounge is reachable only through the foyer, so Voxxy still needs Biggy's push.
  A grid flood-fill (Voxxy's radius against walls and crates) confirmed the path is closed before
  the push and open after it.
- The "cleared" band now hugs the crate row, so a crate shoved north into the pocket under
  Megacandy stops counting as blocking — the old band still counted it and underreported.
- Full run simulated from the new spawn: booth 18 s, breaker, lift 16 s, crates open in one ram.

### Zoom (15:17)
**Prompt:** "Implement zoom in and out."
<kbd>+</kbd>/<kbd>−</kbd>, the mouse wheel and <kbd>0</kbd> (reset) scale the camera between 0.5× and 2×
of the screen-size default, eased over about a tenth of a second. Everything already worked in
metres, so the change was one scale factor in the renderer's view; lighting and labels followed.

### Playtest fix — maintenance bay downstairs (15:21)
**Prompt:** "Move the service place downstairs. Now it's too frustrating to go there all the way with
broken Biggy. It also makes sense to have it downstairs."
The maintenance bay moved from the corridor upstairs to the exhibition hall, between four pillars
12 m south of where the robots start, with its own emergency light. A glitching Biggy no longer
has to take the lift up and cross the corridor for a three-second self-test.

### Playtest fix — livelier motor sound (15:26)
**Prompt:** "Improve robot drive sound — when going on full speed it sounds too much the same."
At top speed every input to the old motor voice (one oscillator, pitch and volume from speed) was
constant, hence the drone. Each motor now has two detuned oscillators, a filter that opens with
speed and strain, a volume pulse tied to distance travelled (wheel turns, servo steps, Biggy's
footfalls), a surface noise layer (tyre hiss, servo chatter, floor rumble), pitch bend when
turning, and a slow random pitch drift. The model cannot hear the result; it was checked by ear.

### Frustration (15:33)
**Prompt:** "Now add some frustration level. When colliding with solid walls or with robots, say
something."
Physics now reports wall hits and robot-on-robot hits separately. Each hard bump (debounced so a
bounce counts once) raises that robot's frustration by its impact speed; it cools down over about
25 s. Lines come in three moods per robot (calm → annoyed → furious), name the robot that was hit,
stay in character (Droid stays deliberate, Biggy blames code smells), and the roster shows ANNOYED /
FURIOUS next to the name. Crates and the booth are excluded — shoving them is Biggy's job, not an
accident. Checked in the browser (four wall crashes took Voxxy from calm to furious) and headlessly
(Biggy into Droid: both complain, each naming the other).

### Elevator music (16:01)
**Prompt:** "Add classic meme elevator music from Kevin MacLeod when Biggy takes the elevator."
The model identified the track ("Local Forecast – Elevator", incompetech.com) and its licence,
CC BY 4.0 — usable in an MIT project only with attribution and kept under its own licence. It
downloaded the original, cut the first 24 s at MP3 frame boundaries with a small Node script (no
ffmpeg on the machine; 7.6 MB → 0.96 MB), and credited it on the title screen, in the README credits
and as an exception in the README's licence section. The music starts when Biggy boards, plays
quieter if another robot is selected, and fades out on arrival with a two-tone ding; other robots'
rides keep the synthesised whoosh. Checked in the browser that the file loads and a 24 s buffer
starts on Biggy's ride.

**Follow-up** (16:05): "Yes, make it a bit longer." — the lift ride went from 2.5 s to 6 s for
everyone, so the music gets a few bars; the whoosh for Voxxy and Droid reads the same constant.

### Stage-clear fanfare (16:09)
**Prompt:** "Add a stage clear fanfare similar to the Super Mario Bros. one."
The model did not reproduce Nintendo's melody — it is a copyrighted composition, and this entry is
public and MIT-licensed. It wrote an original tune in the same idiom instead: fast rising arpeggios
over C, A♭ and B♭ (a common chord move in game fanfares) that land on a held C, played on a 25 %
pulse wave (built with a PeriodicWave from its Fourier series) over a triangle bass with noise-snare
hits, about 2.8 s. It replaces the plain win chord. Checked in the browser that all 28 notes are
scheduled when the game is won.

### Playtest fix — scrolling the title screen (16:15)
**Prompt:** "On the initial screen with the description overlay scrolling does not work well. The mouse
scroll wheel zooms in and out."
Cause: the whole HUD ignores the mouse (`pointer-events: none`), so the wheel fell through the panel
to the canvas, whose zoom handler swallowed it. The panel now takes pointer events and contains its
own scrolling, and the wheel zooms only while playing.

### Title-screen robot carousel (16:27)
**Prompt:** "On the title panel replace the robot descriptions with a carousel — one slide per robot
with a picture and a description including the idol part."
- Pictures: front views cropped (ImageMagick) from the official model sheets and shrunk to 13–17 kB
  each. This reverses the M1 choice of shipping nothing from the sheets; the model re-read the
  references page first, which offers the sheets to entrants to build with, and credited them in
  the README and on the title screen.
- Each slide: picture, role, facts taken from the physics parameters (mass, top speed, stairs or
  lift) and the idol with the reason. Previous/next buttons, dots, ←/→ or A/D keys; it advances on
  its own every 6 s until the player takes over. A fixed slide height keeps the panel from jumping.
- Checked in the browser: keys, buttons and dots switch slides, images load, the game stays on the
  title screen while browsing.

### Karel Čapek easter egg (16:37)
**Prompt:** "Go ahead with your pick" — the model's pick from its own list: a Karel Čapek easter egg,
furnished rooms, richer robot animation.
A red R.U.R. poster (with a 1920s-style robot silhouette) hangs on the foyer's wall of fame.
Čapek's 1920 play *R.U.R. — Rossum's Universal Robots* introduced the word "robot", suggested by his
brother Josef from the Czech *robota*, forced labour. Each robot that drives up to it reacts once
(Voxxy: "Great-great-grandpa. Bootiful."; Droid: "Čapek, 1920. Where our name began."; Biggy:
"Robota. Still robota."), the log records it, and the end screen reports how many of the three paid
their respects — and says nothing if nobody found it. The poster title first rendered blank:
canvas fonts below 1 px do not draw, so the text is drawn at 100× and scaled down.

### Furnished rooms (16:40)
The empty hall got fifteen solid 3 m × 2 m sponsor booths between the pillars, each with a coloured
back wall, a counter with laptops and swag, and a made-up developer-pun sponsor ("Bean Factory",
"Deadlock Consulting", "Cache Me If You Can" — no real brands). The foyer got a coffee bar against
the north windows, bean bags and Devoxx-orange roll-up banners. Booths were placed away from the
mission routes; a grid flood-fill confirmed that every robot still reaches both staircases, the
lift, the electrical room and the maintenance bay from its start, and the full simulated run still
passes. Decor is plain level data (`decor`), drawn under the lighting, so the hall stays dark
until Droid resets the breaker.

### Robot animation (16:42)
- Voxxy blinks every few seconds, its eyes look into turns (and around the room when idle), and its
  ears twitch at speed.
- Droid walks on visible feet, its arms swing with the step, its head turns with its gaze, and the
  eyes pulse. When it stands still it slowly scans the room — and the torch in the lighting pass
  follows the same angle (`droidLook`), so the light and the drawing never disagree.
- Biggy waddles, spreads a little on each footfall (in step with the thud and the dust), shows its
  feet, and its antenna lags behind turns and blinks.
- Every robot leans into turns and breathes when idle. While the Heisenbug's culprit glitches it
  gets a faint jittering double — a visual clue to go with the log, but it never names the robot.

### Backstage, lift, electrical room and service door (16:56)
**Prompt:** "Improve backstage, service lift, electrical room, service door graphics."
- Room 8: a planked stage with a lit lip, a lectern with the speaker's laptop and microphone, stage
  monitors, a taped cable to a framed screen; the projection booth shows racks with status LEDs
  and the projector, whose lens lights up with power.
- Service lift: shaft and checker-plate cabin, sliding doors on the exit side (closed without power
  and while riding), a hazard-striped threshold and a call lamp — red, amber while riding, green.
- Electrical room: switch cabinets with vents and LEDs along both walls, a cable tray, a hazard
  stripe across the doorway and a lightning warning sign; the main breaker is now a panel with a
  lever that flips up when Droid resets it.
- Service door: frame posts, a ribbed steel panel with a handle sliding into the wall, and a keypad
  that is dead without power, blinks amber, then turns green.
All drawn with canvas primitives from existing level data; checked in the browser with screenshots.

### Speakers' lounge (17:04)
**Prompt:** "Improve the speakers' lounge graphic."
An orange SPEAKERS ONLY sign at the queue barriers; behind them plants, a water station, two
purple sofas against the Room 1 wall with coffee tables, a long teal rug, the round table the HDMI
adapter lies on, and a speaker-ready desk with a monitor and laptops on charge. None of it is solid,
so Voxxy's route through the 1.25 m barrier gap to the adapter is unchanged. The decor drawer became
a type → function table so new furniture types are one entry each.

### People (17:10)
**Prompt:** "Go ahead with people — no collision needed, just random lurking."
Eighteen people in seven areas (`people` in the level data, one role per person): attendees in the
foyer, corridor, lobby and hall, crew at the booths and an AV tech on the Room 8 stage, and a speaker
rehearsing in the lounge. Each walks to a random spot in its area, stands for 2–9 s, and picks
another; spots inside booths or pillars are rejected and every path is sampled against the walls, so
nobody walks through one. When a robot comes within ~2 m a person turns to it and says a line that
depends on their role and the robot (speaker to Voxxy: "Have you seen my adapter?"). They never
collide, so they cannot change the mission. The bubble drawing moved into a shared `drawBubble`.
Two simulated minutes: every person moved, and nobody came closer than 0.37 m to a wall.

### Playtest fixes — quieter glitches, collision sounds, maintenance bay (17:17)
**Prompt:** "Remove the visual and audio hint when a robot glitch happens — it's a bit annoying. Add
sound when robots collide with something — wall, robot, box… Improve the maintenance bay graphic."
- Glitches are now silent and do not shake the screen: the canvas flicker, the zap and the
  culprit's ghost double are gone. The log is the only witness — which also makes the Heisenbug
  more of a deduction again.
- Collisions sound like what was hit: a metallic clang off walls (band-passed noise plus an
  inharmonic partial, pitched per robot), a hollow two-tone bonk between robots (one knock pitched for
  each robot, played once per pair), a dull thud on crates and the booth. Louder for heavier robots
  and harder hits, debounced so a bounce sequence makes one sound. Physics now reports crate hits
  separately, next to wall and robot hits.
- The maintenance bay is a steel pad with rings and a centring cross inside the hazard ring, four
  status lamps (amber ready, blinking blue while scanning, green or red after), a sweeping scanner
  arm and progress ring during the self-test, a console that reads READY / SCAN / FIXED / NO FAULT /
  CLEAN, a cable to the pad and a red tool chest with a spanner on top.

### Game-style robot roster (17:24)
**Prompt:** "Make the graphic in the top left corner showing the selected robot more like in games.
Portrait, name and number only — big when selected, smaller otherwise."
Square head portraits cropped from the model sheets (Droid's from the sheet's close-up).
Each card is the portrait with the key number in a corner tab and the name underneath; the selected
robot's card grows from 56 to 96 px with a glow in its colour, the others shrink and dim. The cards
are built once and switching only moves a class, so the resize animates. The frustration moods
lost their text and now tint the portrait frame — amber, then red and shaking.

**Follow-up** (17:28): "Make it a bit smaller. Can you do something with the portrait
background? It's too bright in a darker game." — the light studio background was cut out with
ImageMagick flood fills from the corners (fuzz 9 %) into transparent PNGs; the portraits now sit on a
dark radial backdrop faintly lit in each robot's colour. Cards shrank to 72 px selected / 44 px
otherwise.

### Polish, tests, performance and a requirements check (17:37)
**Prompt:** "Polish code, check tests and performance, verify all requirements and goals from the
Devoxx website are met."
- **Tests:** the repository had none — every check so far had been a throwaway simulation script.
  The model turned them into a dependency-free `node --test` suite (`npm test`, 10 tests, ~3 s)
  that plays the real level headlessly: lift needs power, Biggy refuses stairs, crates stop Voxxy
  and Droid, a full run from the hall to the crates, hall reachability for every robot, only Voxxy
  fits into the lounge, people never touch walls, and both self-test outcomes.
- **Review:** a second agent reviewed the code read-only. Fixed from its report: the audio kept the
  previous game's event memory, so restarting could play a stray buzz, ding or thud; a person with
  nowhere to walk retried the whole search every frame; the closed-door wall list was re-copied 120
  times a second; Biggy's step length was defined in three files; dead code (unused taglines, zones,
  `isHeld`, a canvas reference, exports) and stale comments. The carousel's mass and top speed are
  now computed from the drive model instead of typed in.
- **Performance** (Chromium, 1920×1080): a steady 60 fps (16.6 ms frames, p95 16.8 ms, no long
  tasks) in every area, still 60 fps with the CPU throttled 4×; ~1.7 ms of script per frame, heap
  under 5 MB. The review's remaining micro-optimisations (gradient caching, view culling) were left
  alone as not worth the risk on deadline day.
- **Requirements** re-read from game.devoxx.be/game.html: all three robots with a job only they can
  do; the exhibition hall, the cinema floor and stairs between them; playable by a newcomer with an
  opening tip and objective list; README from clone to playing; MIT LICENSE; public repository;
  GenAI use and prompts documented here.

### README screenshots

Prompt: "Recreate README screenshots - graphic changed."

- The model staged three scenes through the `window.heisenbug()` debug hook in a headless browser
  (1366×768), checked each image, and reframed the corridor shot so Droid's torch actually falls on
  Voxxy: the dark corridor upstairs, Room 8 with the projector's "no signal" beam, and a new shot of
  the exhibition hall with Biggy at the toppled booth.

### Judge review and fixes

Prompt: "Review the game I created here for Devoxx Belgium 2026 competition. […] Test, play and
score it as a Devoxx judge." Then: "Yes, fix both" and "commit and push and then fix README
screenshot".

- Playing it in the browser, the model found a softlock: from the parking spot the obvious move is
  to hold W with Biggy, which rammed the booth *into* the 3 m electrical-room doorway. Robots only
  push, so nothing could pull it out, Droid was cut off from the breaker, and there was no restart
  during play. Reproduced headlessly, then fixed with a 2 m door (Droid needs 1 m, the booth is
  2.6 m) with drawn jambs, a regression test that rams the booth head-on, and a double-R restart
  (R sits next to E, so one stray press does not end a run).
- A headless autopilot through the real modules confirmed the whole mission is winnable with about
  5 minutes left on the clock.
- The corridor screenshot showed Voxxy holding the adapter while the crates still blocked the
  corridor — a state the game cannot reach. It was retaken from a state recorded by that autopilot
  run: power on, crates shoved aside by Biggy, Voxxy carrying the adapter through the gap.
- Caught by hand afterwards: the exhibition-hall screenshot showed the breaker reset while the
  booth still blocked the electrical room — also unreachable. Retaken with the power off, Biggy at
  the booth and Droid's torch on it, from a headless run of the real opening.
- The Room 8 screenshot was retaken the same way (from the autopilot run just before delivery) so
  all three README images show the current HUD, including the `R R restart` hint.

### Touch controls

Prompt: "How to play this on tablets without physical keyboard?", then "yes, build it, then commit
and push".

- The model first answered that it was impossible: input was keyboard-only, so a tablet could not
  even leave the title screen. It proposed a touch layer that feeds the existing input channels —
  a floating stick sets the move vector (analog, which the drive model already accepted, so a half
  push is half throttle), and every button queues the key press it stands for — so `main.js` and
  the physics did not change.
- Tested in Chromium with DevTools touch emulation and real `Input.dispatchTouchEvent` touches at
  1024×768: tap to start, stick drove Voxxy 7 m north, portrait tap switched to Biggy, ⟲ asked for a
  second tap and then restarted. A fresh desktop browser showed no touch UI and unchanged keys.
- **Caught in a screenshot:** "Tap here to start" sat below the fold of the scrolling title panel;
  it is now pinned to the panel's bottom edge on touch screens.
