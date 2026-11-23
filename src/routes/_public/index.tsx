import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BrainIcon,
  CheckIcon,
  KeyRoundIcon,
  LogInIcon,
  MessageSquareIcon,
  MicIcon,
  RocketIcon,
  VenetianMaskIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { LuGithub as GithubIcon } from "react-icons/lu";
import {
  RiDiscordLine as DiscordIcon,
  RiSlackLine as SlackIcon,
  RiTelegramLine as TelegramIcon,
} from "react-icons/ri";

import { usePrices } from "@/hooks";
import signIn from "@/lib/auth/signIn";
import {
  type PricingInterval,
  pricingPlans,
  yearlySavingsPercent,
} from "@/lib/billing/pricingPlans";
import app from "@/lib/config/app.config";
import createMetaTags from "@/lib/util/createMetaTags";
import { signOutLocal } from "@/server/functions/auth";

export const Route = createFileRoute("/_public/")({
  head: () => createMetaTags({ title: "AI assistant, everywhere" }),
  beforeLoad: async ({ context: { session }, preload }) => {
    // skip data-driven work during hover-preload so the landing link does not navigate or sign out on hover
    if (preload) return;

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
    title: "Voice",
    description:
      "Hands-free conversations with wake words when you self-host. Voice in the web app is coming soon",
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
  {
    title: "Any AI Provider",
    description:
      "Run on Omni AI credits, or bring your own key for the models you already use",
    icon: <KeyRoundIcon size={28} />,
  },
];

const steps = [
  {
    number: "01",
    title: "Sign In",
    description: "Authenticate with your Omni account to get started instantly",
    icon: <LogInIcon size={24} />,
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
    description: "Chat in the web app, or anywhere you run Beacon",
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
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-6 font-extrabold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-text">Your AI assistant,</span>
            <span className="mt-2 block text-shimmer">always within reach</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
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
                className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
              >
                {ch.icon}
                {ch.name}
              </span>
            ))}
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
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
            <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
              Built for every conversation
            </h2>
            <p className="text-lg text-muted-foreground">
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
                <p className="text-muted-foreground text-sm leading-relaxed">
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
            <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
              Online in minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              No friction. Just signal.
            </p>
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
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-xs text-primary-foreground">
                    {step.number}
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-xl text-text">
                  {step.title}
                </h3>
                <p className="max-w-xs text-muted-foreground">
                  {step.description}
                </p>
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
                <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
                  Transparent by design
                </h2>
                <p className="text-lg text-muted-foreground">
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

      <Pricing />

      {/* Final CTA */}
      <section className="px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 font-bold text-4xl text-text sm:text-5xl">
            Ready to broadcast your{" "}
            <span className="text-shimmer">signal?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            One assistant, every channel. Open source, free to self-host, and
            free to start in the cloud.
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

          <p className="mt-6 text-muted-foreground text-sm">
            No credit card required to start.
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Plans offered in the cloud, live from billing (see `pricingPlans`)
 */
function Pricing() {
  const { data: prices } = usePrices();
  const [interval, setBillingInterval] = useState<PricingInterval>("month");
  const plans = pricingPlans(prices ?? [], interval);
  const savings = yearlySavingsPercent(prices ?? []);

  if (!plans.length) return null;

  // Paid plans sign in, then land on Settings, which sends the user to the
  // account hub's checkout for their personal workspace (the one Beacon bills)
  const choose = (tier: string) =>
    signIn({
      redirectUrl:
        tier === "free"
          ? "/chat"
          : `/settings?plan=${tier}&interval=${interval}`,
    });

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 font-bold text-3xl text-text sm:text-4xl">
            Simple pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade for included AI credits and unlimited
            conversations
          </p>
        </div>

        {savings && (
          <div className="mb-10 flex justify-center">
            <fieldset className="glass-panel inline-flex rounded-xl p-1">
              <legend className="sr-only">Billing interval</legend>
              {(["month", "year"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={interval === option}
                  onClick={() => setBillingInterval(option)}
                  className={`rounded-lg px-4 py-1.5 font-medium text-sm transition-colors ${
                    interval === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-text"
                  }`}
                >
                  {option === "month" ? "Monthly" : `Yearly, save ${savings}%`}
                </button>
              ))}
            </fieldset>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="glass-panel flex flex-col rounded-2xl p-6"
            >
              <h3 className="font-semibold text-lg text-text">{plan.name}</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                {plan.description}
              </p>
              <p className="mt-6 mb-6">
                <span className="font-bold text-4xl text-text">
                  ${plan.amount}
                </span>
                <span className="text-muted-foreground text-sm">
                  {" "}
                  /{interval}
                </span>
              </p>
              <ul className="mb-8 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <CheckIcon
                      size={16}
                      className="mt-0.5 flex-shrink-0 text-primary"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={
                  plan.amount === 0
                    ? "btn-glass h-11"
                    : "btn-primary h-11 font-semibold"
                }
                onClick={() => choose(plan.tier)}
              >
                {plan.amount === 0 ? "Start free" : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
