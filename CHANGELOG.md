# @omnidotdev/beacon-app

## 0.3.0

### Minor Changes

- [#43](https://github.com/omnidotdev/beacon-app/pull/43) [`86436c1`](https://github.com/omnidotdev/beacon-app/commit/86436c1e6a56588fdc24245a695af683718833b6) Thanks [@coopbri](https://github.com/coopbri)! - Links from Beacon to your Omni account (Manage account, Upgrade, Manage subscription, Buy credits, Add a card) now open it as the same account you use in Beacon, even when another account is signed in on the browser

### Patch Changes

- [#39](https://github.com/omnidotdev/beacon-app/pull/39) [`11dcbe0`](https://github.com/omnidotdev/beacon-app/commit/11dcbe05e8cefa49ef691173d6263858f94f1480) Thanks [@coopbri](https://github.com/coopbri)! - Beacon now follows your Omni session: switching accounts or signing out in another Omni app switches or signs out here too, the next time you come back to the tab

- [#41](https://github.com/omnidotdev/beacon-app/pull/41) [`4a204d0`](https://github.com/omnidotdev/beacon-app/commit/4a204d06f04b24087368c03d0054b6f51bd1b40a) Thanks [@coopbri](https://github.com/coopbri)! - Beacon no longer jumps around while it loads: text keeps its size while the font loads, your persona shows from the first paint instead of briefly showing Orin, and the example prompts appear with the page instead of pushing it up once connected

- [#42](https://github.com/omnidotdev/beacon-app/pull/42) [`ff762bc`](https://github.com/omnidotdev/beacon-app/commit/ff762bcee8e96f4ee0fe48638019f2c7cd1de1b0) Thanks [@coopbri](https://github.com/coopbri)! - Sign-in session tokens stay out of reach of scripts running on the page.

## 0.2.0

### Minor Changes

- [#23](https://github.com/omnidotdev/beacon-app/pull/23) [`acd89ca`](https://github.com/omnidotdev/beacon-app/commit/acd89cacff75c3332164f2fb5adde1a1769a2e26) Thanks [@coopbri](https://github.com/coopbri)! - When managed AI needs a paid account, chat now says that AI uses Omni credits and offers Buy credits, Upgrade to Pro, or using your own API key, instead of a generic error. Buy credits links open straight on Omni credits on your account.

- [#24](https://github.com/omnidotdev/beacon-app/pull/24) [`caaf058`](https://github.com/omnidotdev/beacon-app/commit/caaf0582d933f41c66c8135f3c934bc7f6d6c269) Thanks [@coopbri](https://github.com/coopbri)! - Offer free monthly AI credits where credits run short. While the card-verified free AI credits offer is live, the out-of-credits and paid-access chat notices, and Settings for a free workspace that is out of credits, show an "Add a card" link for the free monthly AI credits, linking to the AI tab of your account for your personal workspace. Chat now asks you to sign in again when your session cannot name the workspace Beacon bills, and the paid-access notice says "Beacon AI runs on AI credits."

- [#26](https://github.com/omnidotdev/beacon-app/pull/26) [`e2499b0`](https://github.com/omnidotdev/beacon-app/commit/e2499b0b610ac4d4790f2a052dfff08cbbc2afc9) Thanks [@coopbri](https://github.com/coopbri)! - A new chat offers example prompts above the message box, such as "Plan a three-day trip to Lisbon on a budget", picked at random each visit, with More ideas to see others. Picking one drafts it into the message box so you can edit it before sending; nothing is sent until you send it. The examples hide while you type and come back if you clear the box.

- [#16](https://github.com/omnidotdev/beacon-app/pull/16) [`08c4648`](https://github.com/omnidotdev/beacon-app/commit/08c4648c46aee3eba586d491131bda8384a8e897) Thanks [@coopbri](https://github.com/coopbri)! - The model picker now always shows the current Omni models and the right default for your plan. If a model you picked is retired, Beacon switches you to the default. Models from your own Anthropic or OpenAI key are unchanged.

- [#14](https://github.com/omnidotdev/beacon-app/pull/14) [`c4b5f60`](https://github.com/omnidotdev/beacon-app/commit/c4b5f60a8b73429350ee00da5286f851dab52e48) Thanks [@coopbri](https://github.com/coopbri)! - AI usage now draws on your shared Omni credit balance. Settings shows your balance with a Buy Credits action, and chat tells you when you are out of credits or AI is temporarily unavailable.

- [`b79a50a`](https://github.com/omnidotdev/beacon-app/commit/b79a50ab7f80087d119755008a19a2171d764c3f) Thanks [@coopbri](https://github.com/coopbri)! - Redesigned AI provider settings: Omni Credits is now the main way to use AI, with smart routing across Claude, GPT-4o, and Kimi K2.5, and your own keys (Anthropic, OpenAI, OpenRouter) live under Advanced. Fixed the model picker showing nothing for new users.

- [#33](https://github.com/omnidotdev/beacon-app/pull/33) [`fcd8522`](https://github.com/omnidotdev/beacon-app/commit/fcd8522bd1696de7412a028bcd1edc25d61f96fb) Thanks [@coopbri](https://github.com/coopbri)! - Dictate messages in chat: tap the mic, speak, and tap again to add the transcript to your message. Voice dictation is included with Beacon Pro and Team

### Patch Changes

- [#22](https://github.com/omnidotdev/beacon-app/pull/22) [`8681c56`](https://github.com/omnidotdev/beacon-app/commit/8681c562793f23506a6dd2e063182f2f58b625f0) Thanks [@coopbri](https://github.com/coopbri)! - Call the shared balance "AI credits": the out-of-credits notice says "Your personal workspace is out of AI credits." and the managed provider card says its models are billed to your AI credits

- [`a7d65fa`](https://github.com/omnidotdev/beacon-app/commit/a7d65faff8c5dede8f18a75edd53fc6f78e399d9) Thanks [@coopbri](https://github.com/coopbri)! - Beacon now runs on Android 15 and later devices that use 16 KB memory pages.

- [#36](https://github.com/omnidotdev/beacon-app/pull/36) [`4c3ca4f`](https://github.com/omnidotdev/beacon-app/commit/4c3ca4f73dcf07eddbd46c616aa7d28bed2bec39) Thanks [@coopbri](https://github.com/coopbri)! - Signed-out visitors opening a signed-in page (chat, memories, settings) are sent to the landing page again instead of seeing an empty app

- [#20](https://github.com/omnidotdev/beacon-app/pull/20) [`b7a50c4`](https://github.com/omnidotdev/beacon-app/commit/b7a50c43340d3be5f408241b9d5b7f28df469c28) Thanks [@coopbri](https://github.com/coopbri)! - Show the plan and credits of your personal workspace, the workspace Beacon now bills. A plan bought on the Omni account hub for your personal workspace now shows in Settings, and Upgrade, Manage subscription, and Buy credits open the hub for that workspace.

- [#27](https://github.com/omnidotdev/beacon-app/pull/27) [`ffb2029`](https://github.com/omnidotdev/beacon-app/commit/ffb20297fd8a64afa1022afe9b3a5b5a2317ccfe) Thanks [@coopbri](https://github.com/coopbri)! - Hover, focus, and selection states use Beacon's orange brand color or a subtle neutral highlight instead of teal: menus, the command palette, the conversation rename button and field, the settings CLI card, and focused inputs.

- [#15](https://github.com/omnidotdev/beacon-app/pull/15) [`a5b0b66`](https://github.com/omnidotdev/beacon-app/commit/a5b0b66c60335f3c3fcbc2d20eccf9eb9f6fe085) Thanks [@coopbri](https://github.com/coopbri)! - Buying credits now happens on your Omni account, where you can pick a credit pack, instead of a fixed $10 checkout. The out-of-credits notice and subscription settings link straight there.

- [#27](https://github.com/omnidotdev/beacon-app/pull/27) [`ffb2029`](https://github.com/omnidotdev/beacon-app/commit/ffb20297fd8a64afa1022afe9b3a5b5a2317ccfe) Thanks [@coopbri](https://github.com/coopbri)! - Soften the chat's borders: example prompts, the message box, and other shared controls now use the theme's subtle hairline borders and hover states instead of bright white outlines and a teal hover.

- [#13](https://github.com/omnidotdev/beacon-app/pull/13) [`3583b7f`](https://github.com/omnidotdev/beacon-app/commit/3583b7ff885adfe53bd8b9449bfbe2fa6b5fb0ee) Thanks [@coopbri](https://github.com/coopbri)! - Claude Opus 5.5, Sonnet 5.5, and Haiku 5.5 are now available with Omni credits or your own Anthropic key. The retired Claude Sonnet 4 is removed.

- [#30](https://github.com/omnidotdev/beacon-app/pull/30) [`8a0b7aa`](https://github.com/omnidotdev/beacon-app/commit/8a0b7aad548065aeeb39ab49ac608bb793b4ea7d) Thanks [@coopbri](https://github.com/coopbri)! - In Beacon cloud, the Skills and Personas pages show the shared set Omni manages, read-only, instead of install and uninstall controls that every user shared

- [#28](https://github.com/omnidotdev/beacon-app/pull/28) [`3bf4c4c`](https://github.com/omnidotdev/beacon-app/commit/3bf4c4c31c384a6ba27f8a0b2e05d37ec265dca9) Thanks [@coopbri](https://github.com/coopbri)! - Press `?` anywhere, or pick "Keyboard shortcuts" in the command palette, to see every keyboard shortcut. Press `b` to show or hide the sidebar.

- [#29](https://github.com/omnidotdev/beacon-app/pull/29) [`e314ea2`](https://github.com/omnidotdev/beacon-app/commit/e314ea2a6209d5f6d018de62659c399d62b77fdb) Thanks [@coopbri](https://github.com/coopbri)! - Refresh the landing page: show live plan pricing, link the privacy policy and terms, describe voice accurately (hands-free when self-hosted, web voice coming soon), add a card for bringing your own AI key, and tidy the section headings

- [#31](https://github.com/omnidotdev/beacon-app/pull/31) [`3f399cd`](https://github.com/omnidotdev/beacon-app/commit/3f399cd3271c69ef2e32a909129b857bd45380f5) Thanks [@coopbri](https://github.com/coopbri)! - The landing page banner and header stay solid while scrolling, so cards no longer show through them

- [#27](https://github.com/omnidotdev/beacon-app/pull/27) [`ffb2029`](https://github.com/omnidotdev/beacon-app/commit/ffb20297fd8a64afa1022afe9b3a5b5a2317ccfe) Thanks [@coopbri](https://github.com/coopbri)! - Match the empty chat's example prompts to the selected persona: Microcap offers crypto and token questions, Jocko offers discipline and accountability asks, and other personas keep the everyday set.

- [#21](https://github.com/omnidotdev/beacon-app/pull/21) [`fc86bdb`](https://github.com/omnidotdev/beacon-app/commit/fc86bdb9aa4763ff8c2332782d6d26308906d83b) Thanks [@coopbri](https://github.com/coopbri)! - Show the Upgrade action in Settings again. Beacon's plan prices are now read on the server, since the billing service refuses browser requests from Beacon.

- [#18](https://github.com/omnidotdev/beacon-app/pull/18) [`556e81a`](https://github.com/omnidotdev/beacon-app/commit/556e81a977154c9900aea8e2090e2ac2527eb83a) Thanks [@coopbri](https://github.com/coopbri)! - Buy and manage plans on your Omni account. Upgrade in Settings now opens the account hub's confirm step for Beacon Pro, and Manage subscription opens your subscriptions there, where you can change or cancel your plan, update your payment method, and see invoices. The in-app checkout, billing portal, and cancel and renew buttons are removed.

- [#32](https://github.com/omnidotdev/beacon-app/pull/32) [`57f4eb5`](https://github.com/omnidotdev/beacon-app/commit/57f4eb559e82e8dae69e6211fbeca5e3172fa35e) Thanks [@coopbri](https://github.com/coopbri)! - Pricing on the landing page has a monthly and yearly toggle showing the yearly saving, and choosing a paid plan signs you in and continues straight to checkout

- [#25](https://github.com/omnidotdev/beacon-app/pull/25) [`c8d713c`](https://github.com/omnidotdev/beacon-app/commit/c8d713c28dfa5263bf99c591bd38a6d556fb540d) Thanks [@coopbri](https://github.com/coopbri)! - Stop writing users' email addresses to the logs: a failed sign-in token check logs only the error message, not the user's email and name, by moving to `@omnidotdev/providers` v0.2.0.

- [#35](https://github.com/omnidotdev/beacon-app/pull/35) [`5f4b08e`](https://github.com/omnidotdev/beacon-app/commit/5f4b08e7d6f838de29a380d8de69dc5a510c91b5) Thanks [@coopbri](https://github.com/coopbri)! - Fonts are now served from our own site instead of Google Fonts, so loading the app no longer sends your IP address to Google.

- [#27](https://github.com/omnidotdev/beacon-app/pull/27) [`ffb2029`](https://github.com/omnidotdev/beacon-app/commit/ffb20297fd8a64afa1022afe9b3a5b5a2317ccfe) Thanks [@coopbri](https://github.com/coopbri)! - On phones and tablets, Enter in the chat box adds a new line and the send button sends, and the Shift+Enter hint is hidden there. With a keyboard, Enter still sends and Shift+Enter adds a line.
