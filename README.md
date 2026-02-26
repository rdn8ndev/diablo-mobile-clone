# Diablo Mobile Clone

A minimal top-down ARPG browser game optimized for touch screens.

## How to Run Locally

1. Open `index.html` directly in a mobile browser (Chrome/Safari), or
2. Serve via any static server: `python3 -m http.server 8080` then visit `http://localhost:8080`

## GitHub Pages Configuration

1. Push to a GitHub repository named `diablo-mobile-clone`
2. In repo settings → Pages → Source: select `main` branch, root folder
3. GitHub Pages URL will be: `https://yourusername.github.io/diablo-mobile-clone/`

## Controls

**Touch (mobile):**
- Left side: Virtual joystick (drag to move hero)
- Right side: Red ATTACK button (tap to attack enemies within range)

**Desktop (optional):**
- WASD to move
- Click attack button or use controls

## Gameplay

- Move with joystick to avoid enemies
- Tap ATTACK to damage nearby enemies (melee range shown as faint circle)
- 5 enemies chase you; they deal contact damage
- If HP reaches 0, click Restart
- Game restarts automatically when all enemies are killed

## Notes

- Pure HTML/CSS/JS - no build step
- Works offline once loaded
- Touch controls use `touch-action: none` to prevent scrolling
