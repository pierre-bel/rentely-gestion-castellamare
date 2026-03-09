

# Plan : Optimisation responsive mobile

## Problèmes identifiés

1. **TimelineOverview** : utilise `window.innerWidth` directement (non réactif au resize). Les cellules sont petites mais la barre de défilement fonctionne.
2. **Page Availability (contrôles)** : les badges de filtrage par bien + les boutons de vue s'entassent sur mobile. Le sélecteur de mois et les contrôles ne sont pas bien empilés.
3. **AvailabilityCalendar** : les cercles de 40px (h-10 w-10) sont serrés sur petit écran, la légende déborde.
4. **HostPageHeader** : vérifier l'espacement mobile du nouveau bouton "+".

## Ce qui fonctionne déjà bien
- **BookingsTable** : vue cartes sur mobile ✓
- **InboxLayout** : toggle sidebar/chat sur mobile ✓  
- **HostSidebar** : Sheet mobile ✓

## Changements prévus

### 1. TimelineOverview — Réactivité du hook mobile
- Remplacer `window.innerWidth < 768` par le hook `useIsMobile()` existant
- Réduire encore CELL_W sur mobile (28px au lieu de 30)
- Tronquer les noms de biens dans la colonne labels sur mobile

### 2. Page Availability — Contrôles mobiles
- Empiler verticalement : mois navigation en haut, puis boutons vue + partage, puis badges listing en scroll horizontal
- Les badges de listing passent en scroll horizontal (`overflow-x-auto flex-nowrap`) au lieu de `flex-wrap`
- Réduire la taille du texte du mois sur mobile

### 3. AvailabilityCalendar — Cellules adaptatives
- Réduire les cercles à `h-8 w-8` sur mobile via classes responsive (`h-8 w-8 sm:h-10 sm:w-10`)
- Compacter la légende sur mobile (2 colonnes au lieu d'une ligne)

### 4. HostPageHeader — Vérification espacement
- S'assurer que le bouton "+" ne chevauche pas le titre sur petits écrans

---

**Fichiers modifiés :**
- `src/components/host/TimelineOverview.tsx`
- `src/pages/host/Availability.tsx`
- `src/components/host/AvailabilityCalendar.tsx`
- `src/components/host/HostPageHeader.tsx` (ajustement mineur)

