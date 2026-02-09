// Gateway client module
//
// Provides unified access to the beacon-gateway from all platforms

export {
  createGatewayClient,
  type GatewayClientConfig,
  type GatewayClientExtensions,
  getGatewayClient,
} from "./client";

export {
  type ConnectionState,
  type DiscoveredGateway,
  GatewayDiscovery,
  getGatewayDiscovery,
} from "./discovery";

export {
  type DeviceIdentity,
  generateIdentity,
  getPublicIdentity,
  getShortId,
  loadOrCreateIdentity,
  signPayload,
  verifySignature,
} from "./identity";
