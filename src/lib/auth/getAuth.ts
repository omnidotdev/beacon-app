import { createGetAuth } from "@omnidotdev/providers/auth";
import { setCookie } from "@tanstack/react-start/server";

import auth from "@/lib/auth/auth";
import { authCache, oidc } from "@/lib/auth/authCache";

const getAuth = createGetAuth({
  authApi: auth.api,
  oidc,
  authCache,
  setCookie,
});

export { getAuth };
