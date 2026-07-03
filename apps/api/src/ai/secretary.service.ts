import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** Résultat de la qualification d'un message vocal. */
export interface SecretaryAnalysis {
  category: 'devis' | 'urgence' | 'rdv' | 'rappel' | 'autre';
  urgency: 'haute' | 'normale';
  summary: string; // 1 phrase pour l'artisan
  callerName?: string | null;
  engine: 'llm' | 'keywords';
}

/**
 * SECRÉTARIAT IA (docs/08 AI-1) : analyse la transcription d'un message vocal
 * et en sort une fiche exploitable (catégorie, urgence, résumé, nom).
 *
 * - Avec une clé IA (réglage admin `aiApiKey` ou env AI_API_KEY) : analyse LLM
 *   (Anthropic `sk-ant-…` ou OpenAI `sk-…`, détecté au préfixe).
 * - Sans clé : repli par mots-clés français — moins fin mais toujours utile,
 *   et surtout : la fonctionnalité marche pour tout le monde dès le jour 1.
 */
@Injectable()
export class SecretaryService {
  private readonly logger = new Logger(SecretaryService.name);

  constructor(private readonly db: DbService) {}

  private get apiKey(): string {
    return process.env.AI_API_KEY || this.db.getSetting('aiApiKey') || '';
  }

  get llmConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Analyse une transcription. Ne lève jamais : repli mots-clés en cas de pépin. */
  async analyze(transcript: string): Promise<SecretaryAnalysis> {
    const text = (transcript || '').trim();
    if (!text) {
      return { category: 'autre', urgency: 'normale', summary: '', engine: 'keywords' };
    }
    if (this.llmConfigured) {
      try {
        return await this.analyzeWithLlm(text);
      } catch (e) {
        this.logger.warn(`Analyse LLM échouée (${(e as Error).message}) -> repli mots-clés`);
      }
    }
    return this.analyzeWithKeywords(text);
  }

  // ── Analyse LLM ─────────────────────────────────────────────────────────────

  private async analyzeWithLlm(text: string): Promise<SecretaryAnalysis> {
    const prompt = `Tu es le secrétariat téléphonique d'un artisan français. Voici la transcription (imparfaite) d'un message vocal laissé par un appelant :

"""${text.slice(0, 4000)}"""

Réponds UNIQUEMENT avec un objet JSON (aucun autre texte) :
{"category":"devis|urgence|rdv|rappel|autre","urgency":"haute|normale","summary":"résumé en une phrase courte et actionnable pour l'artisan (qui appelle, pourquoi, quand rappeler)","callerName":"nom de l'appelant ou null"}`;

    const key = this.apiKey;
    let raw: string;
    if (key.startsWith('sk-ant-')) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data: any = await res.json();
      raw = data?.content?.[0]?.text || '';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data: any = await res.json();
      raw = data?.choices?.[0]?.message?.content || '';
    }

    const json = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim());
    const cat = ['devis', 'urgence', 'rdv', 'rappel', 'autre'].includes(json.category)
      ? json.category
      : 'autre';
    return {
      category: cat,
      urgency: json.urgency === 'haute' ? 'haute' : 'normale',
      summary: String(json.summary || '').slice(0, 300),
      callerName: json.callerName || null,
      engine: 'llm',
    };
  }

  // ── Repli mots-clés (sans clé IA) ───────────────────────────────────────────

  private analyzeWithKeywords(text: string): SecretaryAnalysis {
    const t = text.toLowerCase();
    const has = (...words: string[]) => words.some((w) => t.includes(w));

    let category: SecretaryAnalysis['category'] = 'autre';
    if (has('devis', 'estimation', 'tarif', 'prix', 'combien')) category = 'devis';
    else if (has('urgent', 'urgence', 'fuite', 'panne', 'plus de chauffage', 'plus d’eau', "plus d'eau", 'dégât', 'degat', 'inond')) category = 'urgence';
    else if (has('rendez-vous', 'rendez vous', 'rdv', 'passer', 'disponib', 'créneau', 'creneau')) category = 'rdv';
    else if (has('rappel', 'rappeler', 'rappelle', 'recontact')) category = 'rappel';

    const urgency = category === 'urgence' || has('urgent', "aujourd'hui", 'ce soir', 'tout de suite', 'vite')
      ? 'haute'
      : 'normale';

    // Résumé simple : début du message, nettoyé.
    const clean = text.replace(/\s+/g, ' ').trim();
    const summary = clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;

    return { category, urgency, summary, callerName: null, engine: 'keywords' };
  }

  /** Message d'accueil par défaut du secrétariat (partagé app/API). */
  static greeting(company: string | undefined, closed = false): string {
    const intro = company ? `Bonjour, vous êtes bien chez ${company}.` : 'Bonjour.';
    const closedTxt = closed ? ' Nous sommes actuellement fermés.' : '';
    return (
      `${intro}${closedTxt} Je suis l'assistant de la ligne. ` +
      `Après le bip, indiquez votre nom, la raison de votre appel — devis, urgence ou rendez-vous — ` +
      `et vos disponibilités. Votre message est transmis immédiatement. Merci !`
    );
  }

  /** Libellé humain (pushs, app) : emoji + intitulé. */
  static label(category?: string | null): string {
    switch (category) {
      case 'devis': return '🛠️ Demande de devis';
      case 'urgence': return '🚨 Urgence';
      case 'rdv': return '📅 Rendez-vous';
      case 'rappel': return '📞 Demande de rappel';
      default: return '🎙️ Nouveau message';
    }
  }
}
