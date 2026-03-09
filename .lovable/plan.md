

## Plan: Formulaire de demande de réservation depuis le simulateur embed

### Objectif
Après une simulation de prix sur la page embed (`/embed/availability/all/:hostId`), proposer un bouton "Envoyer une demande" sur chaque logement disponible. Ce bouton ouvre un formulaire (nom, email, telephone, message libre). A la soumission, un email est envoyé a l'hote avec toutes les informations de la simulation.

### Architecture

**1. Composant formulaire d'inquiry (nouveau fichier)**
- `src/components/embed/BookingInquiryForm.tsx`
- Props : listing title, checkin, checkout, nights, price, hostId, onClose
- Champs : nom complet, email, telephone, message libre (tous requis sauf message)
- Validation avec zod
- Appelle l'edge function `send-booking-inquiry`
- Affiche un etat de succes apres envoi

**2. Integration dans EmbedAllAvailability.tsx**
- Pour chaque resultat disponible avec un prix, ajouter un bouton "Envoyer une demande"
- Au clic, affiche le formulaire inline ou dans un dialog sous le resultat
- Egalement pour le mode `contact_required` (hors samedi-samedi), remplacer/completer le message "contactez-nous" par ce meme formulaire

**3. Edge function `send-booking-inquiry` (nouveau)**
- `supabase/functions/send-booking-inquiry/index.ts`
- Recoit : hostId, listingTitle, checkinDate, checkoutDate, nights, price, guestName, guestEmail, guestPhone, guestMessage
- Recupere l'email de l'hote via `portal_settings.contact_email` ou `profiles.email`
- Envoie un email via Resend a l'hote avec un template HTML formate contenant toutes les infos
- Pas d'auth requise (formulaire public)
- `config.toml` : `verify_jwt = false`

**4. Base de donnees**
- Pas de nouvelle table requise. Les demandes sont envoyees par email uniquement.

### Details du mail envoye a l'hote

Sujet : `Nouvelle demande de reservation - [Listing Title]`

Contenu :
- Logement demande
- Dates (arrivee / depart)
- Nombre de nuits
- Prix affiche dans le simulateur
- Coordonnees du demandeur (nom, email, telephone)
- Message libre
- Lien reply-to vers l'email du demandeur

### Securite
- Rate limiting basique dans l'edge function (pas de secret requis)
- Validation des inputs cote serveur (zod dans l'edge function)
- Le formulaire est public (pas d'auth)

