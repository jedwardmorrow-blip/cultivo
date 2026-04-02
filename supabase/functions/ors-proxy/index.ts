import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Authenticate caller via Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Read ORS key from edge function secret — never from app_settings
    const orsKey = Deno.env.get("ORS_API_KEY");
    if (!orsKey) {
      return new Response(JSON.stringify({ error: "ORS_API_KEY secret not configured" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { operation } = body;

    if (operation === "geocode") {
      const { text } = body;
      if (!text) {
        return new Response(JSON.stringify({ error: "Missing required field: text" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const orsUrl = `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(text)}`;
      const orsRes = await fetch(orsUrl);
      const orsData = await orsRes.json();

      return new Response(JSON.stringify(orsData), {
        status: orsRes.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (operation === "route") {
      const { coordinates, instructions, instructions_format, language, geometry, elevation, preference, attributes } = body;
      if (!coordinates || coordinates.length < 2) {
        return new Response(JSON.stringify({ error: "Missing or invalid field: coordinates (need at least 2)" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const orsRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
        method: "POST",
        headers: {
          "Authorization": orsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates, instructions, instructions_format, language, geometry, elevation, preference, attributes }),
      });
      const orsData = await orsRes.json();

      return new Response(JSON.stringify(orsData), {
        status: orsRes.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown operation: ${operation}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
