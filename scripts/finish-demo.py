"""Añade una banda sonora sintetizada original y exporta el video para compartir.

Uso: python3 scripts/finish-demo.py
Requisitos opcionales: NumPy y FFmpeg. Primero ejecuta record-demo.mjs.
"""
import json
import os
from pathlib import Path
import subprocess
import wave

import numpy as np

root = Path(__file__).resolve().parent.parent
work = Path(os.environ.get("DEMO_WORK_DIR", "/tmp/marea-recording"))
source = work / "silent.mp4"
info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-of", "json", str(source)]))
duration = float(info["format"]["duration"])
rate = 44100
audio = np.zeros((int((duration + .1) * rate), 2), dtype=np.float64)
rng = np.random.default_rng(1987)

def note(at, freq, length, amplitude=.08, pan=0):
    start = int(at * rate)
    count = min(int(length * rate), len(audio) - start)
    if count <= 0:
        return
    t = np.arange(count) / rate
    envelope = np.minimum(1, t / .014) * np.exp(-t * 3.3 / length)
    signal = (np.sin(2*np.pi*freq*t) + .24*np.sin(4*np.pi*freq*t) + .1*np.sin(6*np.pi*freq*t)) * envelope * amplitude
    audio[start:start+count, 0] += signal * (1 - pan * .25)
    audio[start:start+count, 1] += signal * (1 + pan * .25)

# Progresión y arpegios originales, sin grabaciones ni música de terceros.
chords = [(146.83,174.61,220), (116.54,146.83,174.61), (130.81,164.81,196), (110,146.83,164.81)]
beat = .6
for n, at in enumerate(np.arange(0, duration, beat)):
    chord = chords[(n // 8) % len(chords)]
    note(at, chord[n % 3] * 2, .85, .075, (-1 if n % 2 else 1))
    if n % 4 == 0:
        note(at, chord[0] / 2, 2.1, .11)
    if n % 2 == 0:
        start = int(at * rate)
        count = min(int(.2 * rate), len(audio) - start)
        t = np.arange(count) / rate
        kick = np.sin(2*np.pi*(65*t-65*t*t)) * np.exp(-t*24) * .1
        audio[start:start+count] += kick[:,None]
    if n % 4 == 2:
        start = int(at * rate)
        count = min(int(.15 * rate), len(audio)-start)
        noise = rng.normal(0,.028,count) * np.exp(-np.arange(count)/rate*35)
        audio[start:start+count] += noise[:,None]

fade = np.minimum(1, np.arange(len(audio))/rate/1.5) * np.minimum(1, np.maximum(0, duration-np.arange(len(audio))/rate)/2)
audio *= fade[:,None]
audio = np.clip(audio, -.8, .8)
with wave.open(str(work / "original-score.wav"), "wb") as out:
    out.setnchannels(2)
    out.setsampwidth(2)
    out.setframerate(rate)
    out.writeframes((audio * 32767).astype("<i2").tobytes())

media = root / "docs/media"
media.mkdir(parents=True, exist_ok=True)
output = media / "marea-negra-demo.mp4"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-i", str(work / "original-score.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(output)], check=True)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(max(0,duration-3)), "-i", str(output), "-frames:v", "1", "-q:v", "2", str(media / "marea-negra-portada.jpg")], check=True)
print(f"Video listo: {output} · {duration:.1f} s · {output.stat().st_size / 1024 / 1024:.1f} MB")
