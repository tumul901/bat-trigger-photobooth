import os
from PIL import Image
from capture import detect_and_crop_face
from compositor import make_ball_photo

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
assets_dir = os.path.join(current_dir, "assets")
ball_path = os.path.join(assets_dir, "ball.png")

# Use stadium bg as a dummy source if no test face exists
test_face_source = os.path.join(os.path.dirname(current_dir), "reference-img", "photo-wall.jpeg")
output_path = os.path.join(assets_dir, "test_output.png")

def test():
    print("DEBUG: Loading assets...")
    if not os.path.exists(ball_path):
        print(f"ERROR: Ball template not found at {ball_path}")
        return

    ball_template = Image.open(ball_path)
    
    # Load test source (using photo-wall.jpeg as it has faces)
    if not os.path.exists(test_face_source):
        print(f"ERROR: Test source not found at {test_face_source}")
        return
        
    source_img = Image.open(test_face_source)
    print(f"DEBUG: Processing source {test_face_source}...")

    # 1. Detect & Crop
    face_crop = detect_and_crop_face(source_img)
    print("DEBUG: Face detect/crop complete.")

    # 2. Composite
    result = make_ball_photo(face_crop, ball_template)
    print("DEBUG: Composition complete.")

    # 3. Save
    result.save(output_path)
    print(f"SUCCESS: Saved composited ball to {output_path}")

if __name__ == "__main__":
    test()
