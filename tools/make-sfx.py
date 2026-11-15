"""Δημιουργεί τα ηχητικά εφέ του ιστοτόπου (κλικ, γύρισμα σελίδας, κουδουνάκια, μετάβαση…) με ρεαλιστική σύνθεση — όχι 8-bit.
Χρήση: python3 tools/make-sfx.py   (απαιτεί numpy, scipy, ffmpeg). Τα αρχεία γράφονται στο public/audio/sfx/."""
import numpy as np, subprocess, os, wave
from scipy import signal
SR = 44100
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'sfx')
def t(d): return np.arange(int(d * SR)) / SR
def exp_env(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def bp(x, lo, hi, order=3): return signal.sosfilt(signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x)
def pink(n):
    w = rng.standard_normal(n); f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1; f /= np.sqrt(k); p = np.fft.irfft(f, n); return p / (np.abs(p).max() + 1e-9)
def fade(x, a=0.004, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR); x[:na] *= np.linspace(0, 1, na); x[-nb:] *= np.linspace(1, 0, nb); return x
def reverb(x, rt=1.0, mix=0.22):
    n = int(rt * SR); ir = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n); ir = lp(ir, 5500); ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    wet = signal.fftconvolve(x, ir)[:len(x) + n // 2]; wet /= (np.abs(wet).max() + 1e-9) / (np.abs(x).max() + 1e-9)
    out = np.zeros(len(wet)); out[:len(x)] += x * (1 - mix); out += wet * mix; return out
def norm(x, peak=0.55): return x / (np.abs(x).max() + 1e-9) * peak
def tone(f, d, tau, amp=1.0, ph=0.0): tt = t(d); return amp * np.sin(2 * np.pi * f * tt + ph) * exp_env(len(tt), tau)
def bell(f, d, tau=0.5, amp=1.0):
    y = np.zeros(int(d * SR))
    for r, a, k in [(1.0, 1.0, 1.0), (2.0, 0.45, 0.6), (2.76, 0.38, 0.45), (4.07, 0.2, 0.3), (5.4, 0.12, 0.2)]: y += tone(f * r * (1 + rng.uniform(-0.002, 0.002)), d, tau * k, a * amp)
    return y
def place(base, snd, at):
    i = int(at * SR); e = min(len(base), i + len(snd)); base[i:e] += snd[:e - i]; return base
def save(name, x, peak=0.6):
    x = fade(norm(x, peak)); path = os.path.join(OUT, name + '.mp3'); wav = path + '.wav'
    with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '96k', path], check=True); os.remove(wav)
    print(f'{name}.mp3  {len(x)/SR:.2f}s')
os.makedirs(OUT, exist_ok=True)
n = int(0.09 * SR); c = bp(rng.standard_normal(n), 1400, 6000) * exp_env(n, 0.007) + tone(190, 0.09, 0.012, 0.35)
save('click', reverb(c, 0.25, 0.1), 0.5)
for i, (d, shift) in enumerate([(0.34, 1.0), (0.30, 1.12), (0.38, 0.9)], 1):
    n = int(d * SR); tt = np.arange(n) / SR; y = np.zeros(n)
    for k, (lo, hi) in enumerate([(700 * shift, 2600 * shift), (1800 * shift, 6500 * shift), (500 * shift, 1900 * shift)]):
        y += bp(pink(n), lo, hi) * np.exp(-0.5 * ((tt / d - (0.18 + 0.32 * k)) / 0.17) ** 2)
    y *= (1 + 0.32 * np.sin(2 * np.pi * rng.uniform(38, 56) * tt + rng.uniform(0, 6))) * np.minimum(1, tt / 0.012) * np.exp(-tt / (d * 0.42))
    snap = hp(rng.standard_normal(n), 3000) * exp_env(n, 0.006) * 0.9 + tone(240 * shift, d, 0.02, 0.25)
    save(f'flip{i}', reverb(y + snap * 0.8, 0.35, 0.12), 0.55)
y = np.zeros(int(1.8 * SR)); place(y, bell(880, 1.6, 0.55, 0.8), 0.0); place(y, bell(1318.5, 1.5, 0.5, 0.7), 0.1)
save('success', reverb(y, 1.1, 0.25), 0.55)
y = np.zeros(int(1.3 * SR)); scale = [2093, 2349, 2637, 3136, 3520, 4186, 4699, 5274]
for _ in range(16): place(y, tone(float(rng.choice(scale)), 0.35, rng.uniform(0.05, 0.14), rng.uniform(0.25, 0.8)), rng.uniform(0, 0.75))
save('sparkle', reverb(hp(y, 1500), 1.0, 0.3), 0.5)
n = int(0.12 * SR); tt = np.arange(n) / SR; f = 180 + 520 * np.exp(-tt / 0.02)
save('pop', reverb(np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_env(n, 0.03) + bp(rng.standard_normal(n), 800, 4000) * exp_env(n, 0.006) * 0.4, 0.2, 0.08), 0.5)
y = np.zeros(int(1.4 * SR))
for k, at in enumerate([0.0, 0.07, 0.15, 0.25, 0.37, 0.5]):
    b = sum(tone(f * rng.uniform(0.99, 1.01), 0.5, rng.uniform(0.07, 0.16), rng.uniform(0.4, 1.0)) for f in (2100, 3170, 4640, 6010, 8420))
    b += hp(rng.standard_normal(int(0.5 * SR)), 5000) * exp_env(int(0.5 * SR), 0.03) * 0.35; place(y, b * (1 - 0.1 * k), at)
save('jingle', reverb(y, 1.0, 0.25), 0.5)
y = np.zeros(int(2.6 * SR))
for k, f in enumerate([1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2637.0]): place(y, bell(f, 1.0, 0.4, 0.55), 0.35 + k * 0.07)
y += hp(pink(len(y)), 4500) * (np.sin(np.pi * np.clip(t(2.6) / 1.2, 0, 1)) ** 2) * 0.5
place(y, tone(110, 1.0, 0.25, 0.9) + tone(55, 1.0, 0.3, 0.7), 0.85)
save('transform', reverb(y, 1.3, 0.3), 0.6)
# swell: «υγρό» που ανεβαίνει — φιλτραρισμένος θόρυβος με ανοδικό φίλτρο, φυσαλίδες και χαμηλό βουητό
d = 3.0; n = int(d * SR); tt = np.arange(n) / SR; base = pink(n); y = np.zeros(n); blk = 2048
for i in range(0, n, blk):
    fc = 250 + 2600 * (i / n) ** 1.6; seg = base[i:i + blk]; y[i:i + len(seg)] = lp(seg, fc, 2)
y *= np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 0.8
for _ in range(36):
    at = rng.uniform(0.2, d - 0.3); fb = rng.uniform(500, 1500); m = int(0.06 * SR); bt = np.arange(m) / SR
    place(y, np.sin(2 * np.pi * np.cumsum(fb + 900 * bt / 0.06) / SR) * exp_env(m, 0.015) * rng.uniform(0.15, 0.35), at)
y += tone(55, d, 2.5, 0.35) * np.sin(np.pi * tt / d)
save('swell', reverb(y, 0.9, 0.25), 0.55)
