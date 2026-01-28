"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, Loader2 } from "lucide-react";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/chat/query-db", {
        message: message
      });
      setResponse(res.data.ai_analyst || res.data.answer);
    } catch (_error) { // 2. Canviat 'error' per '_error' (el guionet indica que sabem que no la usem)
      setResponse("Error: El backend no respon. Revisa que 'uvicorn' estigui corrent.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">AI Analyst</h1>
        <p className="text-slate-500">Pregunta qualsevol dada sobre seguretat a Catalunya.</p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border-2 shadow-xl">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {!response && !loading && (
            <div className="text-center py-20 text-slate-400">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
              {/* 3. Escapem l'apòstrof de l'any fent servir {" "} o l&apos; */}
              <p>Prova: Quants delictes hi ha hagut al Prat l&apos;any 2024?</p>
            </div>
          )}

          {response && (
            <div className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white p-5 rounded-2xl rounded-tl-none border shadow-sm text-slate-800 max-w-[85%]">
                {response}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-blue-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              La IA està analitzant la base de dades...
            </div>
          )}
        </CardContent>

        <div className="p-4 bg-white border-t">
          <div className="flex gap-3">
            <Input 
              placeholder="Escriu la teva consulta aquí..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="h-12 border-slate-200 focus-visible:ring-blue-600"
            />
            <Button onClick={sendMessage} disabled={loading} className="h-12 px-6 bg-blue-600 hover:bg-blue-700 transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}