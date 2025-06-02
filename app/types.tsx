// app/types.tsx

export interface ChatMessage {
  id: string;
  text: string;
  sender: string; 
  timestamp: string; 
  originalTimestamp: string; 
  nickname?: string; 
}

export interface Chat {
  id: number | string; 
  sender: string; 
  messagePreview: string;
  messages: ChatMessage[];
  unreadCount?: number;
  avatar?: string;
  isAnonymous?: boolean; 
  lastMessageTimestamp?: string; 
}

// WebSocket Message Payload
export interface WebSocketMessagePayload {
  type: "ANON_TO_USER" | "USER_TO_ANON" | "ERROR" | "INFO" | "MARK_AS_READ"; // Added MARK_AS_READ
  from?: string; 
  to?: string;   
  content?: string;
  nickname?: string; 
  timestamp?: string; 
  chatId?: string | number; 
}