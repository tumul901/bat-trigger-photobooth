import cv2
import numpy as np
import os
from PIL import Image, ImageOps
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Initialize MediaPipe Tasks Face Detector
current_dir = os.path.dirname(os.path.abspath(__file__))
# Note: The model was downloaded to photobooth/assets/face_detector.tflite
model_path = os.path.join(current_dir, "assets", "face_detector.tflite")

# Configure the detector
base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.FaceDetectorOptions(base_options=base_options)
detector = vision.FaceDetector.create_from_options(options)

def detect_and_crop_face(pil_image: Image) -> Image:
    """
    Detects face, fixes EXIF orientation, and returns a square crop.
    """
    # 1. Fix EXIF rotation and convert to RGB
    img = ImageOps.exif_transpose(pil_image).convert("RGB")
    img_array = np.array(img)
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_array)

    # 2. Run Detection
    detection_result = detector.detect(mp_image)

    if detection_result.detections:
        detection = max(detection_result.detections, key=lambda d: d.categories[0].score)
        bbox = detection.bounding_box
        bx, by, bw, bh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
        h, w = img.size[1], img.size[0]
        
        # Padded square crop
        padding = 0.35
        side = int(max(bw, bh) * (1 + padding * 2))
        
        cx = bx + bw // 2
        cy = by + bh // 2
        
        x1 = max(0, cx - side // 2)
        y1 = max(0, cy - side // 2)
        x2 = min(w, x1 + side)
        y2 = min(h, y1 + side)
        
        if x2 - x1 < side: x1 = max(0, x2 - side)
        if y2 - y1 < side: y1 = max(0, y2 - side)
            
        return img.crop((x1, y1, x2, y2)).convert("RGBA")

    # Fallback: Center Square Crop
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side)).convert("RGBA")
