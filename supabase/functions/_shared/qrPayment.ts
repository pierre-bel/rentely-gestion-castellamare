// Shared SEPA (EPC069-12) QR builders for emails.
export function buildEpc(b: { name: string; iban: string; bic: string }, amount: number, ref: string): string {
  return [
    "BCD", "002", "1", "SCT",
    b.bic.replace(/\s/g, "").toUpperCase(),
    b.name.substring(0, 70),
    b.iban.replace(/\s/g, "").toUpperCase(),
    `EUR${amount.toFixed(2)}`, "", "", ref.substring(0, 140),
  ].join("\n");
}

export function qrBlockHtml(opts: {
  title: string; name: string; iban: string; bic: string; amount: number; ref: string;
  size?: number | null; showDetails?: boolean | null;
}): string {
  if (!(opts.amount > 0)) return "";
  const size = Math.min(300, Math.max(80, Number(opts.size) || 150));
  const data = encodeURIComponent(buildEpc({ name: opts.name, iban: opts.iban, bic: opts.bic }, opts.amount, opts.ref));
  const img = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=4&data=${data}" width="${size}" height="${size}" alt="QR code ${opts.title}" style="display:inline-block;width:${size}px;height:${size}px" />`;
  const p = (l: string, v: string) => `<p style="font-size:12px;color:#6b7280;margin:0 0 2px"><strong>${l} :</strong> ${v}</p>`;
  const details = opts.showDetails === false ? "" :
    `<div style="margin-top:8px">${p("Bénéficiaire", opts.name)}${p("IBAN", opts.iban)}${p("BIC", opts.bic)}${p("Montant", `${opts.amount.toFixed(2)} €`)}${p("Communication", opts.ref)}</div>`;
  return `<div style="text-align:center;margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;display:inline-block"><p style="font-size:13px;color:#374151;margin:0 0 6px"><strong>${opts.title}</strong></p>${img}<p style="font-size:11px;color:#6b7280;margin:6px 0 0">Scannez avec votre application bancaire</p>${details}</div>`;
}
