import path from "node:path";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import { parseJsonc } from "../scanner/parser.js";

/**
 * Non-secret account information extracted from credentials.
 */
export interface AccountInfo {
  /** Subscription type (e.g., "max", "pro", "free") or null if unavailable */
  subscriptionType: string | null;
  /** Rate limit tier (e.g., "default_claude_max_5x") or null if unavailable */
  rateLimitTier: string | null;
}

/**
 * Extract non-secret account information from ~/.claude/.credentials.json.
 *
 * IMPORTANT: Only extracts subscriptionType. Never exposes tokens,
 * refresh tokens, client secrets, or any other credential data.
 *
 * @returns AccountInfo with subscription type if available
 */
export async function extractAccountInfo(): Promise<AccountInfo> {
  const globalDir = getGlobalClaudeDir();
  const credentialsPath = path.join(globalDir, ".credentials.json");

  try {
    const { data } = await parseJsonc(credentialsPath);
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      // subscriptionType lives inside claudeAiOauth
      const oauth = obj.claudeAiOauth;
      if (oauth && typeof oauth === "object") {
        const oauthObj = oauth as Record<string, unknown>;
        const subscriptionType =
          typeof oauthObj.subscriptionType === "string"
            ? oauthObj.subscriptionType
            : null;
        const rateLimitTier =
          typeof oauthObj.rateLimitTier === "string"
            ? oauthObj.rateLimitTier
            : null;
        return { subscriptionType, rateLimitTier };
      }
    }
  } catch {
    // Credentials file doesn't exist or can't be read
  }

  return { subscriptionType: null, rateLimitTier: null };
}
