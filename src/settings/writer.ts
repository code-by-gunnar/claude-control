import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { modify, applyEdits } from "jsonc-parser";

/**
 * Write a single top-level setting to the user-scope settings.json file.
 *
 * Uses jsonc-parser's modify() + applyEdits() to make surgical edits
 * that preserve comments, formatting, BOM, and trailing commas.
 * Creates the file and parent directory if they don't exist.
 *
 * @throws If key is empty or the file cannot be written.
 */
export async function setSetting(
  key: string,
  value: unknown
): Promise<{ key: string; value: unknown }> {
  // Validate inputs
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error("Setting key is required");
  }

  // Determine user-scope settings path
  const userSettingsPath = path.join(os.homedir(), ".claude", "settings.json");

  // Read existing file or start with empty object
  let text: string;
  try {
    text = await fs.readFile(userSettingsPath, "utf-8");
  } catch {
    text = "{}";
  }

  // Use jsonc-parser modify() to set the value
  const formatOptions = { tabSize: 2, insertSpaces: true };
  const edits = modify(text, [trimmedKey], value, {
    formattingOptions: formatOptions,
  });
  const result = applyEdits(text, edits);

  // Ensure directory exists
  const dirPath = path.dirname(userSettingsPath);
  await fs.mkdir(dirPath, { recursive: true });

  // Write file
  await fs.writeFile(userSettingsPath, result, "utf-8");

  return { key: trimmedKey, value };
}
