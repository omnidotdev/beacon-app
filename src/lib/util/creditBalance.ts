import {
  creditsFromBalanceUsd,
  formatCredits,
} from "@omnidotdev/providers/billing";

interface CreditBalanceDisplay {
  /** Whole credits, rounded down so the balance is never overstated */
  credits: number;
  /** Locale-grouped credits for display (no unit label) */
  formatted: string;
  /** No whole credit left to spend */
  isOutOfCredits: boolean;
}

/**
 * Convert the pooled Omni credit balance (retail USD, as Aether stores it)
 * into display credits.
 * @param balanceUsd - Balance in retail USD, as a numeric string or number
 * @param locale - Optional BCP 47 locale for grouping
 * @returns Display credits, or null when the balance is missing or malformed
 */
const getCreditBalanceDisplay = (
  balanceUsd: string | number | null | undefined,
  locale?: Intl.LocalesArgument,
): CreditBalanceDisplay | null => {
  if (balanceUsd == null) return null;

  try {
    const credits = creditsFromBalanceUsd(balanceUsd);

    return {
      credits,
      formatted: formatCredits(credits, locale),
      isOutOfCredits: credits <= 0,
    };
  } catch {
    // Never render garbage as a plausible balance
    return null;
  }
};

export default getCreditBalanceDisplay;
