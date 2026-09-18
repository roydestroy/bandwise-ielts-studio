// Captures microphone PCM off the main thread and hands it to the page in blocks,
// so a long recording never has to be held in memory as raw audio.
const BLOCK = 8192;
class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BLOCK);
    this.used = 0;
    this.port.onmessage = event => { if (event.data === 'flush') this.flush(); };
  }
  flush() {
    // Always reply, even with nothing left, so the page knows the final block has arrived.
    this.port.postMessage(this.buffer.slice(0, this.used));
    this.used = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) for (let i = 0; i < channel.length; i++) {
      this.buffer[this.used++] = channel[i];
      if (this.used === BLOCK) this.flush();
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PcmRecorder);
