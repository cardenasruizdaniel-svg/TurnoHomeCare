class SoundService {
  static audioCtx = null;
  static cachedVoice = null;
  static voicesInitialized = false;
  static currentAudio = null;

  static init() {
    if (typeof window === 'undefined') return;
    this.getAudioContext();
    this.initVoices();
  }

  static initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (this.voicesInitialized && this.cachedVoice) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.cachedVoice = voices.find(v => v.lang === 'es-CO' || v.lang === 'es_CO')
            || voices.find(v => v.lang === 'es-419')
            || voices.find(v => v.lang === 'es-US' || v.lang === 'es_US')
            || voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX')
            || voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish'))
            || voices[0];
          this.voicesInitialized = true;
        }
      } catch (e) {
        console.warn('Error cargando voces:', e);
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
      gainNode.gain.setValueAtTime(0.4 * volume, now);
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
      gain3.gain.setValueAtTime(0.1 * volume, now + 0.28);
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
   * Detiene cualquier locución o audio en curso antes de iniciar uno nuevo
   */
  static stopAll() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch { }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch { }
    }
  }

  /**
   * Reproduce una locución única con callback onComplete al finalizar
   */
  static playSpeechOnce(text, volume = 1.0, onComplete) {
    if (typeof window === 'undefined') return;

    // 1. Intentar con el stream de audio del servidor (/api/tts)
    try {
      const cleanText = encodeURIComponent(text);
      const url = `/api/tts?text=${cleanText}`;
      const audio = new Audio(url);
      audio.volume = volume;
      this.currentAudio = audio;

      let handled = false;
      const finish = () => {
        if (!handled) {
          handled = true;
          this.currentAudio = null;
          if (onComplete) onComplete();
        }
      };

      audio.onended = finish;
      audio.onerror = () => {
        console.warn('Audio stream error, usando SpeechSynthesis local');
        this.playLocalSpeechOnce(text, volume, onComplete);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.playLocalSpeechOnce(text, volume, onComplete);
        });
      }
      return;
    } catch (e) {
      console.warn('Error al iniciar audio stream:', e);
    }

    // 2. Fallback SpeechSynthesis
    this.playLocalSpeechOnce(text, volume, onComplete);
  }

  /**
   * Fallback de síntesis de voz local con callback onComplete
   */
  static playLocalSpeechOnce(text, volume = 1.0, onComplete) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }

    try {
      this.initVoices();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 1.0;
      utterance.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      const spanish = voices.find(v => v.lang && (v.lang.startsWith('es') || v.lang.includes('Spanish')));
      if (spanish) {
        utterance.voice = spanish;
        utterance.lang = spanish.lang;
      } else {
        utterance.lang = 'es-ES';
      }

      let handled = false;
      const finish = () => {
        if (!handled) {
          handled = true;
          if (onComplete) onComplete();
        }
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      if (onComplete) onComplete();
    }
  }

  /**
   * Formatea el turno para pronunciación clara (ej: "A-001" -> "A, cero cero uno")
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
   * Llamado Completo Secuencial: Campana -> Voz 1 -> Pausa -> Campana -> Voz 2 (Sin solapamientos)
   */
  static announceTicket({ ticketNumber, counterName, template, playSound = true, playVoice = true, volume = 1.0, repetitions = 2 }) {
    this.getAudioContext();
    this.stopAll();

    if (playSound) {
      this.playChime(volume);
    }

    if (playVoice) {
      const spokenTicket = this.formatTicketForSpeech(ticketNumber);
      const spokenCounter = counterName || 'su módulo de atención';
      
      const speechText = template
        ? template.replace('{ticket}', spokenTicket).replace('{counter}', spokenCounter)
        : `Turno ${spokenTicket}, por favor pasar a ${spokenCounter}`;

      // Esperar 450ms a que termine el primer tono de la campana
      setTimeout(() => {
        // Primera Locución
        this.playSpeechOnce(speechText, volume, () => {
          // Callback que se ejecuta ÚNICAMENTE cuando la 1ra locución haya terminado
          if (repetitions > 1) {
            // Pausa agradable de 1.2 segundos entre el primer y el segundo llamado
            setTimeout(() => {
              if (playSound) this.playChime(volume * 0.85);
              setTimeout(() => {
                // Segunda Locución
                this.playSpeechOnce(speechText, volume);
              }, 400);
            }, 1200);
          }
        });
      }, 450);
    }
  }
}

export default SoundService;
