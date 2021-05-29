/** Helper class for Japanese Text To Speech. */
class TTS {
  private static instance: TTS;

  lastTime = new Date().valueOf();
  previousText: string | null = null;

  private constructor() {}

  static create() {
    if (!TTS.instance) {
      TTS.instance = new TTS();
    }
    return TTS.instance;
  }

  /** Plays text-to-speech audio for given Japanese text. */
  play(text: string) {
    const now = new Date().valueOf();
    const limit = this.lastTime + 1000;
    if (text != this.previousText || now > limit) {
      console.log('tts.speak(' + text + ')');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance();
      u.text = text;
      u.lang = 'ja-JP';
      window.speechSynthesis.speak(u);
      this.previousText = text;
      this.lastTime = now;
    } else {
      console.log('Ignoring ' + text);
    }
  }
}

const tts = TTS.create();

export { tts };
