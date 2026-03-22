// Gateway client module
//
// Provides unified access to the beacon-gateway from all platforms

export { type GatewayClientExtensions, getGatewayClient } from "./client";
export {
  type ConnectionState,
  type DiscoveredGateway,
  getGatewayDiscovery,
} from "./discovery";
