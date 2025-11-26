/**
 * NextGen Game Engine - Audio System
 * Web Audio API based audio engine
 */

import { EventEmitter } from '../events';
import { Vector2, Vector3 } from '../math';

/**
 * Audio events
 */
export interface AudioEvents {
  'sound:play': { id: string };
  'sound:stop': { id: string };
  'sound:end': { id: string };
  'music:play': { id: string };
  'music:stop': { id: string };
  'context:unlock': void;
}

/**
 * Audio clip data
 */
export interface AudioClip {
  id: string;
  buffer: AudioBuffer | null;
  duration: number;
}

/**
 * Sound instance for active sounds
 */
interface SoundInstance {
  id: string;
  clipId: string;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  panNode: StereoPannerNode | null;
  startTime: number;
  loop: boolean;
  volume: number;
  pitch: number;
  pan: number;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  maxSounds: number;
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  maxSounds: 32
};

/**
 * Audio Manager - handles all audio playback
 */
export class AudioManager extends EventEmitter<AudioEvents> {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private clips: Map<string, AudioClip> = new Map();
  private sounds: Map<string, SoundInstance> = new Map();
  private currentMusic: SoundInstance | null = null;
  
  private config: AudioConfig;
  private soundIdCounter: number = 0;
  private _initialized: boolean = false;
  private _unlocked: boolean = false;

  constructor(config: Partial<AudioConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get unlocked(): boolean {
    return this._unlocked;
  }

  /**
   * Get AudioContext constructor with cross-browser compatibility
   */
  private getAudioContextClass(): typeof AudioContext | undefined {
    if (typeof AudioContext !== 'undefined') {
      return AudioContext;
    }
    // Webkit fallback for older Safari
    const windowWithWebkit = window as { webkitAudioContext?: typeof AudioContext };
    if (typeof windowWithWebkit.webkitAudioContext !== 'undefined') {
      return windowWithWebkit.webkitAudioContext;
    }
    return undefined;
  }

  /**
   * Initialize the audio system
   */
  init(): void {
    if (this._initialized) return;

    const AudioContextClass = this.getAudioContextClass();
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported');
      this._initialized = true;
      return;
    }

    try {
      this.context = new AudioContextClass();
    } catch (_e) {
      console.warn('Failed to create AudioContext');
      this._initialized = true;
      return;
    }

    if (!this.context) {
      this._initialized = true;
      return;
    }

    // Create gain nodes
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    // Apply initial volumes
    this.setMasterVolume(this.config.masterVolume);
    this.setMusicVolume(this.config.musicVolume);
    this.setSfxVolume(this.config.sfxVolume);

    this._initialized = true;

    // Try to unlock audio context on user interaction
    if (this.context.state === 'suspended') {
      this.setupUnlock();
    } else {
      this._unlocked = true;
    }
  }

  private setupUnlock(): void {
    const unlock = async () => {
      if (this.context && this.context.state === 'suspended') {
        try {
          await this.context.resume();
          this._unlocked = true;
          this.emit('context:unlock', undefined);
        } catch (_e) {
          // Ignore
        }
      }
      
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  /**
   * Load an audio clip from a URL
   */
  async loadClip(id: string, url: string): Promise<AudioClip> {
    if (!this.context) {
      const clip: AudioClip = { id, buffer: null, duration: 0 };
      this.clips.set(id, clip);
      return clip;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      const clip: AudioClip = {
        id,
        buffer: audioBuffer,
        duration: audioBuffer.duration
      };
      
      this.clips.set(id, clip);
      return clip;
    } catch (_error) {
      console.error(`Failed to load audio clip: ${url}`);
      const clip: AudioClip = { id, buffer: null, duration: 0 };
      this.clips.set(id, clip);
      return clip;
    }
  }

  /**
   * Unload an audio clip
   */
  unloadClip(id: string): void {
    this.clips.delete(id);
  }

  /**
   * Get a loaded clip
   */
  getClip(id: string): AudioClip | undefined {
    return this.clips.get(id);
  }

  /**
   * Play a sound effect
   */
  playSound(
    clipId: string,
    options: {
      volume?: number;
      pitch?: number;
      pan?: number;
      loop?: boolean;
    } = {}
  ): string | null {
    if (!this.context || !this.sfxGain) return null;

    const clip = this.clips.get(clipId);
    if (!clip || !clip.buffer) return null;

    // Check max sounds
    if (this.sounds.size >= this.config.maxSounds) {
      // Find and stop oldest non-looping sound
      let oldestSound: SoundInstance | null = null;
      let oldestTime = Infinity;
      
      for (const sound of this.sounds.values()) {
        if (!sound.loop && sound.startTime < oldestTime) {
          oldestTime = sound.startTime;
          oldestSound = sound;
        }
      }
      
      if (oldestSound) {
        this.stopSound(oldestSound.id);
      } else {
        return null; // All sounds are looping, can't play new sound
      }
    }

    const id = `sound_${this.soundIdCounter++}`;
    const volume = options.volume ?? 1;
    const pitch = options.pitch ?? 1;
    const pan = options.pan ?? 0;
    const loop = options.loop ?? false;

    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    const panNode = this.context.createStereoPanner();
    panNode.pan.value = pan;

    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.sfxGain);

    const instance: SoundInstance = {
      id,
      clipId,
      source,
      gainNode,
      panNode,
      startTime: this.context.currentTime,
      loop,
      volume,
      pitch,
      pan
    };

    this.sounds.set(id, instance);

    source.onended = () => {
      this.sounds.delete(id);
      this.emit('sound:end', { id });
    };

    source.start(0);
    this.emit('sound:play', { id });

    return id;
  }

  /**
   * Stop a sound
   */
  stopSound(id: string): void {
    const instance = this.sounds.get(id);
    if (instance && instance.source) {
      try {
        instance.source.stop();
      } catch (_e) {
        // Already stopped
      }
      this.sounds.delete(id);
      this.emit('sound:stop', { id });
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(): void {
    for (const id of this.sounds.keys()) {
      this.stopSound(id);
    }
  }

  /**
   * Set sound volume
   */
  setSoundVolume(id: string, volume: number): void {
    const instance = this.sounds.get(id);
    if (instance && instance.gainNode) {
      instance.volume = volume;
      instance.gainNode.gain.value = volume;
    }
  }

  /**
   * Set sound pitch
   */
  setSoundPitch(id: string, pitch: number): void {
    const instance = this.sounds.get(id);
    if (instance && instance.source) {
      instance.pitch = pitch;
      instance.source.playbackRate.value = pitch;
    }
  }

  /**
   * Set sound pan
   */
  setSoundPan(id: string, pan: number): void {
    const instance = this.sounds.get(id);
    if (instance && instance.panNode) {
      instance.pan = pan;
      instance.panNode.pan.value = pan;
    }
  }

  /**
   * Play background music
   */
  playMusic(clipId: string, options: { volume?: number; loop?: boolean } = {}): void {
    if (!this.context || !this.musicGain) return;

    // Stop current music
    this.stopMusic();

    const clip = this.clips.get(clipId);
    if (!clip || !clip.buffer) return;

    const volume = options.volume ?? 1;
    const loop = options.loop ?? true;

    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = loop;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.musicGain);

    this.currentMusic = {
      id: `music_${this.soundIdCounter++}`,
      clipId,
      source,
      gainNode,
      panNode: null,
      startTime: this.context.currentTime,
      loop,
      volume,
      pitch: 1,
      pan: 0
    };

    source.onended = () => {
      if (this.currentMusic?.source === source) {
        this.currentMusic = null;
      }
    };

    source.start(0);
    this.emit('music:play', { id: clipId });
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    if (this.currentMusic && this.currentMusic.source) {
      try {
        this.currentMusic.source.stop();
      } catch (_e) {
        // Already stopped
      }
      const id = this.currentMusic.clipId;
      this.currentMusic = null;
      this.emit('music:stop', { id });
    }
  }

  /**
   * Pause music
   */
  pauseMusic(): void {
    if (this.context) {
      this.context.suspend();
    }
  }

  /**
   * Resume music
   */
  resumeMusic(): void {
    if (this.context) {
      this.context.resume();
    }
  }

  /**
   * Set music volume
   */
  setMusicInstanceVolume(volume: number): void {
    if (this.currentMusic && this.currentMusic.gainNode) {
      this.currentMusic.volume = volume;
      this.currentMusic.gainNode.gain.value = volume;
    }
  }

  /**
   * Cross-fade to new music
   */
  crossfadeMusic(clipId: string, duration: number = 1, options: { volume?: number; loop?: boolean } = {}): void {
    if (!this.context || !this.musicGain) return;

    const clip = this.clips.get(clipId);
    if (!clip || !clip.buffer) return;

    const volume = options.volume ?? 1;
    const loop = options.loop ?? true;

    // Fade out current music
    if (this.currentMusic && this.currentMusic.gainNode) {
      const oldGain = this.currentMusic.gainNode;
      const oldSource = this.currentMusic.source;
      
      oldGain.gain.setValueAtTime(oldGain.gain.value, this.context.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
      
      setTimeout(() => {
        try {
          oldSource?.stop();
        } catch (_e) {
          // Already stopped
        }
      }, duration * 1000);
    }

    // Create new music
    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = loop;

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(0, this.context.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.context.currentTime + duration);

    source.connect(gainNode);
    gainNode.connect(this.musicGain);

    this.currentMusic = {
      id: `music_${this.soundIdCounter++}`,
      clipId,
      source,
      gainNode,
      panNode: null,
      startTime: this.context.currentTime,
      loop,
      volume,
      pitch: 1,
      pan: 0
    };

    source.onended = () => {
      if (this.currentMusic?.source === source) {
        this.currentMusic = null;
      }
    };

    source.start(0);
    this.emit('music:play', { id: clipId });
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume;
    }
  }

  getMasterVolume(): number {
    return this.config.masterVolume;
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.config.musicVolume;
    }
  }

  getMusicVolume(): number {
    return this.config.musicVolume;
  }

  setSfxVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.config.sfxVolume;
    }
  }

  getSfxVolume(): number {
    return this.config.sfxVolume;
  }

  /**
   * Calculate stereo pan from 2D position
   */
  calculatePan2D(soundPos: Vector2, listenerPos: Vector2, maxDistance: number = 500): number {
    const delta = soundPos.subtract(listenerPos);
    const pan = Math.max(-1, Math.min(1, delta.x / maxDistance));
    return pan;
  }

  /**
   * Calculate volume from 2D position
   */
  calculateVolume2D(soundPos: Vector2, listenerPos: Vector2, minDistance: number = 50, maxDistance: number = 500): number {
    const distance = soundPos.distance(listenerPos);
    if (distance <= minDistance) return 1;
    if (distance >= maxDistance) return 0;
    return 1 - (distance - minDistance) / (maxDistance - minDistance);
  }

  /**
   * Calculate 3D audio parameters
   */
  calculate3D(
    soundPos: Vector3,
    listenerPos: Vector3,
    _listenerForward: Vector3,
    minDistance: number = 1,
    maxDistance: number = 100
  ): { volume: number; pan: number } {
    const delta = soundPos.subtract(listenerPos);
    const distance = delta.magnitude();
    
    // Volume falloff
    let volume = 1;
    if (distance > minDistance) {
      volume = 1 - Math.min(1, (distance - minDistance) / (maxDistance - minDistance));
    }
    
    // Simple pan calculation (left/right)
    const pan = Math.max(-1, Math.min(1, delta.x / maxDistance));
    
    return { volume, pan };
  }

  /**
   * Destroy the audio system
   */
  destroy(): void {
    this.stopAllSounds();
    this.stopMusic();
    
    if (this.context) {
      this.context.close();
    }
    
    this.clips.clear();
    this.sounds.clear();
    this.currentMusic = null;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this._initialized = false;
    this._unlocked = false;
  }
}

export default AudioManager;
