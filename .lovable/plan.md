

## Diagnostic

Le probleme principal est dans `BookingPaymentDetailDialog` : les `payment_items` viennent d'une **prop statique** (`selectedBooking` state dans le parent). Quand `invalidateQueries` refetch les donnees, le state `selectedBooking` du parent ne se met **jamais** a jour — c'est un snapshot fige. Donc la checkbox ne change visuellement pas, et la suppression semble ne rien faire.

`BookingPaymentSection` a le meme souci potentiel car `invalidateQueries` cause un delai visible.

## Plan

### 1. `BookingPaymentDetailDialog` — Ajouter un state local optimiste

- Ajouter un `useState<PaymentItem[]>` initialise depuis `booking.payment_items` (avec `useEffect` pour sync quand le booking change)
- **Toggle checkbox** : mettre a jour le state local immediatement (optimiste), puis faire l'appel API. En cas d'erreur, rollback.
- **Delete** : retirer l'item du state local immediatement, puis appel API. Rollback si erreur.
- **Add** : ajouter l'item dans le state local apres succes API (ou optimiste avec un ID temporaire).
- Recalculer `paidTotal` / `remaining` depuis le state local.

### 2. `BookingPaymentSection` — Meme approche optimiste

- Meme pattern : state local derive de la query, mise a jour optimiste sur toggle et delete.

### 3. `HostPaymentsBookingsList` — Sync du parent

- Apres invalidation, quand le parent refetch, s'assurer que `selectedBooking` est mis a jour via un `useEffect` qui synchronise le booking selectionne avec les donnees refetchees.

### Fichiers modifies
- `src/components/host/BookingPaymentDetailDialog.tsx`
- `src/components/host/BookingPaymentSection.tsx`  
- `src/components/host/HostPaymentsBookingsList.tsx`

