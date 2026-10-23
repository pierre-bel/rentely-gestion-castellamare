# Nouvel onglet « Documents »

## Ce que vous aurez
- Un onglet **Documents** dans le menu de gauche, sous « Notes ».
- Une zone où **glisser-déposer** des fichiers. Un bouton « Ajouter » fonctionne aussi. Formats acceptés : PDF, images (JPG, PNG), Word et Excel. Taille maximale : 20 Mo par fichier.
- La liste de vos documents, avec leur nom, leur taille et leur date d'ajout, plus un champ de recherche par nom.
- **Aperçu en un clic** : cliquer sur un document l'ouvre dans une grande fenêtre. Les PDF et les images s'affichent directement. Pour Word et Excel, un bouton permet de télécharger le fichier.
- Des actions pour chaque document : télécharger, renommer, supprimer (avec confirmation).
- Vos documents sont privés : seuls vous et votre équipe y avez accès.

## Détails techniques
- Un espace de stockage privé « host-documents », avec des fichiers rangés dans `{host_id}/...`. Des règles d'accès limitent chaque dossier à son propriétaire.
- Une table `host_documents` (id, host_user_id, name, file_path, mime_type, size_bytes, created_at), avec GRANT et RLS `auth.uid() = host_user_id`.
- Une nouvelle page `src/pages/host/Documents.tsx` (route `/host/documents`), une entrée dans HostSidebar (icône FolderOpen) et le titre « Documents » dans HostLayout.
- L'aperçu utilise une URL signée (1 h) affichée dans une iframe pour les PDF, ou dans une balise img pour les images, à l'intérieur d'un Dialog en plein écran sur mobile.
