import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { text, listings } = await req.json();
    if (!text) throw new Error("text is required");

    const listingsContext = (listings || [])
      .map((l: { id: string; title: string }) => `- id: "${l.id}", title: "${l.title}"`)
      .join("\n");

    const systemPrompt = `You are a data extraction assistant. Extract booking request information from the provided text (email or message).
Return structured data using the extract_booking_info tool. Extract as much as possible; leave fields null if not found.
For dates, use ISO format (YYYY-MM-DD). For listing_id, match the mentioned property name against this list:
${listingsContext || "(no listings provided)"}
If the text mentions an apartment/property name, try to match it to the closest listing title and return its id.
The text may be in French, Dutch, English, or other languages.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_booking_info",
                description:
                  "Extract structured booking request information from the text.",
                parameters: {
                  type: "object",
                  properties: {
                    first_name: {
                      type: "string",
                      description: "Guest first name",
                    },
                    last_name: {
                      type: "string",
                      description: "Guest last name",
                    },
                    email: {
                      type: "string",
                      description: "Guest email address",
                    },
                    phone: {
                      type: "string",
                      description: "Guest phone number",
                    },
                    checkin_date: {
                      type: "string",
                      description: "Check-in date in YYYY-MM-DD format",
                    },
                    checkout_date: {
                      type: "string",
                      description: "Check-out date in YYYY-MM-DD format",
                    },
                    listing_id: {
                      type: "string",
                      description:
                        "ID of the matched listing from the provided list",
                    },
                    listing_hint: {
                      type: "string",
                      description:
                        "The property/apartment name as mentioned in the text",
                    },
                    street: { type: "string", description: "Street name" },
                    street_number: { type: "string", description: "Street number" },
                    postal_code: { type: "string", description: "Postal code" },
                    city: { type: "string", description: "City" },
                    country: { type: "string", description: "Country" },
                    guests: {
                      type: "number",
                      description: "Number of guests",
                    },
                    notes: {
                      type: "string",
                      description:
                        "Any additional relevant information or special requests",
                    },
                  },
                  required: [],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_booking_info" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please retry later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-booking-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
