import type { BillingProvider } from "@omnidotdev/providers/billing";
import { createBillingProvider } from "@omnidotdev/providers/billing";

const baseUrl = import.meta.env.VITE_BILLING_URL as string | undefined;
const appId = import.meta.env.VITE_BILLING_APP_ID as string | undefined;

// Only instantiate when both env vars are present
const billingProvider: BillingProvider | null =
  baseUrl && appId
    ? createBillingProvider({ provider: "aether", baseUrl, appId })
    : null;

export default billingProvider;
