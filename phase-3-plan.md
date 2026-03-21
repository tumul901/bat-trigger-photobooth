# Phase 3 — Frontend Photo Wall (Static)

**Goal:** React+Vite app running, showing the stadium background fullscreen with hardcoded test balls scattered on it. WebSocket connection established but animation deferred to Phase 4.

---

## Tasks

### 3.1 — Vite + React + Tailwind setup

```bash
cd bat-trigger-photobooth
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install gsap canvas-confetti react-router-dom
```

Configure Tailwind in `tailwind.config.js`:
```js
content: ["./index.html", "./src/**/*.{js,jsx}"]
```

Set `index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; }
```

---

### 3.2 — React Router: two routes

In `src/main.jsx`:
```jsx
<Routes>
  <Route path="/" element={<Wall />} />
  <Route path="/capture" element={<Capture />} />
</Routes>
```

---

### 3.3 — Wall page (`Wall.jsx`)

Structure:
```jsx
<div className="relative w-full h-full overflow-hidden">
  {/* Stadium background */}
  <img src="/assets/stadium-bg.png" className="absolute inset-0 w-full h-full object-cover" />

  {/* Balls layer */}
  <div id="ball-layer" className="absolute inset-0">
    {balls.map(ball => <CricketBall key={ball.id} {...ball} />)}
  </div>
</div>
```

State: `balls` array, each item:
```js
{ id, imageUrl, x, y, scale, rotation }
```

For Phase 3: hardcode 5 test balls using `ball.png` (no face) at fixed positions to verify layout.

---

### 3.4 — CricketBall component (`CricketBall.jsx`)

```jsx
function CricketBall({ id, imageUrl, x, y, scale, rotation }) {
  return (
    <img
      id={`ball-${id}`}
      src={imageUrl}
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${scale * 100}vw`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    />
  )
}
```

Position is percentage-based so it scales with any screen size.

---

### 3.5 — WebSocket hook (`usePhotoWall.js`)

```js
function usePhotoWall() {
  const [balls, setBalls] = useState([])

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'new_ball') {
        setBalls(prev => [...prev, msg.ball])
      }
    }
    return () => ws.close()
  }, [])

  return { balls }
}
```

In Phase 3: WebSocket connects but `new_ball` events just add the plain ball PNG (no composited faces yet).

---

### 3.6 — FastAPI: serve frontend static files

In `photobooth/server.py`:
- Mount the Vite `dist/` folder (or dev proxy): For development, Vite runs on port 5173 and FastAPI on 8000. CORS headers are added to FastAPI so the dev Vite server can call the API.

---

### 3.7 — Verify Phase 3

1. `cd frontend && npm run dev` → open `http://localhost:5173`
2. Stadium background fills the screen with no letterboxing
3. 5 hardcoded test balls appear at scattered positions
4. No overflow or scrollbars
5. Open DevTools console → WebSocket connected to `ws://localhost:8000/ws` without error

---

## Edge Cases

| Case | Handling |
|---|---|
| Screen is not 16:9 | `object-cover` on stadium bg fills any ratio |
| Ball positioned near edge | Percentage coords + `translate(-50%,-50%)` keeps ball centered on its point |
| WebSocket server not running | `ws.onerror` logs warning, wall still displays (just won't receive new balls) |
| Very small screen (dev laptop) | Ball sizes use `vw` units — scale proportionally |
