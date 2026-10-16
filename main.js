
import './styles.css';
import {
  renderStaffModule,
  renderInviteAcceptance
} from './staff.js';

const SUPABASE_URL = 'https://bljcjhrzmyckeiushxvk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jqK2PCgeLbWdloQQeYcsSA_m1eVtYxJ';
const ADMIN_PHONE = '+237699171824';

let activeAccessToken = null;
let activeProfile = null;

function authHeaders(token = null) {
  return {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.msg ||
      data.message ||
      data.error_description ||
      data.error ||
      'Une erreur est survenue.'
    );
  }

  return data;
}

function authMessage(message) {
  const node = document.querySelector('#auth-message');
  if (node) node.textContent = message;
}

function renderAuth(mode = 'login') {
  document.querySelector('#app').innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <a class="brand auth-brand" href="#">
          <span class="brand-mark">MC</span>
          <span><strong>Mon Cabinet</strong><small>FONCIER</small></span>
        </a>

        <p class="eyebrow">ESPACE SÉCURISÉ</p>
        <h1>${mode === 'setup' ? 'Créer le compte administrateur' : 'Connexion'}</h1>

        <p class="auth-subtitle">
          ${mode === 'setup'
            ? 'Première activation réservée à la responsable du cabinet.'
            : 'Connectez-vous avec votre adresse e-mail et votre mot de passe.'}
        </p>

        <form id="auth-form">
          ${mode === 'setup' ? `
            <label for="auth-name">Nom complet de maman</label>
            <input id="auth-name" name="name"
              autocomplete="name" placeholder="Nom complet" required>

            <label for="bootstrap-code">Code d’activation administrateur</label>
            <input id="bootstrap-code" name="bootstrap_code"
              autocomplete="off" placeholder="Code fourni séparément"
              required>
          ` : ''}

<label for="auth-email">
  ${mode === 'setup'
    ? 'Adresse e-mail'
    : 'Téléphone ou adresse e-mail'}
</label>

<input id="auth-email" name="email"
  type="${mode === 'setup' ? 'email' : 'text'}"
  autocomplete="${mode === 'setup' ? 'email' : 'username'}"
  placeholder="${mode === 'setup'
    ? 'Adresse e-mail personnelle'
    : '+2376XXXXXXXX ou adresse e-mail'}"
  required>
          <label for="auth-password">Mot de passe</label>
          <input id="auth-password" name="password" type="password"
            autocomplete="${mode === 'setup' ? 'new-password' : 'current-password'}"
            minlength="8" placeholder="Au moins 8 caractères" required>

          <button class="primary auth-submit" type="submit">
            ${mode === 'setup' ? 'Créer le compte' : 'Se connecter'}
          </button>
        </form>

        <button class="text-button auth-back" id="switch-mode" type="button">
          ${mode === 'setup'
            ? '← Retour à la connexion'
            : 'Première utilisation : activer le compte administrateur'}
        </button>

        <p class="security-note">
          Le compte administrateur est réservé à la responsable du cabinet.
          Le personnel devra recevoir une invitation.
        </p>

        <div class="auth-message" id="auth-message"
          role="status" aria-live="polite"></div>
      </section>
    </main>
  `;

  document.querySelector('#auth-form')
    .addEventListener('submit', event => handleAuth(event, mode));

  document.querySelector('#switch-mode').addEventListener('click', () => {
    renderAuth(mode === 'setup' ? 'login' : 'setup');
  });
}

async function handleAuth(event, mode) {
  event.preventDefault();

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  const name = document.querySelector('#auth-name')?.value.trim() || '';
  const bootstrapCode =
    document.querySelector('#bootstrap-code')?.value.trim() || '';

  if (mode === 'setup' && name.length < 2) {
    authMessage('Saisis le nom complet de la responsable.');
    return;
  }

  if (mode === 'setup' && !bootstrapCode) {
    authMessage('Le code d’activation est obligatoire.');
    return;
  }

  authMessage('Connexion en cours…');

  try {
    let session;

if (mode === 'setup') {
  // 1. Essayer d'abord de connecter un compte déjà créé.
  try {
    const loginResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: authHeaders(),
body: JSON.stringify(
  /^\+[1-9]\d{7,14}$/.test(email)
    ? { phone: email, password }
    : { email, password }
);

    session = await readResponse(loginResponse);
  } catch {
    session = null;
  }

  // 2. Si aucun compte ne peut être connecté, tenter l'inscription.
  if (!session?.access_token) {
    try {
      const signupResponse = await fetch(
        `${SUPABASE_URL}/auth/v1/signup`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            email,
            password,
            data: {
              display_name: name,
              phone: ADMIN_PHONE
            }
          })
        }
      );

      session = await readResponse(signupResponse);
    } catch (error) {
      throw new Error(
        "Connexion ou inscription impossible. Si tu avais déjà " +
        "commencé l'inscription, confirme d'abord ton adresse e-mail, " +
        "puis réessaie avec le même e-mail et le même mot de passe. " +
        "Vérifie aussi tes identifiants. Détail : " + error.message
      );
    }

    // 3. Si la confirmation par e-mail est nécessaire, attendre.
    if (!session?.access_token) {
      authMessage(
        "Vérifie ta boîte e-mail et confirme ton adresse. " +
        "Reviens ensuite sur cette page et saisis le même e-mail, " +
        "le même mot de passe, ton nom complet et le code d'activation."
      );
      return;
    }
  }

  if (!session.user?.id) {
    throw new Error("Le compte n'a pas pu être vérifié.");
  }

  // 4. Envoyer le code au serveur sécurisé pour activer l'administratrice.
  activeAccessToken = session.access_token;

  const activationResponse = await fetch(
    `${SUPABASE_URL}/functions/v1/bootstrap-admin`,
    {
      method: 'POST',
      headers: authHeaders(activeAccessToken),
      body: JSON.stringify({
        display_name: name,
        bootstrap_code: bootstrapCode
      })
    }
  );

  await readResponse(activationResponse);

  // 5. Afficher l'espace administrateur après confirmation du serveur.
  openAdminDashboard({
    display_name: name,
    role: 'Administratrice',
    is_admin: true,
    status: 'active'
  });

  return;
}

    const loginResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, password })
      }
    );

    session = await readResponse(loginResponse);

    if (!session.access_token || !session.user?.id) {
      throw new Error('Session de connexion invalide.');
    }

    activeAccessToken = session.access_token;

    const profileUrl = new URL(
      `${SUPABASE_URL}/rest/v1/staff_profiles`
    );

    profileUrl.searchParams.set(
      'select',
      'user_id,display_name,role,is_admin,status'
    );
    profileUrl.searchParams.set('user_id', `eq.${session.user.id}`);

    const profileResponse = await fetch(profileUrl, {
      headers: authHeaders(activeAccessToken)
    });

    const profiles = await readResponse(profileResponse);
    const profile = profiles[0];

    if (!profile || profile.status !== 'active') {
      throw new Error(
        'Aucun profil actif trouvé. L’accès doit être autorisé par la responsable.'
      );
    }

openAdminDashboard(profile);

  } catch (error) {
    activeAccessToken = null;
    authMessage(`Opération non terminée : ${error.message}`);
  }
}

function openAdminDashboard(profile) {
  activeProfile = profile;
  render();
  const name = document.querySelector('.sidebar-bottom b');
  const role = document.querySelector('.sidebar-bottom small');
  const secureLabel = document.querySelector('.secure-label');

  if (name) name.textContent = profile.display_name || 'Administratrice';
  if (role) role.textContent = profile.role || 'Administratrice';
  if (secureLabel) secureLabel.textContent = '● Session authentifiée';

  const actions = document.querySelector('.top-actions');

  if (actions && !document.querySelector('#logout-button')) {
    actions.insertAdjacentHTML(
      'beforeend',
      '<button class="auth-logout" id="logout-button" type="button">Déconnexion</button>'
    );
  }

  document.querySelector('#logout-button')?.addEventListener(
    'click',
    async () => {
      try {
        if (activeAccessToken) {
          await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: authHeaders(activeAccessToken)
          });
        }
      } finally {
activeAccessToken = null;
activeProfile = null;
renderAuth('login');
      }
    }
  );
}


const stats = [
  { label: 'Dossiers ouverts', value: '—', note: 'Connecter la base de données pour afficher les chiffres' },
  { label: 'À traiter', value: '—', note: 'Dossiers en attente de traitement' },
  { label: 'Pièces manquantes', value: '—', note: 'À relancer auprès des clients' },
  { label: 'À valider', value: '—', note: 'En attente de contrôle de la responsable' },
];

const navItems = [
  ['dashboard', 'Vue d’ensemble', '⌂'],
  ['clients', 'Clients', '♙'],
  ['dossiers', 'Dossiers fonciers', '▤'],
  ['tasks', 'Tâches & échéances', '◷'],
  ['documents', 'Documents', '▧'],
  ['finance', 'Finances', '₣'],
  ['team', 'Personnel & accès', '♧'],
  ['settings', 'Paramètres', '⚙'],
];

function render() {
  document.querySelector('#app').innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="Accueil Mon Cabinet Foncier">
          <span class="brand-mark">MC</span>
          <span><strong>Mon Cabinet</strong><small>FONCIER</small></span>
        </a>
        <div class="workspace"><span class="workspace-dot"></span><span><b>Espace cabinet</b><small>Configuration initiale</small></span></div>
        <nav aria-label="Navigation principale">
          <p class="nav-caption">ESPACE DE TRAVAIL</p>
          ${navItems.map(([id,label,icon],i)=>`<button class="nav-item ${i===0?'active':''}" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join('')}
        </nav>
        <div class="sidebar-bottom"><span class="avatar">MC</span><span><b>Administratrice</b><small>Mode de démonstration</small></span></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="menu-toggle" id="menu-toggle" aria-label="Ouvrir le menu">☰</button>
          <div class="crumb">Cabinet <span>/</span> Vue d’ensemble</div>
          <div class="top-actions"><span class="secure-label">● Données non connectées</span><button class="profile-button" aria-label="Profil">MC</button></div>
        </header>
        <section class="content">
          <div class="welcome-row">
            <div><p class="eyebrow">ESPACE DE PILOTAGE</p><h1>Vue d’ensemble</h1><p class="subtitle">Suivez l’activité du cabinet et les dossiers à traiter.</p></div>
            <button class="primary" id="new-case">＋ Nouveau dossier</button>
          </div>
          <div class="notice"><span class="notice-icon">i</span><div><b>Version de préparation — aucune donnée réelle n’est enregistrée.</b><p>Cette interface est une base de travail. L’authentification, la base de données et les autorisations devront être configurées avant un usage réel.</p></div></div>
          <div class="stats-grid">${stats.map(s=>`<article class="stat-card"><p>${s.label}</p><strong>${s.value}</strong><small>${s.note}</small></article>`).join('')}</div>
          <div class="section-grid">
            <section class="panel">
              <div class="panel-head"><div><h2>Dossiers récents</h2><p>Les dossiers s’afficheront ici après connexion à la base.</p></div><button class="text-button" data-page="dossiers">Voir les dossiers →</button></div>
              <div class="empty-state"><div class="empty-icon">▤</div><b>Aucun dossier à afficher</b><p>Les dossiers enregistrés apparaîtront dans cette liste.</p><button class="secondary" id="empty-new-case">Créer un dossier de démonstration</button></div>
            </section>
            <section class="panel quick-panel">
              <div class="panel-head"><div><h2>Accès rapides</h2><p>Les actions principales du cabinet.</p></div></div>
              <button class="quick-link" data-page="clients"><span class="quick-icon">♙</span><span><b>Enregistrer un client</b><small>Coordonnées et demande</small></span><span class="arrow">→</span></button>
              <button class="quick-link" data-page="dossiers"><span class="quick-icon">▤</span><span><b>Consulter les dossiers</b><small>Suivi et pièces du dossier</small></span><span class="arrow">→</span></button>
              <button class="quick-link" data-page="tasks"><span class="quick-icon">◷</span><span><b>Voir les échéances</b><small>Tâches et prochaines actions</small></span><span class="arrow">→</span></button>
              <button class="quick-link" data-page="team"><span class="quick-icon">♧</span><span><b>Gérer le personnel</b><small>Rôles et accès</small></span><span class="arrow">→</span></button>
            </section>
          </div>
          <footer>Mon Cabinet Foncier <span>•</span> Étape 1 — socle d’interface <span>•</span> Ne pas utiliser pour des dossiers réels</footer>
        </section>
      </main>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
    const page = navItems.find(item => item[0] === btn.dataset.page);
    showToast(`${page ? page[1] : 'Section'} : module prévu dans une prochaine étape.`);
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === btn.dataset.page));
  }));
  ['new-case','empty-new-case'].forEach(id => document.getElementById(id)?.addEventListener('click', () => showToast('Le formulaire sera activé après validation du modèle de données et des droits d’accès.')));
  document.getElementById('menu-toggle')?.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}
renderAuth('login');
