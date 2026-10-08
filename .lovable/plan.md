# Onglet « Contrat » dans Détails de la réservation

## Objectif

Ajouter un 4e onglet **Contrat** dans la fenêtre « Détails de la réservation » (à côté de Détails / Paiements / E-mails). Il affiche les champs du locataire prêts à copier pour remplir un contrat, chacun avec un petit bouton « copier ».

## Champs affichés (chacun avec bouton copier)

1. Prénom
2. Nom
3. Téléphone
4. E-mail
5. Rue et numéro (regroupés sur une seule valeur, ex. « Rue principale 12A »)
6. Code postal et ville (regroupés, ex. « 75001 Paris »)

## Comportement

- Les valeurs viennent du locataire lié à la réservation (`tenants` via `pricing_breakdown.tenant_id`, déjà chargé dans la fenêtre). S'il n'y a pas de locataire : repli sur les champs de la réservation (nom complet scindé en prénom/nom, e-mail, téléphone) et champs vides sinon.
- Le bouton copier copie la valeur dans le presse-papiers, affiche une coche et un message « Copié » (comme le bouton « Portail client » existant).
- Un bouton « Copier tout » en haut copie toutes les valeurs d'un coup (une par ligne), pratique pour coller dans un document de contrat.
- Si le locataire n'a pas encore ce champ, le bouton copier est grisé et la valeur affiche « — ».
- La navigation entre onglets reste tactile sur mobile (le nouvel onglet s'ajoute à l'ordre de glissement).

## Fichier modifié

- `src/components/host/BookingDetailDialog.tsx` — ajout de l'onglet « Contrat » (Déclencheur avec icône fichier, contenu listant les 6 champs avec boutons copier, bouton « Copier tout », gestion du presse-papiers).

Aucun changement de base de données ni de logique métier : lecture seule des données déjà disponibles.
