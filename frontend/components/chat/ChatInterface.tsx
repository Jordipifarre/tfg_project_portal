"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send, Bot, User, Loader2, Sparkles,
  MessageSquare, PlusCircle,
} from "lucide-react";
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

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

export function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "Nova conversa", messages: [] },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentSession = sessions.find((s) => s.id === currentSessionId)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession.messages]);

  const handleNewChat = () => {
    const id = Date.now().toString();
    setSessions((prev) => [{ id, title: "Nova conversa", messages: [] }, ...prev]);
    setCurrentSessionId(id);
  };

  const typewriter = async (text: string, msgId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== currentSessionId
          ? s
          : { ...s, messages: [...s.messages, { id: msgId, role: "ai", content: "", isTyping: true }] }
      )
    );
    let out = "";
    for (const word of text.split(" ")) {
      out += word + " ";
      setSessions((prev) =>
        prev.map((s) =>
          s.id !== currentSessionId
            ? s
            : { ...s, messages: s.messages.map((m) => (m.id === msgId ? { ...m, content: out } : m)) }
        )
      );
      await new Promise((r) => setTimeout(r, 28));
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== currentSessionId
          ? s
          : { ...s, messages: s.messages.map((m) => (m.id === msgId ? { ...m, isTyping: false } : m)) }
      )
    );
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

    const isFirst = currentSession.messages.length === 0;
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== currentSessionId
          ? s
          : {
              ...s,
              title: isFirst ? userText.slice(0, 32) + "…" : s.title,
              messages: [...s.messages, { id: userMsgId, role: "user", content: userText }],
            }
      )
    );

    setIsLoading(true);
    try {
      const res = await askAI(userText);
      await typewriter(res.ai || "No he pogut generar una resposta.", aiMsgId);
    } catch {
      toast({ title: "Error de connexió", description: "El backend no respon.", variant: "destructive" });
      setSessions((prev) =>
        prev.map((s) =>
          s.id !== currentSessionId
            ? s
            : {
                ...s,
                messages: [
                  ...s.messages,
                  { id: aiMsgId, role: "ai", content: "**Error:** No s'ha pogut connectar amb el servidor." },
                ],
              }
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isTypingActive = currentSession.messages.some((m) => m.isTyping);

  return (
    <div className="flex h-full rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
      {/* ── History sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-52 flex-col border-r border-slate-800 bg-slate-950/60 shrink-0">
        <div className="p-3 border-b border-slate-800 shrink-0">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2 justify-start bg-slate-800 hover:bg-slate-700 text-slate-200 border-0 text-xs h-9"
            variant="outline"
          >
            <PlusCircle size={14} /> Nova conversa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest px-2 pt-1 pb-1.5">
            Historial
          </p>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all ${
                s.id === currentSessionId
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
              }`}
            >
              <MessageSquare size={11} className="shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main chat column ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-cyan-500/20">
                <Sparkles className="text-cyan-400 w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-slate-300">Com puc ajudar-te?</h2>
              <p className="mt-2 max-w-xs text-xs text-slate-500 leading-relaxed">
                Fes preguntes sobre incidents, analitza taules o consulta la documentació oficial.
              </p>
            </div>
          ) : (
            currentSession.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-cyan-400" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-700/20 border border-cyan-700/30 text-slate-100 rounded-br-sm"
                      : "bg-slate-800/70 border border-slate-700/50 text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <div className="prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.isTyping && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-cyan-400 animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 ring-1 ring-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-slate-300" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking indicator */}
          {isLoading && !isTypingActive && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-cyan-400" />
              </div>
              <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-slate-400" />
                <span className="text-xs text-slate-400 italic">Processant…</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input bar — pinned at bottom */}
        <div className="shrink-0 border-t border-slate-800 p-3 bg-slate-950/60 backdrop-blur-sm">
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-1.5 focus-within:border-cyan-600/50 transition-colors"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre les dades de seguretat…"
              disabled={isLoading || isTypingActive}
              className="flex-1 border-0 focus-visible:ring-0 shadow-none bg-transparent h-9 text-sm text-slate-100 placeholder:text-slate-500"
              autoFocus
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || isTypingActive}
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
            >
              <Send size={14} />
            </Button>
          </form>
          <p className="text-center text-[10px] text-slate-600 mt-1.5">
            L'assistent pot cometre errors — verifica les estadístiques importants.
          </p>
        </div>
      </div>
    </div>
  );
}
