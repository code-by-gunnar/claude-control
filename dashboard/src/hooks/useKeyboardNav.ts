import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export interface Shortcut {
  key: string;
  route: string;
  label: string;
}

export const SHORTCUTS: Shortcut[] = [
  { key: "o", route: "/", label: "Overview" },
  { key: "s", route: "/settings", label: "Settings" },
  { key: "m", route: "/memory", label: "Memory" },
  { key: "p", route: "/permissions", label: "Permissions" },
  { key: "c", route: "/mcp", label: "MCP Servers" },
  { key: "l", route: "/plugins", label: "Plugins" },
  { key: "k", route: "/marketplaces", label: "Marketplaces" },
  { key: "h", route: "/hooks", label: "Hooks" },
  { key: "a", route: "/agents", label: "Agents" },
  { key: "i", route: "/skills", label: "Skills" },
  { key: "e", route: "/health", label: "Health" },
  { key: "j", route: "/projects", label: "Projects" },
];

interface UseKeyboardNavOptions {
  onToggleHelp: () => void;
}

export function useKeyboardNav({ onToggleHelp }: UseKeyboardNavOptions): void {
  const navigate = useNavigate();
  const waitingForSecondKey = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Guard: skip when modifier keys are held
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Guard: skip when typing in form fields
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      ) {
        return;
      }

      // ? key (Shift+/) toggles help overlay
      if (event.key === "?") {
        event.preventDefault();
        onToggleHelp();
        return;
      }

      // G-key chord: first press
      if (!waitingForSecondKey.current && event.key.toLowerCase() === "g" && !event.shiftKey) {
        waitingForSecondKey.current = true;
        // Clear after 1 second timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          waitingForSecondKey.current = false;
        }, 1000);
        return;
      }

      // G-key chord: second press
      if (waitingForSecondKey.current) {
        waitingForSecondKey.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const pressed = event.key.toLowerCase();
        const match = SHORTCUTS.find((s) => s.key === pressed);
        if (match) {
          event.preventDefault();
          navigate(match.route);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate, onToggleHelp]);
}
