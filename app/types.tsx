// app/types.tsx

export interface ChatMessage {
    id: string;
    text: string;
    sender: string; // 'self' or user ID/name for local display, or actual sender from WebSocket
    timestamp: string;
    nickname?: string; // For messages from anonymous users
  }
  
  export interface Chat {
    id: number | string; // Corresponds to anonSessionId for chats with anonymous users
    sender: string; // Username of authenticated user or nickname of anonymous sender
    messagePreview: string;
    messages: ChatMessage[];
    unreadCount?: number;
    avatar?: string;
    isAnonymous?: boolean; // Flag to distinguish chat type
  }
  
  // WebSocket Message Payload
  export interface WebSocketMessagePayload {
    type: "ANON_TO_USER" | "USER_TO_ANON" | "ERROR" | "INFO"; // Added ERROR and INFO for more robust communication
    from: string; // anonSessionId (for ANON_TO_USER) or username (for USER_TO_ANON)
    to: string;   // username (for ANON_TO_USER) or anonSessionId (for USER_TO_ANON)
    content: string;
    nickname?: string; // Only used when ANON_TO_USER
    timestamp?: string; // ISO format; backend fills this
  }