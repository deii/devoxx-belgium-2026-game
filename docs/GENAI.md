# How generative AI was used

The whole game was built in one day with **Claude Code** (model: Claude Opus 5.5) as the main
tool — for research, game design, architecture and code. This file records how the tool was
directed: the key prompts, the iterations, and what was corrected by hand.

Every prompt submitted during development is also captured automatically by a Claude Code
`UserPromptSubmit` hook ([.claude/hooks/record-prompt.js](../.claude/hooks/record-prompt.js)).

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

### M4 — light and weight (13:35)
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
