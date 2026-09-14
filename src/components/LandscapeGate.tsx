import { RotateCcw } from "lucide-react";

/**
 * Portrait-first guard. This app assumes a tall portrait column, so a phone turned
 * sideways (short, landscape, touch viewport) gets a rotate prompt instead of a
 * broken layout. Visibility is pure CSS (.landscape-gate in the global stylesheet):
 * shown only on a short, touch, landscape viewport (a phone on its side), never on
 * tablets or desktop. Kept in the DOM always so no JS/orientation listener is needed.
 */
export default function LandscapeGate() {
  return (
    <div className="landscape-gate" role="alert">
      <RotateCcw className="landscape-gate__icon" aria-hidden="true" />
      <p className="landscape-gate__title">Rotate your device</p>
      <p className="landscape-gate__body">
        This app works best in portrait. Turn your phone upright to keep going.
      </p>
    </div>
  );
}
