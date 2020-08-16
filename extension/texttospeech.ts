/** Helper class for Japanese Text To Speech. */
function TTS() {
  this.lastTime = new Date().valueOf();
  this.previousText = null;
}

TTS.prototype = {
  /**
   * Plays text-to-speech audio for given Japanese text.
   *
   * @param {string} text
   */
  play(text) {
    const now = new Date().valueOf();
    const limit = this.lastTime + 1000;
    if (text != this.previousText || now > limit) {
      console.log('tts.speak(' + text + ')');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance();
      u.text = text;
      u.lang = 'ja-JP';
      window.speechSynthesis.speak(u);
      this.previous_text = text;
      this.last_time = now;
    } else {
      console.log('Ignoring ' + text);
    }
  },
};
