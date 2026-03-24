

## Plan: Corriger le calendrier partagé, la simulation tarifaire et l'envoi de messages

### Problèmes identifiés

1. **Page `/disponibilites` (PublicAvailability)** — C'est un calendrier basique sans simulateur de prix, sans formulaire de contact, et sans calcul tarifaire. Toutes ces fonctionnalités existent déjà dans `EmbedAllAvailability.tsx` mais n'ont jamais été portées sur la page publique.

2. **Tarification weekend** — La logique dans `pricingUtils.ts` est correcte : une réservation Ven+Sam applique bien le `weekend_rate`. Aucun bug ici.

3. **Envoi de messages (formulaire de demande)** — Le formulaire `BookingInquiryForm` et l'edge function `send-booking-inquiry` sont fonctionnels. Mais ils ne sont accessibles que depuis l'embed (`/embed/availability/all/:hostId`), pas depuis la page publique `/disponibilites`.

4. **Page publique ne connaît pas le `hostId`** — Sans hostId, impossible de charger les tarifs hebdomadaires, les vacances scolaires, ou d'envoyer une demande de contact.

### Solution

Refondre `PublicAvailability.tsx` pour y intégrer les mêmes fonctionnalités que `EmbedAllAvailability.tsx` :

#### Étape 1 : Ajouter le simulateur de disponibilité et tarif
- Ajouter les sélecteurs de dates (arrivée/départ) avec calcul automatique du prix
- Récupérer les tarifs hebdomadaires via `public_listing_weekly_pricing`
- Appliquer la même logique de pricing (semaine complète, weekend, prorata)
- Gérer les modes : prix affiché (samedi-samedi), vacances scolaires, contact requis

#### Étape 2 : Ajouter le formulaire de demande de réservation
- Intégrer `BookingInquiryForm` pour chaque listing disponible
- Bouton "Demande" qui ouvre le formulaire inline
- L'envoi passe par l'edge function `send-booking-inquiry` existante

#### Étape 3 : Récupérer le hostId dynamiquement
- Puisque `/disponibilites` n'a pas de hostId dans l'URL, le récupérer depuis le premier listing (via une vue ou une requête jointe)
- Alternative : modifier la vue `public_listings` pour inclure le `host_user_id`

#### Étape 4 : Ajouter les infos de contact et vacances scolaires
- Charger `public_host_contact` et `public_host_school_holidays` pour afficher les coordonnées et gérer la règle "samedi-samedi en vacances"

### Détails techniques

**Fichiers modifiés :**
- `src/pages/PublicAvailability.tsx` — Refonte complète avec simulateur, pricing, formulaire de contact

**Fichier potentiellement modifié :**
- Migration SQL si `public_listings` ne contient pas `host_user_id` (nécessaire pour charger les tarifs et envoyer le formulaire)

**Aucune modification nécessaire sur :**
- `pricingUtils.ts` (logique correcte)
- `BookingInquiryForm.tsx` (composant fonctionnel)
- `send-booking-inquiry/index.ts` (edge function fonctionnelle)

