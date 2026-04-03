

## Plan : 6 améliorations (envoi e-mail manuel, alignement, arrivées, chevauchement, notes, recherche)

### 1. Envoi manuel d'un template e-mail depuis l'onglet E-mails d'une réservation

**Fichier** : `src/components/host/BookingEmailsTab.tsx`
- Ajouter une section "Envoyer un e-mail" en haut de l'onglet
- Charger les `email_automations` du host (déjà récupérées) et les afficher dans un select
- Bouton "Envoyer" qui appelle `supabase.functions.invoke('send-email', { body: { action: 'send_for_booking', automation_id, booking_id } })`
- Afficher un toast de confirmation ou d'erreur, puis rafraîchir la liste des e-mails envoyés

### 2. Aligner le texte à gauche dans les e-mails automatiques

**Fichier** : `src/components/host/email/EmailBodyEditor.tsx`
- Le wrapper HTML généré utilise `margin:0 auto` (centrage du conteneur, ce qui est correct) mais le texte à l'intérieur n'a pas de `text-align:left` explicite
- Modifier `editorHtmlToEmailHtml` pour ajouter `text-align:left` au style du div wrapper : `style="font-family:...;text-align:left;..."`
- Cela garantit que le contenu du mail est aligné à gauche dans tous les clients e-mail

### 3. Corriger le décalage d'un jour sur les arrivées du dashboard

**Fichier** : `src/components/host/DashboardUpcomingBookings.tsx`
- Le problème vient de `getDaysUntilLabel` (ligne 52) : `new Date(checkinDate)` avec une chaîne `YYYY-MM-DD` crée une date en UTC minuit, tandis que `new Date()` est en heure locale → décalage d'un jour
- Corriger en parsant la date avec `parseISO` ou en ajoutant `T00:00:00` et en comparant les dates sans heures : `differenceInDays(startOfDay(parseISO(checkinDate)), startOfDay(new Date()))`

### 4. Vérification de chevauchement lors de l'encodage d'une réservation

**Fichier** : `src/components/host/CreateManualBookingDialog.tsx`
- Après sélection du listing + dates, vérifier s'il existe une réservation qui chevauche pour ce bien
- Query : `bookings` où `listing_id = X` et `status != cancelled*` et `checkin_date < checkout_sélectionné` et `checkout_date > checkin_sélectionné`
- Si résultat > 0, afficher un message d'alerte (Badge rouge) indiquant "⚠ Une réservation existe déjà sur ce créneau" avec le nom du locataire et les dates
- Ne pas bloquer la sauvegarde (l'utilisateur peut volontairement créer un blocage qui chevauche) mais avertir clairement

**Fichier** : `src/components/host/EditManualBookingDialog.tsx`
- Même logique, en excluant la réservation en cours d'édition du check

### 5. Supprimer le "Tableau de bord" parasite en haut de la page Notes

**Fichier** : `src/layouts/HostLayout.tsx`
- Le layout affiche `HostPageHeader` avec le titre déduit de la route (ligne 32 : fallback `"Tableau de bord"`)
- La route `/host/notes` n'est pas listée dans `getPageTitle` → affiche "Tableau de bord" par défaut
- Ajouter `if (pathname === "/host/notes") return "Notes";` dans `getPageTitle`
- Le composant `NotesPanel` a déjà un `HostPageHeader title="Notes"` dans `pages/host/Notes.tsx` → il faut soit retirer celui du layout (en ajoutant `/host/notes` à `shouldHideHeader`) soit retirer celui de `Notes.tsx`. Solution : ajouter le titre dans le layout et retirer le `HostPageHeader` de `Notes.tsx`

### 6. Ajouter une barre de recherche globale à côté du bouton "+" dans le header

**Fichier** : `src/components/host/HostPageHeader.tsx`
- Ajouter un bouton icône "Recherche" (loupe) à côté du bouton "+"
- Au clic, ouvrir un Dialog/Popover de recherche avec un champ texte
- Rechercher dans les réservations (via `host_search_bookings` RPC) et les locataires (table `tenants`) en temps réel (debounce 300ms)
- Afficher les résultats groupés : "Réservations" et "Locataires"
- Clic sur un résultat → naviguer vers `/host/bookings` avec un filtre ou ouvrir le détail de la réservation / fiche locataire
- Ce composant apparaît sur toutes les pages host car il est dans le header partagé

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/host/BookingEmailsTab.tsx` | Section envoi manuel d'un template |
| `src/components/host/email/EmailBodyEditor.tsx` | Ajouter `text-align:left` au wrapper |
| `src/components/host/DashboardUpcomingBookings.tsx` | Fix décalage timezone arrivées |
| `src/components/host/CreateManualBookingDialog.tsx` | Alerte chevauchement réservation |
| `src/components/host/EditManualBookingDialog.tsx` | Alerte chevauchement réservation |
| `src/layouts/HostLayout.tsx` | Ajouter route "Notes" dans getPageTitle |
| `src/pages/host/Notes.tsx` | Retirer HostPageHeader dupliqué |
| `src/components/host/HostPageHeader.tsx` | Ajouter recherche globale |

