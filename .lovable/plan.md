

# Plan: Créer une réservation depuis un email/message de l'inbox

## Objectif
Permettre de cliquer sur un bouton dans l'inbox (emails et messages) pour extraire automatiquement les informations d'une demande (nom, prénom, dates, appartement, téléphone, email, adresse) via l'IA, puis ouvrir le formulaire de réservation manuelle pré-rempli et modifiable.

## Approche

### 1. Extraction IA via Edge Function
Créer une nouvelle Edge Function `extract-booking-info` qui :
- Reçoit le texte d'un email ou message
- Utilise un modèle Lovable AI (gemini-2.5-flash) pour extraire en JSON structuré : `first_name`, `last_name`, `email`, `phone`, `checkin_date`, `checkout_date`, `listing_hint` (nom de l'appartement mentionné), `address` (rue, code postal, ville, pays), `notes`
- Retourne le JSON parsé

### 2. Modifier `CreateManualBookingDialog` pour accepter des données pré-remplies
- Ajouter une prop optionnelle `prefillData` à l'interface Props contenant tous les champs extractibles
- Au chargement, si `prefillData` est fourni, pré-remplir les champs : listing (match par titre), dates, et créer/sélectionner un locataire existant ou pré-remplir le dialog de nouveau locataire
- Le formulaire reste entièrement modifiable

### 3. Ajouter le bouton "Créer réservation" dans `EmailDetailPanel`
- Bouton dans le header de l'email avec icône CalendarPlus
- Au clic : appel à l'Edge Function d'extraction, puis ouverture du `CreateManualBookingDialog` avec les données pré-remplies
- Indicateur de chargement pendant l'extraction

### 4. Ajouter le bouton dans `ChatPanel` / `ChatHeader`
- Même logique pour les messages : bouton dans le header de la conversation
- L'extraction se fait sur l'ensemble des messages du thread (concaténés)

## Détails techniques

### Edge Function `extract-booking-info`
```
POST /extract-booking-info
Body: { text: string, listings: [{id, title}] }
Response: { first_name, last_name, email, phone, checkin_date, checkout_date, listing_id, street, city, postal_code, country, notes }
```
Le modèle reçoit aussi la liste des biens disponibles pour matcher le bon `listing_id`.

### Interface `BookingPrefillData`
```typescript
interface BookingPrefillData {
  listingId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  checkinDate?: Date;
  checkoutDate?: Date;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
}
```

### Flux utilisateur
1. L'hôte lit un email/message de demande de réservation
2. Clique sur "Créer réservation" (bouton avec icône CalendarPlus)
3. L'IA analyse le contenu et extrait les informations
4. Le formulaire de réservation manuelle s'ouvre avec les champs pré-remplis
5. L'hôte vérifie, ajuste si nécessaire, et enregistre

### Fichiers impactés
- **Nouveau** : `supabase/functions/extract-booking-info/index.ts` — Edge Function d'extraction IA
- **Modifié** : `src/components/host/CreateManualBookingDialog.tsx` — Ajout prop `prefillData` + logique de pré-remplissage (tenant matching ou création)
- **Modifié** : `src/components/inbox/EmailDetailPanel.tsx` — Bouton + logique d'extraction pour les emails
- **Modifié** : `src/components/inbox/ChatHeader.tsx` ou `ChatPanel.tsx` — Bouton + logique d'extraction pour les messages
- **Modifié** : `src/pages/host/Inbox.tsx` — State management pour le dialog de réservation
- **Modifié** : `supabase/config.toml` — Déclaration de la nouvelle fonction

