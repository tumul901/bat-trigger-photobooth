from PIL import Image, ImageDraw, ImageFilter

def make_ball_photo(face_img: Image, ball_template: Image, face_ball_ratio: float = 0.58) -> Image:
    """
    Composites face_img onto the cricket ball template.
    Returns final RGBA PIL Image.
    """
    # 1. Prepare Ball Template
    ball_copy = ball_template.convert("RGBA")
    bw, bh = ball_copy.size
    
    # 2. Resize Face for the ball face area
    target_size = int(bw * face_ball_ratio)
    face_resized = face_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # 3. Create Circular Mask for Face
    mask = Image.new("L", (target_size, target_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, target_size, target_size), fill=255)
    
    # Soften the edges of the circle
    mask = mask.filter(ImageFilter.GaussianBlur(1))
    
    # 4. Calculate Position (Center)
    # The center of the ball is (bw // 2, bh // 2)
    # The top-left of the face should be:
    pos_x = (bw - target_size) // 2
    pos_y = (bh - target_size) // 2
    
    # 5. Composite
    ball_copy.paste(face_resized, (pos_x, pos_y), mask)
    
    return ball_copy
