import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BrainIcon,
  CheckCircle2Icon,
  MessageSquareIcon,
  MicIcon,
  RocketIcon,
  SparklesIcon,
  VenetianMaskIcon,
  ZapIcon,
} from "lucide-react";
import { LuGithub as GithubIcon } from "react-icons/lu";
import {
  RiDiscordLine as DiscordIcon,
  RiSlackLine as SlackIcon,
  RiTelegramLine as TelegramIcon,
} from "react-icons/ri";

import signIn from "@/lib/auth/signIn";
import app from "@/lib/config/app.config";
import createMetaTags from "@/lib/util/createMetaTags";
import { signOutLocal } from "@/server/functions/auth";

export const Route = createFileRoute("/_public/")({
  head: () => createMetaTags({ title: "AI assistant, everywhere" }),
  beforeLoad: async ({ context: { session } }) => {
    // Redirect fully provisioned users to the app
    if (session?.user?.identityProviderId) throw redirect({ to: "/chat" });

    // Clear zombie sessions (OAuth cookie without proper provisioning)
    if (session?.user) {
      await signOutLocal();
    }
  },
  component: HomePage,
});

const features = [
  {
    title: "Voice-First",
    description:
      "Natural voice interactions powered by real-time audio streaming",
    icon: <MicIcon size={28} />,
  },
  {
    title: "Multi-Channel",
    description: "One assistant across Discord, Telegram, Slack, and more",
    icon: <MessageSquareIcon size={28} />,
  },
  {
    title: "Persistent Memory",
    description: "Beacon remembers context across conversations and channels",
    icon: <BrainIcon size={28} />,
  },
  {
    title: "Extensible Skills",
    description: "Install tools that give Beacon new abilities on demand",
    icon: <ZapIcon size={28} />,
  },
  {
    title: "Custom Personas",
    description: "Shape personality, tone, and expertise to fit your workflow",
    icon: <VenetianMaskIcon size={28} />,
  },
];

const steps = [
  {
    number: "01",
    title: "Sign In",
    description: "Authenticate with your Omni account to get started instantly",
    icon: <SparklesIcon size={24} />,
  },
  {
    number: "02",
    title: "Configure",
    description:
      "Choose your AI provider, set up a persona, and connect channels",
    icon: <ZapIcon size={24} />,
  },
  {
    number: "03",
    title: "Start Talking",
    description: "Chat via voice, text, or any connected channel",
    icon: <RocketIcon size={24} />,
  },
];

const channels = [
  { name: "Discord", icon: <DiscordIcon size={20} /> },
  { name: "Telegram", icon: <TelegramIcon size={20} /> },
  { name: "Slack", icon: <SlackIcon size={20} /> },
];

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative px-4 pt-20 pb-32 sm:px-6 md:pt-32 md:pb-40 lg:px-8">
        {/* Decorative glow behind headline */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[400px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted">
              {app.description.split(".")[0]}
            </span>
          </div>

          <h1 className="mb-6 font-extrabold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-text">Your AI assistant,</span>
            <span className="mt-2 block text-shimmer">always within reach</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted">
            Voice, text, Discord, Telegram, Slack, and more. Deploy a single
            binary and your assistant is everywhere. Free and open source.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              className="btn-primary group flex h-12 items-center gap-2 px-8 text-base font-semibold"
              onClick={() => signIn({ redirectUrl: "/chat" })}
            >
              Get Started Free
              <ArrowRightIcon
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <a
              href={app.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="btn-glass flex h-12 items-center gap-2 px-8">
                <GithubIcon size={18} />
                View on GitHub
              </span>
            </a>
          </div>

          {/* Channel badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {channels.map((ch) => (
              <span
                key={ch.name}
                className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted"
              >
                {ch.icon}
                {ch.name}
              </span>
            ))}
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted">
              <MicIcon size={16} />
              Voice
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="glass-panel mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted">
              Features
            </span>
            <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
              Built for every conversation
            </h2>
            <p className="text-lg text-muted">
              A single runtime that adapts to how you work
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="glass-panel group rounded-2xl p-6 transition-all hover:glow-soft"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  {feat.icon}
                </div>
                <h3 className="mb-2 font-semibold text-lg text-text">
                  {feat.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="glass-panel mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted">
              How It Works
            </span>
            <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
              Online in minutes
            </h2>
            <p className="text-lg text-muted">No friction. Just signal.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="glass-panel flex flex-col items-center rounded-2xl p-8 text-center"
              >
                <div className="relative mb-6">
                  <div className="glass-panel flex h-20 w-20 items-center justify-center rounded-2xl">
                    <div className="text-primary">{step.icon}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-xs text-[#0a0a0f]">
                    {step.number}
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-xl text-text">
                  {step.title}
                </h3>
                <p className="max-w-xs text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16">
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
              <div className="max-w-xl text-center lg:text-left">
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <CheckCircle2Icon size={14} />
                  Open Source
                </span>
                <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
                  Transparent by design
                </h2>
                <p className="text-lg text-muted">
                  {app.name} is completely open source. Inspect the code,
                  contribute features, or self-host on your own infrastructure.
                  Your data, your signal.
                </p>
              </div>

              <a
                href={app.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="btn-glass flex h-12 items-center gap-2 px-6">
                  <GithubIcon size={20} />
                  View on GitHub
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 font-bold text-4xl text-text sm:text-5xl">
            Ready to broadcast your{" "}
            <span className="text-shimmer">signal?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted">
            One assistant, every channel, always listening. Free and open
            source, forever.
          </p>

          <button
            type="button"
            className="btn-primary group mx-auto flex h-14 items-center gap-2 px-10 text-lg font-semibold"
            onClick={() => signIn({ redirectUrl: "/chat" })}
          >
            Get Started for Free
            <ArrowRightIcon
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <p className="mt-6 text-muted text-sm">
            No credit card required. Free and open source.
          </p>
        </div>
      </section>
    </div>
  );
}
