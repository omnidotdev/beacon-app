import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { LuGithub as GithubIcon } from "react-icons/lu";
import {
  RiDiscordLine as DiscordIcon,
  RiTwitterXLine as XIcon2,
} from "react-icons/ri";

import { BeaconLogo } from "@/components/Sidebar";
import signIn from "@/lib/auth/signIn";
import signOut from "@/lib/auth/signOut";
import app from "@/lib/config/app.config";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const { session } = useRouteContext({ from: "__root__" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = !!session?.user?.identityProviderId;

  const handleSignIn = async () => {
    try {
      await signIn({ redirectUrl: "/chat" });
    } catch (error) {
      console.error("[handleSignIn] OAuth sign-in failed:", error);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient glow: a single soft orb behind the hero that fades to clean
          dark below (mask), so the long page reads as one cohesive background
          rather than scattered orbs clashing with the dark sections. Absolute
          (not fixed) so it scrolls with the page instead of pinning to the
          viewport and reading as a hard seam on mobile. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 22%, transparent 42%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 22%, transparent 42%)",
        }}
      >
        <div
          className="absolute top-[-140px] left-1/2 h-[560px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[130px]"
          style={{ animation: "beacon-pulse 8s ease-in-out infinite" }}
        />
      </div>

      {/* Banner + header */}
      <div className="sticky top-0 z-50">
        <div className="flex w-full items-center justify-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm backdrop-blur-sm sm:gap-3">
          <span className="text-text-secondary">
            <strong className="font-semibold">Beacon is in early access</strong>{" "}
            — help shape it!
          </span>
          <a
            href={app.links.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 font-medium text-primary text-xs transition-colors hover:bg-primary/30"
          >
            <DiscordIcon className="size-3" />
            Discord
          </a>
        </div>

        <header
          className="w-full border-b border-border backdrop-blur-lg"
          style={{
            background:
              "color-mix(in srgb, var(--background) 80%, transparent)",
          }}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-2">
              <BeaconLogo className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl tracking-tight text-text">
                {app.name}
              </span>
              <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-shimmer sm:inline-flex">
                Early Access
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden items-center gap-3 md:flex">
              <a
                href={app.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-2 font-medium text-muted text-sm transition-colors hover:text-text"
              >
                Docs
              </a>
              <a
                href={app.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-2 font-medium text-muted text-sm transition-colors hover:text-text"
              >
                GitHub
              </a>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="btn-glass text-sm"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="btn-primary text-sm"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="btn-icon"
              >
                {mobileMenuOpen ? (
                  <XIcon className="size-5" />
                ) : (
                  <MenuIcon className="size-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div
              className="border-t border-border md:hidden"
              style={{ background: "var(--background)" }}
            >
              <div className="space-y-1 px-4 py-3">
                <a
                  href={app.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md px-3 py-2 font-medium text-muted text-sm hover:text-text"
                >
                  Docs
                </a>
                <a
                  href={app.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md px-3 py-2 font-medium text-muted text-sm hover:text-text"
                >
                  GitHub
                </a>
                <div className="pt-2">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={signOut}
                      className="btn-glass w-full text-sm"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignIn}
                      className="btn-primary w-full text-sm"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 border-t border-border backdrop-blur-sm"
        style={{
          background: "color-mix(in srgb, var(--muted) 10%, transparent)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <BeaconLogo className="h-5 w-5 text-muted opacity-60" />
              <span className="text-muted text-sm">
                Built by{" "}
                <a
                  href="https://omni.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text transition-colors hover:text-primary"
                >
                  Omni
                </a>
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href={app.links.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted transition-colors hover:text-primary"
              >
                <GithubIcon size={20} />
              </a>
              <a
                href={app.links.discord}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="text-muted transition-colors hover:text-primary"
              >
                <DiscordIcon size={20} />
              </a>
              <a
                href={app.links.x}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="text-muted transition-colors hover:text-primary"
              >
                <XIcon2 size={20} />
              </a>
            </div>

            <p className="text-muted text-sm">
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="https://omni.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text"
              >
                Omni
              </a>
              . All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
