# Phase 6 — Integration & Polish

**Goal:** All three devices work together end-to-end in a real live-event scenario. Edge cases are handled, performance is verified, and the experience feels polished and reliable.

---

## Tasks

### 6.1 — Network configuration

On the Swing PC, find the local IP:
```bash
ipconfig  # look for IPv4 under the WiFi adapter
```

On the frontend, replace hardcoded `localhost` with the Swing PC IP using a Vite environment variable:

`.env` (create in `frontend/`):
```
VITE_API_URL=http://192.168.x.x:8000
VITE_WS_URL=ws://192.168.x.x:8000
```

Usage in hooks:
```js
const ws = new WebSocket(import.meta.env.VITE_WS_URL + '/ws')
```

FastAPI must allow CORS from the tablet and TV origins:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"])  # tighten for production
```

---

### 6.2 — Startup script

Create `start.bat` in the project root to launch everything on the Swing PC in one click:

```bat
@echo off
echo Starting Bat Trigger Photobooth...

start "Bat Trigger" cmd /k "cd /d \"d:\work2\bat-trigger-photobooth\bat trigger\" && python main.py"

start "Photobooth Server" cmd /k "cd /d d:\work2\bat-trigger-photobooth\photobooth && uvicorn server:app --host 0.0.0.0 --port 8000"

start "Frontend" cmd /k "cd /d d:\work2\bat-trigger-photobooth\frontend && npm run dev -- --host"

echo All services started.
echo.
echo  Tablet:  http://<this-pc-ip>:5173/capture
echo  TV Wall: http://<this-pc-ip>:5173/wall
pause
```

---

### 6.3 — Production build (optional for event)

If running on a dedicated event machine, build the frontend for better performance:
```bash
cd frontend
npm run build
```
Then serve `dist/` as static files from FastAPI directly, removing the need for the Vite dev server.

---

### 6.4 — Full end-to-end test run

Run through the complete user journey 5 times:

| Step | Expected |
|---|---|
| Open `/capture` on tablet | Webcam opens, face guide visible |
| Tap capture → confirm | "Get Ready to Swing!" screen |
| FastAPI console | Logs `Compositing started` |
| Perform swing | Bat trigger logs `SWING_DETECTED`, server logs `SWING RECEIVED` |
| TV `/wall` page | Ball flies in, confetti fires, ball settles with float |
| Repeat 5+ times | All balls accumulate; oldest removed after 40 |

---

### 6.5 — Performance tuning

| Metric | Target | If failing |
|---|---|---|
| POST → composite done | < 8 seconds | Reduce image size in `capture.py` before sending |
| WS push → ball visible | < 200ms | Already instant via WebSocket |
| Ball entrance animation | 60fps | Check for too many DOM elements; cap at 40 |
| Swing detection latency | < 100ms | Already handled by existing trigger code |

---

### 6.6 — Visual polish checklist

- [ ] Stadium background is sharp, no pixelation at full TV resolution (4K if needed)
- [ ] Ball sizing feels right on a 55"+ TV (`.env` config `VITE_BALL_MIN_VW` / `VITE_BALL_MAX_VW`)
- [ ] Confetti colours match cricket/event brand (`#ff0000`, `#ffd700`, `#ffffff`)
- [ ] "Get Ready to Swing!" screen looks premium on the tablet (dark background, large type, animated)
- [ ] All text uses a loaded Google Font (e.g. **Outfit** or **Rajdhani** for cricket feel)
- [ ] No scrollbars on any page
- [ ] Tablet page works in landscape and portrait orientation

---

### 6.7 — Operator guide (brief)

Create `OPERATOR_GUIDE.md` in the project root:
- How to start everything (`start.bat`)
- URLs for each device
- What to do if the wall freezes (refresh the TV browser tab)
- What to do if compositing seems slow (check the Photobooth Server console)
- How to reset the wall (add a secret keypress `Ctrl+R` or hidden button that clears all balls)

---

## Final Edge Cases

| Case | Handling |
|---|---|
| TV browser tab loses WebSocket connection | Auto-reconnect with exponential backoff in `usePhotoWall.js` |
| FastAPI server crashes mid-event | Restart via `start.bat`; bat trigger retries TCP connection on next swing |
| Tablet runs out of battery | Any device with a browser can open `/capture` and rejoin |
| 40+ balls on wall | Oldest ball fades out and is removed; newest always added |
| Swing misfires (accidental trigger) | Swing detector debounce (5s) already prevents most; operator can refresh wall if needed |
| No face detected in photo | Fallback center-crop composite — always produces a ball, never blocks the flow |
