// WebSocket link to the local server, with auto-reconnect.
export class Net {
  constructor(role, onMessage) {
    this.role = role;
    this.onMessage = onMessage;
    this.queue = [];
    this.open();
  }

  open() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => {
      this.send({ type: 'hello', role: this.role });
      for (const m of this.queue.splice(0)) this.send(m);
    };
    this.ws.onmessage = e => {
      try { this.onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); }
    };
    this.ws.onclose = () => setTimeout(() => this.open(), 1500);
  }

  send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
    else if (this.queue.length < 50) this.queue.push(msg);
  }
}
