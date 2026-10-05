# Heures d'arrivée/départ par année + onglet Connexions API

## 1. Heures d'arrivée et de départ par année (par appartement)

Dans la fiche de chaque appartement (modification d'annonce), nouvelle section « Heures par année » :
- Tableau : Année | Heure d'arrivée | Heure de départ | Supprimer.
- Bouton « Ajouter une année ».
- Les heures par défaut actuelles de l'appartement restent la règle de secours quand aucune année n'est définie.

Application automatique : lors d'une nouvelle réservation (manuelle, import, demande via calendrier), l'heure proposée est celle de l'année de la date d'arrivée si elle existe, sinon l'heure par défaut. Les réservations existantes ne sont pas modifiées (l'heure reste modifiable à la main).

## 2. Nouvel onglet « Connexions API »

Nouvel onglet dans le menu de gestion :
- Créer une clé API (nom libre, ex. « Mon logiciel compta »). La clé complète n'est affichée qu'une seule fois, avec bouton Copier.
- Liste des clés : nom, date de création, dernière utilisation, bouton Révoquer.
- Documentation intégrée : adresse à appeler et exemples.

Ce que l'autre logiciel pourra faire avec la clé :
- Lire la liste des appartements.
- Lire les réservations (filtre par dates / appartement).
- Créer une réservation (statut « En attente »).

## Détails techniques

- Table `listing_yearly_stay_times` (listing_id, year, checkin_time, checkout_time, unique listing+year), RLS propriétaire du listing, GRANTs.
- Helper `getStayTimesForDate(listing, date)` utilisé par CreateManualBookingDialog, import et send-booking-inquiry.
- Table `host_api_keys` (host_id, name, key_hash SHA-256, prefix, last_used_at, revoked_at), RLS host_id = auth.uid().
- Edge function `public-api` (verify_jwt off) : auth via header `X-API-Key` hashé, endpoints GET /listings, GET /bookings, POST /bookings, limités aux données de l'hôte de la clé.
- Route `/host/api` + entrée dans HostSidebar.
