import authClient from "@/lib/auth/authClient";
import { BASE_URL } from "@/lib/config/env.config";

interface Params {
  /** Redirect URL after sign in */
  redirectUrl?: string;
}

/**
 * Sign in with Omni OAuth
 */
const signIn = async ({ redirectUrl = BASE_URL }: Params = {}) => {
  await authClient.signIn.social({
    provider: "omni",
    callbackURL: redirectUrl ?? "/",
  });
};

export default signIn;
