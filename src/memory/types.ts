import type { ConfigScope } from "../scanner/types.js";

/**
 * A single @import directive found in a CLAUDE.md file.
 */
export interface MemoryImport {
  /** The raw @import text as found in the file */
  raw: string;
  /** Absolute path after resolution */
  resolvedPath: string;
  /** Which file contained this import */
  relativeTo: string;
  /** Whether the imported file exists on disk */
  exists: boolean;
  /** Read error if any */
  error?: string;
}

/**
 * A CLAUDE.md file with its resolved import information.
 */
export interface ResolvedMemoryFile {
  /** Absolute path to the CLAUDE.md file */
  path: string;
  /** Config scope level */
  scope: ConfigScope;
  /** Imports found in this file */
  imports: MemoryImport[];
  /** Ordered list of resolved import paths in the dependency chain */
  importChain: string[];
  /** Whether a circular import was detected */
  hasCircular: boolean;
  /** Path where circular import was detected */
  circularAt?: string;
}

/**
 * Complete result of resolving all @import directives across CLAUDE.md files.
 */
export interface MemoryImportResult {
  /** All resolved CLAUDE.md files with their import info */
  files: ResolvedMemoryFile[];
  /** Imports where the target file does not exist */
  brokenImports: MemoryImport[];
  /** Total number of imports found across all files */
  totalImports: number;
  /** Total number of broken imports */
  totalBroken: number;
}
