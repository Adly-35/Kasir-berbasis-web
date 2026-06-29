// audio-manager.js — Sistem Suara Lengkap dengan Web Audio API Fallback
// Tanpa UI pengaturan, tanpa server tambahan, plug & play

const AudioManager = {
    // Audio context untuk Web Audio API synthesizer fallback
    ctx: null,

    // Cache untuk audio elements (MP3 mode)
    cache: {},

    // Volume default
    volume: 0.5,

    // Mode: 'mp3' | 'synth' | 'silent'
    mode: 'mp3',

    // Track which files are available
    mp3Available: {},

    init() {
        // Initialize Web Audio API context (required for synth fallback)
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        } catch (e) {
            console.warn('Web Audio API not available');
        }

        // Check MP3 availability asynchronously
        this.checkMP3Files();

        // Resume context on first user interaction (browser policy)
        document.addEventListener('click', () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });

        console.log('🔊 AudioManager initialized');
    },

    async checkMP3Files() {
        const files = ['scan', 'ok', 'success', 'warning', 'error', 'notif', 'tap', 'delete'];
        let availableCount = 0;

        for (const file of files) {
            try {
                const response = await fetch(`notif/${file}.mp3`, { method: 'HEAD', cache: 'no-cache' });
                this.mp3Available[file] = response.ok;
                if (response.ok) availableCount++;
            } catch (e) {
                this.mp3Available[file] = false;
            }
        }

        // If less than 3 files available, fallback to synth
        if (availableCount < 3) {
            this.mode = this.ctx ? 'synth' : 'silent';
            console.log(`🔊 Audio mode: ${this.mode} (only ${availableCount}/8 MP3 files found)`);
        } else {
            console.log(`🔊 Audio mode: MP3 (${availableCount}/8 files available)`);
        }
    },

    // Main play function
    async play(type) {
        if (this.mode === 'silent') return;

        try {
            // Resume audio context if suspended (browser autoplay policy)
            if (this.ctx && this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            if (this.mode === 'mp3' && this.mp3Available[type]) {
                await this.playMP3(type);
            } else if (this.ctx) {
                this.playSynth(type);
            }
        } catch (e) {
            console.warn(`Audio play failed for ${type}:`, e);
        }
    },

    // Play MP3 file
    playMP3(type) {
        return new Promise((resolve, reject) => {
            // Check cache
            if (this.cache[type]) {
                const audio = this.cache[type].cloneNode();
                audio.volume = this.volume;
                audio.play().then(resolve).catch(reject);
                return;
            }

            // Load new audio
            const audio = new Audio(`notif/${type}.mp3`);
            audio.volume = this.volume;
            audio.preload = 'auto';

            const onCanPlay = () => {
                this.cache[type] = audio;
                audio.play().then(resolve).catch(reject);
                audio.removeEventListener('canplaythrough', onCanPlay);
            };

            audio.addEventListener('canplaythrough', onCanPlay);
            audio.addEventListener('error', () => {
                this.mp3Available[type] = false;
                reject(new Error(`MP3 load failed: ${type}`));
            });

            // Load it
            audio.load();

            // Timeout fallback to synth
            setTimeout(() => {
                if (!this.cache[type] && this.ctx) {
                    this.playSynth(type);
                    resolve();
                }
            }, 2000);
        });
    },

    // Web Audio API Synthesizer (fallback when MP3 not available)
    playSynth(type) {
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sound definitions - each type has unique character
        const sounds = {
            scan: {
                // Short high beep - barcode scanner
                osc: [{ type: 'square', freq: 1800, duration: 0.08, gain: 0.15 }],
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
            },
            ok: {
                // Pleasant ding - confirmation
                osc: [
                    { type: 'sine', freq: 880, duration: 0.15, gain: 0.2 },
                    { type: 'sine', freq: 1100, duration: 0.12, gain: 0.1, delay: 0.05 }
                ],
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.15 }
            },
            success: {
                // Success chime - 3 note ascending
                osc: [
                    { type: 'sine', freq: 523.25, duration: 0.2, gain: 0.15, delay: 0 },
                    { type: 'sine', freq: 659.25, duration: 0.2, gain: 0.15, delay: 0.15 },
                    { type: 'sine', freq: 783.99, duration: 0.3, gain: 0.15, delay: 0.3 }
                ],
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 }
            },
            warning: {
                // Warning buzz - two tone
                osc: [
                    { type: 'sawtooth', freq: 400, duration: 0.15, gain: 0.1, delay: 0 },
                    { type: 'sawtooth', freq: 350, duration: 0.15, gain: 0.1, delay: 0.18 }
                ],
                envelope: { attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.1 }
            },
            error: {
                // Error - descending harsh tone
                osc: [
                    { type: 'sawtooth', freq: 300, duration: 0.3, gain: 0.12 },
                    { type: 'square', freq: 200, duration: 0.2, gain: 0.08, delay: 0.15 }
                ],
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 }
            },
            notif: {
                // Notification bell - gentle
                osc: [
                    { type: 'sine', freq: 600, duration: 0.1, gain: 0.12 },
                    { type: 'sine', freq: 900, duration: 0.2, gain: 0.08, delay: 0.08 }
                ],
                envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.2 }
            },
            tap: {
                // UI tap - very short click
                osc: [{ type: 'sine', freq: 1200, duration: 0.03, gain: 0.08 }],
                envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }
            },
            delete: {
                // Delete - descending swoosh
                osc: [{ type: 'sine', freq: 500, duration: 0.15, gain: 0.1 }],
                envelope: { attack: 0.005, decay: 0.05, sustain: 0.2, release: 0.1 },
                slide: { from: 500, to: 200, duration: 0.15 }
            }
        };

        const sound = sounds[type] || sounds.tap;

        sound.osc.forEach(oscDef => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = oscDef.type;

            const startTime = now + (oscDef.delay || 0);
            const duration = oscDef.duration;
            const peakGain = oscDef.gain * this.volume;

            // Frequency slide (for effects like delete swoosh)
            if (sound.slide) {
                osc.frequency.setValueAtTime(sound.slide.from, startTime);
                osc.frequency.exponentialRampToValueAtTime(sound.slide.to, startTime + sound.slide.duration);
            } else {
                osc.frequency.setValueAtTime(oscDef.freq, startTime);
            }

            // Envelope
            const env = sound.envelope;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(peakGain, startTime + env.attack);
            gain.gain.linearRampToValueAtTime(peakGain * env.sustain, startTime + env.attack + env.decay);
            gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + env.release);
        });
    },

    // Set volume (0.0 - 1.0)
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    },

    // Toggle silent mode
    toggleSilent() {
        this.mode = this.mode === 'silent' ? (this.ctx ? 'synth' : 'mp3') : 'silent';
        return this.mode !== 'silent';
    }
};

// Backward compatible Beep object (existing code uses this)
const Beep = {
    scan:    () => AudioManager.play('scan'),
    ok:      () => AudioManager.play('ok'),
    success: () => AudioManager.play('success'),
    warning: () => AudioManager.play('warning'),
    no:      () => AudioManager.play('error'),
    alert:   () => AudioManager.play('notif'),

    // New sounds for additional events
    tap:     () => AudioManager.play('tap'),
    delete:  () => AudioManager.play('delete'),

    // Volume control
    setVolume: (v) => AudioManager.setVolume(v),
    toggleSilent: () => AudioManager.toggleSilent()
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AudioManager.init();
});
