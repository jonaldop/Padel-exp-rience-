import * as bcrypt from 'bcryptjs';
import { DbService } from './db.service';

/** Crée un compte de démo : demo@standardpro.fr / demo1234 + numéro + appels. */
async function main() {
  const db = new DbService();
  (db as any).onModuleInit();

  const email = 'demo@standardpro.fr';
  if (db.hasUser(email)) {
    console.log('Seed déjà présent, on saute.');
    return;
  }

  const { account } = db.createAccountWithOwner({
    companyName: 'Plomberie Démo',
    email,
    passwordHash: await bcrypt.hash('demo1234', 10),
    firstName: 'Johan',
    lastName: 'Démo',
    plan: 'pro',
    status: 'active',
  });

  const num = db.createPhoneNumber({
    accountId: account.id,
    e164: '+33186000099',
    type: 'geographic',
  });

  db.createCall({
    accountId: account.id,
    phoneNumberId: num.id,
    direction: 'inbound',
    fromE164: '+33612345678',
    toE164: num.e164,
    status: 'completed',
    durationS: 142,
  });
  db.createCall({
    accountId: account.id,
    phoneNumberId: num.id,
    direction: 'inbound',
    fromE164: '+33698765432',
    toE164: num.e164,
    status: 'missed',
  });
  db.createCall({
    accountId: account.id,
    phoneNumberId: num.id,
    direction: 'outbound',
    fromE164: num.e164,
    toE164: '+33611223344',
    status: 'completed',
    durationS: 67,
  });

  console.log('✅ Seed créé. Connexion: demo@standardpro.fr / demo1234');
}

main();
