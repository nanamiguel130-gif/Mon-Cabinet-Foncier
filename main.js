import './styles.css';

const SUPABASE_URL = 'https://bljcjhrzmyckeiushxvk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jqK2PCgeLbWdloQQeYcsSA_m1eVtYxJ';

let authMode = 'login';
let pendingPhone = '';
let pendingName = '';
let otpRequested = false;
let activeAccessToken = null;

function authHeaders(token) {
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
      data.msg || data.message || data.error_description ||
      data.error || 'Une erreur est survenue.'
    );
  }
  return data;
}

function renderAuth(mode = 'login') {
  authMode = mode;
  otpRequested = false;
  pendingPhone = '';
  pendingName = '';

  document.querySelector('#app').innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <a class="brand auth-brand" href="#">
          <span class="brand-mark">MC</span>
          <span><strong>Mon Cabinet</strong><small>FONCIER</small></span>
        </a>

        <p class="eyebrow">ESPACE SÉCURISÉ</p>
        <h1>${mode === 'setup' ? 'Premier compte administrateur' : 'Connexion'}</h1>
        <p class="auth-subtitle">
          ${mode === 'setup'
            ? 'Réservé à la responsable du cabinet. Son numéro doit être vérifié.'
            : 'Connectez-vous avec votre numéro de téléphone.'}
        </p>

        <form id="auth-form">
          ${mode === 'setup' ? `
            <label for="auth-name">Nom complet de maman</label>
            <input id="auth-name" name="name" autocomplete="name"
              placeholder="Nom complet" required>
          ` : ''}

          <label for="auth-phone">Numéro de téléphone</label>
          <input id="auth-phone" name="phone" type="tel"
            inputmode="tel" autocomplete="tel"
            value="${mode === 'setup' ? '+237699171824' : ''}"
            placeholder="+237 6XX XX XX XX"
            ${mode === 'setup' ? 'readonly' : ''}
            required>

          <div id="code-area" ${otpRequested ? '' : 'hidden'}>
            <label for="auth-code">Code reçu par SMS</label>
            <input id="auth-code" name="code" inputmode="numeric"
              autocomplete="one-time-code" placeholder="Code de vérification">
          </div>

          <button class="primary auth-submit" id="send-code" type="submit">
            Envoyer le code SMS
          </button>

          <button class="secondary auth-secondary" id="verify-code"
            type="button" hidden>
            Vérifier le code et continuer
          </button>
        </form>

        <button class="text-button auth-back" id="switch-mode" type="button">
          ${mode === 'setup'
            ? '← Retour à la connexion'
            : 'Première utilisation : créer le compte administrateur'}
        </button>

        <p class="security-note">
          Les comptes du personnel seront accessibles uniquement sur invitation.
          Ne communiquez jamais votre code de vérification.
        </p>
        <div class="auth-message" id="auth-message"
          role="status" aria-live="polite"></div>
      </section>
    </main>
  `;

  document.querySelector('#auth-form').addEventListener('submit', requestAuthCode);
  document.querySelector('#verify-code').addEventListener('click', verifyAuthCode);

  document.querySelector('#switch-mode').addEventListener('click', () => {
    renderAuth(mode === 'setup' ? 'login' : 'setup');
  });
}

function authMessage(message) {
  const node = document.querySelector('#auth-message');
  if (node) node.textContent = message;
}

async function requestAuthCode(event) {
  event.preventDefault();

  const phone = document.querySelector('#auth-phone').value.trim();
  const name = document.querySelector('#auth-name')?.value.trim() || '';

  if (!phone) {
    authMessage('Saisis ton numéro de téléphone.');
    return;
  }

  if (authMode === 'setup' && name.length < 2) {
    authMessage('Saisis le nom complet de l’administratrice.');
    return;
  }

  pendingPhone = phone;
  pendingName = name;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        phone: pendingPhone,
        create_user: authMode === 'setup'
      })
    });

    await readResponse(response);
    otpRequested = true;

    document.querySelector('#code-area').hidden = false;
    document.querySelector('#verify-code').hidden = false;
    document.querySelector('#send-code').textContent = 'Renvoyer le code SMS';

    authMessage('Code demandé. Vérifie les SMS reçus avant de continuer.');
  } catch (error) {
    authMessage(
      `Envoi impossible : ${error.message}. Vérifie la configuration SMS de Supabase.`
    );
  }
}

async function verifyAuthCode() {
  const code = document.querySelector('#auth-code')?.value.trim();

  if (!otpRequested || !code) {
    authMessage('Demande d’abord un code, puis saisis-le.');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        phone: pendingPhone,
        token: code,
        type: 'sms'
      })
    });

    const session = await readResponse(response);

    if (!session.access_token || !session.user?.id) {
      throw new Error('Supabase n’a pas retourné de session valide.');
    }

    activeAccessToken = session.access_token;

    if (authMode === 'setup') {
      const bootstrapResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/bootstrap-admin`,
        {
          method: 'POST',
          headers: authHeaders(activeAccessToken),
          body: JSON.stringify({ display_name: pendingName })
        }
      );

      await readResponse(bootstrapResponse);

      openAdminDashboard({
        display_name: pendingName,
        role: 'administratrice'
      });
      return;
    }

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
      activeAccessToken = null;
      throw new Error(
        'Aucun profil actif associé à ce compte. Demande une invitation à la responsable.'
      );
    }

    if (!profile.is_admin) {
      activeAccessToken = null;
      throw new Error(
        'L’espace du personnel n’est pas encore activé. L’accès administrateur est refusé.'
      );
    }

    openAdminDashboard(profile);
  } catch (error) {
    authMessage(`Connexion non terminée : ${error.message}`);
  }
}

function openAdminDashboard(profile) {
  // Affiche le tableau de bord existant uniquement après authentification.
  render();

  const name = document.querySelector('.sidebar-bottom b');
  const role = document.querySelector('.sidebar-bottom small');
  const secureLabel = document.querySelector('.secure-label');

  if (name) name.textContent = profile.display_name || 'Administratrice';
  if (role) role.textContent = profile.role || 'Administratrice';
  if (secureLabel) secureLabel.textContent = '● Session sécurisée';

  const actions = document.querySelector('.top-actions');
  if (actions) {
    actions.insertAdjacentHTML(
      'beforeend',
      '<button class="auth-logout" id="logout-button" type="button">Déconnexion</button>'
    );
  }

  document.querySelector('#logout-button')?.addEventListener('click', async () => {
    try {
      if (activeAccessToken) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: authHeaders(activeAccessToken)
        });
      }
    } finally {
      activeAccessToken = null;
      renderAuth('login');
    }
  });
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
render();
