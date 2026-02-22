import fs from "node:fs/promises";
import { parse, type ParseError, printParseErrorCode } from "jsonc-parser";

/**
 * Parse a JSONC (JSON with comments and trailing commas) file.
 *
 * Uses Microsoft's jsonc-parser (the same parser VS Code uses) to handle:
 * - Single-line comments (//)
 * - Multi-line comments (/* ... *​/)
 * - Trailing commas
 *
 * @param filePath - Absolute path to the JSON/JSONC file
 * @returns Parsed data and any non-fatal parse errors
 * @throws If the file cannot be read (permission denied, not found, etc.)
 */
export async function parseJsonc(
  filePath: string
): Promise<{ data: unknown; errors: string[] }> {
  const content = await fs.readFile(filePath, "utf-8");

  const parseErrors: ParseError[] = [];
  const data = parse(content, parseErrors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  const errors = parseErrors.map(
    (e) =>
      `${printParseErrorCode(e.error)} at offset ${e.offset} (length ${e.length})`
  );

  return { data, errors };
}

/**
 * Read a Markdown file and return its content as a string.
 *
 * @param filePath - Absolute path to the .md file
 * @returns The raw file content as a string
 * @throws If the file cannot be read
 */
export async function readMarkdown(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}
