// Lightweight GraphQL client for beacon-api
//
// Uses fetch to call the beacon-api GraphQL endpoint
// with session access token for authentication

import { API_GRAPHQL_URL } from "@/lib/config/env.config";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
};

/**
 * Execute a GraphQL query or mutation against the beacon-api
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @param accessToken - JWT access token for authentication
 */
async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  accessToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(API_GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Authentication required",
      403: "Access denied",
      404: "API endpoint not found",
      500: "Server error",
    };
    throw new Error(messages[response.status] ?? `Request failed (${response.status})`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL");
  }

  return result.data;
}

export default graphqlFetch;
