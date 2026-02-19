import { Coins, CreditCard, Loader2, RefreshCw, Shield, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useBillingPortal,
  useCancelSubscription,
  useCheckout,
  useCreditBalance,
  useCreditCheckout,
  useRenewSubscription,
  useSubscription,
} from "@/hooks";
import { isCloudDeployment } from "@/lib/api";

/** Format a Unix timestamp to a readable date */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
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
  const { data: creditData, isLoading: isCreditLoading } = useCreditBalance();
  const { mutateAsync: openPortal, isPending: isPortalLoading } =
    useBillingPortal();
  const { mutateAsync: checkout, isPending: isCheckoutLoading } = useCheckout();
  const { mutateAsync: creditCheckout, isPending: isCreditCheckoutLoading } =
    useCreditCheckout();
  const { mutateAsync: cancel, isPending: isCancelling } =
    useCancelSubscription();
  const { mutateAsync: renew, isPending: isRenewing } =
    useRenewSubscription();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const hasSubscription = !!subscription;
  const isActive = subscription?.status === "active";
  const isCancelingScheduled = !!subscription?.cancelAt;

  const handleManageBilling = async () => {
    if (!subscription?.product?.id) return;

    try {
      await openPortal({
        productId: subscription.product.id,
        returnUrl: window.location.href,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open billing portal",
      );
    }
  };

  const handleUpgrade = async () => {
    try {
      await checkout({
        priceId: "",
        successUrl: `${window.location.origin}/settings?upgraded=true`,
        cancelUrl: window.location.href,
        createWorkspace: { name: "Default" },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start checkout",
      );
    }
  };

  const handleCancel = async () => {
    try {
      await cancel();
      setShowCancelConfirm(false);
      toast.success("Subscription will cancel at the end of the billing period");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel subscription",
      );
    }
  };

  const handleRenew = async () => {
    try {
      await renew();
      toast.success("Subscription renewed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to renew subscription",
      );
    }
  };

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
                {subscription?.product?.name ?? "Free"}
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
                Cancels {formatDate(subscription!.cancelAt!)}
              </span>
            )}
          </div>

          {/* Period info */}
          {hasSubscription && (
            <p className="text-sm text-muted">
              Current period ends {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}

          {!hasSubscription && (
            <p className="text-sm text-muted">
              Upgrade to unlock additional features and higher usage limits
            </p>
          )}

          {/* Credit balance */}
          {creditData && !isCreditLoading && (
            <div className="flex items-center gap-3 rounded-xl bg-surface-elevated/50 px-4 py-3">
              <Coins size={16} className="text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {creditData.balance.toLocaleString()} credits
                </p>
                <p className="text-xs text-muted">Available balance</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  creditCheckout({
                    amount: 10,
                    successUrl: `${window.location.origin}/settings?credits=purchased`,
                    cancelUrl: window.location.href,
                  })
                }
                disabled={isCreditCheckoutLoading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
              >
                {isCreditCheckoutLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Coins size={12} />
                )}
                Buy Credits
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!hasSubscription && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isCheckoutLoading}
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                {isCheckoutLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CreditCard size={14} />
                )}
                Upgrade
              </button>
            )}

            {hasSubscription && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
                className="btn-glass flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isPortalLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CreditCard size={14} />
                )}
                Manage Billing
              </button>
            )}

            {isActive && !isCancelingScheduled && (
              <>
                {showCancelConfirm ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                      Confirm Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="btn-glass px-4 py-2 text-sm"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <X size={14} />
                    Cancel Subscription
                  </button>
                )}
              </>
            )}

            {isCancelingScheduled && (
              <button
                type="button"
                onClick={handleRenew}
                disabled={isRenewing}
                className="btn-glass flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isRenewing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Renew Subscription
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Guard component that skips rendering on non-cloud deployments
function SubscriptionSettings() {
  if (!isCloudDeployment()) return null;
  return <SubscriptionSettingsInner />;
}

export default SubscriptionSettings;
