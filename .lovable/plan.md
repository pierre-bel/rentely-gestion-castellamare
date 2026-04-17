

## Plan : Corriger la duplication du RPC `host_search_bookings`

### Cause racine

Deux signatures de `host_search_bookings` coexistent dans la base :
1. **Ancienne** : `status_filter booking_status` → renvoie `status booking_status`
2. **Nouvelle** (créée hier dans la migration de fix) : `status_filter text` → renvoie `status text`

PostgreSQL ne peut pas choisir → toutes les requêtes vers ce RPC échouent. Résultat : onglet réservations vide, dashboard vide, recherche globale cassée, alors que les **508 réservations sont bien présentes** dans la base (la dernière créée ce matin à 06:36 UTC est bien là).

### Correction (1 migration SQL)

```sql
DROP FUNCTION IF EXISTS public.host_search_bookings(
  uuid, text, booking_status, numeric, numeric, date, date, date, date, text, text
);
```

Cela supprime uniquement l'ancienne signature et garde la nouvelle (celle avec `status_filter text`) qui est déjà appelée par le frontend.

### Vérification post-fix

1. `SELECT COUNT(*) FROM host_search_bookings('327b2716...'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'created_at', 'desc');` → doit retourner 508
2. Onglet `/host/bookings` doit afficher toutes les réservations
3. La réservation créée ce matin (`2e21761e-c35c-4356-8668-80813b58aa8c`, check-in 20/04/2026) doit apparaître en tête
4. Recherche globale et dashboard doivent revivre

### Fichier modifié

| Fichier | Modification |
|---|---|
| Nouvelle migration SQL | DROP de l'ancienne signature `host_search_bookings(..., booking_status, ...)` |

