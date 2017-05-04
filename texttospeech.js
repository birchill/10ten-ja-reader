
function TTS() {
	this.last_time = new Date().valueOf();
	this.previous_text = null;
}

TTS.prototype = {
	play: function(text) {
		let now = new Date().valueOf();
		let limit = this.last_time + 1000; 
		if(text != this.previous_text || now > limit) {
			console.log("tts.speak(" + text + ")");
			window.speechSynthesis.cancel();
			let u = new SpeechSynthesisUtterance();
			u.text = text;
			u.lang = 'ja-JP';
			window.speechSynthesis.speak(u);
			this.previous_text = text;
			this.last_time = now;
		} else {
			console.log("Ignoring " + text);
		}
	}
}

