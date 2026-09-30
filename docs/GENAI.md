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

_Updated per milestone._
