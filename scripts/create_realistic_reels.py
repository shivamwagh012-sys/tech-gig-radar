#!/usr/bin/env python3
"""
TechGig Radar - Professional Reel Generator
Creates realistic animated videos with text animations, transitions, and polished voiceover
"""

import subprocess
import os
import json
from pathlib import Path
import random
import math

# Paths
PROJECT_DIR = Path(__file__).parent.parent
REELS_DIR = PROJECT_DIR / "public" / "reels"
FFMPEG = r"C:\Users\shivam.wagh\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe"

# Video settings
WIDTH = 1080
HEIGHT = 1920
FPS = 30

# Reel content data
REELS = [
    {
        "id": 1,
        "filename": "reel-1-fake-jobs.mp4",
        "voice": "voice-1.mp3",
        "title": "SPOT FAKE JOBS",
        "subtitle": "in 30 Seconds",
        "scenes": [
            {"text": "🚨 RED FLAG #1", "subtext": "Vague job description\\nNo company details", "duration": 5, "color": "#FF4757"},
            {"text": "🚨 RED FLAG #2", "subtext": "Asks for money\\nupfront fees", "duration": 5, "color": "#FF6B35"},
            {"text": "🚨 RED FLAG #3", "subtext": "Gmail or Yahoo\\nfor 'official' contact", "duration": 5, "color": "#FFA500"},
            {"text": "🚨 RED FLAG #4", "subtext": "Urgency pressure\\nDecide NOW!", "duration": 5, "color": "#FF4757"},
            {"text": "✅ STAY SAFE", "subtext": "Research • Verify • Ask Questions", "duration": 7, "color": "#00FF88"},
        ],
        "bg_color": "#0a0a1a"
    },
    {
        "id": 2,
        "filename": "reel-2-aws-backups.mp4",
        "voice": "voice-2.mp3",
        "title": "AWS DROPS",
        "subtitle": "Backup Costs",
        "scenes": [
            {"text": "☁️ BREAKING", "subtext": "AWS S3 Update", "duration": 4, "color": "#00D4FF"},
            {"text": "💰 50% OFF", "subtext": "Cross-region\\nreplication fees", "duration": 6, "color": "#00FF88"},
            {"text": "🌍 ALL REGIONS", "subtext": "Available now\\nworldwide", "duration": 5, "color": "#A855F7"},
            {"text": "💡 TIP", "subtext": "Update your\\nterraform configs!", "duration": 7, "color": "#FFD93D"},
        ],
        "bg_color": "#0a1a2a"
    },
    {
        "id": 3,
        "filename": "reel-3-fresher-jobs.mp4",
        "voice": "voice-3.mp3",
        "title": "FRESHER FRIENDLY",
        "subtitle": "Job Breakdown",
        "scenes": [
            {"text": "🎯 ROLE", "subtext": "Associate\\nData Engineer", "duration": 5, "color": "#00FF88"},
            {"text": "📊 EXPERIENCE", "subtext": "0-2 Years\\nFresher OK!", "duration": 5, "color": "#00D4FF"},
            {"text": "💻 SKILLS", "subtext": "SQL • Python\\ndbt basics", "duration": 6, "color": "#A855F7"},
            {"text": "🎓 TRAINING", "subtext": "Company provides\\nfull onboarding", "duration": 5, "color": "#FFD93D"},
            {"text": "📩 APPLY", "subtext": "@TechGigRadar\\nfor link", "duration": 6, "color": "#00FF88"},
        ],
        "bg_color": "#0a1a0a"
    },
    {
        "id": 4,
        "filename": "reel-4-vscode.mp4",
        "voice": "voice-4.mp3",
        "title": "TOP 5",
        "subtitle": "VS Code Extensions",
        "scenes": [
            {"text": "1️⃣ COPILOT", "subtext": "AI pair\\nprogrammer", "duration": 8, "color": "#A855F7"},
            {"text": "2️⃣ THUNDER", "subtext": "API testing\\nin VS Code", "duration": 8, "color": "#00D4FF"},
            {"text": "3️⃣ ERROR LENS", "subtext": "Inline error\\nhighlighting", "duration": 8, "color": "#FF4757"},
            {"text": "4️⃣ GITLENS", "subtext": "Git blame\\nand history", "duration": 8, "color": "#FFD93D"},
            {"text": "5️⃣ PRETTIER", "subtext": "Auto format\\nyour code", "duration": 8, "color": "#FF6B35"},
            {"text": "🔗 FOLLOW", "subtext": "@TechGigRadar", "duration": 8, "color": "#00FF88"},
        ],
        "bg_color": "#1a0a2a"
    }
]

def create_animated_scene(scene_data, output_path, scene_num, total_scenes, bg_color):
    """Create a single animated scene with text animations"""
    duration = scene_data["duration"]
    text = scene_data["text"]
    subtext = scene_data["subtext"]
    accent = scene_data["color"]
    
    # Calculate positions
    main_y = HEIGHT // 2 - 150
    sub_y = HEIGHT // 2 + 50
    
    # Create filter complex for animated text
    # Text slides in from bottom, pulse effect, then slides out
    filters = []
    
    # Background with gradient
    filters.append(f"color=c={bg_color}:s={WIDTH}x{HEIGHT}:d={duration}[bg]")
    
    # Add animated gradient overlay
    filters.append(f"[bg]drawbox=x=0:y=0:w={WIDTH}:h={HEIGHT}:c={accent}@0.1:t=fill[bg2]")
    
    # Main text - fade in and scale
    main_text_escaped = text.replace(":", "\\:").replace("'", "\\'")
    filters.append(f"[bg2]drawtext=text='{main_text_escaped}':fontsize=90:fontcolor=white:x=(w-text_w)/2:y={main_y}:alpha='if(lt(t,0.5),t*2,1)':fontfile=/Windows/Fonts/arialbd.ttf[v1]")
    
    # Subtext - delayed fade in
    subtext_escaped = subtext.replace("\\n", "").replace(":", "\\:").replace("'", "\\'")
    subtext_lines = scene_data["subtext"].split("\\n")
    
    last_output = "v1"
    for i, line in enumerate(subtext_lines):
        line_escaped = line.replace(":", "\\:").replace("'", "\\'")
        line_y = sub_y + (i * 70)
        filters.append(f"[{last_output}]drawtext=text='{line_escaped}':fontsize=50:fontcolor={accent}:x=(w-text_w)/2:y={line_y}:alpha='if(lt(t,0.8+{i}*0.2),0,if(lt(t,1.3+{i}*0.2),(t-0.8-{i}*0.2)*2,1))':fontfile=/Windows/Fonts/arial.ttf[v{i+2}]")
        last_output = f"v{i+2}"
    
    # Progress bar
    filters.append(f"[{last_output}]drawbox=x=0:y={HEIGHT-20}:w='(t/{duration})*{WIDTH}':h=20:c={accent}:t=fill[vout]")
    
    filter_complex = ";".join(filters)
    
    cmd = [
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", f"color=c={bg_color}:s={WIDTH}x{HEIGHT}:d={duration}",
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-t", str(duration),
        output_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Error: {e.stderr[:200] if e.stderr else 'Unknown'}")
        return False

def create_simple_scene(scene_data, output_path, bg_color):
    """Create a simple scene with static text (fallback)"""
    duration = scene_data["duration"]
    text = scene_data["text"]
    subtext = scene_data["subtext"].replace("\\n", " | ")
    accent = scene_data["color"]
    
    # Escape special characters
    text_esc = text.replace(":", "\\:").replace("'", "")
    subtext_esc = subtext.replace(":", "\\:").replace("'", "")
    
    cmd = [
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", f"color=c={bg_color}:s={WIDTH}x{HEIGHT}:d={duration}:r={FPS}",
        "-vf", f"drawtext=text='{text_esc}':fontsize=100:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-100:fontfile=/Windows/Fonts/arialbd.ttf,drawtext=text='{subtext_esc}':fontsize=50:fontcolor={accent}:x=(w-text_w)/2:y=(h-text_h)/2+50:fontfile=/Windows/Fonts/arial.ttf,drawbox=x=0:y=ih-20:w=iw*t/{duration}:h=20:c={accent}:t=fill",
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-t", str(duration),
        output_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  Simple scene error: {e.stderr[:200] if e.stderr else 'Unknown'}")
        return False

def concat_scenes(scene_files, output_path):
    """Concatenate multiple scene videos"""
    list_file = REELS_DIR / "concat_list.txt"
    
    with open(list_file, "w") as f:
        for scene_file in scene_files:
            f.write(f"file '{scene_file}'\n")
    
    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(list_file),
        "-c", "copy",
        output_path
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)
    os.remove(list_file)

def add_audio(video_path, audio_path, output_path):
    """Add audio to video"""
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_path
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)

def create_reel(reel_data):
    """Create a complete reel with scenes and audio"""
    print(f"\n🎬 Creating {reel_data['filename']}...")
    
    scene_files = []
    bg_color = reel_data["bg_color"]
    
    # Create intro scene
    intro_scene = {
        "text": reel_data["title"],
        "subtext": reel_data["subtitle"],
        "duration": 3,
        "color": "#00D4FF"
    }
    intro_path = REELS_DIR / f"temp_intro_{reel_data['id']}.mp4"
    print(f"  Creating intro...")
    if create_simple_scene(intro_scene, str(intro_path), bg_color):
        scene_files.append(str(intro_path))
    
    # Create content scenes
    for i, scene in enumerate(reel_data["scenes"]):
        scene_path = REELS_DIR / f"temp_scene_{reel_data['id']}_{i}.mp4"
        print(f"  Creating scene {i+1}/{len(reel_data['scenes'])}: {scene['text'][:20]}...")
        if create_simple_scene(scene, str(scene_path), bg_color):
            scene_files.append(str(scene_path))
    
    if not scene_files:
        print(f"  ❌ No scenes created!")
        return False
    
    # Concatenate all scenes
    concat_path = REELS_DIR / f"temp_concat_{reel_data['id']}.mp4"
    print(f"  Concatenating {len(scene_files)} scenes...")
    concat_scenes(scene_files, str(concat_path))
    
    # Add audio
    audio_path = REELS_DIR / reel_data["voice"]
    final_path = REELS_DIR / reel_data["filename"]
    
    if audio_path.exists():
        print(f"  Adding voice...")
        add_audio(str(concat_path), str(audio_path), str(final_path))
    else:
        # No audio, just rename
        os.rename(concat_path, final_path)
        concat_path = None
    
    # Cleanup temp files
    for f in scene_files:
        try:
            os.remove(f)
        except:
            pass
    if concat_path and Path(concat_path).exists():
        os.remove(concat_path)
    
    # Check final file
    if final_path.exists():
        size_mb = final_path.stat().st_size / (1024 * 1024)
        print(f"  ✅ Created: {reel_data['filename']} ({size_mb:.1f} MB)")
        return True
    return False

def main():
    print("=" * 50)
    print("TechGig Radar - Professional Reel Generator")
    print("=" * 50)
    
    # Ensure output dir exists
    REELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create each reel
    success_count = 0
    for reel in REELS:
        if create_reel(reel):
            success_count += 1
    
    print("\n" + "=" * 50)
    print(f"✅ Created {success_count}/{len(REELS)} reels")
    print(f"📁 Output: {REELS_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
