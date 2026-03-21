# Phase 2 — Image Compositing Pipeline

**Goal:** Python produces a correctly composited ball PNG (face centered on cricket ball) from a test input image, saved to disk. No live camera yet.

---

## Tasks

### 2.1 — Face detection module (`capture.py`)

Create `photobooth/capture.py`:

```python
def detect_and_crop_face(pil_image: Image) -> Image | None:
    """
    Given a PIL RGBA/RGB image, detect the largest face,
    crop it with padding, and return a square RGBA image.
    Returns None if no face detected.
    """
```

Logic:
1. Convert PIL image to numpy BGR (for MediaPipe)
2. Run MediaPipe Face Detection (model 0 = short range, model 1 = long range; use model 1 for event distance)
3. Get the bounding box of the highest-confidence detection
4. Add configurable padding (default 25%) on all sides
5. Clamp to image bounds
6. Make the crop square (extend the shorter side)
7. Return as RGBA PIL Image

**Fallback:** If no face is detected, return the center-square crop of the image (graceful degradation — still produces a ball, just with whatever was in frame).

---

### 2.2 — Compositing module (`compositor.py`)

Create `photobooth/compositor.py`:

```python
def make_ball_photo(face_img: Image, ball_template: Image, face_ball_ratio: float = 0.58) -> Image:
    """
    Composites face_img onto the cricket ball template.
    Returns final RGBA PIL Image.
    """
```

Step-by-step:
1. Get ball template size (should be square-ish, e.g. 650x650)
2. Calculate face circle diameter = `ball_width * face_ball_ratio`
3. Resize `face_img` to `(diameter, diameter)`
4. Apply circular mask to face (draw white circle on black, use as mask)
5. Soft-edge the mask with a slight Gaussian blur (avoid harsh edge)
6. Paste face onto ball at center position using alpha mask
7. Return composited RGBA image

---

### 2.3 — Standalone test script

Create `photobooth/test_composite.py`:
- Loads a test image from `photobooth/assets/test_face.jpg` (copy any selfie/stock photo here)
- Calls `detect_and_crop_face()` → logs whether face was found
- Calls `make_ball_photo()` with the result
- Saves output to `photobooth/assets/test_output.png`
- Run with: `python test_composite.py`

---

### 2.4 — Verify Phase 2

1. Run `python test_composite.py`
2. Open `test_output.png` — check:
   - Face is circular, centered on the ball
   - No harsh square edge around the face
   - Ball seams still visible around the face
   - Ball transparency (RGBA) is preserved

---

## Edge Cases

| Case | Handling |
|---|---|
| No face in image | Use center-square crop as fallback |
| Multiple faces | Use the detection with the highest confidence score |
| Face too close to image edge | Clamp crop rect to image bounds before cropping |
| Very small face (far away) | Still works — just resize; quality degrades gracefully |
| Non-square ball template | Proceed anyway; compositing uses ball center regardless |
| Test image is grayscale | Convert to RGB before processing |
