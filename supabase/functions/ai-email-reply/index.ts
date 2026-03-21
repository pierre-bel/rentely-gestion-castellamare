import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { emailId, specificInstructions, rawText, hostId } = await req.json();
    
    // Support two modes: emailId-based (from inbox) or rawText-based (from paste)
    let email: any = null;
    let aiSettings: any = null;
    const effectiveUserId = user.id;

    if (rawText) {
      // Paste mode: no email, just raw text
      const settingsRes = await supabase
        .from("host_ai_settings")
        .select("*")
        .eq("host_user_id", effectiveUserId)
        .maybeSingle();
      aiSettings = settingsRes.data;
      email = {
        from_name: null,
        from_email: "message collé",
        subject: null,
        body_text: rawText,
        body_html: null,
      };
    } else {
      if (!emailId) throw new Error("Missing emailId or rawText");

      const [emailRes, settingsRes] = await Promise.all([
        supabase
          .from("inbox_emails")
          .select("*")
          .eq("id", emailId)
          .eq("host_id", effectiveUserId)
          .single(),
        supabase
          .from("host_ai_settings")
          .select("*")
          .eq("host_user_id", effectiveUserId)
          .maybeSingle(),
      ]);

      email = emailRes.data;
      if (emailRes.error || !email) throw new Error("Email not found");
      aiSettings = settingsRes.data;
    }

    // Fetch host's listings
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, city, address, base_price, bedrooms, beds, bathrooms, guests_max, min_nights, max_nights, cleaning_fee, amenities, checkin_from, checkout_until, description")
      .eq("host_user_id", user.id)
      .eq("status", "approved");

    // Fetch availability for all listings
    const listingIds = (listings || []).map((l: any) => l.id);
    let availability: any[] = [];
    let weeklyPricing: any[] = [];
    let existingBookings: any[] = [];

    if (listingIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];

      const [availRes, pricingRes, bookingsRes] = await Promise.all([
        supabase
          .from("listing_availability")
          .select("listing_id, start_date, end_date")
          .in("listing_id", listingIds)
          .gte("end_date", today)
          .order("start_date"),
        supabase
          .from("listing_weekly_pricing")
          .select("listing_id, week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate")
          .in("listing_id", listingIds)
          .gte("week_start_date", today)
          .order("week_start_date")
          .limit(50),
        supabase
          .from("bookings")
          .select("listing_id, checkin_date, checkout_date, status")
          .in("listing_id", listingIds)
          .in("status", ["confirmed", "pending_payment"])
          .gte("checkout_date", today),
      ]);

      availability = availRes.data || [];
      weeklyPricing = pricingRes.data || [];
      existingBookings = bookingsRes.data || [];
    }

    // Build context for AI
    const listingsContext = (listings || []).map((l: any) => {
      const listingAvail = availability.filter((a: any) => a.listing_id === l.id);
      const listingPricing = weeklyPricing.filter((p: any) => p.listing_id === l.id);
      const listingBookings = existingBookings.filter((b: any) => b.listing_id === l.id);

      return {
        title: l.title,
        city: l.city,
        address: l.address,
        base_price: l.base_price,
        bedrooms: l.bedrooms,
        beds: l.beds,
        bathrooms: l.bathrooms,
        guests_max: l.guests_max,
        min_nights: l.min_nights,
        max_nights: l.max_nights,
        cleaning_fee: l.cleaning_fee,
        checkin_from: l.checkin_from,
        checkout_until: l.checkout_until,
        amenities: l.amenities,
        description: l.description?.substring(0, 300),
        available_periods: listingAvail.map((a: any) => `${a.start_date} → ${a.end_date}`),
        booked_periods: listingBookings.map((b: any) => `${b.checkin_date} → ${b.checkout_date} (${b.status})`),
        weekly_pricing: listingPricing.slice(0, 10).map((p: any) => ({
          week: p.week_start_date,
          weekly: p.weekly_rate,
          weekend: p.weekend_rate,
        })),
      };
    });

    const emailContent = email.body_text || email.body_html?.replace(/<[^>]*>/g, " ") || "";

    // Build tone and language instructions from settings
    const toneValue = aiSettings?.tone || "professionnel et chaleureux";
    const langValue = aiSettings?.language || "fr";
    const customPrompt = aiSettings?.custom_prompt || "";
    const additionalInstructions = aiSettings?.additional_instructions || "";
    const signatureText = aiSettings?.signature || "";
    const pricingExplanation = aiSettings?.pricing_explanation || "";

    const languageInstruction = langValue === "auto"
      ? "Réponds dans la même langue que l'email reçu."
      : `Réponds en ${langValue === "fr" ? "français" : langValue === "en" ? "anglais" : langValue === "nl" ? "néerlandais" : langValue === "de" ? "allemand" : "français"}.`;

    const systemPrompt = `Tu es l'assistant IA d'un propriétaire de locations saisonnières. Tu dois analyser l'email reçu et préparer un brouillon de réponse.

Ton et style : Adopte un ton ${toneValue}.
${languageInstruction}

${customPrompt ? `Contexte fourni par le propriétaire :\n${customPrompt}\n` : ""}
${additionalInstructions ? `Instructions supplémentaires du propriétaire :\n${additionalInstructions}\n` : ""}

Voici les logements du propriétaire et leurs disponibilités/tarifs :
${JSON.stringify(listingsContext, null, 2)}

Date d'aujourd'hui : ${new Date().toISOString().split("T")[0]}

Instructions :
- Analyse la demande dans l'email (dates souhaitées, nombre de personnes, questions, etc.)
- Vérifie la disponibilité en croisant les périodes disponibles et les réservations existantes
- Si des dates sont mentionnées, indique clairement si le logement est disponible ou non
- Si disponible, mentionne le tarif applicable (utilise les tarifs hebdomadaires si disponibles, sinon le prix de base)
- Rédige une réponse prête à envoyer (le propriétaire pourra la modifier avant envoi)
- Si l'email ne concerne pas une demande de réservation, réponds de manière appropriée
- N'invente pas d'informations que tu n'as pas
${specificInstructions ? `\nINSTRUCTIONS SPÉCIFIQUES POUR CE MESSAGE :\n${specificInstructions}\n` : ""}${signatureText ? `- Termine le message avec cette signature : ${signatureText}` : ""}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Email reçu de ${email.from_name || email.from_email} (${email.from_email}):\nObjet: ${email.subject || "(Sans objet)"}\n\n${emailContent}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const draft = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-email-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
