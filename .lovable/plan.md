

## Plan : Corrections multiples du tableau de bord hôte et des balises e-mail

### 1. Corriger la balise `{{portal_link}}` dans les e-mails automatiques

**Problème** : Les deux Edge Functions (`process-email-automations` et `send-email`) génèrent `portal_link` avec le chemin `/booking/` alors que la route réelle est `/portal/:token`.

**Correction** :
- `supabase/functions/process-email-automations/index.ts` ligne 450 : changer `/booking/` → `/portal/`
- `supabase/functions/send-email/index.ts` ligne 174 : idem

### 2. Formater toutes les dates en JJ-MM-AAAA dans les balises e-mail

**Problème** : Les dates `checkin_date`, `checkout_date`, `deposit_due_date`, `balance_due_date`, `payment_due_date` sont renvoyées au format brut ISO (`2026-04-15`).

**Correction** dans les deux Edge Functions (`process-email-automations` et `send-email`) :
- Ajouter une fonction utilitaire `formatDateFR(dateStr)` → `"15-04-2026"`
- L'appliquer à toutes les variables de dates dans `buildVariablesForBooking`

### 3. Supprimer "Frais payés" de l'aperçu des revenus

**Fichier** : `src/components/host/DashboardEarningsSummary.tsx`
- Retirer l'entrée `{ label: "Frais payés", ... }` du tableau `metrics` (ligne ~171-181)
- Passer la grille de 6 à 5 colonnes (`lg:grid-cols-5`)

### 4. Remplacer la messagerie du dashboard par les derniers e-mails reçus

**Problème** : La section "Messagerie" affiche les conversations non lues (messages internes). L'utilisateur veut voir les derniers e-mails reçus (`inbox_emails`).

**Fichier** : `src/pages/host/Dashboard.tsx`
- Remplacer `DashboardInbox` par un nouveau composant `DashboardRecentEmails`
- Renommer le titre de "Messagerie" en "Derniers e-mails"
- Le lien "Voir tout" pointe vers `/host/inbox`

**Nouveau composant** : `src/components/host/DashboardRecentEmails.tsx`
- Query `inbox_emails` filtrée par `host_id`, triée par `received_at desc`, limitée à 7 lignes
- Afficher : expéditeur (`from_name` ou `from_email`), sujet, date, indicateur lu/non lu
- Style similaire aux autres composants du dashboard

### 5. Afficher les paiements en retard dans la section Versements du dashboard

**Fichier** : `src/pages/host/Dashboard.tsx` et `src/components/host/DashboardRecentPayouts.tsx`

- Avant le tableau des versements, ajouter un bloc "Paiements en retard"
- Requêter les `booking_payment_items` non payés avec `due_date < aujourd'hui`, joints aux bookings confirmés de l'hôte
- Afficher : nom du locataire, bien, montant dû, date d'échéance, avec style rouge/destructif
- Réutiliser la logique existante de `OverduePaymentsList` en version simplifiée (sans bouton rappel, juste l'info)

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `supabase/functions/process-email-automations/index.ts` | Fix portal_link + formatage dates |
| `supabase/functions/send-email/index.ts` | Fix portal_link + formatage dates |
| `src/components/host/DashboardEarningsSummary.tsx` | Retirer "Frais payés" |
| `src/pages/host/Dashboard.tsx` | Remplacer messagerie par e-mails, intégrer retards |
| `src/components/host/DashboardRecentEmails.tsx` | Nouveau composant |
| `src/components/host/DashboardRecentPayouts.tsx` | Ajouter section paiements en retard |

