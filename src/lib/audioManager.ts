// Audio manager for terminal sound effects
class AudioManager {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private createBeep(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.context || !this.enabled) return;

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  // Keystroke sound
  playKeystroke() {
    this.createBeep(800, 0.02, 0.05);
  }

  // Command execution sound
  playCommandExecute() {
    this.createBeep(1200, 0.05, 0.08);
  }

  // Error sound
  playError() {
    if (!this.context || !this.enabled) return;
    this.createBeep(200, 0.1, 0.1);
    setTimeout(() => this.createBeep(150, 0.15, 0.1), 100);
  }

  // Success sound (for downloads, etc.)
  playSuccess() {
    if (!this.context || !this.enabled) return;
    this.createBeep(800, 0.08, 0.08);
    setTimeout(() => this.createBeep(1000, 0.08, 0.08), 80);
    setTimeout(() => this.createBeep(1200, 0.12, 0.08), 160);
  }

  // Boot complete sound
  playBootComplete() {
    if (!this.context || !this.enabled) return;
    this.createBeep(600, 0.1, 0.1);
    setTimeout(() => this.createBeep(800, 0.1, 0.1), 100);
    setTimeout(() => this.createBeep(1000, 0.15, 0.1), 200);
  }

  // Tab completion sound
  playTabComplete() {
    this.createBeep(1000, 0.03, 0.06);
  }

  // Clear screen sound
  playClear() {
    if (!this.context || !this.enabled) return;
    this.createBeep(1500, 0.05, 0.07);
    setTimeout(() => this.createBeep(1200, 0.05, 0.07), 50);
    setTimeout(() => this.createBeep(900, 0.05, 0.07), 100);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
