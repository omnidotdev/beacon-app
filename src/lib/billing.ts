import { createBillingProvider } from "@omnidotdev/providers";

import type { BillingProvider } from "@omnidotdev/providers";

const baseUrl = import.meta.env.VITE_AETHER_URL as string | undefined;
const appId = import.meta.env.VITE_AETHER_APP_ID as string | undefined;

// Only instantiate when both env vars are present
const billingProvider: BillingProvider | null =
  baseUrl && appId ? createBillingProvider({ baseUrl, appId }) : null;

export default billingProvider;
