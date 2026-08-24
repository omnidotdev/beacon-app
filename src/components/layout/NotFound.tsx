import { NotFoundPage } from "@omnidotdev/thornberry/not-found";

import { BeaconLogo } from "@/components/Sidebar";
import app from "@/lib/config/app.config";

/**
 * 404 not found. Renders the shared Omni `<NotFoundPage>` (in-shell,
 * theme-aware, prominent "404"), branded with Beacon's wordmark and header
 * logomark. Home points at the app root.
 */
const NotFound = () => (
  <NotFoundPage
    appName={app.name}
    appLogo={<BeaconLogo className="h-7 w-7 text-primary" />}
  />
);

export default NotFound;
