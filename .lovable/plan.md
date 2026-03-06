

## Plan : Paiements dans les réservations

### 1. Colonne "Statut paiement" dans le tableau des réservations (`BookingsTable.tsx`)

Ajouter une colonne entre "Montant" et "Statut" qui affiche un badge de paiement (Payé / Acompte payé / En retard / Non payé). Le statut sera calculé en comparant les `booking_payment_items` avec la date du jour :
- **Payé** (vert) : toutes les échéances sont payées
- **Acompte payé** (amber) : au moins une échéance payée, le reste pas encore dû
- **En retard** (rouge clignotant) : au moins une échéance non payée dont la `due_date` est passée
- **Non payé** (gris) : aucune échéance payée, aucune encore en retard

Cela nécessite de charger les `booking_payment_items` pour chaque réservation dans `HostBookings.tsx` (un seul appel groupé après le fetch des bookings).

### 2. Détails complets dans `BookingDetailDialog.tsx`

Ajouter un onglet "Paiements" (ou intégrer dans l'onglet Détails) qui affiche :
- **Infos locataire complètes** : téléphone, adresse, genre (depuis la table `tenants` via `pricing_breakdown.tenant_id`)
- **Échéancier de paiement** : liste des `booking_payment_items` avec checkbox pour marquer payé/non payé, date d'échéance, montant, indicateur de retard
- **Possibilité de modifier** : changer le montant, la date d'échéance, ajouter/supprimer une échéance (réutiliser la logique de `BookingPaymentDetailDialog`)

### 3. Onglet Paiements : indicateur de retard (`HostPaymentsBookingsList.tsx`)

Modifier `getPaymentStatus` pour prendre en compte `due_date` par rapport à `new Date()` :
- Si `is_paid === false` et `due_date < today` → statut "late" (en retard)
- Ajouter un badge rouge "En retard" distinct du "Non payé"
- Trier par défaut les réservations en retard en premier

### 4. Import : colonnes paiement (`ImportBookingsDialog.tsx`)

Ajouter au template et à la logique d'import :
- `deposit_paid` (Acompte payé ? oui/non) 
- `balance_paid` (Solde payé ? oui/non)

Après création de la réservation, si les `booking_payment_items` sont générés automatiquement via le système d'échéances, marquer les items correspondants comme `is_paid = true` et `paid_at = now()` selon les valeurs importées.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/host/BookingsTable.tsx` | Nouvelle colonne "Paiement" avec badge dynamique |
| `src/components/host/HostBookings.tsx` | Fetch `booking_payment_items` groupé, passer aux composants |
| `src/components/host/BookingDetailDialog.tsx` | Onglet paiements avec infos locataire + échéancier modifiable |
| `src/components/host/HostPaymentsBookingsList.tsx` | Statut "en retard" basé sur `due_date` vs aujourd'hui |
| `src/components/host/ImportBookingsDialog.tsx` | Colonnes `deposit_paid` / `balance_paid` dans template + logique |

Aucune migration SQL nécessaire -- les tables `booking_payment_items` et `tenants` existent déjà avec les colonnes requises.

