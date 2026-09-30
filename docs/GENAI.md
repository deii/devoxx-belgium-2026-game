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

### M1 + M2 — robots in the venue (13:00)
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
