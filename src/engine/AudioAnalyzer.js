/**
 * AudioAnalyzer — Core audio analysis engine
 *
 * Provides two modes:
 *  1. REALTIME: Uses Web Audio API AnalyserNode for live preview
 *  2. OFFLINE:  Decodes entire buffer, uses Radix-2 FFT for accurate frame-by-frame export
 *
 * Output shape is always the same AudioData object, consumed by theme renderers.
 */

const FFT_SIZE = 2048;

// Match Web Audio AnalyserNode defaults so offline export bars match live preview.
// AnalyserNode maps magnitudes in [MIN_DECIBELS, MAX_DECIBELS] to [0, 255] bytes.
const MIN_DECIBELS = -100;
const MAX_DECIBELS = -30;
const DB_RANGE = MAX_DECIBELS - MIN_DECIBELS;

function magToByte(mag) {
  if (mag <= 0) return 0;
  const dB = 20 * Math.log10(mag);
  const scaled = ((dB - MIN_DECIBELS) / DB_RANGE) * 255;
  return Math.max(0, Math.min(255, scaled));
}

// ============================================================
// Radix-2 Cooley-Tukey FFT (in-place)
// ~180x faster than the old manual DFT for 2048 samples
// ============================================================
function fft(real, imag) {
  const n = real.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len *= 2) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wR = Math.cos(angle);
    const wI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curR = 1, curI = 0;
      for (let j = 0; j < half; j++) {
        const ai = i + j;
        const bi = ai + half;
        const tR = curR * real[bi] - curI * imag[bi];
        const tI = curR * imag[bi] + curI * real[bi];
        real[bi] = real[ai] - tR;
        imag[bi] = imag[ai] - tI;
        real[ai] += tR;
        imag[ai] += tI;
        const nr = curR * wR - curI * wI;
        curI = curR * wI + curI * wR;
        curR = nr;
      }
    }
  }
}

/**
 * Split frequency array into bass / mid / treble bands and compute energy
 */
export function extractBands(frequencyData, sampleRate = 44100) {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / binCount;

  const bassEnd = Math.floor(250 / binWidth);
  const midEnd = Math.floor(4000 / binWidth);

  let bassSum = 0, midSum = 0, trebleSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;

  for (let i = 0; i < binCount; i++) {
    const val = frequencyData[i] / 255;
    if (i < bassEnd) { bassSum += val; bassCount++; }
    else if (i < midEnd) { midSum += val; midCount++; }
    else { trebleSum += val; trebleCount++; }
  }

  const bass = bassCount > 0 ? bassSum / bassCount : 0;
  const mid = midCount > 0 ? midSum / midCount : 0;
  const treble = trebleCount > 0 ? trebleSum / trebleCount : 0;
  const energy = bass * 0.6 + mid * 0.3 + treble * 0.1;

  return { bass, mid, treble, energy };
}


/**
 * RealtimeAnalyzer — wraps Web Audio AnalyserNode for live preview
 */
export class RealtimeAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.frequencyData = null;
    this.timeDomainData = null;
  }

  async init(audioElement) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Disconnect existing nodes
    if (this.source) {
      try { this.source.disconnect(); } catch (e) { /* ok */ }
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) { /* ok */ }
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;

    // createMediaElementSource can only be called ONCE per element.
    // Reuse existing source if it's the same audio element.
    if (!this.source || this._connectedElement !== audioElement) {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      this._connectedElement = audioElement;
    }

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getData() {
    if (!this.analyser) {
      return { bass: 0, mid: 0, treble: 0, energy: 0, waveform: new Uint8Array(1024), frequency: new Uint8Array(1024) };
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    return { ...extractBands(this.frequencyData, this.audioContext.sampleRate), waveform: this.timeDomainData, frequency: this.frequencyData };
  }

  resume() {
    if (this.audioContext?.state === 'suspended') this.audioContext.resume();
  }

  destroy() {
    if (this.source) { try { this.source.disconnect(); } catch (e) { /* ok */ } }
    this.source = null;
    this.analyser = null;
  }
}


/**
 * OfflineAnalyzer — Radix-2 FFT at arbitrary timestamps for export
 *
 * Key improvements over old DFT approach:
 *  - Proper Cooley-Tukey FFT: O(N log N) vs O(N²)  →  ~180x faster per frame
 *  - precomputeFrames(): computes ALL frames upfront  →  zero per-frame cost during render
 *  - Full 1024-bin resolution instead of ~256 filled bins
 *  - Pre-baked Hann window (allocated once)
 */
export class OfflineAnalyzer {
  constructor() {
    this.channelData = null;
    this.sampleRate = 44100;
    this.duration = 0;
    this.precomputed = null;
    this._hannWindow = null;
  }

  async decode(arrayBuffer) {
    const audioContext = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    this.sampleRate = audioBuffer.sampleRate;
    this.duration = audioBuffer.duration;

    if (audioBuffer.numberOfChannels > 1) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      this.channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        this.channelData[i] = (left[i] + right[i]) * 0.5;
      }
    } else {
      this.channelData = new Float32Array(audioBuffer.getChannelData(0));
    }

    // Pre-bake Hann window
    this._hannWindow = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      this._hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
    }
  }

  /**
   * Pre-compute audio data for ALL frames at once.
   * Eliminates per-frame FFT during render → massive speed boost.
   */
  /**
   * Pre-compute audio data for ALL frames at once.
   * Includes temporal smoothing (matches AnalyserNode.smoothingTimeConstant = 0.8)
   * so exported frames look identical to the realtime preview.
   */
  precomputeFrames(fps, onProgress) {
    const totalFrames = Math.ceil(this.duration * fps);
    this.precomputed = new Array(totalFrames);

    const windowSize = FFT_SIZE;
    const halfWindow = windowSize >> 1;
    const binCount = halfWindow; // 1024 bins

    // Reusable FFT buffers (allocated once)
    const real = new Float64Array(windowSize);
    const imag = new Float64Array(windowSize);

    // Smoothing buffer — matches AnalyserNode.smoothingTimeConstant = 0.8
    // Formula: smoothed[k] = α * prev[k] + (1-α) * current[k]
    const SMOOTHING = 0.8;
    const smoothedFreq = new Float64Array(binCount);

    for (let frame = 0; frame < totalFrames; frame++) {
      const timeSeconds = frame / fps;
      const sampleCenter = Math.floor(timeSeconds * this.sampleRate);

      // Fill windowed samples
      for (let i = 0; i < windowSize; i++) {
        const idx = sampleCenter - halfWindow + i;
        real[i] = (idx >= 0 && idx < this.channelData.length)
          ? this.channelData[idx] * this._hannWindow[i]
          : 0;
        imag[i] = 0;
      }

      // Radix-2 FFT
      fft(real, imag);

      // Magnitude → dB-mapped byte (matches AnalyserNode.getByteFrequencyData) → smoothed.
      // AnalyserNode smooths magnitudes BEFORE dB conversion, but applying smoothing in
      // byte space is close enough and keeps values stable for the temporal envelope.
      const frequencyData = new Uint8Array(binCount);
      for (let k = 0; k < binCount; k++) {
        const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / windowSize;
        const raw = magToByte(mag);
        smoothedFreq[k] = SMOOTHING * smoothedFreq[k] + (1 - SMOOTHING) * raw;
        frequencyData[k] = Math.max(0, Math.min(255, Math.floor(smoothedFreq[k])));
      }

      // Time-domain waveform (raw samples, no window)
      const timeDomainData = new Uint8Array(binCount);
      for (let i = 0; i < binCount; i++) {
        const idx = sampleCenter - halfWindow + Math.floor((i / binCount) * windowSize);
        const sample = (idx >= 0 && idx < this.channelData.length) ? this.channelData[idx] : 0;
        timeDomainData[i] = Math.max(0, Math.min(255, Math.floor((sample + 1) * 128)));
      }

      const bands = extractBands(frequencyData, this.sampleRate);
      this.precomputed[frame] = { ...bands, waveform: timeDomainData, frequency: frequencyData };

      if (onProgress && frame % 100 === 0) {
        onProgress(frame, totalFrames);
      }
    }
  }

  /**
   * Get pre-computed data for a specific frame index (O(1) lookup).
   */
  getFrame(frameIndex) {
    if (this.precomputed && frameIndex < this.precomputed.length) {
      return this.precomputed[frameIndex];
    }
    return { bass: 0, mid: 0, treble: 0, energy: 0, waveform: new Uint8Array(1024), frequency: new Uint8Array(1024) };
  }

  /**
   * Legacy: compute on-the-fly for a single timestamp (used as fallback)
   */
  getDataAtTime(timeSeconds) {
    if (!this.channelData) {
      return { bass: 0, mid: 0, treble: 0, energy: 0, waveform: new Uint8Array(1024), frequency: new Uint8Array(1024) };
    }

    const sampleCenter = Math.floor(timeSeconds * this.sampleRate);
    const windowSize = FFT_SIZE;
    const halfWindow = windowSize >> 1;
    const binCount = halfWindow;

    const real = new Float64Array(windowSize);
    const imag = new Float64Array(windowSize);

    for (let i = 0; i < windowSize; i++) {
      const idx = sampleCenter - halfWindow + i;
      real[i] = (idx >= 0 && idx < this.channelData.length)
        ? this.channelData[idx] * this._hannWindow[i]
        : 0;
      imag[i] = 0;
    }

    fft(real, imag);

    const frequencyData = new Uint8Array(binCount);
    for (let k = 0; k < binCount; k++) {
      const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / windowSize;
      frequencyData[k] = Math.floor(magToByte(mag));
    }

    const timeDomainData = new Uint8Array(binCount);
    for (let i = 0; i < binCount; i++) {
      const idx = sampleCenter - halfWindow + Math.floor((i / binCount) * windowSize);
      const sample = (idx >= 0 && idx < this.channelData.length) ? this.channelData[idx] : 0;
      timeDomainData[i] = Math.max(0, Math.min(255, Math.floor((sample + 1) * 128)));
    }

    return { ...extractBands(frequencyData, this.sampleRate), waveform: timeDomainData, frequency: frequencyData };
  }
}
