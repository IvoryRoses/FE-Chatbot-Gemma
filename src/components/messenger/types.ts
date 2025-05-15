// types.ts
export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  recipientId: string; // Store PSID for sending messages
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isFromPage: boolean;
}

export interface FacebookMessage {
  id: string;
  message: string;
  from: {
    id: string;
    name: string;
  };
  created_time: string;
}
