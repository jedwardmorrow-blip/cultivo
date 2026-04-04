import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// MetrcApiError — structured error with HTTP status
// ---------------------------------------------------------------------------
class MetrcApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "MetrcApiError";
  }
}

// ---------------------------------------------------------------------------
// MetrcClient — thin wrapper around the Metrc REST API
// ---------------------------------------------------------------------------
class MetrcClient {
  constructor(
    private readonly stateCode: string,
    private readonly apiBaseUrl: string,
    private readonly apiKey: string
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async get(path: string): Promise<unknown> {
    const url = `${this.apiBaseUrl}${path}`;
    const res = await fetch(url, { method: "GET", headers: this.headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new MetrcApiError(res.status, text);
    }
    return res.json();
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.apiBaseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new MetrcApiError(res.status, text);
    }
    return res.json();
  }

  /**
   * Calls GET /facilities/v1 and returns the first facility's name, license,
   * and Metrc facility ID.
   */
  async verifyCredentials(): Promise<{
    facilityName: string;
    license: string;
    metrcFacilityId: string;
  }> {
    const data = (await this.get("/facilities/v1")) as Array<{
      Name: string;
      License: { Number: string; Id: number };
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      throw new MetrcApiError(200, "No facilities returned for these credentials");
    }

    const f = data[0];
    return {
      facilityName: f.Name,
      license: f.License.Number,
      metrcFacilityId: String(f.License.Id),
    };
  }

  /**
   * Calls GET /items/v1/active and returns the raw item array.
   */
  async fetchActiveItems(): Promise<unknown[]> {
    const data = await this.get("/items/v1/active");
    return Array.isArray(data) ? data : [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // --- Auth: require a valid Supabase user session ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // --- Service-role client for internal DB access (bypasses RLS) ---
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { operation } = body as { operation: string };

    // -----------------------------------------------------------------------
    // operation: verify_credentials
    // Calls /facilities/v1 and returns facility name / structured error.
    // -----------------------------------------------------------------------
    if (operation === "verify_credentials") {
      const { data: cred, error: credErr } = await db
        .from("metrc_credentials")
        .select("state_code, api_base_url, api_key_encrypted")
        .eq("is_active", true)
        .maybeSingle();

      if (credErr || !cred) {
        return jsonResponse({ error: "No active Metrc credentials found" }, 404);
      }

      const client = new MetrcClient(
        cred.state_code,
        cred.api_base_url,
        cred.api_key_encrypted
      );

      try {
        const facility = await client.verifyCredentials();
        return jsonResponse({ success: true, facility });
      } catch (err) {
        const metrcErr = err instanceof MetrcApiError ? err : null;
        return jsonResponse({
          success: false,
          error: metrcErr ? metrcErr.message : String(err),
          status: metrcErr?.status ?? null,
        });
      }
    }

    // -----------------------------------------------------------------------
    // operation: sync_item_categories
    // Pulls GET /items/v1/active and writes one row to metrc_sync_log.
    // -----------------------------------------------------------------------
    if (operation === "sync_item_categories") {
      const { data: cred, error: credErr } = await db
        .from("metrc_credentials")
        .select("state_code, api_base_url, api_key_encrypted")
        .eq("is_active", true)
        .maybeSingle();

      if (credErr || !cred) {
        return jsonResponse({ error: "No active Metrc credentials found" }, 404);
      }

      const client = new MetrcClient(
        cred.state_code,
        cred.api_base_url,
        cred.api_key_encrypted
      );

      let items: unknown[] = [];
      let syncStatus: "synced" | "error" = "synced";
      let errorMsg: string | null = null;

      try {
        items = await client.fetchActiveItems();
      } catch (err) {
        syncStatus = "error";
        errorMsg =
          err instanceof MetrcApiError ? err.message : String(err);
      }

      await db.from("metrc_sync_log").insert({
        entity_type: "item_category",
        entity_id: crypto.randomUUID(),
        direction: "pull",
        payload: { count: items.length },
        response: { items },
        status: syncStatus,
        error_msg: errorMsg,
      });

      return jsonResponse({
        success: syncStatus === "synced",
        count: items.length,
        error: errorMsg,
      });
    }

    return jsonResponse({ error: `Unknown operation: ${operation}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
