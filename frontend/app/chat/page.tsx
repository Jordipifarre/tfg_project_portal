"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5.5rem)" }}>
      {/* Header */}
      <div className="shrink-0 pb-4 flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <MessageSquare size={18} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Smart Chat</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            SQL agent + RAG pipeline — ask anything about the safety data.
          </p>
        </div>
      </div>

      {/* Chat fills remaining height */}
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
