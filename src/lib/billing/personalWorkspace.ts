/** An organization claim as the session carries it (rich, from userinfo) */
type OrganizationLike = {
  id?: unknown;
  slug?: unknown;
  type?: unknown;
};

/** The user's personal workspace */
type PersonalWorkspace = {
  id: string;
  slug: string;
};

/**
 * The signed-in user's personal workspace, the one Beacon bills. Omni bills
 * workspaces, and the personal workspace stands in for the individual, so
 * Beacon's plan and credits belong to it. Null when the session carries no
 * personal workspace (no `organization` scope, or a degraded session)
 * @param organizations - The session's organization claims
 */
export const personalWorkspace = (
  organizations: readonly OrganizationLike[] | null | undefined,
): PersonalWorkspace | null => {
  const personal = (organizations ?? []).find((org) => org.type === "personal");

  if (
    !personal ||
    typeof personal.id !== "string" ||
    typeof personal.slug !== "string" ||
    !personal.id ||
    !personal.slug
  ) {
    return null;
  }

  return { id: personal.id, slug: personal.slug };
};
