import { z } from "zod";

// ─── Generic result ───
export interface ValidationResult {
  valid: boolean;
  error: string;
}

function ok(): ValidationResult {
  return { valid: true, error: "" };
}

function fail(msg: string): ValidationResult {
  return { valid: false, error: msg };
}

function fromZod<T>(schema: z.ZodType<T>, data: unknown): ValidationResult {
  const result = schema.safeParse(data);
  if (result.success) return ok();
  return fail(result.error.issues[0]?.message ?? "Validation échouée");
}

// ─── LISTINGS ───

const listingSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "Le titre ne doit pas dépasser 200 caractères"),
  base_price: z.number({ invalid_type_error: "Le prix doit être un nombre" }).min(0, "Le prix doit être ≥ 0"),
  cleaning_fee: z.number().min(0, "Les frais de ménage doivent être ≥ 0").optional().nullable(),
  security_deposit: z.number().min(0, "La caution doit être ≥ 0").optional().nullable(),
  address: z.string().trim().min(1, "L'adresse est requise").max(500, "L'adresse ne doit pas dépasser 500 caractères"),
  city: z.string().trim().min(1, "La ville est requise"),
  guests_max: z.number().int("Le nombre de voyageurs doit être entier").min(1, "Au moins 1 voyageur requis"),
  bedrooms: z.number().int().min(0, "Le nombre de chambres doit être ≥ 0").optional().nullable(),
  beds: z.number().int().min(0, "Le nombre de lits doit être ≥ 0").optional().nullable(),
  bathrooms: z.number().int().min(0, "Le nombre de salles de bain doit être ≥ 0").optional().nullable(),
  min_nights: z.number().int().min(1, "Le minimum de nuits doit être ≥ 1").optional().nullable(),
  max_nights: z.number().int().min(1, "Le maximum de nuits doit être ≥ 1").optional().nullable(),
  weekly_discount: z.number().min(0, "La réduction hebdo doit être ≥ 0").max(100, "La réduction hebdo doit être ≤ 100").optional().nullable(),
  monthly_discount: z.number().min(0, "La réduction mensuelle doit être ≥ 0").max(100, "La réduction mensuelle doit être ≤ 100").optional().nullable(),
  description: z.string().max(5000, "La description ne doit pas dépasser 5000 caractères").optional().nullable(),
  house_rules: z.string().max(3000, "Les règles ne doivent pas dépasser 3000 caractères").optional().nullable(),
});

export function validateListing(data: Record<string, any>): ValidationResult {
  return fromZod(listingSchema, data);
}

export function validateListingTitle(title: string): ValidationResult {
  if (!title.trim()) return fail("Le titre est requis");
  if (title.length > 200) return fail("Le titre ne doit pas dépasser 200 caractères");
  return ok();
}

export function validateListingPrice(price: number | null | undefined): ValidationResult {
  if (price == null) return fail("Le prix est requis");
  if (typeof price !== "number" || isNaN(price)) return fail("Le prix doit être un nombre");
  if (price < 0) return fail("Le prix doit être ≥ 0");
  return ok();
}

// ─── BOOKINGS ───

const bookingSchema = z.object({
  checkin_date: z.string().min(1, "La date d'arrivée est requise"),
  checkout_date: z.string().min(1, "La date de départ est requise"),
  guest_user_id: z.string().uuid("L'identifiant du voyageur est invalide"),
  listing_id: z.string().uuid("L'identifiant du logement est invalide"),
  guests: z.number().int().min(1, "Au moins 1 voyageur requis"),
  nights: z.number().int().min(1, "Au moins 1 nuit requise"),
  subtotal: z.number().min(0, "Le sous-total doit être ≥ 0"),
  total_price: z.number().min(0, "Le prix total doit être ≥ 0"),
}).refine(
  (d) => d.checkout_date > d.checkin_date,
  { message: "La date de départ doit être après la date d'arrivée", path: ["checkout_date"] }
);

export function validateBooking(data: Record<string, any>): ValidationResult {
  return fromZod(bookingSchema, data);
}

export function validateBookingDates(checkin: string, checkout: string): ValidationResult {
  if (!checkin) return fail("La date d'arrivée est requise");
  if (!checkout) return fail("La date de départ est requise");
  if (checkout <= checkin) return fail("La date de départ doit être après la date d'arrivée");
  return ok();
}

// ─── TRANSACTIONS ───

const VALID_TRANSACTION_STATUSES = ["pending", "completed", "failed", "refunded", "cancelled"] as const;

const transactionSchema = z.object({
  amount: z.number({ invalid_type_error: "Le montant doit être un nombre" }).positive("Le montant doit être > 0"),
  status: z.enum(VALID_TRANSACTION_STATUSES, { errorMap: () => ({ message: `Le statut doit être l'un de : ${VALID_TRANSACTION_STATUSES.join(", ")}` }) }),
  booking_id: z.string().uuid("L'identifiant de la réservation est invalide").optional().nullable(),
  currency: z.string().min(1, "La devise est requise").max(10, "La devise est invalide").optional().nullable(),
});

export function validateTransaction(data: Record<string, any>): ValidationResult {
  return fromZod(transactionSchema, data);
}

export function validateTransactionAmount(amount: number | null | undefined): ValidationResult {
  if (amount == null) return fail("Le montant est requis");
  if (typeof amount !== "number" || isNaN(amount)) return fail("Le montant doit être un nombre");
  if (amount <= 0) return fail("Le montant doit être > 0");
  return ok();
}

export function validateTransactionStatus(status: string): ValidationResult {
  if (!VALID_TRANSACTION_STATUSES.includes(status as any)) {
    return fail(`Le statut doit être l'un de : ${VALID_TRANSACTION_STATUSES.join(", ")}`);
  }
  return ok();
}

// ─── GENERIC HELPERS ───

export function validateRequired(value: any, fieldName: string): ValidationResult {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return fail(`${fieldName} est requis`);
  }
  return ok();
}

export function validateEmail(email: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return fail("L'email est requis");
  if (!re.test(email)) return fail("L'email est invalide");
  return ok();
}

export function validateUUID(id: string, fieldName = "ID"): ValidationResult {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!re.test(id)) return fail(`${fieldName} est invalide`);
  return ok();
}
