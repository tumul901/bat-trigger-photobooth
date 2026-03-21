# Phase 4 — Ball Reveal Animation

**Goal:** When a new ball is added to the wall, it performs a full celebratory reveal animation: flies in, bounces into position, triggers a localised confetti burst, then settles into its idle float. All driven by GSAP and canvas-confetti.

---

## Tasks

### 4.1 — GSAP entrance animation in `CricketBall.jsx`

Use `useGSAP` hook (from `@gsap/react`, or `useEffect` + `gsap` directly):

```js
// On mount, animate from off-screen bottom-center to resting position
gsap.fromTo(`#ball-${id}`,
  {
    left: '50%',
    top: '110%',      // below screen
    scale: 0,
    opacity: 0,
    rotation: randomBetween(-20, 20)
  },
  {
    left: `${x}%`,
    top: `${y}%`,
    scale: 1,
    opacity: 1,
    rotation: rotation,
    duration: 0.9,
    ease: 'elastic.out(1, 0.6)',  // bouncy overshoot
    delay: 0.1,
    onComplete: () => startIdleFloat(id)  // after settle, begin idle
  }
)
```

---

### 4.2 — Idle float animation

After the entrance animation completes, add a gentle infinite float:

```js
function startIdleFloat(id) {
  gsap.to(`#ball-${id}`, {
    y: '-=8',             // float up 8px
    duration: 2.5 + Math.random(),
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,           // infinite
  })
}
```

Each ball gets a slightly different float speed for an organic feel.

---

### 4.3 — Confetti burst (`ConfettiBurst.jsx` / inline)

Fire `canvas-confetti` at the ball's final screen position:

```js
import confetti from 'canvas-confetti'

function fireCelebration(x_percent, y_percent) {
  confetti({
    particleCount: 60,
    spread: 55,
    origin: {
      x: x_percent / 100,
      y: y_percent / 100,
    },
    colors: ['#ff0000', '#ffffff', '#ffd700', '#008000'],  // cricket colours
    scalar: 0.9,
    gravity: 1.2,
    ticks: 150,    // short burst, not lingering
  })
}
```

Call `fireCelebration(x, y)` inside the GSAP `onComplete` callback, so confetti fires exactly when ball lands.

---

### 4.4 — Ball cap (remove oldest when limit reached)

In `usePhotoWall.js`:
```js
setBalls(prev => {
  const updated = [...prev, newBall]
  return updated.length > MAX_BALLS
    ? updated.slice(updated.length - MAX_BALLS) // remove oldest
    : updated
})
```

The removed ball's DOM element is unmounted — no explicit exit animation for now (can add fade-out in polish phase).

---

### 4.5 — Demo test in browser

Add a temporary "Simulate Swing" button in `Wall.jsx` (dev only):
```jsx
{import.meta.env.DEV && (
  <button
    className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded"
    onClick={addTestBall}
  >
    Simulate Swing
  </button>
)}
```
`addTestBall()` pushes a ball with `imageUrl = '/assets/ball.png'` and random `x, y`.

---

### 4.6 — Verify Phase 4

1. Click "Simulate Swing" button
2. Ball flies in from bottom center ✓
3. Elastic bounce overshoot then settle ✓
4. Confetti fires at landing position (localised, not full screen) ✓
5. Ball gently floats up and down after settling ✓
6. Click 5 more times — 6 balls on screen, all floating independently ✓
7. Click past `MAX_BALLS` — oldest ball disappears as newest appears ✓

---

## Edge Cases

| Case | Handling |
|---|---|
| Two swings fire in quick succession | Both balls animate simultaneously — GSAP handles parallel timelines |
| Ball's resting position very near edge | `x` clamped to 8%–92%, `y` to 10%–85% in position generator |
| confetti fires before ball arrives | `fireCelebration` called in `onComplete`, so always after ball lands |
| Tab not in focus during animation | GSAP uses `requestAnimationFrame`, which pauses — ball appears instantly on refocus |
