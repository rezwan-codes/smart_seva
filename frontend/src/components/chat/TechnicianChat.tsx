import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Users, X } from "lucide-react";
import { authService } from "../../services/authService";
import { chatService } from "../../services/chatService";
import { technicianService } from "../../services/technicianService";
import type { Technician, User } from "../../types/utility";

type TechnicianConversation = {
  id: string;
  technician?: {
    id: string;
    name: string;
    skill: string;
    status: string;
    phone?: string;
  };
  updatedAt: string;
};

type CitizenConversation = {
  id: string;
  citizen?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

export default function TechnicianChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [conversations, setConversations] = useState<(TechnicianConversation | CitizenConversation)[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    setIsLoadingUserData(true);
    setError("");

    Promise.all([authService.me()])
      .then(([userData]) => {
        if (!cancelled) {
          setUser(userData.user);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load user:", err);
          setError("Could not load your account. Please try logging in again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUserData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;

    setIsLoadingUserData(true);
    setError("");

    Promise.all([technicianService.list(), chatService.listConversations()])
      .then(([techData, convoData]) => {
        if (!cancelled) {
          setTechnicians(techData.technicians);
          setConversations(convoData.conversations);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load chat data:", err);
          setError("Could not load technicians or conversations. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUserData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (!activeConversationId) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    chatService.listMessages(activeConversationId)
      .then((data) => {
        setChatMessages(
          data.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.createdAt),
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
      });

    pollTimerRef.current = setInterval(() => {
      chatService.listMessages(activeConversationId)
        .then((data) => {
          setChatMessages(
            data.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.createdAt),
            })),
          );
        })
        .catch((err) => {
          console.error("Failed to poll messages:", err);
        });
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [activeConversationId]);

  const handleStartConversation = async (technicianId: string) => {
    try {
      const { conversation } = await chatService.createConversation(technicianId);
      setActiveConversationId(conversation.id);
      setConversations((prev) => [conversation, ...prev]);
      setError("");
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Could not start conversation. Please try again.");
    }
  };

  const handleOpenConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError("");
  };

  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatLoading || !activeConversationId) return;

    setChatInput("");
    setIsChatLoading(true);
    setError("");

    try {
      const { message } = await chatService.sendMessage(activeConversationId, trimmed);
      setChatMessages((prev) => [
        ...prev,
        {
          ...message,
          timestamp: new Date(message.createdAt),
        },
      ]);
      const result = await chatService.listConversations();
      setConversations(result.conversations);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Could not send message. Please try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleChatSend();
    }
  };

  const isTechnician = user?.role === "Technician";

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start font-sans">
      {isOpen && (
        <div className="mb-3 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[400px]">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">Technician Chat</p>
                <p className="text-xs text-slate-300">
                  {isTechnician ? "Chat with citizens" : "Chat with technicians"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          {!activeConversationId ? (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
              {isLoadingUserData ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">Loading...</p>
                </div>
              ) : isTechnician ? (
                conversations.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-600">No conversations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => handleOpenConversation(conversation.id)}
                        className="flex w-full flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{(conversation as CitizenConversation).citizen?.name ?? "Unknown"}</p>
                            <p className="text-xs text-slate-500">{(conversation as CitizenConversation).citizen?.email}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">Tap to open chat</p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  {technicians.map((technician) => {
                    const hasConversation = conversations.some((c) => (c as TechnicianConversation).technician?.id === technician.id);
                    return (
                      <button
                        key={technician.id}
                        onClick={() =>
                          hasConversation
                            ? handleOpenConversation(
                                (conversations.find((c) => (c as TechnicianConversation).technician?.id === technician.id) as TechnicianConversation).id,
                              )
                            : handleStartConversation(technician.id)
                        }
                        className="flex w-full flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{technician.name}</p>
                            <p className="text-xs text-slate-500">
                              {technician.skill} · {technician.status}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{hasConversation ? "Tap to continue chat" : "Tap to start chat"}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  ← Back to list
                </button>
                <span className="text-xs text-slate-500">
                  {isTechnician
                    ? (conversations.find((c) => c.id === activeConversationId) as CitizenConversation | undefined)?.citizen?.name ?? "Chat"
                    : (conversations.find((c) => c.id === activeConversationId) as TechnicianConversation | undefined)?.technician?.name ?? "Chat"}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {chatMessages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                          isMine
                            ? "rounded-br-sm bg-sky-600 text-white"
                            : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isChatLoading}
                    className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-60"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-60"
                    aria-label="Send message"
                  >
                    {isChatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-white shadow-lg transition hover:bg-slate-800"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-semibold">Technician Chat</span>
        </button>
      )}
    </div>
  );
}
