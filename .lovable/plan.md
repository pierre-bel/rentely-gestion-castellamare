## Plan : Rendre l'app vraiment mobile-friendly

### 1. Aperçu d'une réservation → Drawer plein écran sur mobile

`BookingDetailDialog.tsx` utilise `Dialog` qui s'affiche centré, mal dimensionné sur 360px (boutons du footer qui débordent, padding trop large, titre tronqué).

**Changements** :
- Sur mobile (`< 768px`) : utiliser le composant `Drawer` (bottom sheet plein hauteur 90vh) au lieu de `Dialog`.
- Sur desktop : conserver le `Dialog` actuel.
- Pattern : hook `useIsMobile()` + rendu conditionnel `<Drawer>` / `<Dialog>` avec le même contenu interne extrait.
- Footer : empiler les boutons en colonne sur mobile, espacement `gap-2`, boutons `w-full`.
- Padding réduit (`p-4` au lieu de `p-6`), titre `text-lg`.

### 2. Swipe entre onglets (Détails / Paiements / E-mails)

Les `Tabs` shadcn ne supportent pas le swipe natif. Ajouter un wrapper de swipe gestuel uniquement sur mobile dans le `BookingDetailDialog`.

**Implémentation** :
- Convertir `defaultValue="details"` en état contrôlé `value` / `onValueChange`.
- Ajouter handlers `onTouchStart` / `onTouchEnd` sur le conteneur `TabsContent` :
  - swipe gauche → onglet suivant
  - swipe droite → onglet précédent
  - seuil : 50px horizontal, ignorer si vertical > horizontal (pour ne pas casser le scroll).
- Indicateur visuel : les `TabsTrigger` actuels restent (highlight de l'onglet actif).

### 3. Liste des réservations (`HostBookings.tsx`)

Vérifier rapidement le tableau : sur mobile il faut une vue en cartes plutôt qu'un tableau qui scrolle horizontalement. Si déjà présent, ne rien changer ; sinon, ajouter un rendu en cartes empilées sous `md`.

### 4. Ajustements responsive globaux légers

- `DialogFooter` (composant UI) : déjà `flex-col-reverse sm:flex-row` → OK.
- Vérifier `DialogContent` : ajouter `max-w-[95vw] sm:max-w-lg` et `max-h-[90vh]` par défaut pour éviter que les autres dialogs débordent.

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/host/BookingDetailDialog.tsx` | Drawer mobile, Tabs contrôlés + swipe, footer empilé |
| `src/components/ui/dialog.tsx` (mineur) | `max-w-[95vw]` + `max-h-[90vh]` par défaut |
| `src/components/host/HostBookings.tsx` (si besoin) | Vérif vue mobile en cartes |

### Hors scope

- Refonte visuelle (couleurs, typo) — uniquement responsive/UX.
- Autres dialogs (édition, etc.) — peuvent suivre dans un second passage si tu veux.
- Le calendrier (déjà responsive).

### Validation

- Preview 360px : ouvrir une réservation → drawer plein écran, swipe entre les 3 onglets fonctionne, boutons du footer empilés et accessibles.
- Preview desktop : comportement inchangé (Dialog modal centré).
