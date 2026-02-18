import {
  Link,
  useNavigate,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import {
  BookOpen,
  Brain,
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiDiscordLine, RiFeedbackLine, RiTwitterXLine } from "react-icons/ri";
import {
  useCreateConversation,
  usePersona,
  usePersonas,
  useTheme,
} from "@/hooks";
import { isCloudDeployment } from "@/lib/api";
import signOut from "@/lib/auth/signOut";
import { CONSOLE_URL } from "@/lib/config/env.config";
import ConversationList from "./ConversationList";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/chat", label: "Chat", icon: <MessageSquare size={18} /> },
  { to: "/memories", label: "Memories", icon: <Brain size={18} /> },
  { to: "/skills", label: "Skills", icon: <Zap size={18} />, comingSoon: true },
  {
    to: "/personas",
    label: "Personas",
    icon: <Users size={18} />,
    comingSoon: true,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const navigate = useNavigate();
  const { session } = useRouteContext({ from: "__root__" });
  const { data: persona, isLoading: personaLoading } = usePersona();
  const createConversation = useCreateConversation();
  const {
    data: personas,
    isLoading: personasLoading,
    isError: personasError,
    refetch: refetchPersonas,
    switchPersona,
  } = usePersonas();
  const { theme, setTheme } = useTheme();
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [userDropdownPos, setUserDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const isCloud = isCloudDeployment();
  const isAuthenticated = !!session?.user;
  const showUserSection = isCloud && isAuthenticated;

  const handlePersonaSwitch = (personaId: string) => {
    switchPersona(personaId);
    setPersonaDropdownOpen(false);
  };

  // Calculate dropdown position synchronously before opening
  const openPersonaDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    setPersonaDropdownOpen(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!personaDropdownOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideButton =
        buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideButton && isOutsideDropdown) {
        setPersonaDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [personaDropdownOpen]);

  // Update user dropdown position when opened
  useEffect(() => {
    if (userDropdownOpen && userButtonRef.current) {
      const rect = userButtonRef.current.getBoundingClientRect();
      setUserDropdownPos({
        top: rect.top - 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [userDropdownOpen]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userDropdownOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideButton =
        userButtonRef.current && !userButtonRef.current.contains(target);
      const isOutsideDropdown =
        userDropdownRef.current && !userDropdownRef.current.contains(target);

      if (isOutsideButton && isOutsideDropdown) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userDropdownOpen]);

  // Close sidebar on navigation (mobile)
  const handleNavClick = () => {
    onClose?.();
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await signOut();
  };

  return (
    <aside
      className={`flex w-72 flex-col rounded-none border-r border-border bg-background max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:w-full max-md:overflow-y-auto max-md:shadow-2xl max-md:transition-transform max-md:duration-300 max-md:ease-out ${
        isOpen ? "max-md:translate-x-0" : "max-md:translate-x-full"
      }`}
    >
      {/* Header with logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 max-md:h-14 max-md:px-4">
        <Link
          to="/"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 transition-all hover:drop-shadow-[0_0_8px_var(--color-primary)] active:scale-95"
        >
          <BeaconLogo className="h-10 w-10 text-primary" />
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-shimmer">
            Early Access
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted/60 transition-all hover:bg-surface-elevated hover:text-text"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-elevated hover:text-text md:hidden"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Persona Switcher */}
      <div className="px-3 pb-3 max-md:pb-2">
        {personaLoading ? (
          <div className="flex items-center gap-3 rounded-xl p-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-surface-elevated" />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 h-3.5 w-20 animate-pulse rounded bg-surface-elevated" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-elevated" />
            </div>
          </div>
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={() =>
              personaDropdownOpen
                ? setPersonaDropdownOpen(false)
                : openPersonaDropdown()
            }
            className="persona-card flex w-full items-center gap-3 rounded-xl p-3"
          >
            <PersonaAvatar
              name={persona?.name ?? "Assistant"}
              avatar={persona?.avatar ?? undefined}
              size="md"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-text">
                {persona?.name ?? "Assistant"}
              </p>
              <p className="truncate text-xs text-muted">
                {persona?.tagline ?? "AI Assistant"}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted transition-transform ${personaDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}

        {/* Persona dropdown - rendered via portal */}
        {personaDropdownOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className="rounded-xl border border-border bg-background p-2 shadow-2xl"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 2147483647,
                isolation: "isolate",
              }}
            >
              {personasLoading ? (
                <div className="flex items-center justify-center gap-2 p-3 text-muted">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading personas...</span>
                </div>
              ) : personasError || (!personas?.length && !persona) ? (
                <div className="flex flex-col items-center gap-2 p-3 text-center">
                  <p className="text-sm text-muted">Unable to load personas</p>
                  <button
                    type="button"
                    onClick={() => refetchPersonas()}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {(personas && personas.length > 0
                    ? personas
                    : [persona!]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonaSwitch(p.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors ${
                        p.id === persona?.id
                          ? "bg-primary/10"
                          : "hover:bg-surface-elevated"
                      }`}
                    >
                      <PersonaAvatar
                        name={p.name}
                        avatar={p.avatar ?? undefined}
                        size="sm"
                      />
                      <span className="text-sm text-text">{p.name}</span>
                    </button>
                  ))}
                  <div className="mt-1 px-2 pt-1">
                    <div className="mb-2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <p className="text-center text-[11px] text-muted/60">
                      More coming soon, including custom personas.{" "}
                      <a
                        href="https://x.com/omnidotdev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary/60 transition-colors hover:text-primary"
                      >
                        Follow us on{" "}
                        <RiTwitterXLine className="inline size-2.5" />
                      </a>
                    </p>
                  </div>
                </>
              )}
            </div>,
            document.body,
          )}
      </div>

      {/* Crystalline divider */}
      <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />

      {/* Conversations section */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
        <div className="flex shrink-0 items-center justify-between px-4 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted/50">
            Conversations
          </span>
          <button
            type="button"
            onClick={async () => {
              const title = `New conversation with ${persona?.name ?? "Assistant"}`;
              const conv = await createConversation.mutateAsync(title);
              navigate({ to: "/chat", search: { c: conv.id } });
              handleNavClick();
            }}
            className="btn-icon -mr-1 p-1 text-muted/50 hover:text-primary"
            title="New conversation"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          <ConversationList onNavigate={handleNavClick} />
        </div>
      </div>

      {/* Group chats coming soon */}
      <div className="mx-3 mb-2 flex items-center gap-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 px-3 py-2.5 max-md:hidden">
        <div className="flex -space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/5">
            <Users size={10} className="text-primary/70" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/5">
            <Users size={10} className="text-primary/60" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/5">
            <Users size={10} className="text-primary/50" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary/70">Group chats</p>
          <p className="text-[10px] text-muted/60">Coming soon</p>
        </div>
      </div>

      {/* Crystalline divider */}
      <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Navigation */}
      <nav className="p-2 pt-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.to;

          if (item.comingSoon) {
            return (
              <div
                key={item.to}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted"
              >
                {item.icon}
                <span>{item.label}</span>
                <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "nav-active text-text"
                  : "text-text hover:bg-surface-elevated"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Settings */}
        <Link
          to="/settings"
          onClick={handleNavClick}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            currentPath === "/settings"
              ? "nav-active text-text"
              : "text-text hover:bg-surface-elevated"
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Crystalline divider */}
      <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* User account section */}
      {showUserSection ? (
        <>
          <div className="px-3 py-2">
            <button
              ref={userButtonRef}
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-elevated"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary">
                  {getInitials(session.user.name ?? session.user.email ?? "U")}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-text">
                  {session.user.name ?? "User"}
                </p>
                <p className="truncate text-xs text-muted">
                  {session.user.email}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-muted transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* User dropdown */}
            {userDropdownOpen &&
              createPortal(
                <div
                  ref={userDropdownRef}
                  className="rounded-xl border border-border bg-background p-2 shadow-2xl"
                  style={{
                    position: "fixed",
                    top: userDropdownPos.top,
                    left: userDropdownPos.left,
                    width: userDropdownPos.width,
                    transform: "translateY(-100%)",
                    zIndex: 2147483647,
                    isolation: "isolate",
                  }}
                >
                  {CONSOLE_URL && (
                    <a
                      href={CONSOLE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-sm text-text transition-colors hover:bg-surface-elevated"
                    >
                      <ExternalLink size={16} />
                      Manage account
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>,
                document.body,
              )}
          </div>

          {/* Crystalline divider */}
          <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </>
      ) : isCloud ? (
        <>
          <div className="px-3 py-2">
            <Link
              to="/login"
              onClick={handleNavClick}
              className="flex w-full items-center gap-3 rounded-xl bg-primary/10 p-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <LogIn size={18} />
              Sign in
            </Link>
          </div>

          {/* Crystalline divider */}
          <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </>
      ) : null}

      {/* Footer with social links */}
      <div className="flex items-center justify-center gap-1 p-3 max-md:p-2">
        <a
          href="https://discord.gg/omnidotdev"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted/60 transition-all hover:bg-surface-elevated hover:text-text"
          title="Discord"
        >
          <RiDiscordLine size={18} />
        </a>
        <a
          href="https://x.com/omnidotdev"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted/60 transition-all hover:bg-surface-elevated hover:text-text"
          title="X"
        >
          <RiTwitterXLine size={18} />
        </a>
        <a
          href="https://docs.omni.dev/armory/beacon"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted/60 transition-all hover:bg-surface-elevated hover:text-text"
          title="Docs"
        >
          <BookOpen size={18} />
        </a>
        <a
          href="https://backfeed.omni.dev/workspaces/omni/projects/beacon"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted/60 transition-all hover:bg-surface-elevated hover:text-text"
          title="Feedback"
        >
          <RiFeedbackLine size={18} />
        </a>
      </div>
    </aside>
  );
}

interface PersonaAvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
}

function PersonaAvatar({ name, avatar, size = "md" }: PersonaAvatarProps) {
  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-primary/20`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 font-semibold text-primary`}
    >
      {getInitials(name)}
    </div>
  );
}

function BeaconLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      {/* Back base edges: left → back → right */}
      <path
        d="M20 62 L50 50 L80 62"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Apex to left and right */}
      <path
        d="M50 20 L20 62 M50 20 L80 62"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front base edges: left → front → right */}
      <path
        d="M20 62 L50 74 L80 62"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertical: apex → front */}
      <path
        d="M50 20 L50 74"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { BeaconLogo };
export default Sidebar;
