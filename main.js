import './styles.css';

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
