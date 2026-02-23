import type { ConfigScope } from "../scanner/types.js";

/**
 * A single hook action entry (command to run when the hook fires).
 */
export interface HookEntry {
  type: "command";
  command: string;
  async?: boolean;
}

/**
 * A matcher within a hook event — matches specific tool names or patterns.
 *
 * If matcher is omitted, the hook fires for all invocations of that event.
 * Matcher is a pipe-separated pattern (e.g., "Edit|Write|MultiEdit").
 */
export interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

/**
 * A hook event extracted from a settings file.
 *
 * Contains all matchers configured for this event, the scope it was
 * found in, and the source file path.
 */
export interface HookEvent {
  /** Event name (e.g., "PreToolUse", "SessionStart") */
  event: string;
  /** Matchers configured for this event */
  matchers: HookMatcher[];
  /** Which scope this hook was found in */
  scope: ConfigScope;
  /** Absolute path to the source settings file */
  sourcePath: string;
}

/**
 * A custom command or skill discovered from a commands directory.
 */
export interface CommandEntry {
  /** Command/skill name (filename without .md extension) */
  name: string;
  /** Absolute file path */
  path: string;
  /** Which scope this command belongs to (user or project) */
  scope: ConfigScope;
}

/**
 * A hook script file discovered in ~/.claude/hooks/.
 */
export interface HookScript {
  /** Script filename (e.g., "deployment-check.sh") */
  fileName: string;
  /** Absolute path to the script */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Script content */
  content: string;
}

/**
 * The complete result of hooks extraction.
 */
export interface HooksResult {
  /** All hook events discovered across all settings files */
  events: HookEvent[];
  /** All known Claude Code hook event names */
  availableEvents: string[];
  /** Event names that have at least one hook configured */
  configuredEvents: string[];
  /** Event names that have no hooks configured */
  unconfiguredEvents: string[];
  /** Script files found in ~/.claude/hooks/ */
  hookScripts: HookScript[];
}

/**
 * The complete result of commands/skills extraction.
 */
export interface CommandsResult {
  /** All custom commands discovered across all command directories */
  commands: CommandEntry[];
}
