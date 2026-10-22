import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/** Removes characters forbidden in file names on Windows/macOS. */
const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Contract file name: "Nom du locataire - Nom de l'appartement - Mois de location"
 * e.g. "Dupont - Appartement Mer - Juillet 2026". Missing parts are skipped.
 */
export function buildContractFileName(
  tenantLastName?: string | null,
  listingTitle?: string | null,
  checkinDate?: string | null,
): string {
  let month = "";
  if (checkinDate) {
    try {
      const m = format(parseISO(checkinDate), "LLLL yyyy", { locale: fr });
      month = m.charAt(0).toUpperCase() + m.slice(1);
    } catch {
      month = "";
    }
  }
  const parts = [tenantLastName, listingTitle, month]
    .map((p) => clean(p || ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Contrat";
}
