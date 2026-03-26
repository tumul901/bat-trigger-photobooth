import asyncio
import json
import os
import io
import base64
import time
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

# Import our custom modules
from capture import detect_and_crop_face
from compositor import make_ball_photo

app = FastAPI()

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State for pending ball
# This stores the latest composited ball (as a base64 string) waiting for a swing.
pending_ball_data = None 

# Pre-load ball template to save time during capture
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
BALL_TEMPLATE = Image.open(os.path.join(ASSETS_DIR, "ball.png"))

# Serve static assets (renamed to avoid collision with React's /assets folder)
app.mount("/backend-assets", StaticFiles(directory=ASSETS_DIR), name="backend-assets")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"DEBUG: New WebSocket connection. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"DEBUG: WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"DEBUG: Broadcast error: {e}")

manager = ConnectionManager()

def run_compositing_sync(file_data: bytes):
    """
    Synchronous version of compositing to run in a threadpool.
    """
    global pending_ball_data
    try:
        t0 = time.time()
        # 1. Load image and fix rotation
        source_img = Image.open(io.BytesIO(file_data)).convert("RGB")
        source_img = ImageOps.exif_transpose(source_img)
        # Webcam feeds are naturally mirrored — flip horizontally to correct
        source_img = ImageOps.mirror(source_img)
        t1 = time.time()
        
        # 2. Detect & Crop
        face_crop = detect_and_crop_face(source_img)
        t2 = time.time()
        
        # 3. Composite onto ball
        final_ball = make_ball_photo(face_crop, BALL_TEMPLATE)
        t3 = time.time()
        
        # 4. Save to base64
        buffered = io.BytesIO()
        final_ball.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        t4 = time.time()
        
        pending_ball_data = f"data:image/png;base64,{img_str}"
        
        # Stats
        print(f"--- COMPOSITING PROFILE ---")
        print(f"  [1] Load & Rotate: {round(t1-t0, 3)}s")
        print(f"  [2] Face Detect:   {round(t2-t1, 3)}s")
        print(f"  [3] Compose:       {round(t3-t2, 3)}s")
        print(f"  [4] Encode (b64):  {round(t4-t3, 3)}s")
        print(f"  TOTAL TIME:        {round(t4-t0, 3)}s")
        print(f"---------------------------")
        
        return True
    except Exception as e:
        print(f"ERROR: Compositing failed: {e}")
        return False

@app.get("/health")
async def health():
    return {"status": "ok", "pending": pending_ball_data is not None}

@app.post("/api/capture")
async def capture(image: UploadFile = File(...)):
    """
    Received image from tablet station.
    """
    print(f"DEBUG: /api/capture request received! Filename: {image.filename}")
    data = await image.read()
    print(f"DEBUG: Image data read complete. Size: {len(data)} bytes")
    
    # Use run_in_executor to avoid blocking the main event loop
    loop = asyncio.get_event_loop()
    
    def background_task():
        print("DEBUG: Starting background compositing task...")
        if run_compositing_sync(data):
            print("DEBUG: Compositing success, broadcasting...")
            # After sync work is done, broadcast the notification on the main loop
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({"type": "compositing_done"}), 
                loop
            )
        else:
            print("DEBUG: Compositing FAILED in background task")
            
    loop.run_in_executor(None, background_task)
    
    return {"status": "ok", "message": "Processing started"}

@app.get("/api/debug/swing")
async def debug_swing():
    """
    Manually trigger a swing event for testing without the bat trigger script.
    """
    global pending_ball_data
    print("DEBUG: Manual swing triggered via API!")
    
    image_url = pending_ball_data if pending_ball_data else "/backend-assets/ball.png"
    
    # For photo balls, we MUST keep rotation at 0 so the face is vertical.
    # For default balls, a random rotation looks more natural.
    is_photo = image_url.startswith("data:image")
    ball_rotation = 0 if is_photo else (time.time() * 123) % 360
    
    await manager.broadcast({
        "type": "new_ball", 
        "ball": {
            "id": int(time.time() * 1000),
            "imageUrl": image_url,
            "x": 15 + (time.time() * 73) % 70, 
            "y": 20 + (time.time() * 91) % 45,
            "finalScale": 0.37, 
            "rotation": ball_rotation
        }
    })
    
    pending_ball_data = None
    return {"status": "ok", "message": "Debug swing broadcasted"}

@app.post("/api/swing")
async def swing():
    """
    Received swing detection from the browser tablet.
    """
    global pending_ball_data
    print("DEBUG: SWING detected via Browser API!")
    
    image_url = pending_ball_data if pending_ball_data else "/backend-assets/ball.png"
    
    # Ensure photo balls stay upright
    is_photo = image_url.startswith("data:image")
    ball_rotation = 0 if is_photo else (time.time() * 123) % 360
    
    await manager.broadcast({
        "type": "new_ball", 
        "ball": {
            "id": int(time.time() * 1000),
            "imageUrl": image_url,
            "x": 15 + (time.time() * 73) % 70, 
            "y": 20 + (time.time() * 91) % 45,
            "finalScale": 0.37, 
            "rotation": ball_rotation
        }
    })
    
    pending_ball_data = None
    return {"status": "ok", "message": "Swing event processed"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep-alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

async def handle_trigger(reader, writer):
    """
    Handles TCP messages from the bat trigger script.
    """
    global pending_ball_data
    addr = writer.get_extra_info('peername')
    print(f"DEBUG: Trigger connected from {addr}")
    
    try:
        while True:
            data = await reader.readline()
            if not data: break
            
            line = data.decode().strip()
            if not line: continue
                
            try:
                event = json.loads(line)
                if event.get("event") == "SWING_DETECTED":
                    print("DEBUG: SWING_DETECTED! Pushing to wall...")
                    
                    # If we have a custom ball, use it. Otherwise fallback to default.
                    image_url = pending_ball_data if pending_ball_data else "/backend-assets/ball.png"
                    
                    # Ensure photo balls stay upright
                    is_photo = image_url.startswith("data:image")
                    ball_rotation = 0 if is_photo else (time.time() * 123) % 360
                    
                    # Broadcast with specific metadata for Phase 4 animations
                    await manager.broadcast({
                        "type": "new_ball", 
                        "ball": {
                            "id": int(time.time() * 1000),
                            "imageUrl": image_url,
                            "x": 15 + (time.time() * 73) % 70, 
                            "y": 20 + (time.time() * 91) % 45, # Keep lower for safe zone
                            "finalScale": 0.37, 
                            "rotation": ball_rotation
                        }
                    })
                    
                    # Clear pending after it's been used
                    pending_ball_data = None
                    
            except json.JSONDecodeError:
                pass
    finally:
        writer.close()
        await writer.wait_closed()

async def tcp_server():
    server = await asyncio.start_server(handle_trigger, '0.0.0.0', 9999)
    async with server:
        await server.serve_forever()

@app.on_event("startup")
async def startup_event():
    # Start the TCP trigger bridge
    asyncio.create_task(tcp_server())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
