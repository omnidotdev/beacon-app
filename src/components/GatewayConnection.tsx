import { useEffect, useState } from "react";

import { type ConnectionState, getGatewayDiscovery } from "@/lib/gateway";

interface GatewayConnectionProps {
  compact?: boolean;
}

/**
 * Gateway connection status indicator
 * Shows connection state and provides quick actions
 */
export function GatewayConnection({ compact = false }: GatewayConnectionProps) {
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
  });

  useEffect(() => {
    const discovery = getGatewayDiscovery();
    return discovery.subscribe(setState);
  }, []);

  const statusColors = {
    disconnected: "bg-slate-500",
    discovering: "bg-yellow-500 animate-pulse",
    connecting: "bg-yellow-500 animate-pulse",
    connected: "bg-green-500",
    error: "bg-red-500",
  };

  const statusText = {
    disconnected: "Disconnected",
    discovering: "Searching...",
    connecting: "Connecting...",
    connected: "Connected",
    error: "Error",
  };

  if (compact) {
    // Compact mode: just a status dot
    return (
      <a
        href="/setup"
        className="group relative flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-800/50"
        title={statusText[state.status]}
      >
        <span
          className={`h-2 w-2 rounded-full ${statusColors[state.status]}`}
        />
        {state.status === "connected" && (
          <span className="text-slate-500 text-xs">
            {state.gateway.deviceId.slice(0, 8)}
          </span>
        )}
      </a>
    );
  }

  // Full mode: status with details
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${statusColors[state.status]}`}
          />
          <div>
            <p className="font-medium text-white text-sm">
              {statusText[state.status]}
            </p>
            {state.status === "connected" && (
              <p className="text-slate-500 text-xs">{state.gateway.name}</p>
            )}
            {state.status === "error" && (
              <p className="text-red-400 text-xs">{state.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.status === "connected" ? (
            <button
              type="button"
              onClick={() => getGatewayDiscovery().disconnect()}
              className="rounded-lg px-3 py-1 text-slate-400 text-sm hover:bg-slate-700/50"
            >
              Disconnect
            </button>
          ) : (
            <a
              href="/setup"
              className="rounded-lg bg-indigo-600/20 px-3 py-1 text-indigo-400 text-sm hover:bg-indigo-600/30"
            >
              Connect
            </a>
          )}
        </div>
      </div>

      {state.status === "connected" && (
        <div className="mt-2 flex items-center gap-3 text-slate-500 text-xs">
          <span>{state.gateway.url}</span>
          <span>•</span>
          <span>v{state.gateway.version}</span>
          {state.gateway.voiceSupported && (
            <>
              <span>•</span>
              <span className="text-green-400">Voice</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
