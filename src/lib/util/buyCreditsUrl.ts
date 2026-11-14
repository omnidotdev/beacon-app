import { accountUrl } from "@omnidotdev/providers/react";

/**
 * Where to buy credits: Buy credits on the Omni account hub, the one place
 * credits are sold. `?product=beacon` lands on the AI usage tab with the
 * personal account (the one Beacon bills) selected. Empty when no account hub
 * is configured, so the link is hidden rather than dead
 * @param accountBaseUrl - Account hub base URL
 */
const buyCreditsUrl = (accountBaseUrl: string | undefined): string => {
  const base = accountUrl(accountBaseUrl);
  return base ? `${base}/billing?product=beacon` : "";
};

export default buyCreditsUrl;
