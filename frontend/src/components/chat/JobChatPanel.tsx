import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Wifi, WifiOff, Wrench, X } from "lucide-react";
import { chatService, type ChatMessage, type Conversation } from "../../services/chatService";
import type { Complaint, User } from "../../types/utility";
import { formatSubmittedAt } from "../../utils/utilityDisplay";

type JobChatPanelProps = {
  complaint: Complaint;
  currentUser: User | null;
};

function getTechnicianPresence(complaint: Complaint) {
  const technician = complaint.technician;

  if (!technician) {
    return { label: "Not assigned", tone: "bg-slate-100 text-slate-600", isLive: false };
  }

  if (technician.status === "Offline") {
    return { label: "Offline", tone: "bg-slate-100 text-slate-600", isLive: false };
  }

  if (!technician.locationUpdatedAt) {
    return {
      label: `${technician.status} - no live ping yet`,
      tone: "bg-amber-100 text-amber-800",
      isLive: false,
    };
  }

  const minutesSincePing = (Date.now() - new Date(technician.locationUpdatedAt).getTime()) / 60000;

  if (minutesSincePing <= 3) {
    return {
      label: `Live now - ${technician.status}`,
      tone: "bg-emerald-100 text-emerald-800",
      isLive: true,
    };
  }

  return {
    label: `Last live ${Math.round(minutesSincePing)} min ago`,
    tone: "bg-amber-100 text-amber-800",
    isLive: false,
  };
}

function getSenderName(message: ChatMessage, complaint: Complaint, currentUser: User | null) {
  if (message.senderRole === "Citizen" || message.senderRole === "citizen") {
    return complaint.citizen?.name ?? "Citizen";
  }
  if (message.senderRole === "Technician" || message.senderRole === "technician") {
    return complaint.technician?.name ?? "Technician";
  }
  if (currentUser && message.senderId === currentUser.id) {
    return currentUser.name ?? "You";
  }
  return message.senderRole || "User";
}

export default function JobChatPanel({ complaint, currentUser }: JobChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);

  const presence = getTechnicianPresence(complaint);
  const canChat = Boolean(complaint.technician) && complaint.status !== "Cancelled";
  const isTechnician = currentUser?.role === "Technician";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || !canChat || !currentUser) return;
    let cancelled = false;

    setIsLoading(true);
    setError("");
    setUnreadCount(0);

    chatService
      .createComplaintConversation(complaint.id)
      .then(({ conversation }) => {
        if (!cancelled) setConversation(conversation);
      })
      .catch(() => {
        if (!cancelled) setError("Chat will be available after a technician is assigned.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, canChat, complaint.id, currentUser]);

  useEffect(() => {
    if (!conversation || !isOpen) return;
    let cancelled = false;

    const loadMessages = () => {
      chatService
        .listMessages(conversation.id)
        .then(({ messages }) => {
          if (cancelled) return;
          const previousCount = previousMessageCountRef.current;
          previousMessageCountRef.current = messages.length;
          setMessages(messages);

          if (!isOpen && messages.length > previousCount) {
            const newMessages = messages.slice(previousCount);
            const unreadFromOthers = newMessages.filter(
              (m) => m.senderId !== currentUser?.id && m.senderRole !== currentUser?.role
            ).length;
            setUnreadCount((prev) => prev + unreadFromOthers);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Could not load chat messages.");
        });
    };

    loadMessages();
    const timer = window.setInterval(loadMessages, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [conversation, isOpen, currentUser?.id, currentUser?.role]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !conversation || isSending) return;

    setInput("");
    setIsSending(true);
    setError("");

    try {
      const { message } = await chatService.sendMessage(conversation.id, trimmed);
      setMessages((current) => {
        const updated = [...current, message];
        previousMessageCountRef.current = updated.length;
        return updated;
      });
    } catch {
      setError("Could not send this message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex w-full items-center justify-center gap-2 rounded-md border border-sky-200 bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700"
      >
        <MessageCircle size={18} />
        Chat
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500">
            <MessageCircle size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">Job Chat</p>
            <p className="text-xs text-slate-300">
              {isTechnician ? "Chat with this citizen" : "Chat with assigned technician"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${presence.tone}`}>
            {presence.isLive ? <Wifi size={13} /> : <WifiOff size={13} />}
            {presence.label}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-sky-700" />
          <p className="text-sm font-semibold">
            {complaint.technician?.name ?? "No technician assigned"}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {complaint.token} - {complaint.title}
        </p>
      </div>

      {!canChat ? (
        <div className="p-4 text-sm text-slate-600">
          Chat will unlock when this complaint has an assigned technician.
        </div>
      ) : (
        <>
          {error && <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</p>}

          <div className="h-72 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={18} />
                Loading chat...
              </div>
            ) : messages.length ? (
              messages.map((message) => {
                const isMine = message.senderId === currentUser?.id;
                const senderName = getSenderName(message, complaint, currentUser);
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? "rounded-br-sm bg-sky-600 text-white"
                          : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                      }`}
                    >
                      {!isMine && (
                        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${isMine ? "text-sky-100" : "text-slate-500"}`}>
                          {senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-line">{message.text}</p>
                      <p className={`mt-1 text-[10px] ${isMine ? "text-sky-100" : "text-slate-400"}`}>
                        {formatSubmittedAt(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                No messages yet. Start with an update about this job.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isTechnician ? "Send an update to the citizen..." : "Ask about this job..."}
                disabled={!conversation || isSending}
                className="min-w-0 flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || !conversation || isSending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-60"
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
