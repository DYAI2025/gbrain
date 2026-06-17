import type { STTAdapter, AudioInput } from './stt.ts';
import type { TTSAdapter } from './tts.ts';

export function buildVoiceSessionPageInput(
  session: VoiceSessionPage,
  provenance?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    title: session.slug,
    type: 'voice_session',
    compiled_truth: session.content,
    frontmatter: {
      type: 'voice_session',
      source: 'voice',
      confidence: 0.6,
      consent: false,
      session_id: session.slug,
      ...provenance,
    },
  };
}

export async function persistVoiceSession(
  engine: { putPage(slug: string, data: Record<string, unknown>): Promise<unknown>; addTag(slug: string, tag: string): Promise<unknown> },
  session: VoiceSessionPage,
  extraTags?: string[],
): Promise<void> {
  const input = buildVoiceSessionPageInput(session);
  await engine.putPage(session.slug, input);
  await engine.addTag(session.slug, 'voice');
  if (extraTags) {
    for (const tag of extraTags) {
      await engine.addTag(session.slug, tag);
    }
  }
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface ContextProviderResult {
  answer: string;
  citations?: unknown[];
}

export type ContextProvider = (
  transcript: string,
  context?: { title?: string; tags?: string[] },
) => Promise<ContextProviderResult>;

export interface VoiceSessionResult {
  sessionId: string;
  transcript: string;
  summary: string;
  tags: string[];
  audioOutput: ArrayBuffer;
  pageContent: string;
}

export interface VoiceSessionPage {
  slug: string;
  content: string;
}

function generateSlug(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `voice-session-${ts}-${rand}`;
}

function generateSummary(transcript: string): string {
  if (transcript.length <= 200) return transcript;
  return transcript.slice(0, 200) + '...';
}

export class VoiceSessionService {
  private stt: STTAdapter;
  private tts: TTSAdapter;
  private onSave?: (session: VoiceSessionPage) => Promise<void>;
  private contextProvider?: ContextProvider;

  constructor(opts: {
    stt: STTAdapter;
    tts: TTSAdapter;
    onSave?: (session: VoiceSessionPage) => Promise<void>;
    contextProvider?: ContextProvider;
  }) {
    this.stt = opts.stt;
    this.tts = opts.tts;
    this.onSave = opts.onSave;
    this.contextProvider = opts.contextProvider;
  }

  async processAudio(
    audio: AudioInput,
    context?: { title?: string; tags?: string[] },
  ): Promise<VoiceSessionResult> {
    const tags = context?.tags ?? [];
    const slug = generateSlug();
    const sessionId = slug;

    let transcriptionResult;
    try {
      transcriptionResult = await this.stt.transcribe(audio);
    } catch (err) {
      throw new SessionError(
        `STT transcription failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const transcript = transcriptionResult.text;
    const summary = generateSummary(transcript);

    let answer: string;
    if (this.contextProvider) {
      try {
        const result = await this.contextProvider(transcript, context);
        answer = result.answer;
      } catch {
        answer = summary;
      }
    } else {
      answer = summary;
    }

    let audioOutput: ArrayBuffer;
    try {
      audioOutput = await this.tts.synthesize(answer);
    } catch {
      audioOutput = new ArrayBuffer(0);
    }

    const pageContent = buildPageContent({
      title: context?.title ?? 'Voice Session',
      transcript,
      summary,
      answer,
      tags,
      slug,
    });

    if (this.onSave) {
      await this.onSave({ slug, content: pageContent });
    }

    return {
      sessionId,
      transcript,
      summary: answer,
      tags,
      audioOutput,
      pageContent,
    };
  }
}

function buildPageContent(opts: {
  title: string;
  transcript: string;
  summary: string;
  answer?: string;
  tags: string[];
  slug: string;
}): string {
  const tagsYaml = opts.tags.length > 0
    ? `\ntags: [${opts.tags.map(t => `"${t}"`).join(', ')}]`
    : '';

  const answerSection = opts.answer && opts.answer !== opts.summary
    ? `\n\n## Answer\n\n${opts.answer}`
    : '';

  return [
    '---',
    `type: voice_session`,
    `source: voice`,
    `confidence: 0.7`,
    `consent: true`,
    `slug: "${opts.slug}"`,
    `title: "${opts.title}"`,
    tagsYaml,
    '---',
    '',
    '## Transcript',
    '',
    opts.transcript,
    '',
    '## Summary',
    '',
    opts.summary,
    answerSection,
  ].join('\n');
}
