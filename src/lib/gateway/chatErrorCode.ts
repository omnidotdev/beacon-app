/** How the chat UI treats a gateway error */
export type ChatErrorKind = "out_of_credits" | "ai_unavailable" | "other";

/** A gateway failure the chat UI surfaces as a dedicated notice */
export type BillingNoticeKind = Exclude<ChatErrorKind, "other">;

/**
 * Map a gateway WebSocket error code onto the chat UI state it drives.
 * `out_of_credits` is the Synapse gateway's 402 (the pooled Omni credit
 * balance is empty); `ai_unavailable` is a 503 or a failed key provisioning
 * @param code - Error `code` from the gateway, if any
 * @returns The UI error kind
 */
const getChatErrorKind = (code: string | undefined): ChatErrorKind => {
  if (code === "out_of_credits") return "out_of_credits";
  if (code === "ai_unavailable") return "ai_unavailable";

  return "other";
};

export default getChatErrorKind;
