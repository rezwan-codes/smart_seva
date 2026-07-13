import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, User2, Users, X } from "lucide-react";
import { authService } from "../../services/authService";
import { chatService } from "../../services/chatService";
import { complaintService } from "../../services/complaintService";
import { technicianService } from "../../services/technicianService";
import type { Complaint, Technician, User } from "../../types/utility";
import { formatEta } from "../../utils/utilityDisplay";

type Message = {
  id: string;
  sender: "user" | "bot" | "technician";
  text: string;
  timestamp: Date;
};

type ChatMode = "bot" | "technician";

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

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("bot");
  const [botMessages, setBotMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I'm the Smart Utility Assistant. Ask me about your complaints, technician, or emergency alerts.",
      timestamp: new Date(),
    },
  ]);
  const [botInput, setBotInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [conversations, setConversations] = useState<(TechnicianConversation | CitizenConversation)[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [botMessages, isBotTyping, chatMessages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    Promise.all([authService.me(), complaintService.list()])
      .then(([userData, complaintData]) => {
        if (!cancelled) {
          setUser(userData.user);
          setComplaints(complaintData.complaints);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingUserData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (mode !== "technician" || !isOpen || !user) return;
    let cancelled = false;

    technicianService
      .list()
      .then((data) => {
        if (!cancelled) setTechnicians(data.technicians);
      })
      .catch(() => {});

    chatService.listConversations().then((data) => {
      if (!cancelled) setConversations(data.conversations);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, isOpen, user]);

  useEffect(() => {
    if (mode !== "technician" || !activeConversationId) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    chatService.listMessages(activeConversationId).then((data) => {
      setChatMessages(
        data.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.createdAt),
        })),
      );
    });

    pollTimerRef.current = setInterval(() => {
      chatService.listMessages(activeConversationId).then((data) => {
        setChatMessages(
          data.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.createdAt),
          })),
        );
      });
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [mode, activeConversationId]);

  const generateBotReply = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    const activeComplaints = complaints.filter((c) => c.status !== "Completed");
    const emergencyComplaints = complaints.filter((c) => c.priority === "Emergency");
    const currentUser = user;

    if (/^(hi|hello|hey|greetings|good morning|good evening|good afternoon)/.test(lower)) {
      const name = currentUser?.name?.split(" ")[0] ?? "there";
      return `Hello ${name}! I'm here to help with your utility service queries. You can ask me about your complaints, technician assignments, or emergency alerts.`;
    }

    if (/help|what can you do|features/.test(lower)) {
      return (
        "I can help you with:\n" +
        "• Complaint status and queue position\n" +
        "• Assigned technician details\n" +
        "• Emergency alerts\n" +
        "• Active and completed complaints\n" +
        "• General utility service information\n\n" +
        "Just ask naturally!"
      );
    }

    if (/emergency|urgent|critical/.test(lower)) {
      if (!emergencyComplaints.length) {
        return "Good news! There are currently no emergency complaints in your account.";
      }
      return `You have ${emergencyComplaints.length} emergency complaint(s): ${emergencyComplaints.map((c) => c.token).join(", ")}. Please check the details on your dashboard.`;
    }

    if (/how many|total complaints|complaint count|active complaints|my complaints/.test(lower)) {
      const total = complaints.length;
      const active = activeComplaints.length;
      const completed = total - active;
      return `You have ${total} complaint(s) in total: ${active} active and ${completed} completed.`;
    }

    if (/status|current complaint|my complaint|queue/.test(lower)) {
      const active = activeComplaints[0];
      if (!active) {
        return "You don't have any active complaints right now. All your complaints have been completed or you haven't filed any yet.";
      }
      const tech = active.technician;
      return (
        `Your current complaint:\n` +
        `• Token: ${active.token}\n` +
        `• Title: ${active.title}\n` +
        `• Status: ${active.status}\n` +
        `• Priority: ${active.priority}\n` +
        `• Queue Position: #${active.position}\n` +
        `• Area: ${active.area}\n` +
        (tech
          ? `• Technician: ${tech.name} (${tech.skill})\n  ETA: ${formatEta(tech.etaMinutes)}\n  Rating: ${tech.rating}/5`
          : "• Technician: Not assigned yet")
      );
    }

    if (/technician|who.*(assigned|fixing)|assigned/.test(lower)) {
      const active = activeComplaints[0];
      if (!active?.technician) {
        return "No technician is assigned to your active complaint yet. An authority will assign one shortly.";
      }
      const tech = active.technician;
      return (
        `Your assigned technician:\n` +
        `• Name: ${tech.name}\n` +
        `• Skill: ${tech.skill}\n` +
        `• Status: ${tech.status}\n` +
        `• Rating: ${tech.rating}/5\n` +
        (typeof tech.distanceKm === "number" ? `• Distance: ${tech.distanceKm % 1 === 0 ? tech.distanceKm.toFixed(0) : tech.distanceKm.toFixed(1)} km\n` : "") +
        `• ETA: ${formatEta(tech.etaMinutes)}\n` +
        (tech.phone ? `• Phone: ${tech.phone}` : "")
      );
    }

    if (/water|gas|electricity|utility/.test(lower)) {
      const water = complaints.filter((c) => c.type === "Water").length;
      const gas = complaints.filter((c) => c.type === "Gas").length;
      const electricity = complaints.filter((c) => c.type === "Electricity").length;
      return (
        `Your complaint breakdown:\n` +
        `• Water: ${water}\n` +
        `• Gas: ${gas}\n` +
        `• Electricity: ${electricity}`
      );
    }

    if (/thank|thanks|thank you/.test(lower)) {
      return "You're welcome! Let me know if you need anything else.";
    }

    return (
      "I'm not sure I understood that. I can tell you about your complaint status, assigned technician, emergency alerts, or how many complaints you have. Try asking one of those!"
    );
  };

  const handleBotSend = async () => {
    const trimmed = botInput.trim();
    if (!trimmed || isBotTyping) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setBotMessages((prev) => [...prev, userMessage]);
    setBotInput("");
    setIsBotTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const botReply = generateBotReply(trimmed);
    const botMessage: Message = {
      id: `b-${Date.now()}`,
      sender: "bot",
      text: botReply,
      timestamp: new Date(),
    };

    setIsBotTyping(false);
    setBotMessages((prev) => [...prev, botMessage]);
  };

  const handleStartConversation = async (technicianId: string) => {
    try {
      const { conversation } = await chatService.createConversation(technicianId);
      setActiveConversationId(conversation.id);
      setConversations((prev) => [conversation, ...prev]);
    } catch {
      // ignore
    }
  };

  const handleOpenConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatLoading || !activeConversationId) return;

    setChatInput("");
    setIsChatLoading(true);

    try {
      const { message } = await chatService.sendMessage(activeConversationId, trimmed);
      setChatMessages((prev) => [
        ...prev,
        {
          ...message,
          timestamp: new Date(message.createdAt),
        },
      ]);
      chatService.listConversations().then((data) => {
        setConversations(data.conversations);
      });
    } catch {
      // ignore
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, onSend: () => void) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const isTechnician = user?.role === "Technician";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-3 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[400px]">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500">
                {mode === "bot" ? <Bot size={18} /> : <Users size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold">{mode === "bot" ? "Smart Utility Bot" : "Technician Chat"}</p>
                <p className="text-xs text-slate-300">
                  {mode === "bot" ? "Always here to help" : isTechnician ? "Chat with citizens" : "Chat with technicians"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex overflow-hidden rounded-md bg-white/10 p-0.5">
                <button
                  onClick={() => setMode("bot")}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition ${mode === "bot" ? "bg-white text-slate-950" : "text-slate-200 hover:text-white"}`}
                >
                  Bot
                </button>
                <button
                  onClick={() => setMode("technician")}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition ${mode === "technician" ? "bg-white text-slate-950" : "text-slate-200 hover:text-white"}`}
                >
                  {isTechnician ? "Chats" : "Technician"}
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {mode === "bot" && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {botMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                        msg.sender === "user"
                          ? "rounded-br-sm bg-sky-600 text-white"
                          : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleBotSend)}
                    placeholder="Ask about complaints, technician..."
                    disabled={isBotTyping}
                    className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-60"
                  />
                  <button
                    onClick={handleBotSend}
                    disabled={!botInput.trim() || isBotTyping}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-60"
                    aria-label="Send message"
                  >
                    {isBotTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === "technician" && (
            <div className="flex h-full flex-col">
              {!activeConversationId ? (
                <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
                  {isLoadingUserData ? (
                    <p className="p-4 text-center text-sm text-slate-600">Loading...</p>
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
                                <User2 size={16} />
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
                            onClick={() => (hasConversation ? handleOpenConversation((conversations.find((c) => (c as TechnicianConversation).technician?.id === technician.id) as TechnicianConversation).id) : handleStartConversation(technician.id))}
                            className="flex w-full flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <User2 size={16} />
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
                        onKeyDown={(e) => handleKeyDown(e, handleChatSend)}
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
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-white shadow-lg transition hover:bg-slate-800"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-semibold">Chat with us</span>
        </button>
      )}
    </div>
  );
}
