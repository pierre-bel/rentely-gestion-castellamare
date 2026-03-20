

# Plan : Corriger les e-mails automatiques, le portail client et ajouter le détail locataire

## Problème 1 : E-mail "à la réservation" jamais envoyé

**Cause racine** : Le trigger `booking_confirmed` est explicitement ignoré dans le cron (`continue` à la ligne 156 de `process-email-automations`). Le commentaire dit "Instant trigger — only at booking creation, skip in cron", mais **aucun code ne déclenche réellement l'envoi à la création de la réservation**. Il manque l'appel dans `CreateManualBookingDialog.tsx` après l'insertion du booking.

**Correction** :
- Dans `CreateManualBookingDialog.tsx`, après la création réussie d'un booking normal (après l'insertion des `booking_payment_items`), appeler la Edge Function `process-email-automations` en passant le `booking_id` nouvellement créé, ou mieux, créer un mécanisme dédié qui :
  1. Récupère les automations de type `booking_confirmed` pour ce host
  2. Appelle la Edge Function `send-email` ou envoie directement via Resend pour chaque automation applicable
- **Approche retenue** : Ajouter un paramètre optionnel `booking_id` à `process-email-automations` qui, s'il est fourni, traite uniquement ce booking et inclut les automations `booking_confirmed` (au lieu de les `continue`). Le front-end appelle cette fonction après la création.

## Problème 2 : Lien portail client (`{{portal_link}}`) ne fonctionne pas dans les e-mails

**Cause racine** : Le champ `access_token` n'est **pas inclus dans le SELECT** de la requête bookings (ligne 100 de `process-email-automations`). Donc `booking.access_token` est `undefined` et le lien généré est `https://gestioncastellamare.lovable.app/booking/`.

**Correction** :
- Ajouter `access_token` au SELECT de la requête bookings dans `process-email-automations/index.ts`.

## Problème 3 : Voir les réservations d'un locataire

**Correction** :
- Créer un composant `TenantDetailDialog.tsx` qui s'ouvre au clic sur une ligne de locataire dans `HostTenants.tsx`.
- Ce dialog affiche les infos du locataire + la liste de toutes ses réservations (passées et futures) récupérées via `pricing_breakdown->>'tenant_id'`.
- Chaque réservation affiche : bien, dates, statut, montant.

## Fichiers impactés

1. **`supabase/functions/process-email-automations/index.ts`**
   - Ajouter `access_token` au SELECT des bookings
   - Ajouter support d'un paramètre `booking_id` dans le body pour traiter un booking spécifique avec les automations `booking_confirmed`

2. **`src/components/host/CreateManualBookingDialog.tsx`**
   - Après création réussie d'un booking, appeler `supabase.functions.invoke("process-email-automations", { body: { booking_id: ... } })` pour déclencher les e-mails de confirmation

3. **`src/components/host/TenantDetailDialog.tsx`** (nouveau)
   - Dialog affichant les infos du locataire et la liste de ses réservations

4. **`src/components/host/HostTenants.tsx`**
   - Ajouter un état pour le locataire sélectionné et ouvrir le dialog au clic sur une ligne

