/**
 * Conversations API — typed client for the W20 F3.3 `/conversations` CRUD
 * surface (per ADR-0031 Option B server-side Conversation History).
 *
 * Mirrors `backend/api/schemas/conversation.py` exactly:
 *   - Conversation         ↔ Conversation
 *   - Message              ↔ Message (citations carry the W3 Citation shape)
 *   - ConversationDetail   ↔ ConversationDetail (conversation + messages)
 *   - ConversationListResponse (paginated)
 *
 * Cross-user isolation is enforced server-side (`Depends(get_current_user)` on
 * every route); the client therefore needs no user filter. Auth transport per
 * ADR-0022 — `credentials: 'include'` carries the `ekp_session` cookie + the
 * CSRF header is injected by `ApiClient` on non-GET writes.
 *
 * The optional `_lite` flag on `appendMessage` skips the response unmarshalling
 * round-trip for the assistant turn (the chat page already has the Message in
 * local state — the POST is a "persist-and-forget" call after the SSE stream
 * settles).
 */

import { ApiClient } from '../api-client';
import type { Citation } from './query';

const client = new ApiClient();

export type ConversationRole = 'user' | 'assistant';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  kb_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: ConversationRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConversationCreatePayload {
  title?: string;
  kb_id?: string | null;
}

export interface ConversationUpdatePayload {
  title?: string;
  /** Pass `null` to clear the kb_id binding; omit the key to preserve it. */
  kb_id?: string | null;
}

export interface MessageCreatePayload {
  role: ConversationRole;
  content: string;
  citations?: Citation[] | null;
}

export const conversationsApi = {
  list: (limit = 50, offset = 0): Promise<ConversationListResponse> =>
    client.get<ConversationListResponse>(
      `/conversations?limit=${limit}&offset=${offset}`,
    ),

  get: (id: string): Promise<ConversationDetail> =>
    client.get<ConversationDetail>(`/conversations/${id}`),

  create: (payload: ConversationCreatePayload = {}): Promise<Conversation> =>
    client.post<Conversation>('/conversations', payload),

  update: (id: string, payload: ConversationUpdatePayload): Promise<Conversation> =>
    client.patch<Conversation>(`/conversations/${id}`, payload),

  remove: (id: string): Promise<void> =>
    // The route returns 204 No Content — the typed wrapper still resolves to
    // `Promise<void>` because `ApiClient.delete` (added below) reads no body.
    client.delete<void>(`/conversations/${id}`),

  appendMessage: (
    conversationId: string,
    payload: MessageCreatePayload,
  ): Promise<Message> =>
    client.post<Message>(`/conversations/${conversationId}/messages`, payload),
};
