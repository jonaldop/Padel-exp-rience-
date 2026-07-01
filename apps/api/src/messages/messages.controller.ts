import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { PushService } from '../push/push.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/**
 * Messagerie (conversations avec les clients).
 *
 * Le moteur est AGNOSTIQUE du canal : aujourd'hui l'envoi tente le SMS Telnyx
 * (ne fonctionnera que sur un numéro compatible SMS), demain le même moteur
 * portera WhatsApp Business / un agrégateur SMS FR — sans changer l'app.
 */
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly db: DbService,
    private readonly telnyx: TelnyxService,
    private readonly push: PushService,
  ) {}

  /** Liste des conversations (dernier message + non-lus). */
  @UseGuards(JwtGuard)
  @Get('threads')
  threads(@CurrentUser() user: JwtPayload) {
    return this.db.listThreads(user.accountId);
  }

  /** Messages d'une conversation (et marque les entrants comme lus). */
  @UseGuards(JwtGuard)
  @Get('thread')
  thread(@CurrentUser() user: JwtPayload, @Query('peer') peer: string) {
    this.db.markThreadRead(user.accountId, peer || '');
    return this.db.listThread(user.accountId, peer || '');
  }

  /** Envoyer un message depuis le numéro pro du compte. */
  @UseGuards(JwtGuard)
  @Post('send')
  async send(@CurrentUser() user: JwtPayload, @Body() body: { to: string; body: string }) {
    const text = (body.body || '').trim();
    if (!body.to || !text) return { error: 'Destinataire et message requis' };
    const number = this.db.findFirstPhoneNumber(user.accountId);
    if (!number) return { error: 'Aucun numéro pro configuré' };

    const msg = this.db.createMessage({
      accountId: user.accountId,
      phoneNumberId: number.id,
      direction: 'outbound',
      fromE164: number.e164,
      toE164: body.to,
      body: text,
      status: 'queued',
      isRead: true,
    });

    if (this.telnyx.configured) {
      try {
        const res = await this.telnyx.sendSms(number.e164, body.to, text);
        this.db.updateMessage(msg.id, {
          status: 'sent',
          providerMessageId: (res as any)?.data?.id || null,
        });
        return { ...msg, status: 'sent' };
      } catch {
        this.db.updateMessage(msg.id, { status: 'failed' });
        return {
          ...msg,
          status: 'failed',
          error:
            "Envoi impossible : aucun canal de messagerie (SMS/WhatsApp) n'est encore activé sur ce numéro.",
        };
      }
    }
    return msg;
  }

  /** Webhook Telnyx Messaging : réception + statuts de livraison. */
  @Post('webhook')
  webhook(@Body() body: any) {
    const event = body?.data;
    if (!event) return { ok: true };
    const type: string = event.event_type;
    const p = event.payload || {};

    if (type === 'message.received') {
      const to: string = p?.to?.[0]?.phone_number || p?.to || '';
      const from: string = p?.from?.phone_number || '';
      const number = this.db.findPhoneNumberByE164(to);
      if (number) {
        this.db.createMessage({
          accountId: number.accountId,
          phoneNumberId: number.id,
          direction: 'inbound',
          fromE164: from,
          toE164: to,
          body: p?.text || '',
          status: 'received',
          providerMessageId: p?.id || null,
        });
        this.push.notifyAccount(number.accountId, {
          title: 'Nouveau message 💬',
          body: `${from} : ${String(p?.text || '').slice(0, 90)}`,
          data: { screen: 'Messages' },
        });
      }
    } else if (type === 'message.finalized' || type === 'message.sent') {
      const status = p?.to?.[0]?.status || (type === 'message.sent' ? 'sent' : 'delivered');
      if (p?.id) this.db.updateMessageStatus(p.id, status);
    }
    return { ok: true };
  }
}
