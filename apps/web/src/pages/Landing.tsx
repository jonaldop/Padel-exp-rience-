import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import '../landing.css';

/* ============================================================
   Joe — Site commercial (racine du domaine).
   Les clients découvrent l'offre, s'inscrivent et s'abonnent :
   chaque CTA envoie vers /app?signup=1&plan=… (tunnel d'inscription
   avec forfait présélectionné puis activation Stripe).
   ============================================================ */

// Formules par défaut (affichées immédiatement, remplacées par l'API)
const FALLBACK_PLANS = [
  { key: 'essentiel', name: 'Essentiel', monthlyPrice: 14.99, includedMinutes: 200, features: ['1 numéro pro', 'Appels & messagerie', 'Horaires & répondeur'] },
  { key: 'pro', name: 'Pro', monthlyPrice: 29, includedMinutes: 600, features: ['Tout Essentiel', 'Transcription', 'Renvoi avancé'] },
  { key: 'business', name: 'Business', monthlyPrice: 49, includedMinutes: 1500, features: ['Tout Pro', 'Assistant IA', 'Multi-utilisateurs'] },
];

const TRADES = ['🔧 Plombiers', '⚡ Électriciens', '🪚 Menuisiers', '🎨 Peintres', '🌿 Paysagistes', '🚕 Taxis & VTC', '💇 Coiffeurs', '🏋️ Coachs', '🧹 Services à domicile', '📸 Photographes'];

const FEATURES = [
  { icon: '📞', title: 'Un vrai numéro pro', text: 'Choisissez votre numéro français en 2 minutes. Vos clients vous appellent dessus, vous les rappelez avec — votre numéro perso reste privé.' },
  { icon: '🎙️', title: 'Répondeur intelligent', text: 'Un message d’accueil professionnel, et chaque message vocal transcrit en texte. Vous lisez vos messages au lieu de les écouter.' },
  { icon: '🕓', title: 'Horaires d’ouverture', text: 'Le soir et le week-end, Joe répond pour vous et prend le message. Vous coupez vraiment, sans rater de client.' },
  { icon: '💬', title: 'Messages clients', text: 'Écrivez à vos clients depuis votre numéro pro, comme par SMS. Toutes les conversations au même endroit.' },
  { icon: '📇', title: 'Vos clients reconnus', text: 'Chaque appel arrive avec le nom du client, sa fiche et l’historique complet. Vous décrochez en sachant qui appelle et pourquoi.' },
  { icon: '💻', title: 'Mobile + ordinateur', text: 'L’app sur votre iPhone, l’espace web sur votre ordinateur. Vos appels, messages et clients vous suivent partout.' },
];

const FAQ = [
  { q: 'Ai-je besoin d’un deuxième téléphone ou d’une carte SIM ?', a: 'Non, c’est justement tout l’intérêt. Joe s’installe comme une simple application sur votre téléphone actuel. Votre ligne pro fonctionne par internet (4G/5G ou Wi-Fi) : aucun matériel, aucune carte SIM, aucune manipulation chez votre opérateur.' },
  { q: 'Est-ce que je garde mon numéro personnel ?', a: 'Oui. Votre numéro et votre forfait actuels ne changent pas d’un millimètre. Joe ajoute une deuxième ligne, 100 % professionnelle, à côté. Vous savez toujours si un appel est pro ou perso avant de décrocher.' },
  { q: 'Comment mes clients me joignent-ils ?', a: 'Ils composent votre numéro pro comme n’importe quel numéro. Votre téléphone sonne via l’app Joe, même verrouillé ou en veille, avec le nom du client affiché. S’ils laissent un message, vous recevez la transcription en texte.' },
  { q: 'La qualité des appels est-elle bonne ?', a: 'Oui — les appels passent en haute définition par internet, sur l’infrastructure télécom professionnelle qui équipe aussi les grands centres d’appels. En 4G/5G ou Wi-Fi, la qualité est au niveau d’un appel classique, souvent meilleure.' },
  { q: 'Puis-je essayer avant de payer ?', a: `Oui : 14 jours d'essai gratuit, sans carte bancaire. Vous créez votre compte, choisissez votre numéro et testez en conditions réelles. Vous n'activez l'abonnement que si Joe vous convient.` },
  { q: 'Y a-t-il un engagement ?', a: 'Aucun. L’abonnement est mensuel et se résilie en un clic depuis votre espace, sans préavis, sans frais cachés, sans appel à un service client pour vous retenir.' },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Landing() {
  const ref = useReveal();
  const [scrolled, setScrolled] = useState(false);
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);

  useEffect(() => {
    document.title = 'Joe — Ta ligne pro. Le numéro professionnel des artisans et indépendants.';
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    api.plans().then((r) => r?.plans?.length && setPlans(r.plans)).catch(() => {});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const signup = (plan?: string) => {
    window.location.href = plan ? `/app?signup=1&plan=${encodeURIComponent(plan)}` : '/app?signup=1';
  };

  const price = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 });

  return (
    <div className="lp" ref={ref}>
      {/* ===== Navigation ===== */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <span className="lp-logo-mark">📞</span> Joe
          </a>
          <div className="lp-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#comment">Comment ça marche</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">Questions</a>
          </div>
          <div className="lp-nav-cta">
            <a href="/app" className="lp-btn lp-btn-ghost lp-btn-nav">Se connecter</a>
            <button className="lp-btn lp-btn-primary lp-btn-nav" onClick={() => signup()}>
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* ===== Héro ===== */}
      <header className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div>
            <div className="lp-eyebrow reveal in">✨ La ligne pro des artisans &amp; indépendants</div>
            <h1 className="lp-h1 reveal in">
              Votre ligne pro.<br />
              <span className="grad">Dans votre poche.</span>
            </h1>
            <p className="lp-hero-sub reveal in d1">
              Un vrai numéro professionnel sur le téléphone que vous avez déjà.
              Sans deuxième mobile, sans carte SIM, sans engagement.
              Prêt en 5 minutes.
            </p>
            <div className="lp-hero-cta reveal in d2">
              <button className="lp-btn lp-btn-primary lg" onClick={() => signup()}>
                Essayer gratuitement 14 jours
              </button>
              <a href="#tarifs" className="lp-btn lp-btn-ghost lg">Voir les tarifs</a>
            </div>
            <div className="lp-hero-note reveal in d3">
              <span>✓ Sans carte bancaire</span>
              <span>✓ Sans engagement</span>
              <span>✓ Résiliable en 1 clic</span>
            </div>
          </div>

          {/* Maquette iPhone : appel entrant */}
          <div className="lp-phone-wrap reveal in d2">
            <div className="lp-phone">
              <div className="lp-screen">
                <div className="lp-notch" />
                <div className="lp-screen-time">9:41</div>
                <div className="lp-screen-avatar">👷</div>
                <div className="lp-screen-name">Martin Durand</div>
                <div className="lp-screen-num">+33 6 23 45 39 61 · Client</div>
                <div className="lp-screen-status">Appel entrant</div>
                <div className="lp-screen-actions">
                  <div className="lp-screen-btn red">✕</div>
                  <div className="lp-screen-btn green">✓</div>
                </div>
              </div>
            </div>
            <div className="lp-chip c1">
              <small>🎙️ Répondeur — transcrit</small>
              « Bonjour, c’est pour un devis de salle de bain… »
            </div>
            <div className="lp-chip c2">
              <small>🕓 Horaires</small>
              Après 19 h, Joe répond pour vous
            </div>
            <div className="lp-chip c3">
              <small>📇 Fiche client</small>
              3 appels · Devis envoyé le 12/06
            </div>
          </div>
        </div>

        {/* Bandeau métiers */}
        <div className="lp-container lp-trades reveal">
          <p>Déjà pensé pour tous les pros qui travaillent au téléphone</p>
          <div className="lp-trades-row">
            {TRADES.map((t) => <span key={t} className="lp-trade">{t}</span>)}
          </div>
        </div>
      </header>

      {/* ===== Pourquoi ===== */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Pourquoi Joe</p>
            <h2 className="lp-h2 reveal">Votre numéro perso n’est pas<br />votre vitrine.</h2>
            <p className="lp-lead reveal d1">
              Donner son 06 personnel à ses clients, c’est être dérangé le dimanche,
              rater des appels importants et paraître moins pro. Joe règle les trois.
            </p>
          </div>
          <div className="lp-why-grid">
            <div className="lp-why reveal">
              <div className="em">🧘</div>
              <h3>Séparez pro et perso</h3>
              <p>Une ligne dédiée à votre activité. Le soir, vous coupez la ligne pro — votre téléphone redevient le vôtre.</p>
            </div>
            <div className="lp-why reveal d1">
              <div className="em">📈</div>
              <h3>Ne ratez plus un client</h3>
              <p>Appel manqué = chantier perdu. Répondeur pro, transcription, notification : chaque appel laisse une trace, vous rappelez au bon moment.</p>
            </div>
            <div className="lp-why reveal d2">
              <div className="em">🏆</div>
              <h3>L’image d’une grande entreprise</h3>
              <p>Accueil professionnel, numéro dédié, rappel avec votre numéro pro : la crédibilité d’un vrai standard, sans le standard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Fonctionnalités ===== */}
      <section className="lp-section" id="fonctionnalites">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Fonctionnalités</p>
            <h2 className="lp-h2 reveal">Tout un standard téléphonique.<br />Dans une app.</h2>
          </div>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`lp-feat reveal d${i % 3}`}>
                <div className="lp-feat-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Comment ça marche ===== */}
      <section className="lp-section" id="comment">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Comment ça marche</p>
            <h2 className="lp-h2 reveal">En ligne en 5 minutes.<br />Vraiment.</h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step reveal">
              <div className="lp-step-num">1</div>
              <h3>Créez votre compte</h3>
              <p>Votre email, le nom de votre entreprise, c’est parti. L’essai de 14 jours démarre immédiatement, sans carte bancaire.</p>
              <span className="lp-step-time">⏱ 2 minutes</span>
            </div>
            <div className="lp-step reveal d1">
              <div className="lp-step-num">2</div>
              <h3>Choisissez votre numéro</h3>
              <p>Sélectionnez votre numéro pro français parmi ceux disponibles. Il est à vous, activé instantanément.</p>
              <span className="lp-step-time">⏱ 1 minute</span>
            </div>
            <div className="lp-step reveal d2">
              <div className="lp-step-num">3</div>
              <h3>Recevez vos appels</h3>
              <p>Téléchargez l’app, connectez-vous : votre ligne pro sonne dans votre poche. Répondeur et horaires déjà configurés.</p>
              <span className="lp-step-time">⏱ 2 minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Comparatif ===== */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Comparez</p>
            <h2 className="lp-h2 reveal">La bonne solution,<br />sans les inconvénients.</h2>
          </div>
          <div className="lp-compare reveal">
            <div className="lp-compare-scroll">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th className="joe-col">📞 Joe</th>
                    <th>Deuxième téléphone</th>
                    <th>Standard classique</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Prix</td>
                    <td className="joe-col">dès {price(plans[0]?.monthlyPrice ?? 14.99)} €/mois</td>
                    <td>téléphone + forfait</td>
                    <td>installation + abonnement</td>
                  </tr>
                  <tr>
                    <td>Mise en service</td>
                    <td className="joe-col">5 minutes</td>
                    <td>plusieurs jours</td>
                    <td>plusieurs semaines</td>
                  </tr>
                  <tr>
                    <td>Un seul appareil à gérer</td>
                    <td className="joe-col"><span className="yes">✓</span></td>
                    <td><span className="no">✕</span></td>
                    <td><span className="no">✕</span></td>
                  </tr>
                  <tr>
                    <td>Répondeur pro + transcription</td>
                    <td className="joe-col"><span className="yes">✓</span></td>
                    <td><span className="no">✕</span></td>
                    <td><span className="no">parfois</span></td>
                  </tr>
                  <tr>
                    <td>Horaires d’ouverture automatiques</td>
                    <td className="joe-col"><span className="yes">✓</span></td>
                    <td><span className="no">✕</span></td>
                    <td><span className="yes">✓</span></td>
                  </tr>
                  <tr>
                    <td>Sans engagement</td>
                    <td className="joe-col"><span className="yes">✓</span></td>
                    <td><span className="no">souvent 24 mois</span></td>
                    <td><span className="no">✕</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tarifs ===== */}
      <section className="lp-section" id="tarifs">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Tarifs</p>
            <h2 className="lp-h2 reveal">Simple. Sans surprise.</h2>
            <p className="lp-lead reveal d1">
              14 jours d’essai gratuit sur tous les forfaits, sans carte bancaire.
              Abonnement mensuel, résiliable à tout moment.
            </p>
          </div>
          <div className="lp-pricing-grid">
            {plans.map((p, i) => {
              const hot = i === 1;
              return (
                <div key={p.key} className={`lp-price${hot ? ' hot' : ''} reveal d${i}`}>
                  {hot && <div className="lp-price-badge">⭐ Le plus choisi</div>}
                  <div className="lp-price-name">{p.name}</div>
                  <div className="lp-price-amount">
                    <span className="n">{price(p.monthlyPrice)} €</span>
                    <span className="per">/ mois</span>
                  </div>
                  <div className="lp-price-min">{p.includedMinutes} minutes incluses</div>
                  <ul>
                    {(p.features || []).map((f: string) => <li key={f}>{f}</li>)}
                    <li>14 jours d’essai gratuit</li>
                  </ul>
                  <button
                    className={`lp-btn ${hot ? 'lp-btn-primary' : 'lp-btn-ghost'}`}
                    onClick={() => signup(p.key)}
                  >
                    Commencer avec {p.name}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="lp-pricing-note reveal">
            Paiement sécurisé par carte bancaire (Stripe) · Facture disponible chaque mois dans votre espace
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section" id="faq">
        <div className="lp-container">
          <div className="lp-center">
            <p className="lp-kicker reveal">Questions fréquentes</p>
            <h2 className="lp-h2 reveal">Tout ce qu’on nous demande.</h2>
          </div>
          <div className="lp-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} className={`reveal d${i % 3}`}>
                <summary>{f.q}</summary>
                <p className="a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="lp-final">
        <div className="lp-container">
          <div className="lp-final-card reveal">
            <h2>Prêt à passer pro ?</h2>
            <p>Votre ligne professionnelle en 5 minutes. 14 jours offerts pour l’essayer.</p>
            <button className="lp-btn lp-btn-white" onClick={() => signup()}>
              Créer ma ligne pro →
            </button>
            <p className="lp-final-note">Sans carte bancaire · Sans engagement · Résiliable en 1 clic</p>
          </div>
        </div>
      </section>

      {/* ===== Pied de page ===== */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div>
              <a href="/" className="lp-logo">
                <span className="lp-logo-mark">📞</span> Joe
              </a>
              <p>
                La ligne professionnelle des artisans, indépendants et petites entreprises.
                Un vrai numéro pro sur votre mobile, prêt en 5 minutes.
              </p>
            </div>
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <strong>Produit</strong>
                <a href="#fonctionnalites">Fonctionnalités</a>
                <a href="#tarifs">Tarifs</a>
                <a href="#faq">Questions fréquentes</a>
              </div>
              <div className="lp-footer-col">
                <strong>Compte</strong>
                <a href="/app?signup=1">Créer un compte</a>
                <a href="/app">Se connecter</a>
              </div>
            </div>
          </div>
          <div className="lp-copy">© {new Date().getFullYear()} Joe — Ta ligne pro. Tous droits réservés.</div>
        </div>
      </footer>
    </div>
  );
}
