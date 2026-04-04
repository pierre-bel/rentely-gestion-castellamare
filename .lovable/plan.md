

## Plan : 9 corrections et améliorations

### 1. Portail client : "baby_crib" → afficher "Lit bébé" correctement

**Fichier** : `src/pages/BookingPortal.tsx` (ligne 383)
- Le label `baby_crib` dans `bedLabels` est déjà "Lit bébé" mais l'icône utilisée est `Bed` pour toutes les pièces. Pour les pièces contenant un lit bébé, utiliser une icône plus adaptée (ex: `Baby` de lucide-react) ou simplement afficher le texte sans l'icône de lit adulte.
- Vérifier le rendu : actuellement `1× Lit bébé` est correct en texte, le problème est probablement cosmétique. Remplacer l'icône `Bed` par `Baby` pour les chambres qui ne contiennent que des lits bébé, ou distinguer visuellement.

### 2. Modifier / supprimer un blocage de dates

**Fichier** : `src/pages/host/Availability.tsx`
- Quand on clique sur un blocage (status `owner_blocked`) dans le calendrier, le `BookingDetailDialog` s'ouvre déjà. Ajouter un bouton "Supprimer" dans `BookingDetailDialog` pour les blocages uniquement.

**Fichier** : `src/components/host/BookingDetailDialog.tsx`
- Si `booking.status === "owner_blocked"`, afficher un bouton "Supprimer le blocage" qui supprime la réservation (DELETE from bookings) puis ferme le dialog et rafraîchit les données.
- Le bouton "Modifier" existant permet déjà d'éditer un blocage via `EditManualBookingDialog`.

### 3. Onglet Paiement : YTD = année complète (janvier → décembre)

**Fichier** : `src/components/host/DashboardEarningsSummary.tsx`
- Changer `defaultEndMonth` de `startOfMonth(addMonths(now, 1))` (mois suivant) vers `new Date(now.getFullYear(), 11, 31)` (31 décembre de l'année en cours) pour afficher les projections sur l'année entière, pas juste jusqu'à aujourd'hui.

### 4. Iframe : corriger l'envoi d'e-mail depuis le simulateur

**Fichier** : `supabase/functions/send-booking-inquiry/index.ts`
- La fonction utilise Resend avec `from: 'Castellamare <noreply@castellamare.com>'`. L'erreur vient probablement du domaine non vérifié sur Resend en mode sandbox.
- Investiguer les logs Edge Function pour identifier l'erreur exacte.
- Solution de repli : si Resend échoue, logger l'erreur détaillée côté serveur et renvoyer le message d'erreur exact au client.

**Fichier** : `src/components/embed/BookingInquiryForm.tsx`
- Améliorer l'affichage d'erreur pour montrer le message exact au lieu d'un générique.

### 5. Belgique par défaut pour le pays lors de l'encodage

**Fichier** : `src/components/host/CreateEditTenantDialog.tsx` (ligne 70)
- Changer le fallback du champ country : `setCountry(src.country || pre.country || "Belgique")` au lieu de `""`.

### 6. Corriger les dates d'échéance de l'acompte

**Fichier** : `src/components/host/CreateManualBookingDialog.tsx` (lignes 244-258)
- Le problème : pour `due_type === "on_booking"`, la date est mise à `new Date()` (aujourd'hui). C'est correct pour "à la réservation".
- Mais si le paramétrage dit `due_type === "before_checkin"` avec `due_days = 30`, le calcul `subDays(checkinDate, 30)` est correct. **Vérifier** que les `defaultSchedules` sont bien chargés avec les bons `due_type` et `due_days`.
- Le bug probable : les données `host_payment_schedules` ont `due_type = "before_checkin"` et `due_days = X`, mais le code utilise `s.due_days || 0` qui retourne 0 si `due_days` est null ou 0 → résultat = date du checkin.
- **Fix** : S'assurer que la query charge bien `due_days` et que le calcul est correct. Vérifier aussi que la date n'est pas écrasée par un autre useEffect.

### 7. Recherche globale : ouvrir la fiche locataire directement

**Fichier** : `src/components/host/GlobalSearchDialog.tsx` (ligne 101-108)
- Actuellement `handleSelect` navigue vers `/host/tenants` pour les locataires. Remplacer par l'ouverture directe du `TenantDetailDialog` dans le dialog lui-même.
- Ajouter un state `selectedTenant` et afficher `TenantDetailDialog` quand un locataire est sélectionné.
- Pour les réservations, ouvrir `BookingDetailDialog` directement au lieu de naviguer vers la page réservations.

### 8. Recherche de réservations par nom du locataire

**Fichier** : Migration SQL pour modifier `host_search_bookings`
- Le RPC actuel cherche dans `profiles.first_name`, `profiles.last_name`, `profiles.email` mais pas dans `tenants`.
- Modifier la fonction pour joindre aussi la table `tenants` via `pricing_breakdown->>'tenant_id'` et chercher dans `tenants.first_name`, `tenants.last_name`, `tenants.email`.
- Nouvelle clause WHERE :
```sql
AND (search_query IS NULL OR 
     l.title ILIKE '%' || search_query || '%' OR
     p.first_name ILIKE '%' || search_query || '%' OR
     p.last_name ILIKE '%' || search_query || '%' OR
     p.email ILIKE '%' || search_query || '%' OR
     t.first_name ILIKE '%' || search_query || '%' OR
     t.last_name ILIKE '%' || search_query || '%' OR
     t.email ILIKE '%' || search_query || '%')
```

### 9. Portail client : section code d'accès toujours visible

**Fichier** : `src/pages/BookingPortal.tsx` (lignes 276-322)
- Le code actuel fonctionne déjà correctement : la section est toujours affichée, le code est masqué si non payé. Confirmer que `show_access_code` est bien activé dans les paramètres du portail. Aucun changement de code nécessaire si le comportement est déjà correct.

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/pages/BookingPortal.tsx` | Icône "baby crib" |
| `src/components/host/BookingDetailDialog.tsx` | Bouton supprimer blocage |
| `src/components/host/DashboardEarningsSummary.tsx` | YTD année complète |
| `supabase/functions/send-booking-inquiry/index.ts` | Debug envoi e-mail |
| `src/components/embed/BookingInquiryForm.tsx` | Meilleure gestion erreurs |
| `src/components/host/CreateEditTenantDialog.tsx` | Belgique par défaut |
| `src/components/host/CreateManualBookingDialog.tsx` | Fix dates échéances |
| `src/components/host/GlobalSearchDialog.tsx` | Ouvrir fiche locataire directement |
| Migration SQL | Modifier `host_search_bookings` pour chercher dans tenants |

