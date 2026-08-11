import type { CommandAction } from "@omnidotdev/thornberry/command-palette";
import { CommandPalette as CommandPaletteShell } from "@omnidotdev/thornberry/command-palette";
import {
  GLOBAL_HOTKEYS,
  hotkeyLabel,
  useHotkeys,
} from "@omnidotdev/thornberry/use-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import {
  Brain,
  LayoutDashboard,
  MessageSquare,
  MoonStar,
  Puzzle,
  Settings,
  Users,
} from "lucide-react";
import { useTheme } from "@/hooks";

/**
 * Global command palette (⌘/Ctrl+K). Mounted once at the app root so it works on
 * every route. Exposes top-level navigation and the theme toggle. Built on the
 * shared thornberry palette so every Omni app shares the same behavior; this
 * wrapper only supplies Beacon's own actions.
 */
const CommandPalette = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // App-wide theme shortcut. react-hotkeys-hook ignores form fields by default,
  // so this never fires while typing in the palette input or any other field
  useHotkeys(GLOBAL_HOTKEYS.toggleTheme, toggleTheme);

  const commands: CommandAction[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      group: "Navigation",
      icon: LayoutDashboard,
      onSelect: () => navigate({ to: "/dashboard" }),
    },
    {
      id: "chat",
      label: "Chat",
      group: "Navigation",
      icon: MessageSquare,
      keywords: ["conversation", "assistant"],
      onSelect: () => navigate({ to: "/chat" }),
    },
    {
      id: "personas",
      label: "Personas",
      group: "Navigation",
      icon: Users,
      onSelect: () => navigate({ to: "/personas" }),
    },
    {
      id: "memories",
      label: "Memories",
      group: "Navigation",
      icon: Brain,
      onSelect: () => navigate({ to: "/memories" }),
    },
    {
      id: "skills",
      label: "Skills",
      group: "Navigation",
      icon: Puzzle,
      onSelect: () => navigate({ to: "/skills" }),
    },
    {
      id: "settings",
      label: "Settings",
      group: "Navigation",
      icon: Settings,
      keywords: ["preferences", "account"],
      onSelect: () => navigate({ to: "/settings" }),
    },
    {
      id: "toggle-theme",
      label:
        theme === "light" ? "Switch to dark theme" : "Switch to light theme",
      group: "Preferences",
      icon: MoonStar,
      keywords: ["theme", "dark", "light", "appearance"],
      shortcut: hotkeyLabel(GLOBAL_HOTKEYS.toggleTheme),
      onSelect: toggleTheme,
    },
  ];

  return (
    <CommandPaletteShell commands={commands} placeholder="Search actions..." />
  );
};

export default CommandPalette;
