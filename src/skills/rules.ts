import type { ScanRule } from "./types.js";

/**
 * Data-driven security scan rules for skill/command content.
 *
 * Each rule matches against a line of skill content (or full content
 * for multiline patterns) and flags potential prompt injection or
 * security risks.
 */
export const SCAN_RULES: ScanRule[] = [
  // ── Data Exfiltration ──────────────────────────────────────────

  {
    id: "exfil-curl-secrets",
    severity: "critical",
    message: "Potential data exfiltration: curl/wget sending secrets as request body",
    // Requires a data-sending flag so that legitimate API auth headers like
    // -H "Authorization: Bearer $TOKEN" are not flagged as exfiltration.
    pattern: /\b(curl|wget)\b(?=.*\s(-d\b|--data\b|--data-\w+|-F\b|--form\b|--upload-file\b)).*\$\{?\w*(SECRET|TOKEN|KEY|PASS|API|AUTH)\w*\}?|\b(curl|wget)\b.*\/etc\/passwd/i,
  },
  {
    id: "exfil-env-dump",
    severity: "critical",
    message: "Environment variable dumping to external destination",
    pattern: /\benv\b.*\|\s*(curl|wget|nc|netcat)\b/i,
  },
  {
    id: "exfil-upload-external",
    severity: "high",
    message: "Uploading local files to external URL",
    pattern: /\b(curl|wget|fetch)\b.*(-F|--data|--upload-file|body:)\s.*(\~\/|\/home\/|\/Users\/|%USERPROFILE%)/i,
  },
  {
    id: "exfil-send-to-webhook",
    severity: "high",
    message: "Sending data to webhook or external endpoint",
    pattern: /\b(curl|wget|fetch)\b.*\b(webhook|ngrok|requestbin|hookbin|pipedream|burpcollaborator)\b/i,
  },

  // ── System Compromise ──────────────────────────────────────────

  {
    id: "sys-rm-rf",
    severity: "critical",
    message: "Destructive command: rm -rf with broad scope",
    pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(\/|~\/|\$HOME|\*)/,
  },
  {
    id: "sys-chmod-777",
    severity: "high",
    message: "Insecure permissions: chmod 777",
    pattern: /\bchmod\s+777\b/,
  },
  {
    id: "sys-modify-etc",
    severity: "critical",
    message: "Modifying system files in /etc/",
    pattern: /\b(echo|cat|tee|sed|write)\b.*>+\s*\/etc\//i,
  },
  {
    id: "sys-write-system-dirs",
    severity: "high",
    message: "Writing to system directories (/usr, /bin, /sbin, /lib)",
    pattern: /\b(echo|cat|tee|cp|mv|write)\b.*>+\s*\/(usr|bin|sbin|lib)\//i,
  },

  // ── Hidden Instructions ────────────────────────────────────────

  {
    id: "hidden-zero-width",
    severity: "critical",
    message: "Invisible zero-width characters detected (potential hidden instructions)",
    pattern: /[\u200B\u200C\u200D\u2060\uFEFF]/,
  },
  {
    id: "hidden-html-comment",
    severity: "medium",
    message: "HTML comment may contain hidden instructions",
    pattern: /<!--[\s\S]*?(instruction|ignore|override|system|prompt|secret)/i,
    multiline: true,
  },
  {
    id: "hidden-base64-block",
    severity: "medium",
    message: "Large base64-encoded block detected (may hide instructions)",
    pattern: /[A-Za-z0-9+/]{100,}={0,2}/,
  },

  // ── Credential Access ──────────────────────────────────────────

  {
    id: "cred-read-env",
    severity: "high",
    message: "Reading .env files (may expose secrets)",
    pattern: /\b(cat|read|type|source|load)\b.*\.env\b/i,
  },
  {
    id: "cred-ssh-keys",
    severity: "critical",
    message: "Accessing SSH private keys",
    pattern: /\b(cat|read|cp|scp|upload)\b.*\/(\.ssh\/id_|\.ssh\/config)/i,
  },
  {
    id: "cred-aws-creds",
    severity: "critical",
    message: "Accessing AWS credentials or config",
    pattern: /\b(cat|read|cp)\b.*\/(\.aws\/(credentials|config))/i,
  },
  {
    id: "cred-keychain",
    severity: "high",
    message: "Accessing system keychain or credential store",
    pattern: /\b(security\s+find-generic-password|credential\s+manager|keyring|keychain)\b/i,
  },

  // ── Privilege Escalation ───────────────────────────────────────

  {
    id: "priv-sudo",
    severity: "high",
    message: "sudo command detected — skills should not require elevated privileges",
    pattern: /\bsudo\b/,
  },
  {
    id: "priv-run-as-root",
    severity: "high",
    message: "Running commands as root user",
    pattern: /\b(su\s+-\s+root|run\s+as\s+root|--user\s*=?\s*root)\b/i,
  },

  // ── Obfuscation ────────────────────────────────────────────────

  {
    id: "obfusc-eval",
    severity: "high",
    message: "eval() pattern detected — may execute obfuscated code",
    pattern: /\beval\s*\(/,
  },
  {
    id: "obfusc-hex-string",
    severity: "medium",
    message: "Long hex-encoded string detected (potential obfuscation)",
    pattern: /\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){9,}/,
  },
  {
    id: "obfusc-base64-decode",
    severity: "medium",
    message: "Base64 decode and execute pattern",
    pattern: /\b(base64\s+--?d|atob|Buffer\.from)\b.*\b(eval|exec|sh|bash)\b/i,
  },

  // ── Social Engineering ─────────────────────────────────────────

  {
    id: "social-ignore-instructions",
    severity: "critical",
    message: "Prompt injection: tells model to ignore previous instructions",
    pattern: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|rules|guidelines|constraints)/i,
  },
  {
    id: "social-override-safety",
    severity: "critical",
    message: "Prompt injection: attempts to override safety guidelines",
    pattern: /\b(override|bypass|disable|turn off|remove)\s+(safety|security|restriction|guardrail|filter|content\s+policy)/i,
  },
  {
    id: "social-dont-tell-user",
    severity: "high",
    message: "Hidden instruction: tells model to hide information from user",
    pattern: /\b(don'?t|do not|never|avoid)\s+(tell|show|reveal|disclose|mention|inform)\s+(the\s+)?(user|human|person|operator)/i,
  },
  {
    id: "social-new-identity",
    severity: "high",
    message: "Prompt injection: attempts to assign new identity or persona",
    pattern: /\b(you are now|pretend you are|act as if you are|your new (role|name|identity) is)\b/i,
  },
  {
    id: "social-jailbreak",
    severity: "critical",
    message: "Known jailbreak pattern detected",
    pattern: /\b(DAN|do anything now|jailbreak|developer mode|unrestricted mode)\b/i,
  },

  // ── Network & Remote Code ──────────────────────────────────────

  {
    id: "net-reverse-shell",
    severity: "critical",
    message: "Reverse shell pattern detected",
    pattern: /\b(nc|ncat|netcat|bash\s+-i)\b.*\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\/dev\/tcp)/,
  },
  {
    id: "net-download-execute",
    severity: "high",
    message: "Download-and-execute pattern (piping remote content to shell)",
    pattern: /\b(curl|wget)\b.*\|\s*(bash|sh|python|node|perl)\b/i,
  },
];
