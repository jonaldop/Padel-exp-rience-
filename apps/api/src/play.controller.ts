import { Controller, Get, Header, Headers, Query, Res } from '@nestjs/common';
import { Readable } from 'stream';
import { config } from './config/config';
import { DbService } from './db/db.service';
import { TelnyxService } from './telnyx/telnyx.service';

/**
 * Lecteur audio brandé pour les messages vocaux : les anciens binaires de
 * l'app ne peuvent pas lire un mp3 en interne -> au lieu d'un lien AWS brut
 * dans Safari, on sert une page Joe propre avec un lecteur.
 * Sécurité : on ne lit que les URLs d'enregistrement Telnyx/S3.
 */
@Controller('play')
export class PlayController {
  constructor(
    private readonly db: DbService,
    private readonly telnyx: TelnyxService,
  ) {}

  /**
   * Résout l'URL audio d'un message : lien FRAIS via l'API Telnyx quand on a
   * l'id d'enregistrement (les liens du webhook expirent en 10 min), sinon
   * l'URL stockée (vieux messages — peut être expirée).
   */
  private async resolveAudioUrl(vmId: string): Promise<string | null> {
    const vm = this.db.findVoicemailById(vmId);
    if (!vm) return null;
    if (vm.providerRecordingId) {
      const fresh = await this.telnyx.getRecordingMp3Url(vm.providerRecordingId);
      if (fresh) return fresh;
    }
    return vm.audioUrl || null;
  }
  /**
   * RELAIS AUDIO : sert l'enregistrement à travers notre serveur.
   * Nécessaire car AVPlayer (lecteur natif iOS) fait des requêtes par plage
   * (Range) que les liens S3/Telnyx refusent (NSURLErrorDomain -1102).
   * On transmet la plage demandée à l'amont et on renvoie le flux tel quel.
   */
  @Get('audio')
  async audio(
    @Query('src') src: string,
    @Query('vm') vmId: string,
    @Headers('range') range: string,
    @Res() res: any,
  ) {
    if (vmId) {
      const resolved = await this.resolveAudioUrl(vmId);
      if (!resolved) {
        res.status(404).send('message introuvable ou enregistrement expiré');
        return;
      }
      src = resolved;
    }
    let u: URL;
    try {
      u = new URL(src || '');
    } catch {
      res.status(400).send('lien invalide');
      return;
    }
    const allowed =
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.amazonaws.com') || u.hostname.endsWith('.telnyx.com'));
    if (!allowed) {
      res.status(400).send('lien invalide');
      return;
    }
    const headers: Record<string, string> = {};
    if (range) headers.Range = range;
    // Les liens Telnyx "privés" s'ouvrent avec notre clé API (n'expirent pas).
    if (u.hostname.endsWith('.telnyx.com') && config.telnyx.apiKey) {
      headers.Authorization = `Bearer ${config.telnyx.apiKey}`;
    }
    try {
      const up = await fetch(src, { headers });
      res.status(up.status);
      for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const v = up.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      if (!up.headers.get('content-type')) res.setHeader('content-type', 'audio/mpeg');
      if (up.body) Readable.fromWeb(up.body as any).pipe(res);
      else res.end();
    } catch (e) {
      res.status(502).send(`amont injoignable: ${(e as Error).message}`);
    }
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page(
    @Query('src') src?: string,
    @Query('vm') vmId?: string,
    @Query('from') from?: string,
    @Query('date') date?: string,
  ) {
    let ok = false;
    let audioSrc = '';
    if (vmId && /^[0-9a-f-]{10,}$/i.test(vmId)) {
      ok = true;
      audioSrc = `/play/audio?vm=${encodeURIComponent(vmId)}`;
    } else {
      try {
        const u = new URL(src || '');
        ok =
          u.protocol === 'https:' &&
          (u.hostname.endsWith('.amazonaws.com') || u.hostname.endsWith('.telnyx.com'));
        audioSrc = `/play/audio?src=${encodeURIComponent(src || '')}`;
      } catch {
        ok = false;
      }
    }
    const esc = (x?: string) =>
      (x || '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const body = ok
      ? `<audio controls autoplay src="${audioSrc}" style="width:100%;margin-top:18px"></audio>`
      : `<p style="color:#c00">Lien d'enregistrement invalide.</p>`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Message vocal — Joe</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(160deg,#5B8CFF,#7C5CF0 55%,#9B5BE0);min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:22px;padding:30px 26px;max-width:420px;width:calc(100% - 40px);margin:20px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3)">
<div style="font-size:40px">🎙️</div>
<h1 style="font-size:19px;margin:10px 0 2px">Message vocal</h1>
${from ? `<p style=\"margin:0;font-weight:700;font-size:15px\">${esc(from)}</p>` : ''}
${date ? `<p style=\"margin:4px 0 0;color:#888;font-size:13px\">${esc(date)}</p>` : ''}
${body}
<p style="margin-top:16px;color:#aaa;font-size:12px">Joe — Ta ligne pro</p>
</div></body></html>`;
  }
}
