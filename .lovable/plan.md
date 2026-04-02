

## Plan : 7 améliorations du tableau de bord et des réservations

### 1. Renommer "Versements" en "Paiements" sur le dashboard

**Fichier** : `src/pages/host/Dashboard.tsx` (ligne 119)
- Changer `"Versements"` → `"Paiements"`

**Fichier** : `src/components/host/DashboardEarningsSummary.tsx` (ligne 164)
- Changer `"Versements en attente"` → `"Paiements en attente"`

### 2. Aperçu des revenus : afficher le total YTD

**Fichier** : `src/components/host/DashboardEarningsSummary.tsx`
- Modifier la query pour filtrer sur l'année en cours (1er janvier → aujourd'hui) au lieu des 12 derniers mois glissants
- Changer le sous-titre de la carte parent pour indiquer "Année en cours (YTD)"

### 3. Blocage : permettre de choisir un locataire (pas seulement un nom libre)

**Fichier** : `src/components/host/CreateManualBookingDialog.tsx` (lignes 500-511)
- Pour le type `owner_blocked`, remplacer le champ texte libre "Raison / Nom" par deux champs :
  - Un sélecteur de locataire (même select que pour les réservations normales, optionnel)
  - Un champ texte "Raison / Notes" pour les notes
- Lors de la sauvegarde, stocker le `tenant_id` dans `pricing_breakdown` comme pour les réservations normales, et le nom du locataire dans les notes

### 4. Modifier la réservation : ajouter les échéances de paiement

**Fichier** : `src/components/host/EditManualBookingDialog.tsx`
- Ajouter une query pour charger les `booking_payment_items` existants de la réservation
- Afficher les échéances (libellé, montant, date d'échéance) en mode éditable, similaire à `CreateManualBookingDialog`
- Lors du save : supprimer les anciens `booking_payment_items` puis insérer les nouveaux
- Supprimer l'ancien système deposit/remaining basé sur `pricing_breakdown` et le remplacer par les payment items réels

### 5. Heures par défaut lors de l'encodage

**Fichier** : `src/components/host/CreateManualBookingDialog.tsx`
- Actuellement les heures sont pré-remplies depuis les defaults du listing (lignes 179-184), mais si l'utilisateur ne les modifie pas et que le champ `<input type="time">` affiche la valeur, elle est bien envoyée au save (ligne 358). Vérifier que le `checkin_time` et `checkout_time` sont bien sauvegardés même si non modifiés par l'utilisateur.
- Ajouter un texte indicatif sous les champs d'heure montrant "(Par défaut: HH:MM)" basé sur le listing sélectionné

### 6. Calendrier iframe : corriger l'envoi de message

**Fichier** : `supabase/functions/send-booking-inquiry/index.ts`
- La fonction existe et fonctionne côté serveur. Le problème est probablement côté RLS ou CORS puisque l'appel est fait depuis un iframe sur un domaine externe.
- Vérifier que la fonction est bien accessible sans JWT (car l'utilisateur public n'est pas authentifié)
- Ajouter une gestion d'erreur plus explicite côté client dans `BookingInquiryForm.tsx` pour afficher le message d'erreur exact

**Fichier** : `supabase/config.toml`
- Ajouter `[functions.send-booking-inquiry]` avec `verify_jwt = false` si nécessaire (la plupart des fonctions sont déjà déployées avec `verify_jwt = false` par défaut)

### 7. Calendrier : modifier les réservations depuis le détail

**Fichier** : `src/components/host/AvailabilityCalendar.tsx`
- Le calendrier en vue grille n'a pas de `onBookingClick`. Ajouter un prop `onBookingClick` et l'appeler au clic sur une cellule réservée
- Connecter dans `src/pages/host/Availability.tsx` pour la vue grille aussi

**Fichier** : `src/pages/host/Availability.tsx`
- Passer `onBookingClick={handleBookingClick}` au composant `AvailabilityCalendar` (déjà fait pour `TimelineOverview` mais pas pour la grille)

### 8. Réservations : filtre par défaut persistant

**Fichier** : `src/components/host/HostBookings.tsx`
- Sauvegarder les filtres actifs dans `localStorage` sous une clé comme `host-bookings-default-filters`
- Ajouter un bouton "Définir comme filtre par défaut" dans le sheet de filtres
- Au chargement de la page, restaurer les filtres depuis `localStorage`

**Fichier** : `src/components/host/BookingsFiltersSheet.tsx`
- Ajouter un bouton "Enregistrer comme défaut" dans le footer du sheet

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/pages/host/Dashboard.tsx` | Renommer "Versements" → "Paiements" |
| `src/components/host/DashboardEarningsSummary.tsx` | Renommer label + filtrer YTD |
| `src/components/host/CreateManualBookingDialog.tsx` | Locataire pour blocages + affichage heures défaut |
| `src/components/host/EditManualBookingDialog.tsx` | Ajouter édition des échéances de paiement |
| `src/components/host/AvailabilityCalendar.tsx` | Ajouter onBookingClick |
| `src/pages/host/Availability.tsx` | Passer onBookingClick à la grille |
| `src/components/host/HostBookings.tsx` | Filtre par défaut persistant |
| `src/components/host/BookingsFiltersSheet.tsx` | Bouton "Enregistrer comme défaut" |
| `supabase/functions/send-booking-inquiry/index.ts` | Debug envoi message |
| `src/components/embed/BookingInquiryForm.tsx` | Meilleur affichage erreurs |

