/**
 * PDF export for generated contracts.
 *
 * The HTML is laid out on an A4-width sheet using the same typography as the
 * Word export (Arial 12pt, line-height 1.5), then rasterised page by page.
 * Page breaks are only placed between text lines / table rows / images, every
 * page gets identical margins, and a heading is never left alone at the bottom
 * of a page.
 */

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_X_MM = 20;
const MARGIN_TOP_MM = 18;
const MARGIN_BOTTOM_MM = 18;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_X_MM * 2;
const CONTENT_H_MM = PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;
// 96 dpi: 1mm = 3.7795px
const PX_PER_MM = 96 / 25.4;
const CONTENT_W_PX = Math.round(CONTENT_W_MM * PX_PER_MM);
const CONTENT_H_PX = CONTENT_H_MM * PX_PER_MM;
const RENDER_SCALE = 2;

const SHEET_CSS = `
.cpdf-sheet { width: ${CONTENT_W_PX}px; display: flow-root; background: #fff; color: #000;
  font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5;
  -webkit-font-smoothing: antialiased; word-wrap: break-word; overflow-wrap: break-word; }
.cpdf-sheet * { box-sizing: border-box; }
.cpdf-sheet p { margin: 0; }
.cpdf-sheet h1, .cpdf-sheet h2, .cpdf-sheet h3, .cpdf-sheet h4, .cpdf-sheet h5, .cpdf-sheet h6 {
  margin: 0; line-height: 1.3; font-weight: bold; font-family: Arial, Helvetica, sans-serif; letter-spacing: normal; }
.cpdf-sheet h1 { font-size: 20pt; }
.cpdf-sheet h2 { font-size: 15pt; }
.cpdf-sheet h3 { font-size: 13pt; }
.cpdf-sheet h4 { font-size: 12pt; }
.cpdf-sheet ul, .cpdf-sheet ol { margin: 0; padding-left: 28px; }
.cpdf-sheet ul, .cpdf-sheet ol { margin-bottom: 6pt; }
.cpdf-sheet :is(ul, ol):has(+ p > br:only-child) { margin-bottom: 0; }
.cpdf-sheet li :is(ul, ol) { margin-bottom: 0; }
.cpdf-sheet ul { list-style: disc outside; }
.cpdf-sheet ol { list-style: decimal outside; }
.cpdf-sheet ul ul { list-style-type: circle; }
.cpdf-sheet li { display: list-item; }
.cpdf-sheet li { margin: 0; }
.cpdf-sheet li > p { margin: 0; }
.cpdf-sheet table { border-collapse: collapse; width: 100% !important; min-width: 0 !important; margin: 0; table-layout: auto; }
.cpdf-sheet col { min-width: 0 !important; }
.cpdf-sheet td, .cpdf-sheet th { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }
.cpdf-sheet th { background-color: #f5f5f5; font-weight: bold; }
.cpdf-sheet td p, .cpdf-sheet th p { margin: 0; }
.cpdf-sheet blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin: 12px 0; }
.cpdf-sheet hr { border: 0; border-top: 1px solid #999; margin: 12px 0; }
.cpdf-sheet img { display: inline-block; max-width: 200px; height: auto; }
.cpdf-sheet strong, .cpdf-sheet b { font-weight: bold; }
.cpdf-sheet mark { padding: 0; }
.cpdf-signature { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 16px; }
.cpdf-signature p { font-size: 11px; color: #666; }
.cpdf-signature img { max-height: 80px; max-width: 240px; }
/* html2canvas measures font baselines with a 1x1 probe <img> appended to <body>;
   the app's global reset makes it display:block, which shifts all text down. */
body > div > img[width="1"][height="1"] { display: inline !important; }
`;

/** Empty TipTap paragraphs (`<p></p>`) are blank lines in Word; keep them as such. */
export function normalizeContractHtml(html: string): string {
  return html.replace(/<p([^>]*)>(\s|&nbsp;)*<\/p>/gi, "<p$1><br></p>");
}

interface Atom {
  top: number;
  bottom: number;
  keepWithNext: boolean;
}

/** Collect unbreakable boxes (text lines, images, table rows, rules), relative to the sheet. */
function collectAtoms(sheet: HTMLElement): Atom[] {
  const origin = sheet.getBoundingClientRect().top;
  const atoms: Atom[] = [];
  const isHeading = (el: Element | null) => !!el?.closest("h1,h2,h3,h4,h5,h6");
  // A paragraph introducing a list ("Au départ, le locataire doit :") stays with it
  const introducesList = (el: Element | null) => {
    const p = el?.closest("p");
    if (!p || p.closest("li, td, th")) return false;
    let next = p.nextElementSibling;
    while (next && next.tagName === "P" && !next.textContent?.trim()) next = next.nextElementSibling;
    return !!next && (next.tagName === "UL" || next.tagName === "OL");
  };

  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent || !node.textContent.trim()) continue;
    // Text inside a table row is handled by the row itself
    if (node.parentElement?.closest("tr")) continue;
    range.selectNodeContents(node);
    const keep = isHeading(node.parentElement) || introducesList(node.parentElement);
    for (const r of Array.from(range.getClientRects())) {
      if (r.height <= 0) continue;
      atoms.push({ top: r.top - origin, bottom: r.bottom - origin, keepWithNext: keep });
    }
  }

  sheet.querySelectorAll("tr, img, hr").forEach((el) => {
    if (el.tagName === "IMG" && el.closest("tr")) return;
    const r = el.getBoundingClientRect();
    if (r.height <= 0) return;
    atoms.push({ top: r.top - origin, bottom: r.bottom - origin, keepWithNext: false });
  });

  return atoms.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

/** Compute [start, end) slices (in px) for each page. */
export function computePageSlices(atoms: Atom[], totalHeight: number, pageHeight: number): Array<[number, number]> {
  const EPS = 0.5;
  const crosses = (y: number) => atoms.some((a) => a.top < y - EPS && a.bottom > y + EPS);
  const candidates = Array.from(new Set(atoms.map((a) => Math.ceil(a.bottom)))).sort((a, b) => a - b);

  const slices: Array<[number, number]> = [];
  let start = 0;
  // Skip leading whitespace on the first page too
  const first = atoms.find((a) => a.top >= 0);
  if (first) start = Math.max(0, Math.floor(first.top));

  let guard = 0;
  while (start < totalHeight - 1 && guard++ < 500) {
    const limit = start + pageHeight;
    if (limit >= totalHeight) {
      slices.push([start, totalHeight]);
      break;
    }

    const valid = candidates.filter((c) => c > start + EPS && c <= limit && !crosses(c));
    let cut = valid.length ? valid[valid.length - 1] : limit;

    // Don't leave a heading orphaned at the bottom of the page
    if (valid.length) {
      for (let i = valid.length - 1; i >= 0; i--) {
        const c = valid[i];
        const lastBefore = atoms.filter((a) => a.bottom <= c + EPS).pop();
        if (!lastBefore || !lastBefore.keepWithNext) {
          cut = c;
          break;
        }
        // Only move back if it doesn't empty the page too much
        if (c - start < pageHeight * 0.5) break;
      }
    }

    slices.push([start, cut]);
    // Next page starts at the next real content (no blank band at the top)
    const next = atoms.find((a) => a.top >= cut - EPS);
    if (!next) break;
    start = Math.max(cut, Math.floor(next.top));
  }

  return slices;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

export async function exportContractPdf(options: {
  html: string;
  signatureData?: string | null;
  fileName: string;
  /** Return the PDF instead of downloading it (used for tests). */
  returnBlob?: boolean;
}): Promise<Blob | void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-20000px;top:0;pointer-events:none;";
  const style = document.createElement("style");
  style.textContent = SHEET_CSS;
  host.appendChild(style);

  const sheet = document.createElement("div");
  sheet.className = "cpdf-sheet";
  const signature = options.signatureData
    ? `<div class="cpdf-signature"><p>Signature :</p><img src="${options.signatureData}" alt="Signature" /></div>`
    : "";
  sheet.innerHTML = normalizeContractHtml(options.html) + signature;
  host.appendChild(sheet);
  document.body.appendChild(host);

  try {
    await waitForImages(sheet);
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;

    const totalHeight = Math.ceil(sheet.scrollHeight);
    const slices = computePageSlices(collectAtoms(sheet), totalHeight, CONTENT_H_PX);

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const mmPerPx = CONTENT_W_MM / CONTENT_W_PX;

    for (let i = 0; i < slices.length; i++) {
      const [start, end] = slices[i];
      const height = Math.max(1, Math.ceil(end - start));

      // A window onto the laid-out sheet, showing only this page's band
      const frame = document.createElement("div");
      frame.style.cssText = `width:${CONTENT_W_PX}px;height:${height}px;overflow:hidden;background:#fff;`;
      const clone = sheet.cloneNode(true) as HTMLElement;
      clone.style.marginTop = `${-start}px`;
      frame.appendChild(clone);
      host.appendChild(frame);

      const canvas = await html2canvas(frame, {
        scale: RENDER_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: CONTENT_W_PX,
        height,
        windowWidth: CONTENT_W_PX + 100,
        // The app's global reset makes <img> display:block, which breaks
        // html2canvas' baseline measurement and shifts all text downwards.
        onclone: (doc) => {
          const fix = doc.createElement("style");
          fix.textContent = "img { display: inline-block !important; }";
          doc.head.appendChild(fix);
        },
      });
      host.removeChild(frame);

      if (i > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        MARGIN_X_MM,
        MARGIN_TOP_MM,
        CONTENT_W_MM,
        height * mmPerPx,
        undefined,
        "FAST",
      );
    }

    if (options.returnBlob) return pdf.output("blob");
    pdf.save(`${options.fileName}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
