const DAYS = ["DI", "LU", "MA", "ME", "JE", "VE", "SA"];
const DATES = Array.from({ length: 31 }, (_, i) => i + 1);

const PROPERTIES = [
  {
    name: "Castellamare - 3ème étage",
    location: "La Panne",
    bookings: [
      { start: 5, end: 8, label: "M. Leroy", color: "bg-primary" },
      { start: 18, end: 24, label: "J. Dupont", color: "bg-primary" },
    ],
  },
  {
    name: "Castellamare - 4ème étage",
    location: "La Panne",
    bookings: [
      { start: 1, end: 3, label: "Test Test", color: "bg-primary/70" },
      { start: 4, end: 6, label: "Test 1", color: "bg-primary" },
      { start: 14, end: 21, label: "S. Martin", color: "bg-primary" },
    ],
  },
  {
    name: "Castellamare - 5ème étage",
    location: "La Panne",
    bookings: [
      { start: 10, end: 16, label: "P. Bernard", color: "bg-primary/70" },
    ],
  },
];

const CalendarMockup = () => (
  <div className="rounded-2xl border border-border/60 shadow-lg overflow-hidden bg-card text-[10px] leading-tight select-none pointer-events-none">
    {/* Header */}
    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-bold text-foreground text-sm">Mars 2026</span>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[9px]">Grille</span>
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">Vue d'ensemble</span>
        </div>
      </div>
      <div className="flex gap-1">
        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-medium">Tous (3)</span>
      </div>
    </div>

    {/* Timeline */}
    <div className="overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-border/40">
        <div className="w-[120px] flex-shrink-0 px-3 py-2 text-muted-foreground font-medium text-[9px]">Biens</div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(31, 1fr)` }}>
          {DATES.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[8px] font-medium ${
                d === 8 ? "bg-primary text-primary-foreground rounded-sm" : "text-muted-foreground"
              }`}
            >
              <div>{DAYS[i % 7]}</div>
              <div>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Property rows */}
      {PROPERTIES.map((prop) => (
        <div key={prop.name} className="flex border-b border-border/30 last:border-0">
          <div className="w-[120px] flex-shrink-0 px-3 py-3">
            <div className="text-foreground font-medium truncate">{prop.name}</div>
            <div className="text-muted-foreground text-[8px]">{prop.location}</div>
          </div>
          <div className="flex-1 relative" style={{ minHeight: "36px" }}>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(31, 1fr)` }}>
              {DATES.map((d) => (
                <div key={d} className="border-l border-border/20" />
              ))}
            </div>
            {prop.bookings.map((b) => (
              <div
                key={b.label + b.start}
                className={`absolute top-1/2 -translate-y-1/2 ${b.color} text-primary-foreground rounded px-1 py-0.5 text-[8px] font-medium truncate`}
                style={{
                  left: `${((b.start - 1) / 31) * 100}%`,
                  width: `${((b.end - b.start + 1) / 31) * 100}%`,
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default CalendarMockup;
