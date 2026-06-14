/**
 * Google Gemini provider for NLP (text) and Vision (photo) meal parsing.
 * Free tier; swappable for Claude/GPT-4o behind the AIProvider seam. Uses
 * structured JSON output (responseSchema) so parsing is deterministic.
 */
import type {
  AIProvider,
  ParseResult,
  ParsePhotoInput,
  ParsedFoodItem,
} from '../ai-provider';
import { fetchJson } from './http';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** JSON schema Gemini must conform its output to. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number', nullable: true },
          unit: { type: 'string', nullable: true },
          estimatedGrams: { type: 'number', nullable: true },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
      },
    },
  },
  required: ['items'],
} as const;

const TEXT_PROMPT =
  'You are a nutrition assistant. Break the meal description into distinct food items. ' +
  'For each item, estimate the portion weight in grams and its nutrition (calories in kcal, ' +
  'protein, carbs, and fat in grams). Use typical serving sizes when the amount is vague ' +
  '(e.g. "a handful", "a bowl"). Set confidence 0-1 per item. Description:\n';

const PHOTO_PROMPT =
  'You are a nutrition assistant. Analyze this meal photo. Identify each distinct food item, ' +
  'estimate its portion weight in grams, and its nutrition (calories in kcal, protein, carbs, ' +
  'and fat in grams). Account for visible quantity. Set confidence 0-1 per item.';

interface GeminiItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  estimatedGrams?: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function toBase64(data: ArrayBuffer | Uint8Array | string): string {
  if (typeof data === 'string') return data; // assume already base64
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const B = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(bytes).toString('base64');
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gemini-2.0-flash',
  ) {}

  private async generate(
    parts: unknown[],
    signal?: AbortSignal,
  ): Promise<ParseResult> {
    const url = `${BASE}/models/${encodeURIComponent(this.model)}:generateContent`;
    const data = await fetchJson<GeminiResponse>(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.apiKey },
      timeoutMs: 30000,
      signal,
      body: {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      },
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}';
    let parsed: { items?: GeminiItem[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { items: [] };
    }

    const items: ParsedFoodItem[] = (parsed.items ?? []).map((it) => ({
      name: it.name,
      quantity: it.quantity ?? null,
      unit: it.unit ?? null,
      estimatedGrams: it.estimatedGrams ?? null,
      estimatedNutrition: {
        calories: Math.round(it.calories ?? 0),
        protein_g: it.protein_g ?? 0,
        carbs_g: it.carbs_g ?? 0,
        fat_g: it.fat_g ?? 0,
      },
      confidence: clamp01(it.confidence),
    }));

    return { items, raw: data };
  }

  parseText(text: string, opts: { signal?: AbortSignal } = {}): Promise<ParseResult> {
    return this.generate([{ text: TEXT_PROMPT + JSON.stringify(text) }], opts.signal);
  }

  parsePhoto(input: ParsePhotoInput, opts: { signal?: AbortSignal } = {}): Promise<ParseResult> {
    return this.generate(
      [
        { text: PHOTO_PROMPT },
        { inline_data: { mime_type: input.mimeType ?? 'image/jpeg', data: toBase64(input.image) } },
      ],
      opts.signal,
    );
  }
}
