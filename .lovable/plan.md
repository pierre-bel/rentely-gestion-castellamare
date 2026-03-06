

## Portail Client par Réservation

C'est tout à fait faisable et pas particulièrement compliqué. L'idée : chaque réservation a un lien unique (ex: `votresite.com/portal/ABC123`) accessible **sans connexion**, qui affiche un mini-portail avec toutes les infos du séjour.

### Comment ça marche

1. **Token d'accès unique par réservation** -- Ajouter une colonne `access_token` (texte unique, généré automatiquement) à la table `bookings`. Ce token sert de "mot de passe" pour accéder au portail sans authentification.

2. **Vue publique sécurisée** -- Créer une vue SQL `public_booking_portal` qui expose uniquement les données nécessaires (dates, adresse, prix, règles, etc.) en joignant `bookings` + `listings`, accessible via le token uniquement.

3. **Page portail** -- Nouvelle page `/portal/:token` (route publique, pas de Navbar ni auth requise) qui affiche :
   - Titre et photo du bien
   - Dates check-in / check-out avec horaires
   - Adresse complète + carte
   - Nombre de guests
   - Récapitulatif prix / paiements
   - Règles de la maison
   - Statut de la réservation
   - Code d'accès (igloohome_code) si configuré
   - Échéancier de paiement (depuis `booking_payment_items`)

4. **Génération du token** -- Trigger SQL `before insert` sur `bookings` qui génère automatiquement un token aléatoire (ex: `encode(gen_random_bytes(16), 'hex')`).

5. **Lien partageable côté hôte** -- Dans le détail d'une réservation (BookingDetailDialog), afficher le lien du portail avec un bouton "Copier le lien" pour l'envoyer au locataire.

### Fichiers concernés

- **Migration SQL** : ajouter `access_token` à `bookings`, créer la vue `public_booking_portal`, trigger de génération auto
- **Nouveau** : `src/pages/BookingPortal.tsx` -- la page portail publique
- **Modifier** : `src/App.tsx` -- ajouter la route `/portal/:token`
- **Modifier** : `src/components/host/BookingDetailDialog.tsx` -- ajouter le lien partageable

