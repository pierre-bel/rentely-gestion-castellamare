# Revue complète du portail client

## Problèmes constatés
1. **Code Igloohome affiché même si non payé.** Depuis la correction de sécurité d'avril, le portail (visiteur sans compte) ne peut plus lire les échéances de paiement. Il reçoit une liste vide, en conclut « tout est payé » et montre le code. Le code est aussi envoyé au navigateur dans tous les cas.
2. **Échéancier et QR invisibles.** Même cause : la section « Échéancier » et les codes QR de paiement ne s'affichent plus, faute d'échéances.
3. **Heures fausses.** Le portail affiche les heures par défaut de l'appartement, pas celles enregistrées sur la réservation (ni les heures par année).
4. **Nom du locataire.** Il vient du compte qui a créé la réservation (souvent vous), pas du locataire lié.

## Ce qui sera fait
- **Code d'accès :** la mention « Code d'accès » toujours visible ; le code lui-même seulement si toutes les échéances sont payées (ou selon votre réglage « paiement complet requis »). Le calcul se fait côté serveur : le code n'est jamais transmis tant que ce n'est pas payé.
- **Échéancier :** de nouveau affiché, avec statut payé / à payer et dates au format JJ-MM-AAAA.
- **Codes QR de paiement :** sous l'échéancier, un QR par échéance non payée (acompte, décompte…), plus un QR « reste à payer », à la taille et avec les détails choisis dans Paiements → Paramètres. Communication « - Acompte » / « - Décompte » comme dans les e-mails. Nouveau réglage dans les paramètres du portail : afficher ou non les QR.
- **Heures :** priorité aux heures de la réservation, puis aux heures de l'année, puis à celles de l'appartement.
- **Nom :** locataire lié à la réservation en priorité.
- **Montants :** vérification que tout suit le réglage « sans décimales ».
- **Test** sur plusieurs vraies réservations (payée, partiellement payée, avec heures personnalisées) en ouvrant le portail sans être connecté.

## Détails techniques
- Étendre `get_booking_portal` (SECURITY DEFINER) : renvoyer `checkin_time`/`checkout_time` de la réservation, heures annuelles (`listing_yearly_stay_times`), nom du tenant (`pricing_breakdown.tenant_id`), `is_fully_paid`, et `igloohome_code` à NULL si non payé selon `require_full_payment_for_access_code`.
- Nouvelle RPC `get_portal_payment_items(_access_token)` SECURITY DEFINER (label, montant, échéance, payé) — aucune réouverture de la table aux anonymes.
- Colonne `portal_settings.show_payment_qr` (défaut true) + interrupteur dans les réglages du portail ; vue `public_portal_settings` mise à jour.
- `BookingPortal.tsx` : utiliser ces données, `PaymentQRCode` avec `qr_size`/`qr_show_details`, `formatEuro` partout.
