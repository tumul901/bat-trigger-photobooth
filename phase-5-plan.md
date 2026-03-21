# Phase 5 — Capture Page (Tablet Station)

**Goal:** The `/capture` page on the tablet opens the camera, takes a face photo on operator tap, POSTs it to the backend, starts the compositing pipeline, and transitions to a "Get Ready to Swing!" screen. No waiting — the flow is instant from the user's perspective.

---

## Tasks

### 5.1 — Capture page layout (`Capture.jsx`)

Three internal states:

| State | What user sees |
|---|---|
| `idle` | "Step in front of the camera" prompt + live webcam preview |
| `preview` | Frozen captured frame + "Looks good!" confirm / "Retake" buttons |
| `ready` | Full-screen animated "🏏 Get Ready to Swing!" screen |

---

### 5.2 — Webcam viewfinder

Use browser `getUserMedia` with rear-preference (tablet back camera if available):

```js
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: 'user' }, width: 1280, height: 720 },
  audio: false,
})
videoRef.current.srcObject = stream
```

Display the `<video>` element fullscreen with a **circular face-guide overlay** (CSS ring) so the user knows where to position their face.

---

### 5.3 — Capture + preview

When "Capture" is tapped:
1. Draw the current video frame onto an offscreen `<canvas>` at 720p
2. `canvas.toBlob('image/jpeg', 0.92)` → Blob
3. freeze the video (pause or overlay the canvas snapshot)
4. Show preview + Confirm / Retake buttons

On confirm:
1. Create `FormData`, append the blob as `image`
2. `POST /api/capture` to FastAPI
3. Transition page state to `ready`  — do NOT wait for the POST response before showing the "Get Ready" screen (fire and forget from the UX perspective)

---

### 5.4 — FastAPI `/api/capture` endpoint

In `photobooth/server.py`, add:

```python
@app.post("/api/capture")
async def capture(image: UploadFile = File(...)):
    data = await image.read()
    pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    # Kick off compositing as a background task — non-blocking
    asyncio.create_task(run_compositing(pil_img))
    return {"status": "compositing_started"}
```

`run_compositing(pil_img)` calls `compositor.py` and stores the finished ball PNG in a module-level variable `pending_ball_image` (overwriting any previous pending shot).

---

### 5.5 — "Get Ready to Swing!" screen

Full-screen, dark cricket-themed design with:
- Large animated bat emoji or SVG
- "Get Ready to Swing! 🏏" heading (Tailwind + custom font)
- Subtle pulsing animation (GSAP infinite scale pulse on the icon)
- After 30s timeout with no swing → auto-reset to `idle` state (edge case: user walked away)

---

### 5.6 — FastAPI: send ball on swing detected

Update `tcp_listener()` in `server.py`. When `SWING_DETECTED` arrives:
1. Check if `pending_ball_image` is set
2. If yes: encode as base64, broadcast WebSocket `new_ball` event, clear `pending_ball_image`
3. If no: log warning "swing fired but no pending ball" — this means compositing wasn't done yet (very unlikely given the head start, but handle gracefully)

---

### 5.7 — Verify Phase 5

1. Open `http://<swing-pc-ip>:5173/capture` on the tablet
2. Webcam opens, face guide visible ✓
3. Tap capture → face preview shown ✓
4. Tap confirm → "Get Ready to Swing!" screen appears instantly ✓
5. On Swing PC console, FastAPI logs: `Compositing started` ✓
6. Perform swing → TV (`/wall`) shows new composited ball with face ✓

---

## Edge Cases

| Case | Handling |
|---|---|
| Compositing not finished when swing fires | Log warning + push a fallback ball using just `ball.png` (no face) so the wall always reacts |
| User retakes photo multiple times | Each new POST overwrites `pending_ball_image` — only the latest composite matters |
| Tablet camera permission denied | Show an error screen with instructions to allow camera access |
| User walks away without swinging | 30s `idle` timeout resets `/capture` to `idle` state, clears `pending_ball_image` |
| Two people use the station simultaneously | `pending_ball_image` is last-write-wins — operators manage the physical queue |
| Poor lighting → face not detected | `compositor.py` fallback: center-square crop (from Phase 2) — always produces a ball |
