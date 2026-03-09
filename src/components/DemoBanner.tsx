import { Info, X } from "lucide-react";
import { useState } from "react";
import { isDemoActive, getDemoState } from "@/lib/demoMode";

const DemoBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoActive() || dismissed) return null;

  const state = getDemoState();
  const roleLabel = state?.role === "host" ? "Hôte" : "Administrateur";

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>
          <strong>Mode démonstration ({roleLabel})</strong> — Les données affichées sont fictives. Aucun e-mail ne sera envoyé et aucune action réelle ne sera effectuée.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded hover:bg-amber-200/60 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default DemoBanner;
