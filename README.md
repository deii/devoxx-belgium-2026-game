# Heisenbug: Keynote in 10

A browser game for the [Devoxx Belgium 2026 Robot Games](https://game.devoxx.be/) competition.

The keynote in Room 8 at Kinepolis Antwerp starts in ten minutes, the auditorium is dark and the
speaker's HDMI adapter is on the wrong side of the building. Three robots have to fix it together —
and one of them has a glitch nobody has diagnosed yet.

> Work in progress — built on 30 September 2026. This README is updated with every milestone.

## The mission

The keynote clock counts down from 10:00 (about six minutes of real time). Everything has to be
done by the three robots together:

1. **Biggy** shoves the wall of sponsor crates out of the Megacandy bottleneck — the only way from
   the foyer into the central corridor. Voxxy and Droid are too light to move a crate at all.
2. **Voxxy** squeezes between the queue barriers of the speakers' lounge (too narrow for the other
   two) and picks up the speaker's HDMI adapter.
3. **Droid** restores power at the old fuse panel by the grand staircase…
4. …and opens the Room 8 service door.
5. **Voxxy** carries the adapter onto the Room 8 stage. The projector starts, you win.

If the clock reaches zero first, the keynote starts in the dark.

### The Heisenbug

One of the three robots — a different one every run — has a bug nobody has diagnosed yet. Every
so often it misbehaves: steering flips left/right, a sensor blackout drops its commands, the
throttle latches after you let go, or, while you are driving someone else, it twitches on its own.
The glitches get more frequent as the morning goes on.

The system log in the corner reports every symptom but never says *which* unit it was — you have to
work that out from what you see. Drive your suspect into **Droid's old maintenance bay** (in the
corridor, against the Room 4 wall) and press <kbd>E</kbd> for a three-second self-test. Right, and
the glitches stop for good. Wrong, and the keynote clock loses 30 seconds. Finding it is optional —
the end screen tells you who it was either way.

## Play

- **Live:** https://deii.github.io/devoxx-belgium-2026-game/
- **Locally:** clone the repository and serve the folder with any static file server, then open it
  in a browser:

  ```bash
  git clone https://github.com/deii/devoxx-belgium-2026-game.git
  cd devoxx-belgium-2026-game
  npx serve .          # or: python -m http.server 8000
  ```

  ES modules do not load from `file://`, so opening `index.html` directly will not work.

No build step, no dependencies — plain HTML, CSS and JavaScript on a 2D canvas.

## The robots

| Robot | Role |
|-------|------|
| **Voxxy** | Light and quick. Slips through the crowd and carries the adapter. |
| **Droid** | Has been in this building for years. Opens service doors, restores power, lights the way. |
| **Biggy** | Heavy and hard to stop. Pushes crates and forces jammed doors — but cannot take the stairs. |

## Controls

| Key | Action |
|-----|--------|
| <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys | Drive the selected robot |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> or <kbd>Tab</kbd> | Switch between Voxxy, Droid and Biggy |
| <kbd>E</kbd> or <kbd>Space</kbd> | Interact (pick up / drop, fuse panel, service door) |
| <kbd>Enter</kbd> / <kbd>R</kbd> | Start / play again |

The robots are physically simulated: each has its own mass, motor force, turning speed and grip.
Voxxy reaches 4.5 m/s in about a second and skids in tight turns; Biggy needs five seconds to get
up to speed, coasts for two metres after you let go, and knocks Voxxy aside on contact.

## Light and weight

The cinema floor starts without power. Daylight falls through the glass facade of the foyer; the
central corridor has only green exit signs and emergency lights, and Room 8 is pitch black.
Droid's amber eyes are a real torch, Voxxy's visor glows. Resetting the fuse panel brings the
ceiling lamps back with a fluorescent flicker, turns on Room 8's house lights and starts the
projector — a blue "no signal" beam until the adapter is plugged in.

Weight is visible, too: Voxxy kicks up dust when it skids, Biggy's footfalls puff dust and nudge
the camera, and every hard impact shakes the view in proportion to mass × speed.

## How generative AI was used

See [docs/GENAI.md](docs/GENAI.md).

## Credits

- Robot designs based on the Devoxx Robot Games model sheets.
- Venue layout traced from the Kinepolis Antwerp cinema-floor plan provided by Devoxx
  ([references](https://game.devoxx.be/references.html)); the plan itself is shown as a faint
  overlay (`assets/cinema-floor-plan.png`).

## License

[MIT](LICENSE)
