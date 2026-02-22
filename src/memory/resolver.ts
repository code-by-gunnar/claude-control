import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import type {
  MemoryImport,
  MemoryImportResult,
  ResolvedMemoryFile,
} from "./types.js";

/** Maximum depth for import chain traversal (matches Claude Code's limit). */
const MAX_CHAIN_DEPTH = 5;

/**
 * Pattern to match @import directives in CLAUDE.md content.
 *
 * Matches:
 * - @./relative/path.md
 * - @../parent/path.md
 * - @~/home/path.md
 * - @/absolute/path.md
 * - @docs/bare/path.md
 *
 * Skips references inside triple-backtick code blocks.
 */
const IMPORT_PATTERN = /@([.~\/][^\s)]*\.md|[a-zA-Z][^\s)]*\/[^\s)]*\.md)/g;

/**
 * Parse @import directives from CLAUDE.md content, skipping code blocks.
 *
 * @param content - Raw CLAUDE.md file content
 * @returns Array of raw import strings found
 */
export function parseImportDirectives(content: string): string[] {
  const imports: string[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    // Track triple-backtick code block state
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Find all @import matches on this line
    let match: RegExpExecArray | null;
    IMPORT_PATTERN.lastIndex = 0;
    while ((match = IMPORT_PATTERN.exec(line)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Resolve an import path to an absolute path.
 *
 * @param importPath - The raw import path (without leading @)
 * @param containingFile - Absolute path of the file containing the import
 * @returns Absolute resolved path
 */
export function resolveImportPath(
  importPath: string,
  containingFile: string
): string {
  const containingDir = path.dirname(containingFile);

  // Home directory paths: ~/...
  if (importPath.startsWith("~/") || importPath.startsWith("~\\")) {
    return path.resolve(os.homedir(), importPath.slice(2));
  }

  // Absolute paths: /...
  if (path.isAbsolute(importPath)) {
    return path.resolve(importPath);
  }

  // Relative paths: ./ or ../
  // Bare paths: docs/foo.md (resolve relative to containing file)
  return path.resolve(containingDir, importPath);
}

/**
 * Check whether a file exists on disk.
 *
 * @param filePath - Absolute path to check
 * @returns true if the file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Traverse the import chain for a single file, detecting circular imports.
 *
 * @param filePath - Absolute path to the file to traverse from
 * @param visited - Set of already-visited paths (for circular detection)
 * @param depth - Current depth in the chain
 * @returns Object with ordered chain paths and circular detection info
 */
async function traverseImportChain(
  filePath: string,
  visited: Set<string>,
  depth: number
): Promise<{
  chain: string[];
  hasCircular: boolean;
  circularAt?: string;
}> {
  const chain: string[] = [];
  let hasCircular = false;
  let circularAt: string | undefined;

  if (depth >= MAX_CHAIN_DEPTH) {
    return { chain, hasCircular, circularAt };
  }

  const normalizedPath = path.resolve(filePath);

  if (visited.has(normalizedPath)) {
    return { chain, hasCircular: true, circularAt: normalizedPath };
  }

  visited.add(normalizedPath);

  // Try to read the file content to find nested imports
  let content: string;
  try {
    content = await fs.readFile(normalizedPath, "utf-8");
  } catch {
    // File can't be read — stop traversal
    return { chain, hasCircular, circularAt };
  }

  const importPaths = parseImportDirectives(content);

  for (const rawImport of importPaths) {
    const resolved = resolveImportPath(rawImport, normalizedPath);
    chain.push(resolved);

    const exists = await fileExists(resolved);
    if (exists) {
      const nested = await traverseImportChain(resolved, new Set(visited), depth + 1);
      chain.push(...nested.chain);
      if (nested.hasCircular) {
        hasCircular = true;
        circularAt = circularAt ?? nested.circularAt;
      }
    }
  }

  return { chain, hasCircular, circularAt };
}

/**
 * Resolve all @import directives across CLAUDE.md files.
 *
 * For each CLAUDE.md file in the scan result:
 * 1. Parse @import directives from content
 * 2. Resolve each import to an absolute path
 * 3. Check if the imported file exists
 * 4. Traverse the import chain up to MAX_CHAIN_DEPTH levels
 * 5. Detect circular imports
 *
 * @param files - ConfigFile array from scan result
 * @returns Structured import resolution result
 */
export async function resolveMemoryImports(
  files: ConfigFile[]
): Promise<MemoryImportResult> {
  const resolvedFiles: ResolvedMemoryFile[] = [];
  const allBrokenImports: MemoryImport[] = [];
  let totalImports = 0;

  // Filter for CLAUDE.md files that exist and have string content
  const claudeMdFiles = files.filter(
    (f) =>
      f.type === "claude-md" &&
      f.exists &&
      typeof f.content === "string"
  );

  for (const file of claudeMdFiles) {
    const content = file.content as string;
    const rawImports = parseImportDirectives(content);

    const imports: MemoryImport[] = [];

    for (const raw of rawImports) {
      const resolvedPath = resolveImportPath(raw, file.expectedPath);
      const exists = await fileExists(resolvedPath);

      const memoryImport: MemoryImport = {
        raw: `@${raw}`,
        resolvedPath,
        relativeTo: file.expectedPath,
        exists,
      };

      if (!exists) {
        memoryImport.error = "File not found";
        allBrokenImports.push(memoryImport);
      }

      imports.push(memoryImport);
    }

    totalImports += imports.length;

    // Traverse import chain for this file
    const visited = new Set<string>();
    const { chain, hasCircular, circularAt } = await traverseImportChain(
      file.expectedPath,
      visited,
      0
    );

    resolvedFiles.push({
      path: file.expectedPath,
      scope: file.scope,
      imports,
      importChain: chain,
      hasCircular,
      circularAt,
    });
  }

  return {
    files: resolvedFiles,
    brokenImports: allBrokenImports,
    totalImports,
    totalBroken: allBrokenImports.length,
  };
}
