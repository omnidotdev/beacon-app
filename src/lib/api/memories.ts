// Memory API types and GraphQL operations
//
// Calls beacon-api GraphQL endpoints for memory management

import graphqlFetch from "./graphql";

export type MemoryCategory = "preference" | "fact" | "correction" | "general";

export type Memory = {
  id: string;
  gatewayMemoryId: string;
  category: string;
  content: string;
  contentHash: string;
  tags: string;
  pinned: boolean;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// GraphQL queries

const MY_MEMORIES_QUERY = `
  query MyMemories($category: String, $limit: Int) {
    myMemories(category: $category, limit: $limit) {
      id
      gatewayMemoryId
      category
      content
      contentHash
      tags
      pinned
      accessCount
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

const DELETE_MEMORY_MUTATION = `
  mutation DeleteMemory($gatewayMemoryId: String!) {
    deleteMemory(gatewayMemoryId: $gatewayMemoryId)
  }
`;

const UPDATE_MEMORY_MUTATION = `
  mutation UpdateMemory($gatewayMemoryId: String!, $pinned: Boolean) {
    updateMemory(gatewayMemoryId: $gatewayMemoryId, pinned: $pinned) {
      id
      gatewayMemoryId
      category
      content
      contentHash
      tags
      pinned
      accessCount
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

/**
 * Fetch all memories for the current user
 */
export async function fetchMemories(
  accessToken: string,
  category?: string,
  limit?: number,
): Promise<Memory[]> {
  const data = await graphqlFetch<{ myMemories: Memory[] }>(
    MY_MEMORIES_QUERY,
    { category: category ?? null, limit: limit ?? null },
    accessToken,
  );

  return data.myMemories;
}

/**
 * Soft-delete a memory by gateway memory ID
 */
export async function deleteMemory(
  accessToken: string,
  gatewayMemoryId: string,
): Promise<boolean> {
  const data = await graphqlFetch<{ deleteMemory: boolean }>(
    DELETE_MEMORY_MUTATION,
    { gatewayMemoryId },
    accessToken,
  );

  return data.deleteMemory;
}

/**
 * Update a memory (currently supports toggling pinned state)
 */
export async function updateMemory(
  accessToken: string,
  gatewayMemoryId: string,
  pinned: boolean,
): Promise<Memory> {
  const data = await graphqlFetch<{ updateMemory: Memory }>(
    UPDATE_MEMORY_MUTATION,
    { gatewayMemoryId, pinned },
    accessToken,
  );

  return data.updateMemory;
}
