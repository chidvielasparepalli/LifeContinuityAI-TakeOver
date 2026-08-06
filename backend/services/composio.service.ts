import { Composio } from "@composio/core";

// Composio Connect: Gmail OAuth link + status for a user.
// Uses the modern `connectedAccounts.link()` flow (Composio-managed OAuth),
// which returns a redirectUrl the frontend opens for the user to authorize.
// No SDK key configured → routes degrade to clean JSON errors, never HTML.

const GMAIL_TOOLKIT = "gmail";

interface ComposioUserContext {
  userId: string; // primary key — the app's uid
  alias?: string; // human-readable label for the connection
  callbackUrl?: string; // where Composio redirects after OAuth
}

function getClient(): Composio | null {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return null;
  return new Composio({ apiKey: key });
}

export class ComposioService {
  // Returns the auth config ID for Gmail, preferring the explicitly configured
  // env value (COMPOSIO_GMAIL_AUTH_CONFIG_ID) and falling back to auto-creating
  // a Composio-managed Gmail config. Returns null when Composio isn't configured.
  async getGmailAuthConfigId(client: Composio): Promise<string | null> {
    const configured = process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID;
    if (configured) return configured;

    // Try to find an existing managed Gmail config first.
    try {
      const existing = await client.authConfigs.list({
        toolkit: GMAIL_TOOLKIT,
        isComposioManaged: true
      });
      const items = existing?.items ?? [];
      if (items.length > 0 && items[0]?.id) return items[0].id;
    } catch (e: any) {
      console.warn("[COMPOSIO] failed to list auth configs:", e?.message || e);
    }

    // Auto-create a Composio-managed Gmail config.
    try {
      const created = await client.authConfigs.create(GMAIL_TOOLKIT, {
        type: "use_composio_managed_auth",
        name: "LifeContinuity Gmail",
        credentials: { scopes: ["https://www.googleapis.com/auth/gmail.readonly"] }
      });
      return created?.id ?? null;
    } catch (e: any) {
      console.warn("[COMPOSIO] failed to auto-create gmail auth config:", e?.message || e);
      return null;
    }
  }

  // Returns a redirect URL the frontend opens so the user can authorize Gmail.
  // Throws with a JSON-safe message on failure.
  async generateLink({ userId, alias, callbackUrl }: ComposioUserContext): Promise<{
    redirectUrl: string;
    connectionId: string;
  }> {
    const client = getClient();
    if (!client) throw new Error("COMPOSIO_API_KEY is not configured on the server.");
    if (!userId) throw new Error("userId is required.");

    const authConfigId = await this.getGmailAuthConfigId(client);
    if (!authConfigId) throw new Error("Could not obtain a Gmail auth config from Composio.");

    const request = await client.connectedAccounts.link(userId, authConfigId, {
      callbackUrl: callbackUrl || undefined,
      alias: alias || `gmail-${userId}`
    });

    if (!request?.redirectUrl) {
      throw new Error("Composio returned no authorization URL.");
    }

    return { redirectUrl: request.redirectUrl, connectionId: request.id };
  }

  // Returns the active connection status for a user's Gmail connection.
  async getStatus(userId: string): Promise<{
    connected: boolean;
    status?: string;
    connectionId?: string;
    reason?: string;
    error?: string;
  }> {
    const client = getClient();
    if (!client) return { connected: false, reason: "COMPOSIO_API_KEY not configured" };

    try {
      const result = await client.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [GMAIL_TOOLKIT]
      });
      const item = result?.items?.[0];
      const status = item?.status ?? null;
      return {
        connected: status === "ACTIVE",
        status: status || undefined,
        connectionId: item?.id || undefined
      };
    } catch (e: any) {
      console.warn("[COMPOSIO] status check failed:", e?.message || e);
      return { connected: false, error: e?.message || String(e) };
    }
  }
}

export const composioService = new ComposioService();
