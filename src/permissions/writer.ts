import fs from "node:fs/promises";
import { parse, modify, applyEdits } from "jsonc-parser";

export interface RemoveResult {
  success: true;
  removed: string;
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
