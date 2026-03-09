

# Plan : QR Code de paiement SEPA (EPC069-12)

## Principe

Le standard **EPC QR** encode les données d'un virement SEPA dans un QR code. Aucune API, aucun intermédiaire, aucun frais. Le locataire scanne avec son app bancaire et le virement est pré-rempli (IBAN, montant, bénéficiaire, référence). Il valide, c'est tout.

## Étapes

### 1. Migration DB
Ajouter 3 colonnes à `portal_settings` :
- `bank_beneficiary_name` (text, nullable)
- `bank_iban` (text, nullable)  
- `bank_bic` (text, nullable)

Mettre à jour la vue `public_portal_settings` pour exposer ces 3 colonnes (le portail locataire y accède sans auth).

### 2. Installer la lib `qrcode`
Package npm léger pour générer les QR codes en SVG/canvas côté client. Pas de dépendance serveur.

### 3. Section "Coordonnées bancaires" dans `HostPaymentSettings.tsx`
Ajouter une carte avec 3 champs (Bénéficiaire, IBAN, BIC) sauvegardés via upsert dans `portal_settings`. Positionnée entre les échéances et la cabine de plage.

### 4. Composant `PaymentQRCode.tsx`
Génère la chaîne EPC069-12 :
```text
BCD
002
1
SCT
{BIC}
{Bénéficiaire}
{IBAN}
EUR{Montant}


REF-{booking_id_court}-{label}
```
Affiche le QR dans un Popover au clic d'un bouton.

### 5. Modifier `BookingPortal.tsx`
Dans `renderPaymentSchedule()`, ajouter un bouton QR à côté de chaque échéance **non payée** (seulement si les coordonnées bancaires du host sont renseignées). Récupérer `bank_iban`, `bank_bic`, `bank_beneficiary_name` depuis `public_portal_settings`.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | 3 colonnes + update vue |
| `src/components/host/HostPaymentSettings.tsx` | Carte coordonnées bancaires |
| `src/components/portal/PaymentQRCode.tsx` | Nouveau composant |
| `src/pages/BookingPortal.tsx` | Bouton QR par échéance non payée |

