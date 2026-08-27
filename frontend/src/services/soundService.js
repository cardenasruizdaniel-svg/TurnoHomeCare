class SoundService {
  static audioCtx = null;

  static getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Genera una campana / ding-dong melódico agradable usando Web Audio API
   */
  static playChime(volume = 1.0) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.3 * volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      gainNode.connect(ctx.destination);

      // Tono 1 (Ding: 587.33 Hz - Re5)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.8);

      // Tono 2 (Dong: 440 Hz - La4)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now + 0.25);
      osc2.connect(gainNode);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.5);

      // Armónico sutil
      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(880, now + 0.25);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.08 * volume, now + 0.25);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.25);
      osc3.stop(now + 1.2);

    } catch (e) {
      console.warn('No se pudo reproducir campana sonora:', e);
    }
  }

  /**
   * Pronuncia el llamado usando Web Speech API
   */
  static speak(text, options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Cancelar cualquier locución anterior

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.92; // Un poco pausado para máxima claridad
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;
      utterance.lang = 'es-ES';

      // Buscar voz en español
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Error en síntesis de voz:', e);
    }
  }

  /**
   * Llamado completo: Campana + Locución hablada
   */
  static announceTicket({ ticketNumber, counterName, template, playSound = true, playVoice = true, volume = 1.0, repetitions = 1 }) {
    if (playSound) {
      this.playChime(volume);
    }

    if (playVoice) {
      const defaultTemplate = 'Turno {ticket}, por favor dirigirse a {counter}';
      const rawText = template || defaultTemplate;
      
      // Separar letras y números para que la voz pronuncie cada letra clara (ej: "A 0 2 4")
      const formattedTicket = ticketNumber.replace('-', ' ');
      const speechText = rawText
        .replace('{ticket}', formattedTicket)
        .replace('{counter}', counterName || 'su módulo correspondiente');

      // Pequeño retardo de 400ms tras la campana para iniciar la voz
      setTimeout(() => {
        this.speak(speechText, { volume });

        if (repetitions > 1) {
          setTimeout(() => {
            if (playSound) this.playChime(volume * 0.8);
            setTimeout(() => {
              this.speak(speechText, { volume });
            }, 400);
          }, 3500);
        }
      }, 450);
    }
  }
}

export default SoundService;
