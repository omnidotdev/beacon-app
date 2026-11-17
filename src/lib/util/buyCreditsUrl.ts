import { accountUrl } from "@omnidotdev/providers/react";

/**
 * Where to buy credits: Buy credits on the Omni account hub, the one place
 * credits are sold. `?product=beacon&tab=ai` lands on Omni credits, and
 * `?workspace=` selects the personal workspace Beacon bills, so the credits
 * land where Beacon spends them. Empty when no account hub is configured, so
 * the link is hidden rather than dead
 * @param accountBaseUrl - Account hub base URL
 * @param workspace - Personal workspace slug, when known
 */
const buyCreditsUrl = (
  accountBaseUrl: string | undefined,
  workspace?: string,
): string => {
  const base = accountUrl(accountBaseUrl);
  if (!base) return "";

  const search = new URLSearchParams({ product: "beacon", tab: "ai" });
  if (workspace) search.set("workspace", workspace.toLowerCase());

  return `${base}/billing?${search.toString()}`;
};

export default buyCreditsUrl;
