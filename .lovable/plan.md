# Passer au nouveau connecteur Gmail (une boîte par propriétaire)

## Objectif
Remplacer la connexion Gmail actuelle, qui expire régulièrement, par le connecteur Gmail « par utilisateur ». Chaque propriétaire connecte sa propre boîte. Le renouvellement des accès est géré automatiquement. Gmail reste utilisable normalement en dehors du logiciel.

## Ce que verra Pierre
- Dans Messages : un bouton « Connecter Gmail » ouvre une petite fenêtre Google. Une fois l'accès accordé, la boîte est connectée durablement.
- Les e-mails se synchronisent comme aujourd'hui (bouton Synchroniser).
- Les réponses proposées par l'IA peuvent être **envoyées depuis Gmail** après validation (nouveau : aujourd'hui, l'envoi est impossible car l'accès est en lecture seule). La réponse apparaît dans le dossier « Envoyés » de Gmail, dans la même conversation.
- La création de réservation à partir d'un e-mail reste identique.
- Si Google demande un jour de renouveler l'accès, un bouton « Reconnecter Gmail » s'affiche avec un message clair, au lieu d'une erreur.
- Un bouton « Déconnecter Gmail » retire l'autorisation.

## Étapes
1. Relier le connecteur Gmail par utilisateur au projet (une fenêtre d'approbation s'affichera ; un client Google doit être configuré dans les paramètres de l'espace de travail).
2. Nouveau stockage sécurisé et chiffré de la connexion de chaque propriétaire.
3. Nouveau flux de connexion et de déconnexion dans Messages.
4. Synchronisation des e-mails réécrite pour passer par le connecteur (même tri qu'aujourd'hui : boîte de réception, sans brouillons ni envoyés, 20 nouveaux e-mails max par synchro).
5. Bouton « Envoyer via Gmail » sur la réponse IA, en réponse dans le même fil.
6. Retrait de l'ancienne connexion (anciens accès supprimés) ; les e-mails déjà importés sont conservés.
7. Test de bout en bout avec le compte propriétaire.

## À faire côté Google (important)
- Ajouter l'adresse de retour du connecteur dans le client Google : `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`.
- **Publier l'application Google** (Google Auth Platform > Audience > Publish app). Tant qu'elle est en « Test », Google coupe l'accès au bout de 7 jours — c'est très probablement la cause des expirations actuelles.
- Activer l'accès hors ligne sur le client dans les paramètres du connecteur.

## Détails techniques
- Connecteur `google_mail`, scopes : userinfo.email, userinfo.profile, gmail.readonly, gmail.send.
- Table `app_user_connections` (clé chiffrée AES-GCM, accès service_role uniquement) ; état « reconnexion requise » stocké pour l'affichage.
- Fonctions : app-user-oauth-start, app-user-oauth-complete, gmail-disconnect, sync-gmail-inbox (réécrite via callAsAppUser, lecture par lots), gmail-send-reply (RFC 2822, In-Reply-To/References, threadId).
- Page de retour `/oauth/gmail/return` (popup, postMessage même origine).
- `useInboxEmails` : état connecté lu via une fonction serveur ; table `gmail_tokens` et fonctions gmail-oauth-start/callback supprimées après bascule.
- Mémoire Gmail OAuth mise à jour (lecture + envoi, connecteur par utilisateur).
