#!/bin/bash
# Video Reel Generator for TechGig Radar

FFMPEG="/c/Users/shivam.wagh/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg"
REELS_DIR="C:/Users/shivam.wagh/projects/techgig-radar/public/reels"

cd "$REELS_DIR"

# Download background images using curl
echo "Downloading background images..."

curl -sL "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=1080&h=1920&fit=crop" -o bg1.jpg
curl -sL "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&h=1920&fit=crop" -o bg2.jpg
curl -sL "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1080&h=1920&fit=crop" -o bg3.jpg
curl -sL "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1080&h=1920&fit=crop" -o bg4.jpg

echo "Creating video reels..."

# Reel 1: Fake Jobs
"$FFMPEG" -y -loop 1 -i bg1.jpg -i reel-1-fake-jobs.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  reel-1-fake-jobs.mp4 2>/dev/null

# Reel 2: AWS Backups
"$FFMPEG" -y -loop 1 -i bg2.jpg -i reel-2-aws-backups.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  reel-2-aws-backups.mp4 2>/dev/null

# Reel 3: Fresher Jobs
"$FFMPEG" -y -loop 1 -i bg3.jpg -i reel-3-fresher-jobs.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  reel-3-fresher-jobs.mp4 2>/dev/null

# Reel 4: VS Code Extensions
"$FFMPEG" -y -loop 1 -i bg4.jpg -i reel-4-vscode.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  reel-4-vscode.mp4 2>/dev/null

echo "Done! Videos created:"
ls -la *.mp4 2>/dev/null
