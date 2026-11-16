import { useRouteContext } from "@tanstack/react-router";
import { Coins, CreditCard, Shield } from "lucide-react";

import { usePlan, usePrices } from "@/hooks";
import { isCloudDeployment } from "@/lib/api";
import {
  hubInterval,
  manageSubscriptionUrl,
  upgradePlanUrl,
} from "@/lib/billing/hubLinks";
import { personalWorkspace } from "@/lib/billing/personalWorkspace";
import { isPaidTier, planName } from "@/lib/billing/plan";
import { ACCOUNT_URL, BASE_URL } from "@/lib/config/env.config";
import buyCreditsUrl from "@/lib/util/buyCreditsUrl";
import getCreditBalanceDisplay from "@/lib/util/creditBalance";

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
  const { session } = useRouteContext({ from: "__root__" });
  const { data: plan, isLoading } = usePlan();
  const { data: prices } = usePrices();

  // Beacon bills the user's personal workspace: its plan and credits apply,
  // and plan actions on the hub target it
  const workspace = personalWorkspace(session?.organizations)?.slug;

  const isPaid = isPaidTier(plan?.tier);
  const name = planName(plan?.tier);

  // The personal workspace's balance (retail USD) shown as whole credits
  const balance = getCreditBalanceDisplay(plan?.creditBalance);

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
          workspace,
        })
      : "";
  const manageUrl = manageSubscriptionUrl(ACCOUNT_URL, BASE_URL, workspace);

  // Credits are sold on the Omni account hub (catalog packs), never here
  const buyUrl = buyCreditsUrl(ACCOUNT_URL, workspace);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted/60">
        Subscription
      </h2>

      {isLoading ? (
        <SubscriptionSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Plan of the personal workspace Beacon bills */}
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <span className="text-lg font-semibold text-text">{name}</span>
          </div>

          <p className="text-sm text-muted">
            {isPaid
              ? "Your personal workspace's plan"
              : "Upgrade your personal workspace for more included credits each month and voice"}
          </p>

          {/* Credit balance of the personal workspace */}
          {balance && (
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
                    ? "Chat is paused until you buy credits or upgrade. Credits belong to your personal workspace"
                    : "Your personal workspace's credits"}
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
            {!isPaid && upgradeUrl && (
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

            {isPaid && manageUrl && (
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

// Guard component that skips rendering on non-cloud deployments. The plan
// comes from the gateway, so it shows even when the client has no billing URL
// (only the Upgrade target, which needs Aether's prices, is then hidden)
function SubscriptionSettings() {
  if (!isCloudDeployment()) return null;
  return <SubscriptionSettingsInner />;
}

export default SubscriptionSettings;
