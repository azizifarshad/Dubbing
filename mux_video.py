import sys
import os
import subprocess
import json
import tempfile
import shutil
import argparse
from pathlib import Path

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Asset paths and defaults
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"

def find_asset(filename_candidates):
    for candidate in filename_candidates:
        p = ASSETS_DIR / candidate
        if p.exists():
            return p
        # Check root or parent assets
        p_parent = BASE_DIR.parent / "assets" / candidate
        if p_parent.exists():
            return p_parent
    return None

DEFAULT_INTRO_VIDEO = find_asset(["Final  (1).mp4", "intro.mp4"])
DEFAULT_CACHED_INTRO = ASSETS_DIR / "cache" / "intro_normalized_1080p.mp4"
DEFAULT_LOGO_IMAGE = find_asset(["Logo-Vidans .png", "logo_watermark.png", "Logo-Vidans.png"])

# Branding parameters
LOGO_WIDTH_PERCENT = 12
LOGO_MARGIN_PERCENT = 2

# Output Encoding Settings
OUTPUT_FPS = 30
VIDEO_CODEC = "libx264"
VIDEO_PRESET = "medium"
VIDEO_CRF = 20
AUDIO_BITRATE = "192k"

# FFmpeg utilities
def get_ffmpeg_bin():
    if os.name != 'nt' and os.path.exists('/usr/bin/ffmpeg'):
        return '/usr/bin/ffmpeg'
    return 'ffmpeg'

def get_ffprobe_bin():
    if os.name != 'nt' and os.path.exists('/usr/bin/ffprobe'):
        return '/usr/bin/ffprobe'
    return 'ffprobe'

def run_command(command):
    res = subprocess.run(command, capture_output=True, text=True)
    if res.returncode != 0:
        err_msg = res.stderr.strip() if res.stderr else res.stdout.strip()
        raise subprocess.CalledProcessError(res.returncode, command, output=res.stdout, stderr=err_msg)

def get_video_info(video_path):
    command = [
        get_ffprobe_bin(),
        "-v", "error",
        "-show_streams",
        "-show_format",
        "-of", "json",
        str(video_path)
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def get_video_duration(video_path):
    try:
        info = get_video_info(video_path)
        if "format" in info and "duration" in info["format"]:
            return float(info["format"]["duration"])
        for stream in info.get("streams", []):
            if "duration" in stream:
                return float(stream["duration"])
    except Exception:
        pass
    return 10.0

def get_video_resolution(video_path):
    try:
        info = get_video_info(video_path)
        for stream in info.get("streams", []):
            if stream.get("codec_type") == "video":
                return int(stream["width"]), int(stream["height"])
    except Exception:
        pass
    return 1920, 1080

def has_audio(video_path):
    try:
        info = get_video_info(video_path)
        return any(stream.get("codec_type") == "audio" for stream in info.get("streams", []))
    except Exception:
        return False

# Scale video to match standard format
def normalize_video(
    input_video,
    output_video,
    width,
    height,
    audio_override=None,
    custom_duration=None,
    preset=VIDEO_PRESET
):
    duration = custom_duration if custom_duration is not None else get_video_duration(input_video)

    command = [
        get_ffmpeg_bin(),
        "-y",
        "-i", str(input_video)
    ]

    if audio_override and os.path.exists(str(audio_override)):
        command.extend([
            "-i", str(audio_override)
        ])
        audio_input = "1:a"
    elif not has_audio(input_video):
        command.extend([
            "-f", "lavfi",
            "-t", str(duration),
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=48000"
        ])
        audio_input = "1:a"
    else:
        audio_input = "0:a"

    filter_complex = (
        f"[0:v]"
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
        f"setsar=1,"
        f"fps={OUTPUT_FPS},"
        f"format=yuv420p"
        f"[v];"

        f"[{audio_input}]"
        f"aresample=48000,"
        f"aformat=sample_fmts=fltp:channel_layouts=stereo,"
        f"apad,"
        f"atrim=duration={duration}"
        f"[a]"
    )

    command.extend([
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", VIDEO_CODEC,
        "-preset", preset,
        "-crf", str(VIDEO_CRF),
        "-c:a", "aac",
        "-b:a", AUDIO_BITRATE,
        "-t", str(duration),
        "-movflags", "+faststart",
        str(output_video)
    ])

    run_command(command)

# Join intro clip with main video
def concatenate_videos(video_list, output_video):
    concat_file = output_video.parent / f"concat_list_{os.getpid()}_{id(video_list)}.txt"
    with open(concat_file, "w", encoding="utf-8") as file:
        for video in video_list:
            path = str(video.resolve()).replace("\\", "/")
            file.write(f"file '{path}'\n")

    command = [
        get_ffmpeg_bin(),
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        "-movflags", "+faststart",
        str(output_video)
    ]
    try:
        run_command(command)
    finally:
        try:
            if concat_file.exists():
                concat_file.unlink()
        except Exception:
            pass

# Add watermark logo in corner
def add_logo(input_video, output_video, logo_image, preset=VIDEO_PRESET):
    width, height = get_video_resolution(input_video)
    logo_width = int(width * LOGO_WIDTH_PERCENT / 100)
    margin = int(width * LOGO_MARGIN_PERCENT / 100)

    # Use -2 for even height scaling to prevent h264 odd dimensions error
    logo_filter = (
        f"[1:v]scale={logo_width}:-2[logo];"
        f"[0:v][logo]overlay=x=W-w-{margin}:y=H-h-{margin}:format=auto[v]"
    )

    command = [
        get_ffmpeg_bin(),
        "-y",
        "-i", str(input_video),
        "-i", str(logo_image),
        "-filter_complex", logo_filter,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", VIDEO_CODEC,
        "-preset", preset,
        "-crf", str(VIDEO_CRF),
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_video)
    ]
    run_command(command)

# Video dubbing and branding pipeline
def process_dubbed_video(
    video_path: str,
    audio_path: str,
    output_path: str,
    intro_video_path: str = None,
    logo_image_path: str = None,
    include_intro: bool = True,
    include_logo: bool = True,
    preset: str = VIDEO_PRESET
):
    source_video = Path(video_path).resolve()
    dubbed_audio = Path(audio_path).resolve() if audio_path else None
    output_video = Path(output_path).resolve()

    if not source_video.exists():
        raise FileNotFoundError(f"Source video not found: {source_video}")

    intro_video = Path(intro_video_path).resolve() if intro_video_path else DEFAULT_INTRO_VIDEO
    logo_image = Path(logo_image_path).resolve() if logo_image_path else DEFAULT_LOGO_IMAGE

    use_intro = include_intro and intro_video and intro_video.exists()
    use_logo = include_logo and logo_image and logo_image.exists()

    # Copy streams directly if no branding is applied
    if not use_intro and not use_logo:
        # Standard fast stream-copy
        cmd = [
            get_ffmpeg_bin(),
            "-y",
            "-i", str(source_video),
            "-i", str(dubbed_audio),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            str(output_video)
        ]
        run_command(cmd)
        return {
            "success": True,
            "engine": "ffmpeg-stream-copy",
            "output_size": os.path.getsize(output_video),
            "included_intro": False,
            "included_logo": False
        }

    # Target reference resolution (1920x1080)
    ref_width = 1920
    ref_height = 1080
    if use_intro:
        w, h = get_video_resolution(intro_video)
        if w > 0 and h > 0:
            ref_width, ref_height = w, h

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir = Path(temp_dir)
        step_output = None

        # Normalize main video and replace audio
        normalized_source = temp_dir / "normalized_source.mp4"
        normalize_video(
            source_video,
            normalized_source,
            ref_width,
            ref_height,
            audio_override=dubbed_audio,
            preset=preset
        )
        step_output = normalized_source

        # Add intro if requested
        if use_intro:
            # Check if pre-rendered cache matches reference resolution
            normalized_intro = None
            if DEFAULT_CACHED_INTRO and DEFAULT_CACHED_INTRO.exists() and ref_width == 1920 and ref_height == 1080:
                normalized_intro = DEFAULT_CACHED_INTRO
            else:
                normalized_intro = temp_dir / "normalized_intro.mp4"
                normalize_video(
                    intro_video,
                    normalized_intro,
                    ref_width,
                    ref_height,
                    preset=preset
                )

            concatenated_video = temp_dir / "concatenated.mp4"
            concatenate_videos([normalized_intro, normalized_source], concatenated_video)
            step_output = concatenated_video

        # Add watermark if requested
        if use_logo:
            add_logo(step_output, output_video, logo_image, preset=preset)
        else:
            if step_output != output_video:
                shutil.copyfile(step_output, output_video)

    return {
        "success": True,
        "engine": "ffmpeg-branded-pipeline",
        "output_size": os.path.getsize(output_video),
        "included_intro": use_intro,
        "included_logo": use_logo
    }

# Command line interface
if __name__ == "__main__":
    try:
        # Check if positional arguments were passed (legacy compatibility)
        # e.g.: python mux_video.py <video> <audio> <output>
        if len(sys.argv) >= 4 and not sys.argv[1].startswith("--"):
            v_in = sys.argv[1]
            a_in = sys.argv[2]
            v_out = sys.argv[3]
            res = process_dubbed_video(v_in, a_in, v_out, include_intro=True, include_logo=True)
            print(json.dumps(res, ensure_ascii=False))
            sys.exit(0)

        # Parse named flags
        parser = argparse.ArgumentParser(description="Multiplex dubbed audio with video, intro and logo watermark")
        parser.add_argument("--video", "-v", required=True, help="Path to input source video")
        parser.add_argument("--audio", "-a", required=True, help="Path to input dubbed WAV audio")
        parser.add_argument("--output", "-o", required=True, help="Path to output MP4 video")
        parser.add_argument("--intro", help="Path to custom intro video file")
        parser.add_argument("--logo", help="Path to custom logo image file")
        parser.add_argument("--no-intro", action="store_true", help="Disable intro video concatenation")
        parser.add_argument("--no-logo", action="store_true", help="Disable logo watermark overlay")
        parser.add_argument("--preset", default=VIDEO_PRESET, help="H.264 encoding preset (e.g. fast, medium)")

        args = parser.parse_args()

        res = process_dubbed_video(
            video_path=args.video,
            audio_path=args.audio,
            output_path=args.output,
            intro_video_path=args.intro,
            logo_image_path=args.logo,
            include_intro=not args.no_intro,
            include_logo=not args.no_logo,
            preset=args.preset
        )
        print(json.dumps(res, ensure_ascii=False))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
