import { Injectable } from '@nestjs/common';

/**
 * Journal d'appels en mémoire (MVP / démo).
 * À remplacer par PostgreSQL (cf. doc 04 — entité CALL, ticket CALL-5).
 */
export interface CallLog {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: 'ringing' | 'answered' | 'missed' | 'voicemail' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  durationS?: number;
}

@Injectable()
export class CallsStore {
  private calls: CallLog[] = [];

  upsert(partial: Partial<CallLog> & { id: string }): CallLog {
    const existing = this.calls.find((c) => c.id === partial.id);
    if (existing) {
      Object.assign(existing, partial);
      return existing;
    }
    const created: CallLog = {
      direction: 'inbound',
      from: '',
      to: '',
      status: 'ringing',
      startedAt: new Date().toISOString(),
      ...partial,
    };
    this.calls.unshift(created);
    return created;
  }

  list(): CallLog[] {
    return this.calls;
  }
}
