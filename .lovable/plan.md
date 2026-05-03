## Problème

Quand on ouvre une réservation depuis le tableau de bord (Recent / Upcoming), c'est **le nom de l'hôte** qui apparaît dans le champ "Locataire", pas celui du vrai locataire.

## Cause racine

Pour les réservations créées manuellement par l'hôte (`CreateManualBookingDialog.tsx`), le champ `bookings.guest_user_id` est rempli avec **`user.id` (l'ID de l'hôte lui-même)**, car le locataire n'a pas de compte. Le vrai locataire est stocké dans la table `tenants` et référencé via `pricing_breakdown.tenant_id`.

Or dans `DashboardRecentBookings.tsx` (ligne 86-107) et `DashboardUpcomingBookings.tsx` (ligne 102-123), le code fait :

```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("first_name, last_name, email, phone")
  .eq("id", full.guest_user_id)   // ← c'est l'hôte !
  .single();

setSelectedBooking({
  ...
  guest_name: profile ? `${profile.first_name} ${profile.last_name}` : booking.guest_email,
  ...
});
```

Résultat : `guest_name` = nom du propriétaire.

`BookingDetailDialog` charge bien le tenant via `pricing_breakdown.tenant_id`, mais l'affichage du nom (ligne 169) utilise `booking.guest_name` qui est déjà pollué.

## Correction

**`src/components/host/BookingDetailDialog.tsx`** (ligne 169) — utiliser le nom du tenant en priorité :

```tsx
<p className="text-sm font-medium">
  {tenant
    ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || booking.guest_name
    : booking.guest_name}
</p>
```

Cela corrige le problème pour **toutes** les sources qui ouvrent le dialog (dashboard recent, upcoming, HostBookings, GlobalSearch, Availability) sans toucher chaque appelant.

## Fichier modifié

- `src/components/host/BookingDetailDialog.tsx` (1 ligne)
