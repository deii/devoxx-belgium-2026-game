# Heisenbug: Keynote in 10

A browser game for the [Devoxx Belgium 2026 Robot Games](https://game.devoxx.be/) competition.

The keynote in Room 8 at Kinepolis Antwerp starts in ten minutes, the auditorium is dark and the
speaker's HDMI adapter is on the wrong side of the building. Three robots have to fix it together —
and one of them has a glitch nobody has diagnosed yet.

> Work in progress — built on 30 September 2026. This README is updated with every milestone.

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

The robots are physically simulated: each has its own mass, motor force, turning speed and grip.
Voxxy reaches 4.5 m/s in about a second and skids in tight turns; Biggy needs five seconds to get
up to speed, coasts for two metres after you let go, and knocks Voxxy aside on contact.

## How generative AI was used

See [docs/GENAI.md](docs/GENAI.md).

## Credits

- Robot designs based on the Devoxx Robot Games model sheets.
- Venue layout traced from the Kinepolis Antwerp cinema-floor plan provided by Devoxx
  ([references](https://game.devoxx.be/references.html)); the plan itself is shown as a faint
  overlay (`assets/cinema-floor-plan.png`).

## License

[MIT](LICENSE)
