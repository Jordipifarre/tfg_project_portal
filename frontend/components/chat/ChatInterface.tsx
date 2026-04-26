"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  isTyping?: boolean;
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typewriter = async (text: string, msgId: string) => {
    setMessages((prev) => [...prev, { id: msgId, role: "ai", content: "", isTyping: true }]);
    let out = "";
    for (const word of text.split(" ")) {
      out += word + " ";
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: out } : m))
      );
      await new Promise((r) => setTimeout(r, 28));
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isTyping: false } : m))
    );
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: userText }]);
    setIsLoading(true);

    try {
      const res = await askAI(userText);
      await typewriter(res.ai || "No he pogut generar una resposta.", aiMsgId);
    } catch {
      toast({ title: "Error de connexió", description: "El backend no respon.", variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: "ai", content: "**Error:** No s'ha pogut connectar amb el servidor." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isTypingActive = messages.some((m) => m.isTyping);

  return (
    <div className="flex h-full rounded-lg border border-[#e5e5e5] overflow-hidden bg-white shadow-sm">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div className="w-14 h-14 bg-[#1a3a52]/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-[#1a3a52]/20">
                <Sparkles className="text-[#1a3a52] w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[#1f2937]">Com puc ajudar-te?</h2>
              <p className="mt-2 max-w-xs text-xs text-[#6b7280] leading-relaxed">
                Fes preguntes sobre incidents, analitza taules o consulta la documentació oficial.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-[#1a3a52]/10 ring-1 ring-[#1a3a52]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-[#1a3a52]" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1a3a52] text-white rounded-br-sm"
                      : "bg-white border border-[#e5e5e5] text-[#1f2937] rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <div className="prose prose-sm max-w-none break-words prose-headings:text-[#1f2937] prose-p:text-[#1f2937] prose-strong:text-[#1f2937] prose-code:text-[#1a3a52]">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.isTyping && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#1a3a52] animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 ring-1 ring-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-[#475569]" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && !isTypingActive && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-[#1a3a52]/10 ring-1 ring-[#1a3a52]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-[#1a3a52]" />
              </div>
              <div className="bg-white border border-[#e5e5e5] shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-[#9ca3af]" />
                <span className="text-xs text-[#6b7280] italic">Processant…</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-[#e5e5e5] p-3 bg-white">
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-gray-50 border border-[#e5e5e5] rounded-xl px-3 py-1.5 focus-within:border-[#1a3a52]/40 focus-within:ring-1 focus-within:ring-[#1a3a52]/10 transition-all"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre les dades de seguretat…"
              disabled={isLoading || isTypingActive}
              className="flex-1 border-0 focus-visible:ring-0 shadow-none bg-transparent h-9 text-sm text-[#1f2937] placeholder:text-[#9ca3af]"
              autoFocus
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || isTypingActive}
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg bg-[#1a3a52] hover:bg-[#0f2d42] text-white disabled:opacity-40"
            >
              <Send size={14} />
            </Button>
          </form>
          <p className="text-center text-[10px] text-[#9ca3af] mt-1.5">
            L&apos;assistent pot cometre errors — verifica les estadístiques importants.
          </p>
        </div>
      </div>
    </div>
  );
}
