

## Plan : Amélioration complète du système de contrats

### Contexte

Le PDF fourni montre un contrat professionnel avec : un bloc d'adresse décalé (style Word), des encadrés, des espacements contrôlés, du gras, des tableaux, et une mise en page soignée. L'éditeur actuel TipTap manque de fonctionnalités de mise en page avancée (indentation/blocs décalés, encadrés, espacements). De plus, la liste de réservations dans le dialog de génération affiche le nom du propriétaire au lieu du locataire, et il n'y a pas de bouton "Générer contrat" depuis les réservations ni d'export PDF/Word.

### Changements prévus

#### 1. Enrichir l'éditeur de contrats (ContractTemplateEditor + ContractToolbar)

Ajouter les extensions TipTap suivantes :
- **Indent / Text Indent** — possibilité de décaler un bloc vers la droite (pour les adresses comme dans le PDF)
- **Blockquote** — pour les encadrés avec bordure
- **Spacer** — bouton pour insérer un espace vertical (paragraphe vide ou `<br>`)  
- **Font size** — sélecteur de taille de police
- Vérifier que **gras, tableaux, listes numérotées** fonctionnent déjà correctement dans le rendu final

Nouveaux boutons dans la toolbar :
- Indentation gauche/droite (augmenter/diminuer le retrait)
- Encadré (blockquote stylé avec bordure)
- Espace vertical
- Taille de police

#### 2. Corriger l'affichage des réservations dans ContractGenerateDialog

Actuellement le `SelectItem` affiche correctement `guest.first_name guest.last_name — listing.title (date)` (le code est bon mais les profils ne se chargent peut-être pas). Vérifier et s'assurer que l'affichage montre :
- **Nom du locataire** (pas du propriétaire)
- **Dates du séjour** (checkin → checkout)
- **Nom de l'appartement**

#### 3. Bouton "Générer contrat" sur chaque réservation

Ajouter dans `BookingDetailDialog` un bouton "Générer contrat" qui :
- Ouvre le `ContractGenerateDialog` pré-rempli avec la réservation sélectionnée
- Ou génère directement le contrat avec le premier/seul template disponible

#### 4. Export PDF et Word du contrat généré

Dans `ContractPreviewDialog`, ajouter deux boutons :
- **Télécharger en PDF** — utiliser `html2canvas` + `jsPDF` pour convertir le HTML en PDF
- **Télécharger en Word** — utiliser `html-docx-js` ou `docx` pour générer un `.docx` depuis le HTML

#### 5. Améliorer le rendu des contrats générés

S'assurer que les styles inline dans le HTML généré (indentation, encadrés, tableaux) sont correctement rendus dans :
- L'aperçu du dialogue
- L'export PDF
- L'export Word

### Détails techniques

**Fichiers modifiés :**
- `src/components/host/ContractToolbar.tsx` — Ajout boutons indent, blockquote, spacer, font size
- `src/components/host/ContractTemplateEditor.tsx` — Ajout extensions TipTap (Blockquote, Indent)
- `src/components/host/ContractGenerateDialog.tsx` — Corriger affichage réservations, ajouter prop pour pré-sélection
- `src/components/host/ContractPreviewDialog.tsx` — Ajout boutons export PDF et Word
- `src/components/host/BookingDetailDialog.tsx` — Ajout bouton "Générer contrat"
- `src/components/host/HostContracts.tsx` — Enrichir l'affichage des contrats (nom locataire, appartement)

**Dépendances à installer :**
- `jspdf` + `html2canvas` pour export PDF
- `html-docx-js` ou approche alternative pour export Word

