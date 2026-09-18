const https = require('https');

class TTSController {
  /**
   * Genera o transmite audio MP3 en español para que cualquier Smart TV o navegador
   * pueda reproducir la voz hablada sin depender de SpeechSynthesis local.
   */
  static async streamSpeech(req, res) {
    try {
      const text = req.query.text;
      if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Parámetro text es requerido' });
      }

      // Limpiar texto para optimizar la dicción
      const cleanText = encodeURIComponent(text.trim());
      const googleTTSUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es-CO&q=${cleanText}`;

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      };

      https.get(googleTTSUrl, options, (ttsRes) => {
        if (ttsRes.statusCode !== 200) {
          console.warn(`[TTS] Error desde Google TTS (${ttsRes.statusCode})`);
          return res.status(502).json({ error: 'No se pudo generar audio TTS' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cachear audio 24h
        res.setHeader('Accept-Ranges', 'bytes');

        ttsRes.pipe(res);
      }).on('error', (err) => {
        console.error('[TTS] Error en solicitud HTTPS:', err.message);
        res.status(500).json({ error: 'Error al conectar con servicio TTS' });
      });

    } catch (error) {
      console.error('[TTS] Error interno:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TTSController;
