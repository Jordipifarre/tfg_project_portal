"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5.5rem)" }}>
      {/* Header */}
      <div className="shrink-0 pb-4 flex items-center gap-3">
        <div className="p-2 bg-[#1a3a52]/10 rounded-lg">
          <MessageSquare size={18} className="text-[#1a3a52]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Smart Chat</h1>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Agent SQL + pipeline RAG — pregunta sobre les dades de seguretat.
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
