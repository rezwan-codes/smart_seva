import { api } from "./api";

export type TechnicianLite = {
  id: string;
  name: string;
  skill: string;
  status: string;
  phone?: string;
  locationUpdatedAt?: string | null;
};

export type Conversation = {
  id: string;
  technician?: TechnicianLite;
  citizen?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  complaint?: {
    id: string;
    token: string;
    title: string;
    status: string;
    priority: string;
    area: string;
  } | null;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

export const chatService = {
  async listConversations(): Promise<{ conversations: Conversation[] }> {
    const { data } = await api.get("/chat/conversations");
    return data;
  },

  async createConversation(technicianId: string): Promise<{ conversation: Conversation }> {
    const { data } = await api.post("/chat/conversations", { technicianId });
    return data;
  },

  async createComplaintConversation(complaintId: string): Promise<{ conversation: Conversation }> {
    const { data } = await api.post(`/chat/complaints/${complaintId}/conversation`);
    return data;
  },

  async listMessages(conversationId: string): Promise<{ messages: ChatMessage[] }> {
    const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
    return data;
  },

  async sendMessage(conversationId: string, text: string): Promise<{ message: ChatMessage }> {
    const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { text });
    return data;
  },
};
