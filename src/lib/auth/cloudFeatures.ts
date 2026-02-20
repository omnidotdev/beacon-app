// Cloud features configuration
//
// Cloud features require Omni OAuth authentication and are optional
// in the local-first architecture

/**
 * Features that require cloud authentication
 */
export const CLOUD_FEATURES = {
  // Cross-device memory sync
  memorySync: {
    id: "memory_sync",
    name: "Memory Sync",
    description: "Sync memories and preferences across all your devices",
    requiresAuth: true,
  },

  // Persona marketplace
  personaMarketplace: {
    id: "persona_marketplace",
    name: "Persona Marketplace",
    description: "Browse and install personas from the community",
    requiresAuth: true,
  },

  // Usage tracking and billing
  usageTracking: {
    id: "usage_tracking",
    name: "Omni Synapse",
    description: "Use Omni-hosted AI models with pay-per-use credits",
    requiresAuth: true,
  },

  // Remote access via Omni relay
  remoteAccess: {
    id: "remote_access",
    name: "Remote Access",
    description: "Access your gateway from anywhere via Omni relay",
    requiresAuth: true,
  },

  // Trellis PKM integration
  trellis: {
    id: "trellis",
    name: "Trellis",
    description: "Sync conversations to your Trellis knowledge garden",
    requiresAuth: true,
    comingSoon: true,
  },
} as const;

/**
 * Features that work locally without authentication
 */
export const LOCAL_FEATURES = {
  // Chat with AI
  chat: {
    id: "chat",
    name: "Chat",
    description: "Conversation with your AI assistant",
    requiresAuth: false,
  },

  // Voice input/output
  voice: {
    id: "voice",
    name: "Voice",
    description: "Voice input and text-to-speech output",
    requiresAuth: false,
  },

  // Local personas
  localPersonas: {
    id: "local_personas",
    name: "Local Personas",
    description: "Use personas stored on your gateway",
    requiresAuth: false,
  },

  // Device pairing
  devicePairing: {
    id: "device_pairing",
    name: "Device Pairing",
    description: "Pair devices with your gateway",
    requiresAuth: false,
  },

  // mDNS discovery
  discovery: {
    id: "discovery",
    name: "Gateway Discovery",
    description: "Automatically find gateways on your network",
    requiresAuth: false,
  },

  // Channel integrations
  channels: {
    id: "channels",
    name: "Messaging Channels",
    description: "Connect to Discord, Slack, Telegram, and more",
    requiresAuth: false,
  },

  // Skills management
  skills: {
    id: "skills",
    name: "Skills",
    description: "Extend your assistant with custom skills",
    requiresAuth: false,
  },
} as const;

export type CloudFeatureId = keyof typeof CLOUD_FEATURES;
export type LocalFeatureId = keyof typeof LOCAL_FEATURES;

/**
 * Check if a feature requires cloud authentication
 */
export function requiresCloudAuth(
  featureId: CloudFeatureId | LocalFeatureId,
): boolean {
  if (featureId in CLOUD_FEATURES) {
    return CLOUD_FEATURES[featureId as CloudFeatureId].requiresAuth;
  }
  return false;
}

/**
 * Get all cloud features
 */
export function getCloudFeatures() {
  return Object.values(CLOUD_FEATURES);
}

/**
 * Get all local features
 */
export function getLocalFeatures() {
  return Object.values(LOCAL_FEATURES);
}
