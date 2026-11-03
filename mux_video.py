import sys
import os
import subprocess
import json

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def mux_video_with_audio(video_path: str, audio_path: str, output_path: str):
    """
    Multiplexes original video with new dubbed Persian audio track.
    1. Preserves 100% original video frames without re-encoding (-c:v copy)
    2. Encodes Persian audio to AAC 192k
    3. Trims to shortest stream
    4. Faststart MP4 for immediate web and mobile playback
    """
    if not os.path.exists(video_path):
        print(json.dumps({"success": False, "error": f"Video file not found: {video_path}"}))
        sys.exit(1)

    if not os.path.exists(audio_path):
        print(json.dumps({"success": False, "error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)

    # 1. Try system FFmpeg CLI
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-i", audio_path,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        output_path
    ]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        if proc.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1024:
            print(json.dumps({
                "success": True,
                "engine": "ffmpeg-cli",
                "output_size": os.path.getsize(output_path)
            }))
            sys.exit(0)
    except Exception as e:
        pass

    # 2. Try PyAV fallback (in-process C library bindings)
    try:
        import av
        with av.open(video_path) as in_video, av.open(audio_path) as in_audio:
            out_container = av.open(output_path, mode='w', format='mp4')

            in_v_stream = in_video.streams.video[0]
            out_v_stream = out_container.add_stream(template=in_v_stream)

            in_a_stream = in_audio.streams.audio[0]
            out_a_stream = out_container.add_stream('aac', rate=44100)
            out_a_stream.bit_rate = 192000

            for packet in in_video.demux(in_v_stream):
                if packet.dts is not None:
                    packet.stream = out_v_stream
                    out_container.mux(packet)

            for frame in in_audio.decode(in_a_stream):
                for packet in out_a_stream.encode(frame):
                    out_container.mux(packet)

            for packet in out_a_stream.encode():
                out_container.mux(packet)

            out_container.close()

        if os.path.exists(output_path) and os.path.getsize(output_path) > 1024:
            print(json.dumps({
                "success": True,
                "engine": "pyav",
                "output_size": os.path.getsize(output_path)
            }))
            sys.exit(0)
    except Exception as av_err:
        print(json.dumps({
            "success": False,
            "error": f"Error in PyAV muxing: {str(av_err)}"
        }))
        sys.exit(1)

    print(json.dumps({"success": False, "error": "Final video muxing failed"}))
    sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Missing input parameters"}))
        sys.exit(1)

    mux_video_with_audio(sys.argv[1], sys.argv[2], sys.argv[3])
