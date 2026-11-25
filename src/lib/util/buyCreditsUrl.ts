import { hubCreditsUrl } from "@omnidotdev/providers/react";

/**
 * Where to buy credits: Buy credits on the Omni account hub, the one place
 * credits are sold. It lands on AI credits for Beacon, for the personal
 * workspace Beacon bills, so the credits land where Beacon spends them, and
 * opens the hub as the account Beacon is signed in as. Empty when no account
 * hub is configured, so the link is hidden rather than dead
 * @param accountBaseUrl - Account hub base URL
 * @param options.workspace - Personal workspace slug, when known
 * @param options.loginHint - The signed-in account's subject
 */
const buyCreditsUrl = (
  accountBaseUrl: string | undefined,
  {
    workspace,
    loginHint,
  }: { workspace?: string; loginHint?: string | null } = {},
): string =>
  hubCreditsUrl(accountBaseUrl, { product: "beacon", workspace, loginHint });

export default buyCreditsUrl;
