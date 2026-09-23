class SoundService {
  static audioCtx = null;
  static cachedVoice = null;
  static voicesInitialized = false;
  static currentAudio = null;
  static activeTimeouts = [];
  static lastAnnounceTicket = null;
  static lastAnnounceTime = 0;

  static init() {
    if (typeof window === 'undefined') return;
    this.getAudioContext();
    this.initVoices();
  }

  static initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prioridad: Voz en español de Colombia > México > EE.UU. > España > Cualquier español
          this.cachedVoice =
            voices.find(v => v.lang === 'es-CO' || v.lang === 'es_CO') ||
            voices.find(v => v.lang === 'es-MX' || v.lang === 'es_MX') ||
            voices.find(v => v.lang === 'es-419') ||
            voices.find(v => v.lang === 'es-US' || v.lang === 'es_US') ||
            voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish') || v.lang.includes('Español')) ||
            voices[0];
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
      gainNode.gain.setValueAtTime(0.35 * volume, now);
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
   * Registra un temporizador seguro que se puede cancelar limpiamente con stopAll()
   */
  static safeTimeout(fn, delayMs) {
    const timeoutId = setTimeout(() => {
      this.activeTimeouts = this.activeTimeouts.filter(id => id !== timeoutId);
      fn();
    }, delayMs);
    this.activeTimeouts.push(timeoutId);
    return timeoutId;
  }

  /**
   * Detiene cualquier locución, audio o temporizador en curso antes de iniciar uno nuevo
   */
  static stopAll() {
    // 1. Limpiar todos los temporizadores pendientes
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeTimeouts = [];

    // 2. Detener audio HTML5 si lo hay
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch { }
      this.currentAudio = null;
    }

    // 3. Detener síntesis de voz en el navegador
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch { }
    }
  }

  /**
   * Reproduce una locución única con Web Speech API
   */
  static playSpeechOnce(text, volume = 1.0, onComplete) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }

    try {
      this.initVoices();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.90; // Velocidad natural y clara
      utterance.pitch = 1.0;
      utterance.volume = Math.min(1.0, Math.max(0.1, volume));

      if (this.cachedVoice) {
        utterance.voice = this.cachedVoice;
        utterance.lang = this.cachedVoice.lang;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const spanish = voices.find(v => v.lang && (v.lang.startsWith('es') || v.lang.includes('Spanish')));
        if (spanish) {
          utterance.voice = spanish;
          utterance.lang = spanish.lang;
        } else {
          utterance.lang = 'es-ES';
        }
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
   * Formatea el turno para pronunciación clara (ej: "A-001" -> "A, 0 0 1")
   */
  static formatTicketForSpeech(ticketNumber) {
    if (!ticketNumber) return '';
    const parts = String(ticketNumber).split('-');
    if (parts.length === 2) {
      const letter = parts[0];
      const numbers = parts[1].split('').join(' ');
      return `${letter}, ${numbers}`;
    }
    return String(ticketNumber).split('').join(' ');
  }

  /**
   * Anuncio Secuencial Limpio: Campana -> Voz 1 -> Pausa -> Campana -> Voz 2 (Sin eco ni solapamientos)
   */
  static announceTicket({ ticketNumber, patientName, counterName, template, playSound = true, playVoice = true, volume = 1.0, repetitions = 2 }) {
    // 1. Evitar llamadas duplicadas idénticas en menos de 1.2 segundos (Anti-eco)
    const nowMs = Date.now();
    const announceKey = `${ticketNumber}_${counterName}`;
    if (this.lastAnnounceTicket === announceKey && (nowMs - this.lastAnnounceTime) < 1200) {
      return;
    }
    this.lastAnnounceTicket = announceKey;
    this.lastAnnounceTime = nowMs;

    // 2. Detener cualquier sonido o locución anterior
    this.getAudioContext();
    this.stopAll();

    // 3. Reproducir campana inicial
    if (playSound) {
      this.playChime(volume);
    }

    if (playVoice) {
      const spokenTicket = this.formatTicketForSpeech(ticketNumber);
      const spokenCounter = counterName || 'su módulo de atención';
      const cleanPatient = patientName ? patientName.trim() : '';

      let speechText = '';
      if (template) {
        speechText = template
          .replace('{ticket}', spokenTicket)
          .replace('{patient}', cleanPatient ? `, ${cleanPatient}` : '')
          .replace('{counter}', spokenCounter);
      } else {
        speechText = cleanPatient
          ? `Turno ${spokenTicket}, ${cleanPatient}, por favor pasar a ${spokenCounter}`
          : `Turno ${spokenTicket}, por favor pasar a ${spokenCounter}`;
      }

      // Esperar 450ms a que pase la campana inicial
      this.safeTimeout(() => {
        this.playSpeechOnce(speechText, volume, () => {
          // Se ejecuta cuando termina la 1ra locución
          if (repetitions > 1) {
            this.safeTimeout(() => {
              if (playSound) this.playChime(volume * 0.85);
              this.safeTimeout(() => {
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
