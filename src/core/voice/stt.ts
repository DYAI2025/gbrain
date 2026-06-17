export type AudioInput =
  | { buffer: ArrayBuffer; mimeType: string }
  | { fileRef: string };

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language: string;
  confidence: number;
  provider: string;
}

export interface STTAdapter {
  transcribe(audio: AudioInput): Promise<TranscriptionResult>;
  isAvailable(): boolean;
}

export class MockSTTAdapter implements STTAdapter {
  private delayMs: number;
  private fail: boolean;
  private language: string;

  constructor(opts?: { delayMs?: number; fail?: boolean; language?: string }) {
    this.delayMs = opts?.delayMs ?? 0;
    this.fail = opts?.fail ?? false;
    this.language = opts?.language ?? 'en';
  }

  async transcribe(_audio: AudioInput): Promise<TranscriptionResult> {
    if (this.fail) {
      throw new Error('Mock STT failure');
    }
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
    return {
      text: 'This is a mock transcription of the audio input.',
      language: this.language,
      confidence: 0.95,
      provider: 'mock',
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

export class DeepgramSTTAdapter implements STTAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.deepgram.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    if ('fileRef' in audio) {
      throw new Error(
        'fileRef not supported by Deepgram STT; pass buffer + mimeType instead',
      );
    }

    const url = `${this.baseUrl}/listen?model=nova-2`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Token ${this.apiKey}`,
        'content-type': audio.mimeType,
      },
      body: audio.buffer,
    });

    if (!response.ok) {
      const status = response.status;
      const bodyText = await response.text().catch(() => '');
      const detail = bodyText ? `: ${bodyText.slice(0, 200)}` : '';
      throw new Error(`Deepgram STT HTTP ${status}${detail}`);
    }

    const data = await response.json() as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
            words?: Array<{
              word: string;
              start: number;
              end: number;
              confidence: number;
            }>;
          }>;
        }>;
      };
      metadata?: { model_info?: { name?: string } };
    };

    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    if (!alt?.transcript) {
      throw new Error(
        `Deepgram STT returned unexpected response: missing transcript in results`,
      );
    }

    const segments: TranscriptionSegment[] | undefined = alt.words?.map((w) => ({
      start: w.start,
      end: w.end,
      text: w.word,
      confidence: w.confidence,
    }));

    return {
      text: alt.transcript,
      segments,
      language: 'en',
      confidence: alt.confidence ?? 0,
      provider: 'deepgram',
    };
  }
}
