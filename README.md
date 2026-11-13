# Archery

A relaxed, eight-arrow field round for Lang Systems Arcade. Try four targets at 12–36 metres. Score 15 for the outer ring, 30 closer to centre and 50 for a bullseye. Your best round is saved in the current browser.

[Play on GitHub Pages](https://langzonedev.github.io/Archery-/)

## Controls

- Touch or mouse: press inside the range, drag sideways to aim and down to draw. Release to shoot. The aim dot previews where the arrow crosses the nearest target lane.
- Keyboard: Tab to the range. Left and Right aim, Up and Down adjust draw, Space shoots and Escape clears the draw.
- Restart begins a fresh round. Sound is optional.

## Local development

Serve this directory over HTTP, for example with `python3 -m http.server 8000`, and open `http://localhost:8000`. There is no build step. GitHub Pages publishes from the root of `main`.

For handoff, try a short pull at the near targets and stronger draws for the far targets. Check that interrupted gestures clear the bow, scoring updates only once per arrow and the best score survives a reload.
