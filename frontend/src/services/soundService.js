class SoundService {
  static audioCtx = null;
  static cachedVoice = null;
  static voicesInitialized = false;

  static init() {
    if (typeof window === 'undefined') return;
    this.getAudioContext();
    this.initVoices();
  }

  static initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (this.voicesInitialized) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Priorizar español latinoamericano o colombiano, luego español de España
        this.cachedVoice = voices.find(v => v.lang === 'es-CO' || v.lang === 'es_CO')
          || voices.find(v => v.lang === 'es-US' || v.lang === 'es_US')
          || voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX')
          || voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish'))
          || null;
        this.voicesInitialized = true;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  static getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.audioCtx && AudioCtx) {
      this.audioCtx = new AudioCtx();
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
      gainNode.gain.setValueAtTime(0.35 * volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      gainNode.connect(ctx.destination);

      // Tono 1 (Ding: 587.33 Hz - Re5)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.9);

      // Tono 2 (Dong: 440 Hz - La4)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now + 0.28);
      osc2.connect(gainNode);
      osc2.start(now + 0.28);
      osc2.stop(now + 1.6);

      // Armónico sutil
      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(880, now + 0.28);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.09 * volume, now + 0.28);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.28);
      osc3.stop(now + 1.3);

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
      this.initVoices();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel(); // Cancelar cualquier locución anterior

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.90; // Pausado y natural
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;
      utterance.lang = 'es-CO';

      if (this.cachedVoice) {
        utterance.voice = this.cachedVoice;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const spanish = voices.find(v => v.lang.startsWith('es'));
        if (spanish) utterance.voice = spanish;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Error en síntesis de voz:', e);
    }
  }

  /**
   * Formatea el turno para que la voz lo pronuncie de manera clara y natural
   * ej: "A-001" -> "A, cero cero uno"
   * ej: "P-012" -> "P, cero uno dos"
   */
  static formatTicketForSpeech(ticketNumber) {
    if (!ticketNumber) return '';
    const parts = ticketNumber.split('-');
    if (parts.length === 2) {
      const letter = parts[0];
      const numbers = parts[1].split('').join(' ');
      return `${letter}, ${numbers}`;
    }
    return ticketNumber.split('').join(' ');
  }

  /**
   * Llamado completo: Campana + Locución hablada
   */
  static announceTicket({ ticketNumber, counterName, template, playSound = true, playVoice = true, volume = 1.0, repetitions = 1 }) {
    this.getAudioContext();
    this.initVoices();

    if (playSound) {
      this.playChime(volume);
    }

    if (playVoice) {
      const spokenTicket = this.formatTicketForSpeech(ticketNumber);
      const spokenCounter = counterName || 'su módulo de atención';
      
      const speechText = template
        ? template.replace('{ticket}', spokenTicket).replace('{counter}', spokenCounter)
        : `Turno ${spokenTicket}, por favor pasar a ${spokenCounter}`;

      // Retardo de 500ms tras la campana para iniciar la voz
      setTimeout(() => {
        this.speak(speechText, { volume });

        if (repetitions > 1) {
          setTimeout(() => {
            if (playSound) this.playChime(volume * 0.85);
            setTimeout(() => {
              this.speak(speechText, { volume });
            }, 500);
          }, 4200);
        }
      }, 500);
    }
  }
}

export default SoundService;
