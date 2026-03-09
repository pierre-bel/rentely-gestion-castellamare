

## Plan : Réception d'emails dans la messagerie via Resend Inbound

### Architecture

```text
Email entrant → Resend Inbound → Webhook → Edge Function → Table inbox_emails → Affichage dans Inbox
```

### Étapes

#### 1. Créer une table `inbox_emails`
- Colonnes : `id`, `host_id`, `from_email`, `from_name`, `subject`, `body_text`, `body_html`, `received_at`, `read`, `attachments` (jsonb)
- RLS : seul le host propriétaire peut lire ses emails

#### 2. Créer une Edge Function `receive-email`
- Endpoint webhook appelé par Resend Inbound
- Parse le payload (from, to, subject, html, text, attachments)
- Identifie le host destinataire via l'adresse email cible
- Insère le message dans `inbox_emails`
- Sécurisé par un secret webhook partagé

#### 3. Configurer Resend Inbound (côté utilisateur)
- Ajouter un enregistrement MX DNS pour le domaine
- Configurer le webhook Resend pointant vers l'Edge Function
- Stocker le secret webhook dans les secrets du projet

#### 4. Afficher les emails dans l'Inbox existante
- Ajouter un onglet ou filtre "Emails" dans la page Inbox host
- Afficher les emails avec : expéditeur, objet, date, aperçu du corps
- Vue détail avec le contenu HTML de l'email
- Badge de compteur d'emails non lus

### Prérequis utilisateur
- Domaine vérifié sur Resend avec enregistrements MX configurés
- Configuration du webhook Resend Inbound dans le dashboard Resend

### Limitations initiales
- Lecture seule (pas de réponse depuis l'app dans un premier temps)
- Les pièces jointes seront stockées en métadonnées, pas téléchargées dans le storage

