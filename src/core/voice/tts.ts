export interface TTSAdapter {
  synthesize(text: string, voice?: string): Promise<ArrayBuffer>;
  isAvailable(): boolean;
}

export class MockTTSAdapter implements TTSAdapter {
  private delayMs: number;
  private fail: boolean;

  constructor(opts?: { delayMs?: number; fail?: boolean }) {
    this.delayMs = opts?.delayMs ?? 0;
    this.fail = opts?.fail ?? false;
  }

  async synthesize(_text: string, _voice?: string): Promise<ArrayBuffer> {
    if (this.fail) {
      throw new Error('Mock TTS failure');
    }
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
    return new ArrayBuffer(64);
  }

  isAvailable(): boolean {
    return true;
  }
}

export class SupertonicTTSAdapter implements TTSAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8080/v1') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isAvailable(): boolean {
    return true;
  }

  async synthesize(text: string, voice?: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/audio/speech`;
    const body = JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice ?? 'alloy',
      response_format: 'wav',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const status = response.status;
      const bodyText = await response.text().catch(() => '');
      const detail = bodyText ? `: ${bodyText.slice(0, 200)}` : '';
      throw new Error(`Supertonic TTS HTTP ${status}${detail}`);
    }

    return response.arrayBuffer();
  }
}
