import { Controller, Get, Header, Query } from '@nestjs/common';

/**
 * Lecteur audio brandé pour les messages vocaux : les anciens binaires de
 * l'app ne peuvent pas lire un mp3 en interne -> au lieu d'un lien AWS brut
 * dans Safari, on sert une page Joe propre avec un lecteur.
 * Sécurité : on ne lit que les URLs d'enregistrement Telnyx/S3.
 */
@Controller('play')
export class PlayController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page(@Query('src') src?: string, @Query('from') from?: string, @Query('date') date?: string) {
    let ok = false;
    try {
      const u = new URL(src || '');
      ok =
        u.protocol === 'https:' &&
        (u.hostname.endsWith('.amazonaws.com') || u.hostname.endsWith('.telnyx.com'));
    } catch {
      ok = false;
    }
    const esc = (x?: string) =>
      (x || '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const body = ok
      ? `<audio controls autoplay src="${esc(src)}" style="width:100%;margin-top:18px"></audio>`
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
