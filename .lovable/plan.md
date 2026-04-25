## Plan : restaurer le calendrier des disponibilités partagé

### Diagnostic
La régression vient du backend, pas des réservations elles-mêmes.

Le bouton **Partager** ouvre `/embed/availability/all/:hostId`, qui charge les réservations via la vue SQL **`public.public_booking_dates`**.

Or cette vue a été modifiée récemment par la migration :
- `supabase/migrations/20260424155119_e690f4d0-ce40-441a-83c1-e43e23f178a3.sql`

Cette migration a forcé :
```sql
ALTER VIEW public.public_booking_dates SET (security_invoker = on);
```

Conséquence : la vue réutilise les permissions de l’utilisateur anonyme qui consulte le lien partagé. Mais la table `bookings` **n’autorise pas les anonymes à lire les réservations** via RLS.

Résultat concret :
- les appartements peuvent encore apparaître,
- mais **les réservations ne remontent plus du tout**,
- donc le calendrier partagé paraît vide.

C’est cohérent avec la mémoire projet déjà définie :
- `mem://security/access-control` précise que **`public_booking_dates` est l’exception** et doit rester une vue publique standard pour les contrôles calendrier anonymes.

### Correction prévue

#### 1. Corriger la vue publique des réservations
Créer une migration SQL qui :
- recrée `public.public_booking_dates` **sans `security_invoker=on`**,
- conserve uniquement les colonnes non sensibles :
  - `listing_id`
  - `checkin_date`
  - `checkout_date`
- garde le filtrage actuel sur les statuts visibles dans le calendrier.

Forme attendue :
```sql
DROP VIEW IF EXISTS public.public_booking_dates;
CREATE VIEW public.public_booking_dates AS
SELECT listing_id, checkin_date, checkout_date
FROM public.bookings
WHERE status = ANY (ARRAY['confirmed'::booking_status, 'completed'::booking_status, 'pending_payment'::booking_status]);

GRANT SELECT ON public.public_booking_dates TO anon, authenticated;
```

#### 2. Vérifier s’il faut aussi réajuster `public_listing_availability`
Je vais contrôler si la partie “dates bloquées” dépend de la même régression ou si elle reste fonctionnelle avec les policies actuelles.

But :
- ne pas élargir l’accès inutilement,
- corriger uniquement ce qui casse l’affichage partagé.

#### 3. Vérifier les pages concernées côté front
Contrôler le flux utilisé par :
- `src/pages/host/Availability.tsx` → génération du lien partagé
- `src/pages/EmbedAllAvailability.tsx` → calendrier partagé “tous les appartements”
- `src/pages/EmbedAvailability.tsx` → calendrier partagé d’un seul bien

Je ne prévois pas de gros refactor front : le code paraît bon, il consomme simplement une vue backend devenue trop restrictive.

### Vérifications après fix
1. Ouvrir le lien **Partager** depuis `/host/availability`
2. Vérifier que les réservations réapparaissent dans :
   - la vue partagée globale
   - la vue partagée d’un logement individuel
3. Vérifier que les jours réservés sont à nouveau marqués correctement
4. Vérifier qu’aucune donnée sensible n’est exposée :
   - pas de nom voyageur
   - pas d’e-mail
   - seulement les dates occupées

### Détail technique
- **Cause racine** : `security_invoker=on` sur `public_booking_dates`
- **Impact** : les lectures anonymes du calendrier partagé héritent de la RLS de `bookings`, qui bloque l’accès
- **Fix minimal et sûr** : revenir à une vue publique limitée aux dates, sans données personnelles

Si vous validez, j’applique directement la migration et je sécurise la régression proprement.