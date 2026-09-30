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

_To be documented as they are implemented._

## How generative AI was used

See [docs/GENAI.md](docs/GENAI.md).

## Credits

- Robot designs based on the Devoxx Robot Games model sheets.
- Venue layout based on the Kinepolis Antwerp floor plans provided by Devoxx.

## License

[MIT](LICENSE)
