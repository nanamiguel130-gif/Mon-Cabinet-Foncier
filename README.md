# Mon Cabinet Foncier

Plateforme professionnelle de gestion et de suivi d'un cabinet foncier.

## Objectif

Mon Cabinet Foncier centralise les activités de la structure dans une seule application.

L'application est conçue autour d'une administration principale dirigée par Maman.

## Principaux modules

- Direction
- Gestion du personnel
- Services
- Postes
- Rôles
- Permissions
- Responsabilités
- Dossiers fonciers
- Documents
- Procédures
- Finances
- Avances sur salaire
- Paie
- Bulletins de salaire
- Signature de réception
- Notifications
- Vidéosurveillance
- Journal d'audit

## Architecture

L'application utilise :

- GitHub pour le code source
- Supabase pour l'authentification et la base de données
- Vercel pour le déploiement

## Sécurité

Les accès seront contrôlés à plusieurs niveaux :

Authentification
→ Profil
→ Rôle
→ Permissions
→ Espace autorisé
→ Données autorisées
→ Journal d'audit

Aucune clé `service_role` ne doit être placée dans le frontend.

Les données sensibles devront être protégées par les politiques RLS de Supabase.

## Administratrice principale

Maman contrôle :

- la configuration de la structure ;
- les employés ;
- les services ;
- les postes ;
- les responsabilités ;
- les permissions ;
- les finances ;
- les avances ;
- la paie ;
- la vidéosurveillance ;
- les journaux d'audit.

## Activation des employés

Le processus prévu est :

1. Maman crée l'employé.
2. Le numéro de téléphone personnel est enregistré.
3. Un code temporaire d'activation est envoyé.
4. L'employé communique le code à Maman.
5. Maman valide l'activation.
6. L'employé configure son compte.
7. L'employé crée lui-même son mot de passe.
8. Le compte devient actif.

Le mot de passe n'est jamais communiqué à Maman.

## Connexion

Après activation, l'employé pourra se connecter avec :

- téléphone + mot de passe ;
- ou adresse e-mail/Gmail + mot de passe.

## Paie

Le processus prévu est :

Paie préparée
→ Paie validée
→ Paiement enregistré
→ Bulletin délivré
→ Réception signée

La signature de réception confirme la réception du salaire et ne modifie pas le montant payé.

## Déploiement

Le dépôt est destiné à être déployé sur Vercel.

## État

Version 1 — architecture initiale.
