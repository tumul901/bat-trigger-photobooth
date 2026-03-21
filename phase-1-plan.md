# Phase 1 — Backend Scaffolding

**Goal:** FastAPI server is running, receives TCP events from the bat trigger, and echoes them over WebSocket to any connected browser. No image processing yet.

---

## Tasks

### 1.1 — Project setup

- Create `photobooth/` directory
- Create `photobooth/requirements.txt`:
  ```
  fastapi
  uvicorn[standard]
  websockets
  pillow
  mediapipe
  opencv-python
  python-multipart
  ```
- Copy assets:
  - `reference-img/ball-individual.png` → `photobooth/assets/ball.png`
  - `stadium-bg.png` → `photobooth/assets/stadium-bg.png`
- Create `photobooth/config.ini`

**config.ini:**
```ini
[trigger]
host = localhost
port = 9999

[camera]
device_index = 0

[compositing]
face_padding = 0.25
face_ball_ratio = 0.58

[display]
ball_count_max = 40
```

---

### 1.2 — FastAPI server skeleton

Create `photobooth/server.py`:
- FastAPI app with a `/ws` WebSocket endpoint
- A `ConnectionManager` class that keeps a list of active WebSocket connections and can broadcast a JSON message to all of them
- A `/health` GET endpoint that returns `{"status": "ok"}` (useful for testing)
- Serve `photobooth/assets/` as static files at `/assets`

---

### 1.3 — TCP socket listener (trigger bridge)

In `server.py`, on startup (FastAPI `lifespan`):
- Start a background `asyncio` task: `tcp_listener()`
- `tcp_listener()` opens a TCP server on `localhost:9999`
- Reads newline-delimited JSON from the connection
- On receiving `{"event": "SWING_DETECTED", ...}`, broadcasts `{"type": "swing_detected"}` to all WebSocket clients

---

### 1.4 — Modify bat trigger

In `bat trigger/main.py`, update `trigger_event()`:
- After `print(json.dumps(event))`, attempt to send the same JSON string over TCP to `localhost:9999`
- Wrap in try/except — if photobooth server is not running, fail silently (no crash)
- Use a module-level persistent socket with reconnect logic (not a new socket per swing)

---

### 1.5 — Verify Phase 1

**Test A — Server starts:**
```bash
cd photobooth
uvicorn server:app --reload --port 8000
```
→ Browser opens `http://localhost:8000/health` → returns `{"status": "ok"}`

**Test B — WebSocket echo:**
- Open browser console on `http://localhost:8000`
- Connect to `ws://localhost:8000/ws`
- Run bat trigger, perform a swing
- Browser console should log: `{"type": "swing_detected"}`

---

## Edge Cases

| Case | Handling |
|---|---|
| Photobooth server not running when swing fires | Silent fail in trigger, try reconnect next swing |
| Multiple WebSocket clients connected | `ConnectionManager` broadcasts to all |
| Malformed JSON from trigger | Catch `JSONDecodeError`, log warning, discard |
| Client disconnects mid-session | Remove from `ConnectionManager` on `WebSocketDisconnect` |
| Multiple rapid swings | Each queued as an `asyncio` task, processed in order |
