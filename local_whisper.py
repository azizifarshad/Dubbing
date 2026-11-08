import sys
import json
import os
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

def transcribe(audio_path, model_size="base"):
    try:
        if not os.path.exists(audio_path):
            print(json.dumps({"success": False, "error": f"فایل صوتی یافت نشد: {audio_path}"}))
            return

        # Read audio file
        data, samplerate = sf.read(audio_path)
        
        # Convert stereo to mono
        if len(data.shape) > 1:
            data = data.mean(axis=1)

        data = data.astype(np.float32)

        # Normalize amplitude
        max_val = np.max(np.abs(data))
        if max_val > 0:
            data = data / max_val

        # Use CUDA if available, fallback to CPU
        device = "cpu"
        compute_type = "int8"
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
                compute_type = "float16"
        except Exception:
            pass

        # Check for bundled local models
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidate_paths = [
            os.path.join(base_dir, "models", f"faster-whisper-{model_size}"),
            os.path.join(base_dir, "models", model_size),
            os.path.join(base_dir, "..", "models", f"faster-whisper-{model_size}"),
            os.path.join(os.getcwd(), "models", f"faster-whisper-{model_size}"),
        ]
        resolved_model = model_size
        local_files_only = False
        for cpath in candidate_paths:
            if os.path.isdir(cpath) and os.path.exists(os.path.join(cpath, "model.bin")):
                resolved_model = cpath
                local_files_only = True
                break

        # Load whisper model
        model = WhisperModel(resolved_model, device=device, compute_type=compute_type, local_files_only=local_files_only)
        
        # Transcribe with word timestamps and VAD
        segments, info = model.transcribe(
            data,
            language="en",
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=400)
        )

        results = []
        idx = 1
        speaker_idx = 1
        last_seg_end = 0.0

        for segment in segments:
            # Switch speaker on long pauses
            if idx > 1 and (segment.start - last_seg_end) > 1.2:
                speaker_idx = (speaker_idx % 2) + 1

            word_list = []
            if hasattr(segment, 'words') and segment.words:
                for w in segment.words:
                    word_list.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "score": round(w.probability, 3) if hasattr(w, 'probability') else 1.0
                    })

            seg_start = round(segment.start, 2)
            seg_end = round(segment.end, 2)
            seg_dur = round(max(0.1, seg_end - seg_start), 2)

            results.append({
                "id": idx,
                "speakerId": f"speaker_{speaker_idx}",
                "start": seg_start,
                "end": seg_end,
                "duration": seg_dur,
                "text": segment.text.strip(),
                "words": word_list
            })
            idx += 1
            last_seg_end = seg_end

        print(json.dumps({
            "success": True,
            "segments": results,
            "language": info.language,
            "duration": round(info.duration, 2)
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "مسیر فایل ارسال نشده است."}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    transcribe(audio_path, model_size)
