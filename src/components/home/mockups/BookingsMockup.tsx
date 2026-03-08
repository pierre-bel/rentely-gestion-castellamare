import { Search } from "lucide-react";

const BOOKINGS = [
  { id: "1bbb7bf0", property: "Castellamare - 4ème étage", tenant: "Jean Dupont", dates: "1 août - 7 août 2026", amount: "945,00 €", status: "Confirmée" },
  { id: "46c84d84", property: "Castellamare - 3ème étage", tenant: "Marie Leroy", dates: "3 juil. - 10 juil. 2026", amount: "1 025,00 €", status: "Confirmée" },
  { id: "fe976102", property: "Castellamare - 5ème étage", tenant: "Sophie Martin", dates: "17 avr. - 24 avr. 2026", amount: "625,00 €", status: "Confirmée" },
  { id: "1947ed2b", property: "Castellamare - 3ème étage", tenant: "Pierre Bernard", dates: "8 mai - 15 mai 2026", amount: "465,00 €", status: "Confirmée" },
  { id: "59aaa916", property: "Castellamare - 3ème étage", tenant: "Luc Dumont", dates: "14 juil. - 21 juil. 2026", amount: "780,00 €", status: "En attente" },
];

const BookingsMockup = () => (
  <div className="rounded-2xl border border-border/60 shadow-lg overflow-hidden bg-card text-[10px] leading-tight select-none pointer-events-none">
    {/* Header */}
    <div className="px-4 py-3 border-b border-border/40">
      <h3 className="font-bold text-foreground text-sm mb-3">Réservations</h3>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground text-[9px]">Rechercher par bien ou locataire...</span>
        </div>
        <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-[9px] font-medium">+ Nouvelle réservation</span>
        <span className="border border-border rounded-lg px-2 py-1.5 text-[9px] text-muted-foreground">Filtres</span>
      </div>
    </div>

    {/* Table */}
    <div className="divide-y divide-border/40">
      <div className="grid grid-cols-6 gap-2 px-4 py-2 text-muted-foreground text-[9px] font-medium">
        <span>ID</span>
        <span>Bien</span>
        <span>Locataire</span>
        <span>Dates</span>
        <span>Montant</span>
        <span>Statut</span>
      </div>
      {BOOKINGS.map((b) => (
        <div key={b.id} className="grid grid-cols-6 gap-2 px-4 py-2.5 items-center">
          <span className="text-muted-foreground font-mono">{b.id.slice(0, 8)}</span>
          <span className="text-foreground truncate">{b.property}</span>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary flex-shrink-0">
              {b.tenant.split(" ").map(n => n[0]).join("")}
            </div>
            <span className="text-foreground truncate">{b.tenant}</span>
          </div>
          <span className="text-muted-foreground">{b.dates}</span>
          <span className="text-foreground font-medium">{b.amount}</span>
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium w-fit ${
            b.status === "Confirmée" ? "bg-primary/10 text-primary" : "bg-yellow-100 text-yellow-700"
          }`}>
            {b.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default BookingsMockup;
