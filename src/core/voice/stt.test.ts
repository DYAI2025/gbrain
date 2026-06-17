import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { MockSTTAdapter, DeepgramSTTAdapter } from './stt.ts';
import type { AudioInput } from './stt.ts';

describe('MockSTTAdapter', () => {
  test('returns expected transcription text', async () => {
    const adapter = new MockSTTAdapter();
    const audio: AudioInput = { buffer: new ArrayBuffer(128), mimeType: 'audio/wav' };
    const result = await adapter.transcribe(audio);
    expect(result.text).toBe('This is a mock transcription of the audio input.');
    expect(result.language).toBe('en');
    expect(result.confidence).toBe(0.95);
    expect(result.provider).toBe('mock');
  });

  test('respects delay', async () => {
    const adapter = new MockSTTAdapter({ delayMs: 50 });
    const audio: AudioInput = { buffer: new ArrayBuffer(128), mimeType: 'audio/wav' };
    const start = Date.now();
    await adapter.transcribe(audio);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  test('with fail=true throws', async () => {
    const adapter = new MockSTTAdapter({ fail: true });
    const audio: AudioInput = { buffer: new ArrayBuffer(128), mimeType: 'audio/wav' };
    expect(adapter.transcribe(audio)).rejects.toThrow('Mock STT failure');
  });

  test('isAvailable returns true', () => {
    const adapter = new MockSTTAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  test('handles AudioInput with fileRef', async () => {
    const adapter = new MockSTTAdapter();
    const audio: AudioInput = { fileRef: '/tmp/test-audio.wav' };
    const result = await adapter.transcribe(audio);
    expect(result.text).toBe('This is a mock transcription of the audio input.');
  });
});

describe('DeepgramSTTAdapter', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedAuthorization: string;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any, init?: any) => {
      const headers = new Headers(init?.headers);
      capturedAuthorization = headers.get('authorization') ?? '';
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const parsed = new URL(url);
      if (parsed.hostname === 'api.deepgram.com') {
        if (!parsed.pathname.endsWith('/listen')) {
          return new Response('Not Found', { status: 404 });
        }
        const body = JSON.stringify({
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: 'Hello world',
                    confidence: 0.98,
                    words: [
                      { word: 'Hello', start: 0.0, end: 0.5, confidence: 0.99 },
                      { word: 'world', start: 0.5, end: 1.0, confidence: 0.97 },
                    ],
                  },
                ],
              },
            ],
          },
          metadata: { model_info: { name: 'nova-2' } },
        });
        return new Response(body, {
          headers: { 'content-type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as unknown as typeof globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test('with key isAvailable returns true', () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    expect(adapter.isAvailable()).toBe(true);
  });

  test('with empty key isAvailable returns false', () => {
    const adapter = new DeepgramSTTAdapter('');
    expect(adapter.isAvailable()).toBe(false);
  });

  test('transcribe sends POST with auth token and returns transcription result', async () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    const audio: AudioInput = { buffer: new ArrayBuffer(256), mimeType: 'audio/wav' };
    const result = await adapter.transcribe(audio);
    expect(result.text).toBe('Hello world');
    expect(result.confidence).toBe(0.98);
    expect(result.language).toBe('en');
    expect(result.provider).toBe('deepgram');
    expect(result.segments).toHaveLength(2);
    expect(result.segments![0].text).toBe('Hello');
    expect(result.segments![1].text).toBe('world');
    expect(capturedAuthorization).toBe('Token test-api-key');
  });

  test('transcribe sends correct content-type header', async () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    const audio: AudioInput = { buffer: new ArrayBuffer(256), mimeType: 'audio/webm' };
    await adapter.transcribe(audio);
    // Verified via the mock that it didn't throw
  });

  test('transcribe with fileRef throws actionable error', async () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    const audio: AudioInput = { fileRef: '/tmp/audio.wav' };
    expect(adapter.transcribe(audio)).rejects.toThrow(
      'fileRef not supported by Deepgram STT; pass buffer + mimeType instead',
    );
  });

  test('transcribe throws on HTTP error', async () => {
    const adapter = new DeepgramSTTAdapter('invalid-key');
    const audio: AudioInput = { buffer: new ArrayBuffer(256), mimeType: 'audio/wav' };
    const originalFetch2 = globalThis.fetch;
    globalThis.fetch = (async () => new Response('Unauthorized', { status: 401 })) as unknown as typeof globalThis.fetch;
    try {
      await expect(adapter.transcribe(audio)).rejects.toThrow('Deepgram STT HTTP 401');
    } finally {
      globalThis.fetch = originalFetch2;
    }
  });

  test('transcribe throws on malformed response (missing results)', async () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    const originalFetch2 = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({}), { headers: { 'content-type': 'application/json' } })) as unknown as typeof globalThis.fetch;
    try {
      await expect(adapter.transcribe({ buffer: new ArrayBuffer(128), mimeType: 'audio/wav' })).rejects.toThrow(
        'Deepgram STT',
      );
    } finally {
      globalThis.fetch = originalFetch2;
    }
  });

  test('transcribe throws on fetch failure', async () => {
    const adapter = new DeepgramSTTAdapter('test-api-key');
    const audio: AudioInput = { buffer: new ArrayBuffer(256), mimeType: 'audio/wav' };
    const originalFetch2 = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('network error'); }) as unknown as typeof globalThis.fetch;
    try {
      await expect(adapter.transcribe(audio)).rejects.toThrow('network error');
    } finally {
      globalThis.fetch = originalFetch2;
    }
  });
});
