const VARIABLES = [
  "{{guest_first_name}}",
  "{{guest_last_name}}",
  "{{guest_email}}",
  "{{checkin_date}}",
  "{{checkin_time}}",
  "{{checkout_date}}",
  "{{checkout_time}}",
  "{{nights}}",
  "{{total_price}}",
  "{{listing_title}}",
  "{{listing_address}}",
  "{{listing_city}}",
];

const AUTOMATIONS = [
  { name: "Avant votre séjour", properties: "Tous les biens", trigger: "8 jours avant l'arrivée", recipient: "Locataire", enabled: true },
  { name: "Confirmation réservation", properties: "Tous les biens", trigger: "À la confirmation de réservation", recipient: "Locataire", enabled: true },
  { name: "Rappel de paiement", properties: "Tous les biens", trigger: "3 jours avant échéance", recipient: "Locataire", enabled: false },
];

const EmailsMockup = () => (
  <div className="rounded-2xl border border-border/60 shadow-lg overflow-hidden bg-card text-[10px] leading-tight select-none pointer-events-none">
    {/* Header */}
    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
      <h3 className="font-bold text-foreground text-sm">E-mails automatiques</h3>
      <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-[9px] font-medium">+ Nouveau modèle</span>
    </div>

    {/* Variables */}
    <div className="px-4 py-3 border-b border-border/40">
      <div className="text-muted-foreground text-[9px] font-medium mb-2">Variables dynamiques disponibles</div>
      <div className="flex flex-wrap gap-1">
        {VARIABLES.map((v) => (
          <span key={v} className="inline-flex items-center bg-muted rounded px-1.5 py-0.5 text-[8px] text-muted-foreground font-mono">
            {v}
          </span>
        ))}
      </div>
    </div>

    {/* Table */}
    <div className="divide-y divide-border/40">
      <div className="grid grid-cols-5 gap-2 px-4 py-2 text-muted-foreground text-[9px] font-medium">
        <span>Nom</span>
        <span>Bien(s)</span>
        <span>Déclencheur</span>
        <span>Destinataire</span>
        <span>Actif</span>
      </div>
      {AUTOMATIONS.map((a) => (
        <div key={a.name} className="grid grid-cols-5 gap-2 px-4 py-3 items-center">
          <span className="text-foreground font-medium">{a.name}</span>
          <span className="text-muted-foreground">{a.properties}</span>
          <span className="inline-flex items-center border border-border rounded px-1.5 py-0.5 text-[8px] text-muted-foreground w-fit">
            {a.trigger}
          </span>
          <span className="text-muted-foreground">{a.recipient}</span>
          <div className={`h-4 w-7 rounded-full relative ${a.enabled ? "bg-primary" : "bg-muted"}`}>
            <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${a.enabled ? "right-0.5" : "left-0.5"}`} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default EmailsMockup;
