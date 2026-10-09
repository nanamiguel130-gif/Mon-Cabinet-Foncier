# Mon Cabinet Foncier — socle Étape 1

Interface de démarrage responsive pour une application web progressive (PWA-ready), destinée à la gestion administrative d'un cabinet foncier au Cameroun.

## État de cette version
- Interface responsive ordinateur / tablette / mobile.
- Navigation d'interface et messages explicatifs de démonstration.
- Préparation Vite et configuration de déploiement Vercel.
- Aucun branchement Supabase.
- Aucune donnée réelle enregistrée ; les compteurs sont volontairement vides.
- Ce n'est pas encore une version prête pour la production.

## Lancer localement
Prérequis : Node.js LTS et npm.

```bash
npm install
npm run dev
```

## Vérifier la compilation
```bash
npm run build
npm run preview
```

## Déploiement Vercel
Importer le dépôt dans Vercel. Framework preset : Vite ; commande de build : `npm run build` ; répertoire de sortie : `dist`.

## Structure
```text
index.html
package.json
vercel.json
manifest.webmanifest
src/
  main.js
  styles.css
```

## Prochaine étape avant les données réelles
1. Vérifier le projet Supabase cible et l'organisation.
2. Présenter le schéma SQL, les rôles et les politiques RLS proposés.
3. Obtenir l'accord avant toute modification Supabase.
4. Implémenter l'authentification, les profils, les clients, les dossiers et le stockage privé.
5. Tester les politiques d'accès avec des comptes de rôles différents.

Ne jamais exposer de clé `service_role` ou de clé secrète dans le navigateur.
