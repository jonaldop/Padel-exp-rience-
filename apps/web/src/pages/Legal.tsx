import '../landing.css';

/* ============================================================
   Pages légales : mentions légales, politique de confidentialité, CGV.
   Requises pour Stripe, l'App Store et la vérification business Meta.
   URLs : /mentions-legales · /confidentialite · /cgv
   ============================================================ */

export type LegalPage = 'mentions' | 'confidentialite' | 'cgv';

const COMPANY = {
  name: 'Webmarketing Services',
  siren: '749 919 155',
  address: '435 allée François Aubrun, 13100 Le Tholonet, France',
  director: 'Johan Poulos',
  email: 'johan@webmarketing-services.com',
  site: 'https://www.allojoe.fr',
};

const TITLES: Record<LegalPage, string> = {
  mentions: 'Mentions légales',
  confidentialite: 'Politique de confidentialité',
  cgv: 'Conditions générales de vente',
};

export function Legal({ page }: { page: LegalPage }) {
  document.title = `${TITLES[page]} — Joe · allojoe.fr`;
  return (
    <div className="lp" style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <nav className="lp-nav scrolled">
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <span className="lp-logo-mark"><img src="/mascotte.png" alt="Joe" /></span> Joe
          </a>
          <div className="lp-links">
            <a href="/mentions-legales">Mentions légales</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/cgv">CGV</a>
          </div>
          <div className="lp-nav-cta">
            <a href="/" className="lp-btn lp-btn-ghost lp-btn-nav">← Retour au site</a>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '110px 20px 80px', lineHeight: 1.65, color: '#2a2a3a', fontSize: 15.5 }}>
        <h1 style={{ fontSize: 32, letterSpacing: '-0.02em', marginBottom: 6 }}>{TITLES[page]}</h1>
        <p style={{ color: '#6e6d80', marginTop: 0 }}>Dernière mise à jour : juillet 2026</p>

        {page === 'mentions' && <Mentions />}
        {page === 'confidentialite' && <Confidentialite />}
        {page === 'cgv' && <Cgv />}
      </main>
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 20, marginTop: 34, marginBottom: 8, letterSpacing: '-0.01em' }}>{children}</h2>
);

function Mentions() {
  return (
    <>
      <H>Éditeur du site</H>
      <p>
        Le site <b>allojoe.fr</b> et le service <b>Joe — Ta ligne pro</b> sont édités par la société{' '}
        <b>{COMPANY.name}</b>, immatriculée sous le numéro SIREN {COMPANY.siren}, dont le siège social est
        situé {COMPANY.address}.
      </p>
      <p>
        Directeur de la publication : {COMPANY.director}.<br />
        Contact : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>

      <H>Hébergement</H>
      <p>
        Site web : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).<br />
        Services applicatifs : Railway Corp., États-Unis (railway.com).<br />
        Services de télécommunications : Telnyx LLC, 311 W Superior St, Chicago, IL 60654, États-Unis (telnyx.com).
      </p>

      <H>Propriété intellectuelle</H>
      <p>
        L'ensemble des éléments du site (textes, visuels, logo, mascotte, interfaces, code) est protégé par le
        droit de la propriété intellectuelle et demeure la propriété exclusive de {COMPANY.name}. Toute
        reproduction sans autorisation écrite préalable est interdite.
      </p>

      <H>Nous contacter</H>
      <p>
        Pour toute question relative au site ou au service : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </>
  );
}

function Confidentialite() {
  return (
    <>
      <p>
        La protection de vos données est essentielle au service Joe : notre métier consiste précisément à
        traiter vos communications professionnelles avec soin. Cette politique décrit quelles données nous
        traitons, pourquoi, et vos droits (Règlement général sur la protection des données — RGPD).
      </p>

      <H>Responsable de traitement</H>
      <p>
        {COMPANY.name}, SIREN {COMPANY.siren}, {COMPANY.address} — contact :{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <H>Données traitées</H>
      <p>
        <b>Données de compte</b> : nom, prénom, nom d'entreprise, email, numéro de téléphone personnel (pour le
        renvoi d'appels), mot de passe (stocké haché, jamais en clair).<br />
        <b>Données d'usage téléphonique</b> : journaux d'appels (numéros, horaires, durées), messages vocaux,
        enregistrements et leurs transcriptions, conversations écrites, fiches clients que vous créez.<br />
        <b>Données de facturation</b> : historique des factures et de l'abonnement. Les données de carte
        bancaire sont traitées exclusivement par Stripe : nous n'y avons jamais accès et n'en stockons aucune.<br />
        <b>Données techniques</b> : identifiants d'appareil pour les notifications, journaux techniques de
        sécurité.
      </p>

      <H>Finalités et bases légales</H>
      <p>
        Fourniture du service de téléphonie et de secrétariat (exécution du contrat) · Facturation et
        obligations comptables (obligation légale) · Prévention de la fraude et sécurité de la plateforme
        (intérêt légitime) · Amélioration du service (intérêt légitime).
      </p>

      <H>Sous-traitants</H>
      <p>
        Nous faisons appel à des prestataires strictement nécessaires au service : Telnyx (acheminement
        télécom), Stripe (paiement), Vercel et Railway (hébergement), Expo (notifications mobiles), et des
        fournisseurs d'intelligence artificielle (Anthropic ou OpenAI) pour la transcription et la
        qualification des messages vocaux. Certains sont situés hors de l'Union européenne : les transferts
        sont encadrés par les clauses contractuelles types de la Commission européenne.
      </p>

      <H>Durées de conservation</H>
      <p>
        Données de compte : pendant toute la durée du contrat, puis suppression ou anonymisation.
        Messages vocaux et transcriptions : jusqu'à leur suppression par vos soins ou la clôture du compte.
        Factures : 10 ans (obligation comptable). Journaux d'appels : durée du contrat, dans la limite des
        obligations légales applicables aux opérateurs.
      </p>

      <H>Vos droits</H>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, de limitation et
        d'opposition sur vos données. Pour les exercer : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        Vous pouvez également adresser une réclamation à la CNIL (cnil.fr).
      </p>

      <H>Cookies</H>
      <p>
        Le site n'utilise que des cookies strictement nécessaires (session de connexion). Aucun cookie
        publicitaire, aucun pistage à des fins commerciales.
      </p>
    </>
  );
}

function Cgv() {
  return (
    <>
      <H>1. Objet</H>
      <p>
        Les présentes conditions régissent la fourniture par {COMPANY.name} du service <b>Joe — Ta ligne
        pro</b> : ligne téléphonique professionnelle par internet comprenant, selon la formule choisie, un
        numéro français, les appels, le répondeur intelligent avec transcription et qualification des
        messages, et les applications mobile et web. <b>Le service est destiné exclusivement à un usage
        professionnel</b> (artisans, indépendants, entreprises).
      </p>

      <H>2. Souscription et activation</H>
      <p>
        La souscription s'effectue en ligne : choix du numéro, création du compte, puis règlement de
        l'abonnement par carte bancaire (paiement sécurisé Stripe). Le numéro choisi est réservé lors de
        l'inscription et mis en service immédiatement après la confirmation du premier paiement.
      </p>

      <H>3. Tarifs et facturation</H>
      <p>
        Les tarifs en vigueur sont affichés sur {COMPANY.site}. L'abonnement est mensuel, payé d'avance par
        prélèvement automatique. Les appels reçus sont illimités dans le cadre d'un usage professionnel
        raisonnable. Les appels sortants sont inclus à hauteur du volume de la formule choisie ; au-delà,
        ils sont facturés 0,05 € par minute sur la facture du mois suivant. Les formules « illimitées »
        s'entendent pour un usage professionnel individuel raisonnable (limite technique de 3 000 minutes
        sortantes par mois). Les appels sortants sont limités à la France métropolitaine, aux DOM et aux
        destinations listées dans l'application.
      </p>

      <H>4. Durée et résiliation</H>
      <p>
        L'abonnement est <b>sans engagement</b> : résiliable à tout moment depuis l'espace client, avec effet
        à la fin de la période mensuelle déjà réglée. En cas de résiliation ou d'impayé non régularisé, le
        numéro est conservé 15 jours puis définitivement libéré.
      </p>

      <H>5. Numéros et usage du service</H>
      <p>
        Les numéros sont attribués parmi le stock disponible chez nos opérateurs partenaires. Le client
        s'engage à un usage conforme à la loi et loyal du service : sont notamment interdits le spam, le
        démarchage automatisé massif, l'usurpation d'identité, la fraude téléphonique et la revente du
        service. {COMPANY.name} peut suspendre immédiatement une ligne en cas d'usage frauduleux ou abusif.
      </p>

      <H>6. Appels d'urgence — limitation importante</H>
      <p>
        Le service fonctionne par internet (VoIP). <b>L'accès aux numéros d'urgence (112, 15, 17, 18) peut
        être indisponible</b>, notamment en cas de coupure internet ou d'électricité, et la localisation
        automatique de l'appelant n'est pas garantie. Le client reconnaît conserver un accès téléphonique
        classique (ligne mobile) pour les appels d'urgence.
      </p>

      <H>7. Responsabilité</H>
      <p>
        {COMPANY.name} est tenue à une obligation de moyens. La qualité du service dépend notamment de la
        connexion internet du client et des réseaux des opérateurs tiers. La responsabilité de {COMPANY.name}{' '}
        ne saurait excéder le montant des sommes versées au titre des trois derniers mois d'abonnement. Les
        transcriptions et qualifications produites par l'intelligence artificielle sont fournies à titre
        d'aide et peuvent comporter des imprécisions.
      </p>

      <H>8. Données personnelles</H>
      <p>
        Le traitement des données est décrit dans notre <a href="/confidentialite">politique de
        confidentialité</a>.
      </p>

      <H>9. Droit applicable</H>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera
        recherchée avant toute action ; à défaut, compétence est attribuée aux tribunaux du ressort du siège
        de {COMPANY.name}.
      </p>

      <H>Contact</H>
      <p>
        {COMPANY.name} — {COMPANY.address} — <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </>
  );
}
