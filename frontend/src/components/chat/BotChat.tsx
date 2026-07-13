import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { authService } from "../../services/authService";
import { complaintService } from "../../services/complaintService";
import type { Complaint, User } from "../../types/utility";
import { formatEta } from "../../utils/utilityDisplay";

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
};

export default function BotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I'm the Smart Utility Assistant. Ask me about your complaints, technician, or emergency alerts.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const generateReply = (userMessage: string): string => {
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

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const reply = generateReply(trimmed);
    const botMessage: Message = {
      id: `b-${Date.now()}`,
      sender: "bot",
      text: reply,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-3 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[400px]">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">Smart Utility Bot</p>
                <p className="text-xs text-slate-300">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((msg) => (
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
            {isTyping && (
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about complaints, technician..."
                disabled={isTyping}
                className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-60"
                aria-label="Send message"
              >
                {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
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
