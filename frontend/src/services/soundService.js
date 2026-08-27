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
    if (this.voicesInitialized && this.cachedVoice) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Priorizar voces en español (Latinoamérica, Colombia, México o España)
          this.cachedVoice = voices.find(v => v.lang === 'es-CO' || v.lang === 'es_CO')
            || voices.find(v => v.lang === 'es-419')
            || voices.find(v => v.lang === 'es-US' || v.lang === 'es_US')
            || voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX')
            || voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish') || v.name.toLowerCase().includes('spanish'))
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
   * Pronuncia el llamado usando Web Speech API y fallback de Audio Stream (Smart TV & Mobile)
   */
  static speak(text, options = {}) {
    if (typeof window === 'undefined') return;

    let spokenLocally = false;

    // 1. Intentar Web Speech API si está disponible en el navegador
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis) {
      try {
        this.initVoices();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 0.88; // Pausado y natural
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume !== undefined ? options.volume : 1.0;

        const voices = window.speechSynthesis.getVoices();
        const spanish = voices.find(v => v.lang && (v.lang.startsWith('es') || v.lang.includes('Spanish')));
        if (spanish) {
          utterance.voice = spanish;
          utterance.lang = spanish.lang;
        } else {
          utterance.lang = 'es-ES';
        }

        let started = false;
        utterance.onstart = () => {
          started = true;
        };
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error, ejecutando audio stream fallback:', e);
          this.playAudioStream(text, options.volume);
        };

        window.speechSynthesis.speak(utterance);
        spokenLocally = true;

        // Si tras 700ms no ha iniciado (común en Smart TVs sin paquete TTS), usar stream de audio
        setTimeout(() => {
          if (!started && !window.speechSynthesis.speaking) {
            this.playAudioStream(text, options.volume);
          }
        }, 700);

      } catch (e) {
        console.warn('Fallo en SpeechSynthesis local:', e);
      }
    }

    if (!spokenLocally) {
      this.playAudioStream(text, options.volume);
    }
  }

  static playAudioStream(text, volume = 1.0) {
    try {
      const cleanText = encodeURIComponent(text);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=${cleanText}`;
      const audio = new Audio(url);
      audio.volume = volume !== undefined ? volume : 1.0;
      audio.play().catch(e => {
        console.warn('Audio fallback error:', e);
      });
    } catch (e) {
      console.warn('No se pudo inicializar audio stream:', e);
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
