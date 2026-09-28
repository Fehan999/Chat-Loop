class SoundService {
    constructor() {
      this.sounds = {};
      this.isEnabled = true;
    }
  
    loadSounds() {
      // You can add actual sound files or use browser's default beep
      this.sounds.message = new Audio('/message.mp3'); // Add your sound file to public folder
      // Fallback if no sound file
      if (!this.sounds.message.canPlayType) {
        this.sounds.message = null;
      }
    }
  
    playMessageReceived() {
      if (!this.isEnabled) return;
      
      // Use Web Audio API for beep if no sound file
      if (!this.sounds.message) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.1;
          
          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.log('Audio not supported');
        }
      } else {
        this.sounds.message.play().catch(e => console.log('Sound play failed', e));
      }
    }
  
    toggleSound(enabled) {
      this.isEnabled = enabled;
    }
  }
  
  export const soundService = new SoundService();