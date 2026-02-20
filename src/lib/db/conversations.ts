// Conversation and message operations for local IndexedDB storage

import { db, generateId, type LocalConversation, type LocalMessage } from "./index";
import type { Conversation, Message } from "../api/types";

// Convert local format to API format
function toApiConversation(local: LocalConversation): Conversation {
  return {
    id: local.id,
    title: local.title,
    lastMessage: null, // Populated separately if needed
    updatedAt: local.updatedAt,
  };
}

function toApiMessage(local: LocalMessage): Message {
  return {
    id: local.id,
    role: local.role,
    content: local.content,
    timestamp: local.timestamp,
    isError: local.isError,
  };
}

// Conversation operations
export async function getConversations(personaId: string): Promise<Conversation[]> {
  const conversations = await db.conversations
    .where("personaId")
    .equals(personaId)
    .reverse()
    .sortBy("updatedAt");

  // Get last message for each conversation
  const results: Conversation[] = [];
  for (const conv of conversations) {
    const lastMessage = await db.messages
      .where("conversationId")
      .equals(conv.id)
      .reverse()
      .sortBy("timestamp")
      .then((msgs) => msgs[0]?.content ?? null);

    results.push({
      ...toApiConversation(conv),
      lastMessage,
    });
  }

  return results;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const conv = await db.conversations.get(id);
  if (!conv) return null;

  const lastMessage = await db.messages
    .where("conversationId")
    .equals(id)
    .reverse()
    .sortBy("timestamp")
    .then((msgs) => msgs[0]?.content ?? null);

  return {
    ...toApiConversation(conv),
    lastMessage,
  };
}

export async function createConversation(personaId: string, title?: string): Promise<Conversation> {
  const now = Date.now();
  const conversation: LocalConversation = {
    id: generateId(),
    title: title ?? "New conversation",
    personaId,
    createdAt: now,
    updatedAt: now,
  };

  await db.conversations.add(conversation);

  return {
    id: conversation.id,
    title: conversation.title,
    lastMessage: null,
    updatedAt: conversation.updatedAt,
  };
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db.conversations.update(id, {
    title,
    updatedAt: Date.now(),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", [db.conversations, db.messages], async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

// Message operations
export async function getMessages(conversationId: string): Promise<Message[]> {
  const messages = await db.messages
    .where("conversationId")
    .equals(conversationId)
    .sortBy("timestamp");

  return messages.map(toApiMessage);
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  options?: { isError?: boolean },
): Promise<Message> {
  const now = Date.now();
  const message: LocalMessage = {
    id: generateId(),
    conversationId,
    role,
    content,
    timestamp: now,
    isError: options?.isError,
  };

  await db.transaction("rw", [db.conversations, db.messages], async () => {
    await db.messages.add(message);
    // Update conversation timestamp
    await db.conversations.update(conversationId, { updatedAt: now });
  });

  // Auto-title conversation based on first user message
  const conv = await db.conversations.get(conversationId);
  if (conv?.title.startsWith("New conversation") && role === "user") {
    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
    await db.conversations.update(conversationId, { title });
  }

  return toApiMessage(message);
}

export async function getMessageCount(conversationId: string): Promise<number> {
  return db.messages.where("conversationId").equals(conversationId).count();
}

export async function updateMessage(id: string, content: string): Promise<void> {
  await db.messages.update(id, { content });
}

export async function deleteMessage(id: string): Promise<void> {
  await db.messages.delete(id);
}

// Bulk operations for sync
export async function importConversation(
  conversation: Conversation,
  messages: Message[],
  personaId: string,
): Promise<void> {
  await db.transaction("rw", [db.conversations, db.messages], async () => {
    await db.conversations.put({
      id: conversation.id,
      title: conversation.title,
      personaId,
      createdAt: conversation.updatedAt,
      updatedAt: conversation.updatedAt,
    });

    for (const msg of messages) {
      await db.messages.put({
        id: msg.id,
        conversationId: conversation.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      });
    }
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [db.conversations, db.messages], async () => {
    await db.conversations.clear();
    await db.messages.clear();
  });
}
