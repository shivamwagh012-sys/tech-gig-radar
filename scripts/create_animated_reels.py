"""
TechGig Radar - Professional Animated Video Generator
Creates smooth animated videos with text overlays and synchronized audio
"""

import os
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import tempfile
import shutil
import math

# Paths
REELS_DIR = Path("C:/Users/shivam.wagh/projects/techgig-radar/public/reels")
FFMPEG_PATH = "C:/Users/shivam.wagh/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe"

# Video configurations
REELS = [
    {
        "id": 1,
        "audio": "voice-1.mp3",
        "output": "reel-1-fake-jobs.mp4",
        "bg_gradient": ["#1a1a2e", "#16213e"],
        "accent": "#00ff88",
        "title": "SPOT FAKE JOBS",
        "scenes": [
            {"text": "🚨 FAKE JOB ALERT", "sub": "30 Second Guide", "t": 0},
            {"text": "RED FLAG #1", "sub": "Vague Descriptions", "icon": "⚠️", "t": 4},
            {"text": "RED FLAG #2", "sub": "They Ask For Money", "icon": "💸", "t": 10},
            {"text": "RED FLAG #3", "sub": "Wrong Email Domain", "icon": "📧", "t": 16},
            {"text": "STAY SAFE!", "sub": "@TechGigRadar", "icon": "✅", "t": 22},
        ]
    },
    {
        "id": 2,
        "audio": "voice-2.mp3",
        "output": "reel-2-aws-backups.mp4",
        "bg_gradient": ["#0f1624", "#1a1a3e"],
        "accent": "#00d4ff",
        "title": "AWS NEWS",
        "scenes": [
            {"text": "☁️ BREAKING NEWS", "sub": "AWS Update", "t": 0},
            {"text": "S3 REPLICATION", "sub": "Egress Fees REMOVED", "icon": "💰", "t": 4},
            {"text": "MULTI-REGION", "sub": "Save $$$ Monthly", "icon": "🌍", "t": 10},
            {"text": "UPDATE NOW!", "sub": "@TechGigRadar", "icon": "🚀", "t": 16},
        ]
    },
    {
        "id": 3,
        "audio": "voice-3.mp3",
        "output": "reel-3-fresher-jobs.mp4",
        "bg_gradient": ["#1a0a2e", "#2d1b4e"],
        "accent": "#a855f7",
        "title": "FRESHERS",
        "scenes": [
            {"text": "🌱 HEY FRESHERS!", "sub": "Job Breakdown", "t": 0},
            {"text": "DATA ENGINEER", "sub": "0-2 Years Experience", "icon": "📊", "t": 4},
            {"text": "TECH STACK", "sub": "Python • SQL • dbt", "icon": "💻", "t": 10},
            {"text": "$60K - $80K", "sub": "Remote from India!", "icon": "💵", "t": 16},
            {"text": "APPLY TODAY!", "sub": "@TechGigRadar", "icon": "✨", "t": 22},
        ]
    },
    {
        "id": 4,
        "audio": "voice-4.mp3",
        "output": "reel-4-vscode.mp4",
        "bg_gradient": ["#1e1e2e", "#2d2d4e"],
        "accent": "#ffd93d",
        "title": "VS CODE",
        "scenes": [
            {"text": "⚡ TOP 5 EXTENSIONS", "sub": "2026 Edition", "t": 0},
            {"text": "#1 COPILOT", "sub": "AI Pair Programmer", "icon": "🤖", "t": 4},
            {"text": "#2 THUNDER", "sub": "API Testing", "icon": "⚡", "t": 10},
            {"text": "#3 ERROR LENS", "sub": "Inline Errors", "icon": "🔍", "t": 16},
            {"text": "#4 GITLENS", "sub": "Git Superpowers", "icon": "📝", "t": 22},
            {"text": "#5 PRETTIER", "sub": "Auto Format", "icon": "✨", "t": 28},
            {"text": "FOLLOW US!", "sub": "@TechGigRadar", "icon": "🚀", "t": 34},
        ]
    }
]

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_frame(config, scene, frame_num, total_frames, width=1080, height=1920):
    """Create a single frame with animations"""
    bg1 = hex_to_rgb(config["bg_gradient"][0])
    bg2 = hex_to_rgb(config["bg_gradient"][1])
    accent = hex_to_rgb(config["accent"])
    
    # Create image with gradient
    img = Image.new('RGB', (width, height), bg1)
    draw = ImageDraw.Draw(img)
    
    # Animated gradient background
    for y in range(height):
        ratio = y / height
        color = tuple(int(bg1[i] * (1-ratio) + bg2[i] * ratio) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    
    # Animated glow effect
    draw = ImageDraw.Draw(img, 'RGBA')
    progress = frame_num / max(total_frames, 1)
    glow_size = 300 + int(50 * math.sin(progress * math.pi * 4))
    glow_alpha = 20 + int(15 * math.sin(progress * math.pi * 2))
    glow_color = accent + (glow_alpha,)
    
    cx, cy = width // 2, height // 2
    draw.ellipse([cx - glow_size, cy - glow_size, cx + glow_size, cy + glow_size], fill=glow_color)
    
    # Load fonts
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 64)
        sub_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 42)
        icon_font = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 100)
        brand_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
    except:
        title_font = sub_font = icon_font = brand_font = ImageFont.load_default()
    
    draw = ImageDraw.Draw(img)
    
    # Fade in animation (first 10 frames)
    alpha = min(1.0, frame_num / 10) if frame_num < 10 else 1.0
    
    # Draw icon with bounce animation
    icon = scene.get("icon", "")
    if icon:
        bounce = int(10 * math.sin(progress * math.pi * 6)) if frame_num > 5 else 0
        try:
            bbox = draw.textbbox((0, 0), icon, font=icon_font)
            icon_w = bbox[2] - bbox[0]
            draw.text((width//2 - icon_w//2, height//2 - 280 + bounce), icon, font=icon_font, fill="white")
        except:
            pass
    
    # Draw main text with scale animation
    text = scene.get("text", "")
    if text:
        scale = min(1.0, 0.8 + frame_num / 30 * 0.2) if frame_num < 30 else 1.0
        font_size = int(64 * scale)
        try:
            scaled_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
        except:
            scaled_font = title_font
        
        bbox = draw.textbbox((0, 0), text, font=scaled_font)
        text_w = bbox[2] - bbox[0]
        y_pos = height//2 - 80 if icon else height//2 - 50
        draw.text((width//2 - text_w//2, y_pos), text, font=scaled_font, fill="white")
    
    # Draw subtitle
    sub = scene.get("sub", "")
    if sub:
        bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sub_w = bbox[2] - bbox[0]
        y_pos = height//2 + 20 if icon else height//2 + 50
        draw.text((width//2 - sub_w//2, y_pos), sub, font=sub_font, fill=accent)
    
    # Draw progress bar at bottom
    bar_height = 6
    bar_y = height - 180
    draw.rectangle([100, bar_y, width - 100, bar_y + bar_height], fill=(50, 50, 50))
    bar_progress = int((width - 200) * progress)
    draw.rectangle([100, bar_y, 100 + bar_progress, bar_y + bar_height], fill=accent)
    
    # Draw branding
    brand = "TechGig Radar"
    bbox = draw.textbbox((0, 0), brand, font=brand_font)
    brand_w = bbox[2] - bbox[0]
    draw.text((width//2 - brand_w//2, height - 120), brand, font=brand_font, fill=accent)
    
    return img

def get_scene_for_time(scenes, time_sec):
    """Get the current scene based on time"""
    current_scene = scenes[0]
    for scene in scenes:
        if time_sec >= scene["t"]:
            current_scene = scene
    return current_scene

def create_video(config):
    """Create animated video with synchronized audio"""
    print(f"\n🎬 Creating: {config['title']}")
    
    audio_path = REELS_DIR / config["audio"]
    output_path = REELS_DIR / config["output"]
    
    # Get audio duration using ffprobe
    cmd = [FFMPEG_PATH.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-show_entries", 
           "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    duration = float(result.stdout.strip()) if result.stdout.strip() else 30
    print(f"  📢 Audio duration: {duration:.1f}s")
    
    # Create temp directory
    temp_dir = Path(tempfile.mkdtemp())
    frames_dir = temp_dir / "frames"
    frames_dir.mkdir()
    
    try:
        fps = 30
        total_frames = int(duration * fps)
        print(f"  🖼️ Generating {total_frames} frames...")
        
        for i in range(total_frames):
            time_sec = i / fps
            scene = get_scene_for_time(config["scenes"], time_sec)
            
            # Calculate frame within scene
            scene_start = scene["t"]
            frame_in_scene = int((time_sec - scene_start) * fps)
            
            img = create_frame(config, scene, frame_in_scene, fps * 5)  # 5 sec per scene animation cycle
            img.save(frames_dir / f"frame_{i:05d}.png", "PNG")
            
            if i % 100 == 0:
                print(f"    Frame {i}/{total_frames}")
        
        print(f"  ⏳ Encoding video with audio...")
        
        # Encode with ffmpeg
        cmd = [
            FFMPEG_PATH, "-y",
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%05d.png"),
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-preset", "medium",
            "-crf", "20",
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"  ✅ Done! {config['output']} ({size_mb:.1f} MB)")
            return True
        else:
            print(f"  ❌ Error: {result.stderr[:300]}")
            return False
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    print("🎥 TechGig Radar - Animated Video Generator")
    print("=" * 50)
    
    success = 0
    for config in REELS:
        if create_video(config):
            success += 1
    
    print("\n" + "=" * 50)
    print(f"✅ Created {success}/{len(REELS)} videos")
    print(f"📁 Output: {REELS_DIR}")

if __name__ == "__main__":
    main()
