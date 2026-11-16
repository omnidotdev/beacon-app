import { Coins, CreditCard, Shield } from "lucide-react";

import {
  useCreditBalance,
  useEntitlements,
  usePrices,
  useSubscription,
} from "@/hooks";
import { isCloudDeployment } from "@/lib/api";
import billingProvider from "@/lib/billing";
import {
  hubInterval,
  manageSubscriptionUrl,
  upgradePlanUrl,
} from "@/lib/billing/hubLinks";
import { ACCOUNT_URL, BASE_URL } from "@/lib/config/env.config";
import buyCreditsUrl from "@/lib/util/buyCreditsUrl";
import getCreditBalanceDisplay from "@/lib/util/creditBalance";
import getTierFromEntitlements from "@/lib/util/getTierFromEntitlements";

/** Format a Unix timestamp to a readable date, or a dash when missing/invalid */
function formatDate(timestamp?: number | null): string {
  if (timestamp == null) return "—";
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Map subscription status to display config */
function getStatusDisplay(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-500/15 text-emerald-400",
      };
    case "canceled":
      return {
        label: "Canceled",
        className: "bg-red-500/15 text-red-400",
      };
    case "past_due":
      return {
        label: "Past Due",
        className: "bg-amber-500/15 text-amber-400",
      };
    case "trialing":
      return {
        label: "Trial",
        className: "bg-primary/15 text-primary",
      };
    default:
      return {
        label: status,
        className: "bg-muted/15 text-muted",
      };
  }
}

function SubscriptionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-32 rounded bg-surface-elevated" />
        <div className="h-5 w-16 rounded-full bg-surface-elevated" />
      </div>
      <div className="h-4 w-48 rounded bg-surface-elevated" />
      <div className="flex gap-3">
        <div className="h-9 w-32 rounded-lg bg-surface-elevated" />
        <div className="h-9 w-28 rounded-lg bg-surface-elevated" />
      </div>
    </div>
  );
}

// Inner component that always calls hooks (avoids Rules of Hooks violation)
function SubscriptionSettingsInner() {
  const { data: subscription, isLoading } = useSubscription();
  const { data: entitlements } = useEntitlements();
  const { data: prices } = usePrices();
  const { data: creditData, isLoading: isCreditLoading } = useCreditBalance();

  const hasSubscription = !!subscription;
  const isCancelingScheduled = !!subscription?.cancelAt;

  // A comped or manually-granted tier has no Stripe subscription, so fall back to
  // the entitlement tier. Prefer the live subscription's plan name when present.
  const entitlementTier = getTierFromEntitlements(entitlements);
  const hasEntitlement = !!entitlementTier;
  const planName = subscription?.product?.name ?? entitlementTier ?? "Free";

  // Pooled Omni balance (retail USD) shown as whole credits
  const balance = getCreditBalanceDisplay(creditData?.balance);

  // Target the entry paid tier ("pro"), falling back to the cheapest paid price.
  // Prices arrive sorted by unit amount ascending.
  const upgradePrice =
    prices?.find((price) => price.metadata?.tier === "pro") ??
    prices?.find((price) => (price.unit_amount ?? 0) > 0);

  // Plans are bought and managed on the Omni account hub, never here
  const upgradeInterval = hubInterval(upgradePrice?.recurring?.interval);
  const upgradeUrl =
    upgradePrice?.metadata?.tier && upgradeInterval
      ? upgradePlanUrl(ACCOUNT_URL, BASE_URL, {
          plan: upgradePrice.metadata.tier,
          interval: upgradeInterval,
        })
      : "";
  const manageUrl = manageSubscriptionUrl(ACCOUNT_URL);

  // Credits are sold on the Omni account hub (catalog packs), never here
  const buyUrl = buyCreditsUrl(ACCOUNT_URL);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted/60">
        Subscription
      </h2>

      {isLoading ? (
        <SubscriptionSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Tier and status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <span className="text-lg font-semibold text-text">
                {planName}
              </span>
            </div>

            {hasSubscription && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusDisplay(subscription.status).className}`}
              >
                {getStatusDisplay(subscription.status).label}
              </span>
            )}

            {isCancelingScheduled && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                Cancels {formatDate(subscription?.cancelAt)}
              </span>
            )}
          </div>

          {/* Period info */}
          {hasSubscription && (
            <p className="text-sm text-muted">
              Current period ends {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}

          {!hasSubscription && !hasEntitlement && (
            <p className="text-sm text-muted">
              Upgrade for more included credits each month and voice
            </p>
          )}

          {/* Credit balance (one pool shared across Omni) */}
          {balance && !isCreditLoading && (
            <div
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                balance.isOutOfCredits
                  ? "border border-amber-500/30 bg-amber-500/10"
                  : "bg-surface-elevated/50"
              }`}
            >
              <Coins size={16} className="text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {balance.isOutOfCredits
                    ? "You are out of credits"
                    : `${balance.formatted} credits`}
                </p>
                <p className="text-xs text-muted">
                  {balance.isOutOfCredits
                    ? "Chat is paused until you buy credits or upgrade. Credits are shared across Omni"
                    : "Shared across Omni"}
                </p>
              </div>
              {buyUrl && (
                <a
                  href={buyUrl}
                  className={
                    balance.isOutOfCredits
                      ? "btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
                      : "flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
                  }
                >
                  <Coins size={12} />
                  Buy credits
                </a>
              )}
            </div>
          )}

          {/* Actions (open on the account hub, in the system browser on desktop) */}
          <div className="flex flex-wrap gap-3">
            {!hasSubscription && upgradeUrl && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
              >
                <CreditCard size={14} />
                Upgrade
              </a>
            )}

            {hasSubscription && manageUrl && (
              <a
                href={manageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass flex items-center gap-2 text-sm"
              >
                <CreditCard size={14} />
                Manage subscription
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Guard component that skips rendering on non-cloud deployments or without billing
function SubscriptionSettings() {
  if (!isCloudDeployment() || !billingProvider) return null;
  return <SubscriptionSettingsInner />;
}

export default SubscriptionSettings;
