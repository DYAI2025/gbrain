import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { MockTTSAdapter, SupertonicTTSAdapter } from './tts.ts';

describe('MockTTSAdapter', () => {
  test('returns ArrayBuffer', async () => {
    const adapter = new MockTTSAdapter();
    const result = await adapter.synthesize('Hello world');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(64);
  });

  test('respects delay', async () => {
    const adapter = new MockTTSAdapter({ delayMs: 50 });
    const start = Date.now();
    await adapter.synthesize('Hello');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  test('with fail=true throws', async () => {
    const adapter = new MockTTSAdapter({ fail: true });
    expect(adapter.synthesize('Hello')).rejects.toThrow('Mock TTS failure');
  });

  test('isAvailable returns true', () => {
    const adapter = new MockTTSAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });
});

describe('SupertonicTTSAdapter', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedRequests: { url: string; method: string; body: string }[];

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    capturedRequests = [];
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      capturedRequests.push({
        url,
        method: init?.method ?? 'GET',
        body: (init?.body as string) ?? '',
      });
      const parsed = new URL(url);
      if (parsed.hostname === 'localhost' && parsed.port === '9999') {
        if (parsed.pathname === '/audio/speech' || parsed.pathname === '/v1/audio/speech') {
          return new Response(new ArrayBuffer(128), {
            headers: { 'content-type': 'audio/wav' },
          });
        }
        return new Response('Not Found', { status: 404 });
      }
      // Pass through to real fetch for non-mock URLs (e.g., connection refused)
      return originalFetch(input, init);
    };
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test('isAvailable returns true', () => {
    const adapter = new SupertonicTTSAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  test('default baseUrl is localhost:8080/v1', () => {
    const adapter = new SupertonicTTSAdapter();
    expect(adapter).toBeDefined();
  });

  test('synthesize sends POST to /audio/speech and returns audio bytes', async () => {
    const adapter = new SupertonicTTSAdapter('http://localhost:9999');
    const result = await adapter.synthesize('Hello world', 'alloy');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(128);
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1);
    const req = capturedRequests[capturedRequests.length - 1];
    expect(req.method).toBe('POST');
    const body = JSON.parse(req.body);
    expect(body.input).toBe('Hello world');
    expect(body.voice).toBe('alloy');
  });

  test('synthesize without voice defaults to alloy', async () => {
    const adapter = new SupertonicTTSAdapter('http://localhost:9999');
    await adapter.synthesize('Hello world');
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1);
    const req = capturedRequests[capturedRequests.length - 1];
    const body = JSON.parse(req.body);
    expect(body.voice).toBe('alloy');
  });

  test('synthesize with v1 prefix sends to /v1/audio/speech', async () => {
    const adapter = new SupertonicTTSAdapter('http://localhost:9999/v1');
    await adapter.synthesize('Hello');
    const req = capturedRequests[capturedRequests.length - 1];
    expect(new URL(req.url).pathname).toBe('/v1/audio/speech');
  });

  test('synthesize throws on HTTP error', async () => {
    const adapter = new SupertonicTTSAdapter('http://localhost:9999/bad');
    expect(adapter.synthesize('Hello')).rejects.toThrow('Supertonic TTS HTTP 404');
  });

  test('synthesize throws on fetch failure', async () => {
    const adapter = new SupertonicTTSAdapter('http://localhost:1');
    expect(adapter.synthesize('Hello')).rejects.toThrow();
  });
});
