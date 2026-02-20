// Local IndexedDB storage using Dexie
//
// Stores conversations and messages client-side for:
// - Offline access
// - Privacy (data stays on device)
// - Zero server storage cost for cloud users

import Dexie, { type EntityTable } from "dexie";

// Database schema types
export interface LocalConversation {
  id: string;
  title: string;
  personaId: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isError?: boolean;
}

// Database class
class BeaconDatabase extends Dexie {
  conversations!: EntityTable<LocalConversation, "id">;
  messages!: EntityTable<LocalMessage, "id">;

  constructor() {
    super("beacon");

    this.version(1).stores({
      conversations: "id, personaId, updatedAt",
      messages: "id, conversationId, timestamp",
    });
  }
}

// Singleton database instance
export const db = new BeaconDatabase();

// Helper to generate IDs
export function generateId(): string {
  return crypto.randomUUID();
}

export default db;
