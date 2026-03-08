

## Plan: Editeur riche TipTap pour les contrats

Le screenshot montre le format actuel du contrat: en-tete avec coordonnees host a gauche / date a droite, titre encadre centre, bloc destinataire aligne a droite, corps avec indentations, tableau de prix aligne, conditions generales en italique avec liste numerotee. L'editeur riche doit permettre de reproduire exactement cette mise en page.

### Fichiers a creer/modifier

| Fichier | Action |
|---|---|
| `src/components/host/ContractToolbar.tsx` | **Creer** — barre d'outils riche pour contrats |
| `src/components/host/ContractTemplateEditor.tsx` | **Modifier** — remplacer Textarea par TipTap |
| `src/components/host/ContractPreviewDialog.tsx` | **Modifier** — rendu HTML avec `dangerouslySetInnerHTML` |

### 1. Installer extensions TipTap manquantes

`@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`

### 2. Creer `ContractToolbar.tsx`

Barre d'outils groupee avec separateurs visuels :
- **Historique** : Annuler / Retablir
- **Titres** : H1, H2, H3
- **Texte** : Gras, Italique, Souligne, Barre
- **Alignement** : Gauche, Centre, Droite
- **Listes** : Puces, Numerotee
- **Insertion** : Tableau, Trait horizontal
- **Couleur** : Texte, Surlignage

Reutiliser le pattern de `EmailToolbar.tsx` comme base.

### 3. Modifier `ContractTemplateEditor.tsx`

- Remplacer le `<Textarea>` par un editeur TipTap avec toutes les extensions (StarterKit, TextStyle, Color, Highlight, TextAlign, Underline, Table*)
- L'insertion des variables dynamiques (badges a droite) utilisera `editor.chain().focus().insertContent(variable).run()` au lieu de la concatenation au state
- Ajouter un apercu live sous l'editeur (comme dans `EmailBodyEditor`)
- Le contenu est stocke en HTML riche dans `body_html`

### 4. Modifier `ContractPreviewDialog.tsx`

Remplacer `{contract.generated_html}` par `dangerouslySetInnerHTML={{ __html: contract.generated_html }}` pour que le gras, centrage, tableaux et mise en page soient rendus correctement.

### Resultat attendu

L'hote pourra reproduire exactement le format du screenshot : en-tete structure, titre encadre et centre, blocs alignes a droite, tableaux de prix, conditions en italique avec liste numerotee — le tout via un editeur visuel intuitif.

