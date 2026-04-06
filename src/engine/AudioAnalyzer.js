/**
 * AudioAnalyzer — Core audio analysis engine
 * 
 * Provides two modes:
 *  1. REALTIME: Uses Web Audio API AnalyserNode for live preview
 *  2. OFFLINE:  Decodes entire buffer, computes FFT at arbitrary timestamps for export
 * 
 * Output shape is always the same AudioData object, consumed by theme renderers.
 */

// Number of FFT bins
const FFT_SIZE = 2048;

/**
 * Split frequency array into bass / mid / treble bands and compute energy
 */
export function extractBands(frequencyData, sampleRate = 44100) {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / binCount;

  // Frequency ranges (Hz)
  const bassEnd = Math.floor(250 / binWidth);
  const midEnd = Math.floor(4000 / binWidth);

  let bassSum = 0, midSum = 0, trebleSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;

  for (let i = 0; i < binCount; i++) {
    const val = frequencyData[i] / 255; // Normalize 0–1
    if (i < bassEnd) {
      bassSum += val;
      bassCount++;
    } else if (i < midEnd) {
      midSum += val;
      midCount++;
    } else {
      trebleSum += val;
      trebleCount++;
    }
  }

  const bass = bassCount > 0 ? bassSum / bassCount : 0;
  const mid = midCount > 0 ? midSum / midCount : 0;
  const treble = trebleCount > 0 ? trebleSum / trebleCount : 0;
  const energy = (bass * 0.6 + mid * 0.3 + treble * 0.1); // Weighted overall energy

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
    this.isPlaying = false;
  }

  async init(audioElement) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Disconnect previous source if exists
    if (this.source) {
      try { this.source.disconnect(); } catch (e) { /* ok */ }
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source = this.audioContext.createMediaElementSource(audioElement);
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

    const bands = extractBands(this.frequencyData, this.audioContext.sampleRate);

    return {
      ...bands,
      waveform: this.timeDomainData,
      frequency: this.frequencyData,
    };
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy() {
    if (this.source) {
      try { this.source.disconnect(); } catch (e) { /* ok */ }
    }
    this.source = null;
    this.analyser = null;
  }
}


/**
 * OfflineAnalyzer — computes FFT at arbitrary time positions for frame-by-frame export
 * 
 * This decodes the full audio, then for any given timestamp, extracts a window of samples
 * and runs a manual DFT approximation to get frequency data matching the realtime output.
 */
export class OfflineAnalyzer {
  constructor() {
    this.channelData = null;
    this.sampleRate = 44100;
    this.duration = 0;
  }

  async decode(arrayBuffer) {
    const audioContext = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    this.sampleRate = audioBuffer.sampleRate;
    this.duration = audioBuffer.duration;
    
    // Mix down to mono
    if (audioBuffer.numberOfChannels > 1) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      this.channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        this.channelData[i] = (left[i] + right[i]) / 2;
      }
    } else {
      this.channelData = new Float32Array(audioBuffer.getChannelData(0));
    }
  }

  getDataAtTime(timeSeconds) {
    if (!this.channelData) {
      return { bass: 0, mid: 0, treble: 0, energy: 0, waveform: new Uint8Array(1024), frequency: new Uint8Array(1024) };
    }

    const sampleIndex = Math.floor(timeSeconds * this.sampleRate);
    const windowSize = FFT_SIZE;
    const halfWindow = windowSize / 2;

    // Extract windowed samples
    const samples = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
      const idx = sampleIndex - halfWindow + i;
      if (idx >= 0 && idx < this.channelData.length) {
        // Apply Hann window
        const hannMultiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
        samples[i] = this.channelData[idx] * hannMultiplier;
      }
    }

    // Compute magnitude spectrum via DFT (simplified — only compute bins we need)
    const binCount = halfWindow;
    const frequencyData = new Uint8Array(binCount);
    const timeDomainData = new Uint8Array(binCount);

    // Time domain (waveform) — downsample
    for (let i = 0; i < binCount; i++) {
      const idx = Math.floor((i / binCount) * windowSize);
      timeDomainData[i] = Math.floor((samples[idx] + 1) * 128);
    }

    // Frequency domain — fast approach: use a simplified FFT
    // We compute magnitudes for frequency bins
    const step = Math.max(1, Math.floor(binCount / 256)); // Compute ~256 bins for performance
    for (let k = 0; k < binCount; k += step) {
      let real = 0, imag = 0;
      for (let n = 0; n < windowSize; n += 4) { // Skip every 4 for speed
        const angle = (2 * Math.PI * k * n) / windowSize;
        real += samples[n] * Math.cos(angle);
        imag -= samples[n] * Math.sin(angle);
      }
      const magnitude = Math.sqrt(real * real + imag * imag) * 4 / windowSize;
      const db = Math.max(0, Math.min(255, Math.floor(magnitude * 512)));
      
      // Fill adjacent bins with same value
      for (let j = k; j < Math.min(k + step, binCount); j++) {
        frequencyData[j] = db;
      }
    }

    const bands = extractBands(frequencyData, this.sampleRate);

    return {
      ...bands,
      waveform: timeDomainData,
      frequency: frequencyData,
    };
  }
}
