import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';

export interface TranslationFields {
  title?: string | null;
  content?: string | null;
  means?: string | null;
  output?: string | null;
  verificationMethod?: string | null;
  targetValue?: string | null;
  dueMonth?: string | null;
  objective?: string | null;
  sourceRef?: string | null;
  deliverable?: string | null;
  baseline?: string | null;
  dataSource?: string | null;
  frequency?: string | null;
  likelihood?: string | null;
  impact?: string | null;
  mitigation?: string | null;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildPayload(input: TranslationFields): Record<string, string> {
  const payload: Record<string, string> = {};
  const fields: (keyof TranslationFields)[] = [
    'title', 'content', 'means', 'output', 'verificationMethod',
    'targetValue', 'dueMonth', 'objective', 'sourceRef', 'deliverable',
    'baseline', 'dataSource', 'frequency', 'likelihood', 'impact', 'mitigation',
  ];
  for (const f of fields) {
    const val = stripHtml(input[f] as string | null | undefined);
    if (val) payload[f] = val;
  }
  return payload;
}

const SYSTEM_PROMPT = `You are a professional translator specializing in USAID project documents for Côte d'Ivoire (NPSP-CI / GHSD proposal).
Your task is to translate French field values to clear, professional English.
Rules:
- Translate only the values, keep the field names exactly as-is
- Return ONLY a valid JSON object — no explanation, no markdown, no extra text
- Preserve technical terms (M1-M6, NOFO, PMO, etc.) as-is
- If a value is already in English, keep it unchanged
- Plain text output only — no HTML tags`;

function buildUserMessage(payload: Record<string, string>): string {
  return `Translate the following French fields to English:\n${JSON.stringify(payload, null, 2)}`;
}

function parseJsonResponse(raw: string): Record<string, string> {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM response is not valid JSON');
  return JSON.parse(match[0]);
}

@Injectable()
export class TranslationLlmService {
  private readonly logger = new Logger(TranslationLlmService.name);

  async translate(input: TranslationFields): Promise<TranslationFields> {
    const payload = buildPayload(input);
    if (Object.keys(payload).length === 0) {
      return {};
    }

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasMistral   = !!process.env.MISTRAL_API_KEY;

    if (hasAnthropic) {
      this.logger.log('[TranslationLLM] Using Claude (Anthropic)');
      try {
        return await this.callClaude(payload);
      } catch (err: any) {
        this.logger.error(`[TranslationLLM] Claude error: ${err?.message ?? err}`);
        throw new InternalServerErrorException(`Claude API error: ${err?.message ?? 'unknown'}`);
      }
    }
    if (hasMistral) {
      this.logger.log('[TranslationLLM] Using Mistral (fallback)');
      try {
        return await this.callMistral(payload);
      } catch (err: any) {
        this.logger.error(`[TranslationLLM] Mistral error: ${err?.message ?? err}`);
        throw new InternalServerErrorException(`Mistral API error: ${err?.message ?? 'unknown'}`);
      }
    }
    throw new BadRequestException(
      'No LLM API key configured — set ANTHROPIC_API_KEY or MISTRAL_API_KEY in .env',
    );
  }

  private async callClaude(payload: Record<string, string>): Promise<TranslationFields> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: Anthropic } = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const MODEL = 'claude-haiku-4-5-20251001';

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserMessage(payload) }],
    });

    const raw = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    this.logger.log(`[TranslationLLM] Claude — in=${response.usage?.input_tokens} out=${response.usage?.output_tokens}`);
    return parseJsonResponse(raw) as TranslationFields;
  }

  private async callMistral(payload: Record<string, string>): Promise<TranslationFields> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Mistral } = require('@mistralai/mistralai');
    const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY, timeout: 60000 });
    const MODEL = 'mistral-small-latest';

    const response = await client.chat.complete({
      model: MODEL,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] as any,
        },
        { role: 'user', content: buildUserMessage(payload) },
      ],
    });

    const raw = response.choices?.[0]?.message?.content ?? '';
    this.logger.log(`[TranslationLLM] Mistral — tokens=${response.usage?.totalTokens ?? '?'}`);
    return parseJsonResponse(typeof raw === 'string' ? raw : JSON.stringify(raw)) as TranslationFields;
  }
}
