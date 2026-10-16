const SUPABASE_URL = 'https://bljcjhrzmyckeiushxvk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jqK2PCgeLbWdloQQeYcsSA_m1eVtYxJ';

const PERMISSIONS = [
  ['clients', 'Clients'],
  ['dossiers', 'Dossiers fonciers'],
  ['tasks', 'Tâches et échéances'],
  ['documents', 'Documents'],
  ['finance', 'Finances']
];

const ROLES = [
  ['gestionnaire', 'Gestionnaire'],
  ['agent_foncier', 'Agent foncier'],
  ['comptabilite', 'Comptabilité']
];

function staffEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function staffRequest(action, payload = {}, accessToken = null) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/staff-access`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {})
      },
      body: JSON.stringify({ action, ...payload })
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || 'Une erreur est survenue.'
    );
  }

  return result;
}

function staffDefaultPermissions(role) {
  if (role === 'comptabilite') {
    return {
      clients: false,
      dossiers: false,
      tasks: false,
      documents: true,
      finance: true
    };
  }

  return {
    clients: true,
    dossiers: true,
    tasks: true,
    documents: true,
    finance: false
  };
}

function staffRoleOptions(selected) {
  return ROLES.map(([value, label]) => `
    <option value="${value}"
      ${selected === value ? 'selected' : ''}>
      ${label}
    </option>
  `).join('');
}

function staffPermissionInputs(permissions, userId = '') {
  return PERMISSIONS.map(([key, label]) => {
    const checked = permissions?.[key] === true;

    return `
      <label class="staff-permission">
        <input type="checkbox"
          data-permission="${key}"
          ${userId ? `id="perm-${userId}-${key}"` : ''}
          ${checked ? 'checked' : ''}>
        <span>${label}</span>
      </label>
    `;
  }).join('');
}

function staffDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('fr-FR');
}

export async function renderStaffModule({
  container,
  accessToken,
  onMessage = () => {}
}) {
  if (!container || !accessToken) {
    onMessage('Une session administratrice est nécessaire.');
    return;
  }

  container.innerHTML = `
    <style>
      .staff-page { display: grid; gap: 20px; }
      .staff-card {
        background: var(--card, #fff);
        border: 1px solid #dce5e1;
        border-radius: 14px;
        padding: 16px;
        min-width: 0;
      }
      .staff-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
      }
      .staff-page input:not([type=checkbox]),
      .staff-page select {
        box-sizing: border-box;
        width: 100%;
        padding: 11px;
        border: 1px solid #cbd5d1;
        border-radius: 8px;
        margin: 5px 0 12px;
        background: #fff;
        color: #19332e;
      }
      .staff-page label { display: block; }
      .staff-page .staff-permission {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin: 5px 12px 5px 0;
      }
      .staff-page .staff-permission input { width: auto; }
      .staff-page button {
        cursor: pointer;
        border: 1px solid #cbd5d1;
        border-radius: 8px;
        padding: 10px 13px;
        margin: 4px 5px 4px 0;
        background: #fff;
        color: #19332e;
      }
      .staff-page .staff-primary {
        background: #163b35;
        color: #fff;
        border-color: #163b35;
      }
      .staff-page .staff-muted { color: #63736e; font-size: 13px; }
      .staff-page .staff-message {
        padding: 12px;
        border-radius: 8px;
        background: #f1f5f3;
        overflow-wrap: anywhere;
      }
      .staff-page .staff-divider {
        border: 0;
        border-top: 1px solid #e1e8e5;
        margin: 14px 0;
      }
      .staff-page h2 { margin-top: 0; }
      .staff-page h3 { margin-bottom: 6px; }
      .staff-page .staff-status { font-weight: 600; }
      .staff-page .staff-small { font-size: 12px; }
    </style>

    <div class="staff-page" id="staff-page">
      <div>
        <p class="eyebrow">ADMINISTRATION</p>
        <h1>Personnel & accès</h1>
        <p class="subtitle">
          Gérez les comptes, les rôles et les autorisations du cabinet.
        </p>
      </div>

      <div id="staff-message" class="staff-message" role="status">
        Chargement du personnel…
      </div>

      <section class="staff-card">
        <h2>Inviter un employé</h2>
        <p class="staff-muted">
          Une invitation personnelle sera créée, valable 72 heures.
          Le lien pourra être transmis par WhatsApp.
        </p>

        <form id="staff-create-form">
          <label for="staff-name">Nom complet</label>
          <input id="staff-name" required minlength="2"
            maxlength="120" placeholder="Nom de l'employé">

          <label for="staff-phone">Numéro de téléphone international</label>
          <input id="staff-phone" required
            type="tel" placeholder="+2376XXXXXXXX"
            pattern="\\+[1-9][0-9]{7,14}">

          <label for="staff-role">Rôle</label>
          <select id="staff-role">
            ${staffRoleOptions('agent_foncier')}
          </select>

          <p><strong>Autorisations à accorder</strong></p>
          <div id="staff-create-permissions">
            ${staffPermissionInputs(staffDefaultPermissions('agent_foncier'))}
          </div>

          <button class="staff-primary" type="submit">
            Créer l'invitation
          </button>
        </form>

        <div id="staff-invitation-result"></div>
      </section>

      <section>
        <h2>Comptes du personnel</h2>
        <div id="staff-profiles" class="staff-grid"></div>
      </section>

      <section class="staff-card">
        <h2>Historique des invitations</h2>
        <div id="staff-invitations"></div>
      </section>
    </div>
  `;

  const page = container.querySelector('#staff-page');
  const message = page.querySelector('#staff-message');

  function setMessage(text) {
    message.textContent = text;
  }

  page.querySelector('#staff-role').addEventListener('change', event => {
    const defaults = staffDefaultPermissions(event.target.value);
    page.querySelector('#staff-create-permissions').innerHTML =
      staffPermissionInputs(defaults);
  });

  async function loadStaff() {
    setMessage('Chargement des comptes…');

    try {
      const data = await staffRequest('list', {}, accessToken);
      const profiles = data.profiles || [];
      const invitations = data.invitations || [];

      page.querySelector('#staff-profiles').innerHTML =
        profiles.map(profile => {
          const id = staffEscape(profile.user_id);
          const isAdmin = profile.is_admin === true;
          const status = profile.status === 'active'
            ? 'Actif'
            : 'Suspendu';
          const permissions = profile.permissions || {};

          return `
            <article class="staff-card"
              data-profile-card="${id}">
              <h3>${staffEscape(profile.display_name)}</h3>
              <p>${staffEscape(profile.phone)}</p>
              <p class="staff-muted">
                Rôle : ${staffEscape(profile.role)}
              </p>
              <p class="staff-status">
                Statut : ${status}
              </p>

              ${isAdmin ? `
                <p class="staff-message">
                  Administratrice principale — compte protégé.
                </p>
              ` : `
                <label>
                  Rôle
                  <select data-role-for="${id}">
                    ${staffRoleOptions(profile.role)}
                  </select>
                </label>

                <p><strong>Permissions</strong></p>
                ${staffPermissionInputs(permissions, id)}

                <div>
                  <button class="staff-primary staff-save"
                    data-user-id="${id}">
                    Enregistrer les droits
                  </button>

                  <button class="staff-status-button"
                    data-user-id="${id}"
                    data-status="${profile.status === 'active'
                      ? 'suspended' : 'active'}">
                    ${profile.status === 'active'
                      ? 'Suspendre' : 'Réactiver'}
                  </button>
                </div>
              `}

              <p class="staff-muted staff-small">
                Créé le ${staffDate(profile.created_at)}
              </p>
            </article>
          `;
        }).join('') || '<p>Aucun profil trouvé.</p>';

      page.querySelector('#staff-invitations').innerHTML =
        invitations.map(invitation => {
          let status = 'En attente';

          if (invitation.accepted_at) {
            status = 'Acceptée';
          } else if (
            new Date(invitation.expires_at).getTime() < Date.now()
          ) {
            status = 'Expirée';
          }

          return `
            <div>
              <strong>${staffEscape(invitation.display_name)}</strong>
              — ${staffEscape(invitation.phone)}
              <p class="staff-muted">
                Rôle : ${staffEscape(invitation.role)}
                · ${status}
              </p>
              <p class="staff-muted">
                Expiration : ${staffDate(invitation.expires_at)}
              </p>
              <hr class="staff-divider">
            </div>
          `;
        }).join('') || '<p>Aucune invitation.</p>';

      setMessage('Les données du personnel ont été chargées.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  page.querySelector('#staff-create-form')
    .addEventListener('submit', async event => {
      event.preventDefault();

      const name = page.querySelector('#staff-name').value.trim();
      const phone = page.querySelector('#staff-phone').value.trim();
      const role = page.querySelector('#staff-role').value;
      const permissions = {};

      page.querySelectorAll(
        '#staff-create-permissions [data-permission]'
      ).forEach(input => {
        permissions[input.dataset.permission] = input.checked;
      });

      const resultBox = page.querySelector('#staff-invitation-result');
      resultBox.textContent = 'Création de l’invitation…';

      try {
        const result = await staffRequest('create', {
          display_name: name,
          phone,
          role,
          permissions
        }, accessToken);

        const invitationUrl =
          `${window.location.origin}${window.location.pathname}` +
          `#invite=${result.token}`;

        const messageText =
          `Bonjour ${name}, voici ton invitation pour Mon Cabinet Foncier : ` +
          invitationUrl +
          `. Elle expire dans 72 heures. Ouvre le lien et crée ton mot de passe personnel.`;

        const whatsappUrl =
          `https://wa.me/${phone.replace(/\\D/g, '')}` +
          `?text=${encodeURIComponent(messageText)}`;

        resultBox.innerHTML = `
          <div class="staff-message">
            <strong>Invitation créée.</strong>
            <p>Transmets ce lien uniquement à l'employé concerné :</p>
            <p><a href="${staffEscape(invitationUrl)}">
              Ouvrir le lien d'invitation
            </a></p>
            <button type="button" id="staff-copy-link">
              Copier le lien
            </button>
            <a href="${staffEscape(whatsappUrl)}"
              target="_blank" rel="noopener noreferrer">
              <button type="button">Envoyer par WhatsApp</button>
            </a>
            <p class="staff-muted">
              Le lien donne accès à la création du compte. Ne le publie pas
              dans un groupe et ne le partage pas avec d'autres personnes.
            </p>
          </div>
        `;

        resultBox.querySelector('#staff-copy-link')
          .addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(invitationUrl);
              onMessage('Lien copié.');
            } catch {
              onMessage('Copie impossible. Sélectionne le lien pour le copier.');
            }
          });

        page.querySelector('#staff-create-form').reset();
        page.querySelector('#staff-create-permissions').innerHTML =
          staffPermissionInputs(staffDefaultPermissions('agent_foncier'));

        await loadStaff();
      } catch (error) {
        resultBox.textContent = error.message;
      }
    });

  page.querySelector('#staff-profiles')
    .addEventListener('click', async event => {
      const saveButton = event.target.closest('.staff-save');
      const statusButton = event.target.closest('.staff-status-button');

      if (saveButton) {
        const userId = saveButton.dataset.userId;
        const card = page.querySelector(
          `[data-profile-card="${userId}"]`
        );
        const role = card.querySelector(
          `[data-role-for="${userId}"]`
        ).value;
        const permissions = {};

        card.querySelectorAll('[data-permission]').forEach(input => {
          permissions[input.dataset.permission] = input.checked;
        });

        saveButton.disabled = true;

        try {
          const result = await staffRequest('update', {
            user_id: userId,
            role,
            permissions
          }, accessToken);

          onMessage(result.message || 'Permissions enregistrées.');
          await loadStaff();
        } catch (error) {
          onMessage(error.message);
        } finally {
          saveButton.disabled = false;
        }
      }

      if (statusButton) {
        const userId = statusButton.dataset.userId;
        const status = statusButton.dataset.status;
        const actionText = status === 'suspended'
          ? 'suspendre ce compte'
          : 'réactiver ce compte';

        if (!confirm(`Confirmer : ${actionText} ?`)) return;

        statusButton.disabled = true;

        try {
          const result = await staffRequest('status', {
            user_id: userId,
            status
          }, accessToken);

          onMessage(result.message || 'Statut mis à jour.');
          await loadStaff();
        } catch (error) {
          onMessage(error.message);
        } finally {
          statusButton.disabled = false;
        }
      }
    });

  await loadStaff();
}

export function renderInviteAcceptance(token) {
  const app = document.querySelector('#app');

  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <h1>Activer mon compte employé</h1>
        <p class="auth-subtitle">
          Crée un mot de passe personnel pour terminer ton inscription.
        </p>

        <form id="staff-accept-form">
          <label for="staff-new-password">Nouveau mot de passe</label>
          <input id="staff-new-password" type="password"
            minlength="10" maxlength="128"
            autocomplete="new-password" required>

          <label for="staff-confirm-password">
            Confirmer le mot de passe
          </label>
          <input id="staff-confirm-password" type="password"
            minlength="10" maxlength="128"
            autocomplete="new-password" required>

          <button class="primary" type="submit">
            Activer mon compte
          </button>
        </form>

        <p id="staff-accept-message"
          class="auth-message" role="status" aria-live="polite"></p>
      </section>
    </main>
  `;

  const form = app.querySelector('#staff-accept-form');
  const message = app.querySelector('#staff-accept-message');

  if (!/^[a-f0-9]{64}$/.test(token)) {
    form.hidden = true;
    message.textContent = 'Ce lien d’invitation est invalide.';
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const password =
      app.querySelector('#staff-new-password').value;
    const confirmation =
      app.querySelector('#staff-confirm-password').value;

    if (password.length < 10) {
      message.textContent =
        'Choisis un mot de passe de 10 caractères minimum.';
      return;
    }

    if (password !== confirmation) {
      message.textContent =
        'Les deux mots de passe ne correspondent pas.';
      return;
    }

    message.textContent = 'Activation en cours…';

    try {
      const result = await staffRequest('accept', {
        token,
        password
      });

      form.hidden = true;
      message.textContent =
        result.message || 'Compte créé. Tu peux maintenant te connecter.';

      const backButton = document.createElement('button');
      backButton.type = 'button';
      backButton.className = 'primary';
      backButton.textContent = 'Retour à la connexion';
      backButton.addEventListener('click', () => {
        window.location.hash = '';
        window.location.reload();
      });

      app.querySelector('.auth-card').appendChild(backButton);
    } catch (error) {
      message.textContent = error.message;
    }
  });
                            }
