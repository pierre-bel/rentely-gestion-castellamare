export interface DefaultEmailTemplate {
  name: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  trigger_days: number;
  recipient_type: string;
  send_if_late: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    name: "Confirmation de réservation",
    subject: "Confirmation de votre réservation – {{listing_title}}",
    trigger_type: "booking_confirmed",
    trigger_days: 0,
    recipient_type: "tenant",
    send_if_late: true,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Nous avons le plaisir de vous confirmer votre réservation pour <strong>{{listing_title}}</strong>.</p>
<h3>📋 Récapitulatif</h3>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Arrivée</td><td style="padding:8px;border:1px solid #e5e7eb">{{checkin_date}}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Départ</td><td style="padding:8px;border:1px solid #e5e7eb">{{checkout_date}}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Durée</td><td style="padding:8px;border:1px solid #e5e7eb">{{nights}} nuit(s)</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Montant total</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>{{total_price}}</strong></td></tr>
</table>
<h3>💳 Paiement</h3>
<p>Voici les détails de votre échéancier :</p>
<ul>
  <li><strong>Acompte :</strong> {{deposit_amount}} — à régler avant le {{deposit_due_date}}</li>
  <li><strong>Solde :</strong> {{balance_amount}} — à régler avant le {{balance_due_date}}</li>
</ul>
{{qr_paiement}}
<p>Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.</p>
<p>Cordialement,<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Rappel de paiement – Acompte",
    subject: "Rappel : acompte à régler – {{listing_title}}",
    trigger_type: "days_before_checkin",
    trigger_days: 30,
    recipient_type: "tenant",
    send_if_late: false,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Nous nous permettons de vous rappeler que le paiement de l'acompte pour votre séjour à <strong>{{listing_title}}</strong> est attendu.</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Montant</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>{{deposit_amount}}</strong></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Échéance</td><td style="padding:8px;border:1px solid #e5e7eb">{{deposit_due_date}}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Séjour</td><td style="padding:8px;border:1px solid #e5e7eb">{{checkin_date}} → {{checkout_date}}</td></tr>
</table>
{{qr_paiement}}
<p>Si le paiement a déjà été effectué, veuillez ne pas tenir compte de ce rappel.</p>
<p>Cordialement,<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Rappel de paiement – Solde",
    subject: "Rappel : solde à régler – {{listing_title}}",
    trigger_type: "days_before_checkin",
    trigger_days: 14,
    recipient_type: "tenant",
    send_if_late: false,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Votre séjour à <strong>{{listing_title}}</strong> approche ! Nous vous rappelons que le solde de votre réservation reste à régler.</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Montant du solde</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>{{balance_amount}}</strong></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Échéance</td><td style="padding:8px;border:1px solid #e5e7eb">{{balance_due_date}}</td></tr>
</table>
{{qr_paiement}}
<p>Merci de procéder au règlement dans les meilleurs délais afin de finaliser votre réservation.</p>
<p>Cordialement,<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Informations d'arrivée",
    subject: "Préparez votre arrivée – {{listing_title}}",
    trigger_type: "days_before_checkin",
    trigger_days: 3,
    recipient_type: "tenant",
    send_if_late: true,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Votre séjour à <strong>{{listing_title}}</strong> approche ! Voici les informations pratiques pour préparer votre arrivée.</p>
<h3>📍 Adresse</h3>
<p>{{listing_address}}, {{listing_city}}</p>
<h3>🕐 Horaires</h3>
<ul>
  <li><strong>Arrivée :</strong> {{checkin_date}} — à partir de 16h00</li>
  <li><strong>Départ :</strong> {{checkout_date}} — avant 10h00</li>
</ul>
<h3>📦 À prévoir</h3>
<ul>
  <li>Les draps et serviettes sont fournis</li>
  <li>Le ménage de fin de séjour est inclus</li>
  <li>Un état des lieux sera réalisé à votre arrivée</li>
</ul>
<p>Vous recevrez le code d'accès au logement la veille de votre arrivée, sous réserve du paiement intégral de votre séjour.</p>
<p>N'hésitez pas à nous contacter si vous avez des questions.</p>
<p>Bon voyage !<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Code d'accès au logement",
    subject: "Votre code d'accès – {{listing_title}}",
    trigger_type: "days_before_checkin",
    trigger_days: 1,
    recipient_type: "tenant",
    send_if_late: true,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Nous vous souhaitons la bienvenue ! Voici les informations pour accéder à votre logement <strong>{{listing_title}}</strong>.</p>
<h3>🔑 Accès</h3>
<p>Votre code d'accès ainsi que toutes les informations de votre séjour sont disponibles sur votre portail personnel. Si vous n'avez pas encore reçu le lien, n'hésitez pas à nous contacter.</p>
<h3>📍 Rappel de l'adresse</h3>
<p>{{listing_address}}, {{listing_city}}</p>
<h3>📞 En cas de besoin</h3>
<p>Nous restons joignables en cas de problème à votre arrivée.</p>
<p>Excellent séjour !<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Bienvenue – Pendant votre séjour",
    subject: "Bienvenue à {{listing_title}} – Tout se passe bien ?",
    trigger_type: "days_after_checkin",
    trigger_days: 1,
    recipient_type: "tenant",
    send_if_late: false,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Nous espérons que votre installation à <strong>{{listing_title}}</strong> s'est bien passée et que vous profitez de votre séjour !</p>
<p>Si vous rencontrez le moindre souci ou si vous avez besoin d'informations sur les activités et restaurants à proximité, n'hésitez surtout pas à nous contacter.</p>
<h3>📌 Rappels utiles</h3>
<ul>
  <li>Le tri sélectif est de rigueur — les bacs se trouvent à l'entrée de la résidence</li>
  <li>Merci de respecter le voisinage, en particulier après 22h</li>
  <li>En cas d'urgence technique (panne, fuite…), contactez-nous immédiatement</li>
</ul>
<p>Nous vous souhaitons un excellent séjour !</p>
<p>L'équipe de gestion</p>`,
  },
  {
    name: "Rappel de départ",
    subject: "Rappel : départ demain – {{listing_title}}",
    trigger_type: "days_before_checkout",
    trigger_days: 1,
    recipient_type: "tenant",
    send_if_late: false,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Votre séjour à <strong>{{listing_title}}</strong> touche à sa fin. Voici quelques rappels pour faciliter votre départ.</p>
<h3>🕐 Départ</h3>
<p><strong>{{checkout_date}}</strong> — avant 10h00</p>
<h3>✅ Avant de partir</h3>
<ul>
  <li>Merci de laisser le logement dans un état raisonnable</li>
  <li>Vaisselle lavée ou mise au lave-vaisselle</li>
  <li>Poubelles vidées</li>
  <li>Fenêtres et volets fermés</li>
  <li>Clés / télécommandes remises en place</li>
  <li>Éteindre les lumières, la climatisation et le chauffage</li>
</ul>
<p>Nous vous remercions pour votre séjour et espérons vous revoir bientôt !</p>
<p>L'équipe de gestion</p>`,
  },
  {
    name: "Remerciement et avis",
    subject: "Merci pour votre séjour – {{listing_title}}",
    trigger_type: "days_after_checkout",
    trigger_days: 1,
    recipient_type: "tenant",
    send_if_late: false,
    body_html: `<p>{{guest_civility}} {{guest_last_name}},</p>
<p>Nous espérons que votre séjour à <strong>{{listing_title}}</strong> vous a plu !</p>
<p>Votre avis compte beaucoup pour nous. N'hésitez pas à partager votre expérience — cela nous aide à améliorer continuellement la qualité de nos services.</p>
<p>Vous pouvez laisser un avis directement sur votre portail de réservation.</p>
<p>Nous serions ravis de vous accueillir à nouveau. À bientôt !</p>
<p>Cordialement,<br/>L'équipe de gestion</p>`,
  },
  {
    name: "Notification hôte – Nouvelle réservation",
    subject: "🔔 Nouvelle réservation – {{listing_title}} – {{checkin_date}}",
    trigger_type: "booking_confirmed",
    trigger_days: 0,
    recipient_type: "host",
    send_if_late: true,
    body_html: `<p>Bonjour,</p>
<p>Une nouvelle réservation vient d'être enregistrée :</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Logement</td><td style="padding:8px;border:1px solid #e5e7eb">{{listing_title}}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Locataire</td><td style="padding:8px;border:1px solid #e5e7eb">{{guest_full_name}}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Dates</td><td style="padding:8px;border:1px solid #e5e7eb">{{checkin_date}} → {{checkout_date}} ({{nights}} nuits)</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Montant total</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>{{total_price}}</strong></td></tr>
</table>
<p>Pensez à vérifier les paiements et à préparer le logement.</p>
<p>Bonne gestion !</p>`,
  },
];
