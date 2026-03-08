import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays, Users, Home, Euro, MapPin, Clock,
  ShieldCheck, Bed, Bath, DoorOpen, CheckCircle2, XCircle,
  KeyRound, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

const formatPrice = (price: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  return `${h}h${m !== "00" ? m : ""}`;
}

interface PortalData {
  booking_id: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  subtotal: number;
  cleaning_fee: number | null;
  service_fee: number | null;
  taxes: number | null;
  pricing_breakdown: any;
  igloohome_code: string | null;
  notes: string | null;
  currency: string | null;
  listing_title: string;
  cover_image: string | null;
  listing_images: string[] | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  checkin_from: string | null;
  checkout_until: string | null;
  house_rules: string | null;
  property_type: string;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: string[] | null;
}

interface PaymentItem {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  sort_order: number;
}

interface PortalSettings {
  welcome_message: string | null;
  show_price: boolean;
  show_address: boolean;
  show_house_rules: boolean;
  show_access_code: boolean;
  show_payment_schedule: boolean;
  show_amenities: boolean;
  show_map_link: boolean;
  custom_footer_text: string | null;
  section_order: string[];
  require_full_payment_for_access_code: boolean;
}

interface CustomSectionData {
  section_key: string;
  title: string;
  body_html: string;
}

const DEFAULT_SETTINGS: PortalSettings = {
  welcome_message: null,
  show_price: true,
  show_address: true,
  show_house_rules: true,
  show_access_code: true,
  show_payment_schedule: true,
  show_amenities: true,
  show_map_link: true,
  custom_footer_text: null,
  section_order: ["dates", "access_code", "address", "amenities", "pricing", "payment_schedule", "house_rules"],
  require_full_payment_for_access_code: true,
};

export default function BookingPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS);
  const [customSections, setCustomSections] = useState<CustomSectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: portal, error: err } = await supabase
        .from("public_booking_portal")
        .select("*")
        .eq("access_token", token)
        .maybeSingle();

      if (err || !portal) {
        setError(true);
        setLoading(false);
        return;
      }

      setData(portal as unknown as PortalData);

      const bookingId = (portal as any).booking_id;
      const { data: bookingRow } = await supabase
        .from("bookings")
        .select("listing_id, listings(host_user_id)")
        .eq("id", bookingId)
        .maybeSingle();

      const hostUserId = (bookingRow as any)?.listings?.host_user_id;

      const [paymentsRes, settingsRes, customRes] = await Promise.all([
        supabase.from("booking_payment_items").select("*").eq("booking_id", bookingId).order("sort_order"),
        hostUserId
          ? supabase.from("public_portal_settings").select("*").eq("host_user_id", hostUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        hostUserId
          ? supabase.from("public_portal_custom_sections").select("*").eq("host_user_id", hostUserId).order("sort_order")
          : Promise.resolve({ data: null }),
      ]);

      if (paymentsRes.data) setPayments(paymentsRes.data as PaymentItem[]);
      if (settingsRes.data) {
        const s = settingsRes.data as any;
        setSettings({
          ...s,
          section_order: s.section_order || DEFAULT_SETTINGS.section_order,
        });
      }
      if (customRes.data) setCustomSections(customRes.data as CustomSectionData[]);

      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Portail introuvable</h1>
            <p className="text-sm text-muted-foreground">Ce lien de réservation n'est pas valide ou a expiré.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const checkin = parseISO(data.checkin_date);
  const checkout = parseISO(data.checkout_date);
  const heroImage = data.cover_image || data.listing_images?.[0];
  const fullAddress = [data.address, data.postal_code, data.city, data.state, data.country].filter(Boolean).join(", ");

  // Section renderers
  const renderDates = () => (
    <Card key="dates">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Séjour</p>
            <p className="text-sm font-semibold mt-1">{format(checkin, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-xs text-muted-foreground">→</p>
            <p className="text-sm font-semibold">{format(checkout, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.nights} nuit{data.nights > 1 ? "s" : ""}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          {data.checkin_from && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="text-sm font-medium">à partir de {formatTime(data.checkin_from)}</p>
              </div>
            </div>
          )}
          {data.checkout_until && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium">avant {formatTime(data.checkout_until)}</p>
              </div>
            </div>
          )}
        </div>
        <Separator />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm">{data.guests} voyageur{data.guests > 1 ? "s" : ""}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderAccessCode = () => {
    if (!settings.show_access_code || !data.igloohome_code) return null;
    return (
      <Card key="access_code" className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Code d'accès</p>
              <p className="text-lg font-bold font-mono tracking-widest text-primary mt-1">{data.igloohome_code}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAddress = () => {
    if (!settings.show_address) return null;
    return (
      <Card key="address">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Adresse</p>
              <p className="text-sm font-medium mt-1">{fullAddress}</p>
            </div>
          </div>
          {settings.show_map_link && data.latitude && data.longitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Ouvrir dans Google Maps →
            </a>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAmenities = () => {
    if (!settings.show_amenities) return null;
    return (
      <Card key="amenities">
        <CardContent className="pt-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Le logement</p>
          <div className="flex flex-wrap gap-3">
            {data.bedrooms != null && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <DoorOpen className="h-3.5 w-3.5" /> {data.bedrooms} chambre{data.bedrooms > 1 ? "s" : ""}
              </Badge>
            )}
            {data.beds != null && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Bed className="h-3.5 w-3.5" /> {data.beds} lit{data.beds > 1 ? "s" : ""}
              </Badge>
            )}
            {data.bathrooms != null && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Bath className="h-3.5 w-3.5" /> {data.bathrooms} sdb
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPricing = () => {
    if (!settings.show_price) return null;
    return (
      <Card key="pricing">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Euro className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tarification</p>
          </div>
          {data.subtotal > 0 && (
            <div className="flex justify-between text-sm">
              <span>Hébergement</span>
              <span>{formatPrice(data.subtotal, data.currency || "EUR")}</span>
            </div>
          )}
          {data.cleaning_fee != null && data.cleaning_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Frais de ménage</span>
              <span>{formatPrice(data.cleaning_fee, data.currency || "EUR")}</span>
            </div>
          )}
          {data.service_fee != null && data.service_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Frais de service</span>
              <span>{formatPrice(data.service_fee, data.currency || "EUR")}</span>
            </div>
          )}
          {data.taxes != null && data.taxes > 0 && (
            <div className="flex justify-between text-sm">
              <span>Taxes</span>
              <span>{formatPrice(data.taxes, data.currency || "EUR")}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>{formatPrice(data.total_price, data.currency || "EUR")}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPaymentSchedule = () => {
    if (!settings.show_payment_schedule || payments.length === 0) return null;
    return (
      <Card key="payment_schedule">
        <CardContent className="pt-5 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Échéancier de paiement</p>
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {p.is_paid ? (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                )}
                <div>
                  <span className={p.is_paid ? "line-through text-muted-foreground" : ""}>{p.label}</span>
                  {p.due_date && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      — {format(parseISO(p.due_date), "d MMM yyyy", { locale: fr })}
                    </span>
                  )}
                </div>
              </div>
              <span className={p.is_paid ? "text-muted-foreground" : "font-medium"}>
                {formatPrice(p.amount, data.currency || "EUR")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderHouseRules = () => {
    if (!settings.show_house_rules || !data.house_rules) return null;
    return (
      <Card key="house_rules">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Règles de la maison</p>
          </div>
          <p className="text-sm whitespace-pre-line text-foreground/90">{data.house_rules}</p>
        </CardContent>
      </Card>
    );
  };


  const renderCustomSection = (key: string) => {
    const sectionKey = key.replace("custom_", "");
    const cs = customSections.find((s) => s.section_key === sectionKey);
    if (!cs) return null;
    return (
      <Card key={key}>
        <CardContent className="pt-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{cs.title}</p>
          <div className="text-sm whitespace-pre-line text-foreground/90">{cs.body_html}</div>
        </CardContent>
      </Card>
    );
  };

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    dates: renderDates,
    access_code: renderAccessCode,
    address: renderAddress,
    amenities: renderAmenities,
    pricing: renderPricing,
    payment_schedule: renderPaymentSchedule,
    house_rules: renderHouseRules,
    
  };

  const sectionOrder = settings.section_order.length > 0 ? settings.section_order : DEFAULT_SETTINGS.section_order;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-muted">
        {heroImage ? (
          <img src={heroImage} alt={data.listing_title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-xl sm:text-2xl font-bold drop-shadow-md">{data.listing_title}</h1>
          <p className="text-sm opacity-90 flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" /> {data.city}{data.state ? `, ${data.state}` : ""}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome message */}
        {settings.welcome_message && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-foreground/90 whitespace-pre-line">{settings.welcome_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <div className="flex items-center justify-between">
          <StatusBadge status={data.status as StatusValue} />
          <span className="text-xs text-muted-foreground font-mono">{data.booking_id.slice(0, 8)}</span>
        </div>

        {/* Sections in configured order */}
        {sectionOrder.map((key) => {
          if (key.startsWith("custom_")) {
            return renderCustomSection(key);
          }
          const renderer = sectionRenderers[key];
          return renderer ? renderer() : null;
        })}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          {settings.custom_footer_text || "Ce portail est réservé au locataire de cette réservation."}
        </p>
      </div>
    </div>
  );
}
