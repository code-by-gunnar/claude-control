import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse, modify, applyEdits } from "jsonc-parser";

export interface RemoveResult {
  success: true;
  removed: string;
}

export interface AddResult {
  added: string;
}

/**
 * Remove a single permission entry from a settings.json file.
 *
 * Uses jsonc-parser's modify() + applyEdits() to make surgical edits
 * that preserve comments, formatting, BOM, and trailing commas.
 *
 * @throws If the file cannot be read/written, or the entry is not found.
 */
export async function removePermission(
  sourcePath: string,
  rule: "allow" | "deny" | "ask",
  raw: string
): Promise<RemoveResult> {
  // Guard: refuse managed scope files
  if (isManagedPath(sourcePath)) {
    throw new Error("Cannot modify managed-scope settings (admin-controlled)");
  }

  const text = await fs.readFile(sourcePath, "utf-8");
  const data = parse(text, undefined, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as Record<string, unknown>;

  if (!data || typeof data !== "object") {
    throw new Error(`Invalid settings file: ${sourcePath}`);
  }

  const permissions = data.permissions as
    | Record<string, unknown[]>
    | undefined;

  if (!permissions || typeof permissions !== "object") {
    throw new Error("No permissions block found in file");
  }

  const arr = permissions[rule];
  if (!Array.isArray(arr)) {
    throw new Error(`No permissions.${rule} array found in file`);
  }

  const idx = arr.indexOf(raw);
  if (idx === -1) {
    throw new Error(
      `Permission entry not found: "${raw}" in permissions.${rule}`
    );
  }

  const formatOptions = { tabSize: 2, insertSpaces: true };

  // Remove the entry from the array using jsonc-parser's modify()
  let result = text;
  let edits = modify(result, ["permissions", rule, idx], undefined, {
    formattingOptions: formatOptions,
  });
  result = applyEdits(result, edits);

  // If array is now empty, remove the key from permissions
  if (arr.length === 1) {
    edits = modify(result, ["permissions", rule], undefined, {
      formattingOptions: formatOptions,
    });
    result = applyEdits(result, edits);

    // If permissions object is now empty, remove it too
    const remaining = Object.keys(permissions).filter((k) => k !== rule);
    if (remaining.length === 0) {
      edits = modify(result, ["permissions"], undefined, {
        formattingOptions: formatOptions,
      });
      result = applyEdits(result, edits);
    }
  }

  await fs.writeFile(sourcePath, result, "utf-8");

  return { success: true, removed: raw };
}

/**
 * Add a single permission entry to the user-scope settings.json file.
 *
 * Uses jsonc-parser's modify() + applyEdits() to make surgical edits
 * that preserve comments, formatting, BOM, and trailing commas.
 * Creates the file and parent directory if they don't exist.
 *
 * @throws If inputs are invalid, the entry already exists, or the file cannot be written.
 */
export async function addPermission(
  tool: string,
  rule: "allow" | "deny" | "ask",
  pattern?: string
): Promise<AddResult> {
  // Validate inputs
  const trimmedTool = tool.trim();
  if (!trimmedTool) {
    throw new Error("Tool name is required");
  }
  if (!["allow", "deny", "ask"].includes(rule)) {
    throw new Error('Rule must be "allow", "deny", or "ask"');
  }

  // Build the permission string
  const trimmedPattern = pattern?.trim();
  const permString = trimmedPattern
    ? `${trimmedTool}(${trimmedPattern})`
    : trimmedTool;

  // Determine user-scope settings path
  const userSettingsPath = path.join(os.homedir(), ".claude", "settings.json");

  // Read existing file or start with empty object
  let text: string;
  try {
    text = await fs.readFile(userSettingsPath, "utf-8");
  } catch {
    text = "{}";
  }

  // Parse to check for duplicates
  const data = parse(text, undefined, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as Record<string, unknown> | null;

  const permissions = (data?.permissions ?? {}) as Record<string, unknown[]>;
  const existing = permissions[rule];
  if (Array.isArray(existing) && existing.includes(permString)) {
    throw new Error("Permission already exists");
  }

  const formatOptions = { tabSize: 2, insertSpaces: true };

  // Ensure permissions object exists
  let result = text;
  if (!data || !data.permissions) {
    const edits = modify(result, ["permissions"], {}, {
      formattingOptions: formatOptions,
    });
    result = applyEdits(result, edits);
  }

  // Ensure permissions[rule] array exists
  const parsedAfter = parse(result, undefined, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as Record<string, unknown>;
  const permsAfter = parsedAfter?.permissions as Record<string, unknown> | undefined;
  if (!permsAfter || !Array.isArray(permsAfter[rule])) {
    const edits = modify(result, ["permissions", rule], [], {
      formattingOptions: formatOptions,
    });
    result = applyEdits(result, edits);
  }

  // Append the new entry (index -1 = append)
  const edits = modify(result, ["permissions", rule, -1], permString, {
    formattingOptions: formatOptions,
    isArrayInsertion: true,
  });
  result = applyEdits(result, edits);

  // Ensure directory exists
  const dirPath = path.dirname(userSettingsPath);
  await fs.mkdir(dirPath, { recursive: true });

  // Write file
  await fs.writeFile(userSettingsPath, result, "utf-8");

  return { added: permString };
}

/**
 * Check if a settings path is a managed (enterprise/admin) path.
 */
function isManagedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/programdata/") ||
    normalized.startsWith("/library/application support/.claude/") ||
    normalized.startsWith("/etc/.claude/")
  );
}
