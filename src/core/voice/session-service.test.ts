import { describe, test, expect } from 'bun:test';
import { MockSTTAdapter } from './stt.ts';
import { MockTTSAdapter } from './tts.ts';
import { VoiceSessionService, SessionError } from './session-service.ts';
import type { AudioInput } from './stt.ts';
import type { ContextProvider } from './session-service.ts';

describe('VoiceSessionService', () => {
  const audio: AudioInput = { buffer: new ArrayBuffer(128), mimeType: 'audio/wav' };

  test('processAudio with mock STT+TTS returns transcript and audio', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const service = new VoiceSessionService({ stt, tts });

    const result = await service.processAudio(audio);

    expect(result.transcript).toBe('This is a mock transcription of the audio input.');
    expect(result.summary).toBe('This is a mock transcription of the audio input.');
    expect(result.audioOutput).toBeInstanceOf(ArrayBuffer);
    expect(result.audioOutput.byteLength).toBe(64);
    expect(result.sessionId).toBeTruthy();
    expect(result.tags).toEqual([]);
  });

  test('returns result with context tags and title', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const service = new VoiceSessionService({ stt, tts });

    const result = await service.processAudio(audio, {
      title: 'Test Meeting',
      tags: ['person:anna', 'company:acme'],
    });

    expect(result.tags).toEqual(['person:anna', 'company:acme']);
    expect(result.pageContent).toContain('person:anna');
    expect(result.pageContent).toContain('company:acme');
  });

  test('session is saved via onSave callback', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    let savedSession: { slug: string; content: string } | undefined;
    const service = new VoiceSessionService({
      stt,
      tts,
      onSave: async (session) => {
        savedSession = session;
      },
    });

    const result = await service.processAudio(audio);

    expect(savedSession).toBeDefined();
    expect(savedSession!.slug).toBe(result.sessionId);
    expect(savedSession!.content).toBe(result.pageContent);
  });

  test('session markdown contains frontmatter + transcript + summary', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const service = new VoiceSessionService({ stt, tts });

    const result = await service.processAudio(audio);

    expect(result.pageContent).toContain('---');
    expect(result.pageContent).toContain('type: voice_session');
    expect(result.pageContent).toContain('source: voice');
    expect(result.pageContent).toContain('confidence: 0.7');
    expect(result.pageContent).toContain('consent: true');
    expect(result.pageContent).toContain('## Transcript');
    expect(result.pageContent).toContain(result.transcript);
    expect(result.pageContent).toContain('## Summary');
    expect(result.pageContent).toContain(result.summary);
  });

  test('STT failure throws SessionError', async () => {
    const stt = new MockSTTAdapter({ fail: true });
    const tts = new MockTTSAdapter();
    const service = new VoiceSessionService({ stt, tts });

    expect(service.processAudio(audio)).rejects.toThrow(SessionError);
    expect(service.processAudio(audio)).rejects.toThrow('STT transcription failed');
  });

  test('TTS failure still returns result with empty audioOutput', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter({ fail: true });
    const service = new VoiceSessionService({ stt, tts });

    const result = await service.processAudio(audio);

    expect(result.transcript).toBe('This is a mock transcription of the audio input.');
    expect(result.audioOutput).toBeInstanceOf(ArrayBuffer);
    expect(result.audioOutput.byteLength).toBe(0);
  });

  test('contextProvider answer is used as summary and TTS input', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const contextProvider: ContextProvider = async (transcript) => {
      expect(transcript).toBe('This is a mock transcription of the audio input.');
      return { answer: 'Contextual answer based on transcript' };
    };
    const service = new VoiceSessionService({ stt, tts, contextProvider });

    const result = await service.processAudio(audio);

    expect(result.summary).toBe('Contextual answer based on transcript');
    expect(result.pageContent).toContain('Contextual answer based on transcript');
    expect(result.pageContent).toContain('## Transcript');
    expect(result.pageContent).toContain('## Summary');
  });

  test('contextProvider receives context tags and title', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    let receivedContext: { title?: string; tags?: string[] } | undefined;
    const contextProvider: ContextProvider = async (_transcript, ctx) => {
      receivedContext = ctx;
      return { answer: 'test' };
    };
    const service = new VoiceSessionService({ stt, tts, contextProvider });

    await service.processAudio(audio, { title: 'Meeting', tags: ['tag1'] });

    expect(receivedContext).toEqual({ title: 'Meeting', tags: ['tag1'] });
  });

  test('contextProvider error falls back to summary', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const contextProvider: ContextProvider = async () => {
      throw new Error('Provider unavailable');
    };
    const service = new VoiceSessionService({ stt, tts, contextProvider });

    const result = await service.processAudio(audio);

    expect(result.summary).toBe('This is a mock transcription of the audio input.');
    expect(result.pageContent).not.toContain('## Answer');
  });

  test('contextProvider error does not throw SessionError', async () => {
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();
    const contextProvider: ContextProvider = async () => {
      throw new Error('Provider crash');
    };
    const service = new VoiceSessionService({ stt, tts, contextProvider });

    await expect(service.processAudio(audio)).resolves.toBeDefined();
  });
});
