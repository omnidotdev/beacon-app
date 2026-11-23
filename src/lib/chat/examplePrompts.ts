/**
 * Example prompts offered above an empty chat's composer. Picking one drafts
 * it into the composer to edit before sending
 */

/** Everyday asks any persona can take on, used when a persona has no own set */
export const EXAMPLE_PROMPTS = [
  "Plan a three-day trip to Lisbon on a budget",
  "Explain compound interest with a simple example",
  "Draft a friendly email asking to move a meeting",
  "Give me a 20-minute workout I can do at home",
  "Suggest five dinners I can cook in 30 minutes",
  "Help me write a cover letter for a design job",
  "Weigh the pros and cons of renting versus buying",
  "Quiz me on common Spanish verbs",
  "Brainstorm names for a neighborhood bakery",
  "Turn my to-do list into a plan for the week",
] as const;

/** Asks that fit a persona's specialty, keyed by persona id */
export const PERSONA_EXAMPLE_PROMPTS: Record<string, readonly string[]> = {
  microcap: [
    "What red flags should I check before buying a token",
    "Explain market cap versus fully diluted valuation",
    "How do I read a token's holder distribution",
    "Walk me through spotting a rug pull",
    "Explain liquidity pools like I'm new to DeFi",
    "What makes a microcap actually worth watching",
    "Help me size a position so a -90% won't wreck me",
    "Break down the tokenomics I should look for",
    "How do token unlocks move the price",
    "How can on-chain volume be faked",
  ],
  jocko: [
    "Build me a 5 a.m. morning routine that sticks",
    "I keep skipping workouts, hold me accountable",
    "Help me stop putting off a hard project",
    "Plan a no-excuses training week",
    "What does extreme ownership look like at work",
    "Help me lead a team that keeps missing deadlines",
    "Break a big goal into daily disciplined actions",
    "I got passed over for a promotion, now what",
    "Give me a plan to quit sugar for 30 days",
    "Help me run a blunt after-action review",
  ],
};

/** Example prompts for a persona, falling back to the everyday set */
export const examplePromptsFor = (personaId?: string): readonly string[] =>
  (personaId && PERSONA_EXAMPLE_PROMPTS[personaId]) || EXAMPLE_PROMPTS;
