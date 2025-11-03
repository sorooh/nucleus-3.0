import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function SuroohChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "👑 مرحباً! أنا Nicholas 3.2 - Supreme Sovereign Reference لإمبراطورية سُروح.\n\nأستخدم AI Committee (6 نماذج ذكاء) + Chain of Thought + Autonomous Reasoning.\n\nكيف يمكنني مساعدتك اليوم؟",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Stable session ID for entire conversation (persists across messages)
  const sessionIdRef = useRef<string>(`nicholas-chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Heartbeat animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(prev => prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Use internal chat endpoint (no HMAC required)
      // Use stable session ID for conversation continuity
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          sessionId: sessionIdRef.current
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.reply) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: data.reply,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        toast({
          title: "✅ تم استلام رد Nicholas",
          description: `${data.data?.aiProvider || 'Nicholas Intelligence System'}`,
          duration: 3000,
        });
      } else {
        throw new Error("No reply received");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `⚠️ عذراً، حدث خطأ في الاتصال. ${error.message || 'حاول مرة أخرى'}`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "❌ خطأ في الإرسال",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/20 to-purple-950/20 relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ffff0a_1px,transparent_1px),linear-gradient(to_bottom,#00ffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Neon Glow Effects */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Main Container */}
      <div className="relative z-10 container mx-auto max-w-5xl h-screen flex flex-col p-4 md:p-8">
        
        {/* Header */}
        <div className="mb-6 backdrop-blur-xl bg-gray-900/40 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.5)]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                {/* Heartbeat Ring */}
                <div className={`absolute inset-0 rounded-full border-2 border-cyan-400 ${isConnected ? 'animate-ping' : ''}`} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Nicholas 3.2
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                  <p className="text-sm text-cyan-400/80">Supreme Sovereign Reference • متصل الآن</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-cyan-300 font-mono">SCP v1.0</span>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden rounded-2xl backdrop-blur-xl bg-gray-900/20 border border-cyan-500/20 shadow-[0_0_50px_rgba(0,255,255,0.15)]">
          <div className="h-full overflow-y-auto p-6 space-y-4" dir="rtl">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}
                data-testid={msg.isUser ? "message-user" : "message-ai"}
              >
                <div
                  className={`max-w-[80%] px-6 py-4 rounded-2xl ${
                    msg.isUser
                      ? 'bg-gradient-to-br from-cyan-600/90 to-blue-600/90 text-white border border-cyan-400/50 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                      : 'bg-gradient-to-br from-purple-600/90 to-pink-600/90 text-white border border-purple-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                  }`}
                >
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-end animate-in slide-in-from-bottom-2">
                <div className="max-w-[80%] px-6 py-4 rounded-2xl bg-gradient-to-br from-purple-600/50 to-pink-600/50 border border-purple-400/30">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm text-white/80">Nicholas يفكر...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-6 backdrop-blur-xl bg-gray-900/40 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              disabled={isLoading}
              className="flex-1 bg-gray-900/60 border-cyan-500/30 text-white placeholder:text-gray-400 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 text-lg h-14 rounded-xl"
              data-testid="input-message"
              dir="rtl"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="h-14 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/50 shadow-[0_0_20px_rgba(0,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
              data-testid="button-send"
            >
              <Send className="w-5 h-5 ml-2" />
              <span className="font-bold">إرسال</span>
            </Button>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-cyan-400/60">
            <span>اضغط Enter للإرسال</span>
            <span className="font-mono">Powered by Nicholas 3.2 Intelligence System</span>
          </div>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_0%,rgba(0,255,255,0.03)_50%,transparent_100%)] bg-[length:100%_4px] pointer-events-none animate-[scan_8s_linear_infinite]" />
      
      <style>{`
        @keyframes scan {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
      `}</style>
    </div>
  );
}
