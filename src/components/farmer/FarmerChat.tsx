import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { safeFetchJson } from '../../utils/api.ts';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  Ticket,
  Calendar,
  Wheat,
  ShoppingBag,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Globe
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface ContextSummary {
  hasActiveToken: boolean;
  activeTokenNumber?: string;
  upcomingBookingsCount: number;
  procurementsCount: number;
}

interface FarmerChatProps {
  onNavigateToTab?: (tab: 'queue' | 'procurement' | 'purchases' | 'notifications') => void;
}

const QUICK_PROMPTS = [
  {
    labelHi: 'मेरा टोकन & कतार स्थिति',
    labelEn: 'My Token & Queue Position',
    prompt: 'मेरा सक्रिय टोकन क्या है और कतार में मेरी स्थिति क्या है?'
  },
  {
    labelHi: 'मेरी आगामी बुकिंग',
    labelEn: 'Upcoming Bookings',
    prompt: 'मेरी आगामी स्लॉट बुकिंग और अपॉइंटमेंट की जानकारी दें।'
  },
  {
    labelHi: 'फसल खरीद & भुगतान स्थिति',
    labelEn: 'Procurement & Payments',
    prompt: 'मेरी फसल खरीद (Procurement) और भुगतान की स्थिति क्या है?'
  },
  {
    labelHi: 'केंद्र पर उपलब्ध सेवाएं',
    labelEn: 'Available Kendra Services',
    prompt: 'कृषि सेवा केंद्र पर कौन-कौन सी सेवाएं उपलब्ध हैं और उनके क्या नियम हैं?'
  },
  {
    labelHi: 'मेरे खरीद बिल व रसीदें',
    labelEn: 'My Purchase Bills',
    prompt: 'मेरे हालिया खरीद बिल और रसीदें बताएं।'
  }
];

export const FarmerChat: React.FC<FarmerChatProps> = ({ onNavigateToTab }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initial welcome message
    const initialGreeting = user?.name
      ? `नमस्ते ${user.name} जी! 🙏\n\nमैं **किसान मित्र (Kisan Mitra)** हूँ—कृषि सेवा केंद्र का आधिकारिक AI सहायक।\n\nआप मुझसे अपने **टोकन**, **अपॉइंटमेंट बुकिंग**, **फसल खरीद/तौल (Procurement)**, **भुगतान स्थिति** या **केंद्र की सेवाओं** के बारे में हिंदी या English में पूछ सकते हैं।`
      : `नमस्ते किसान भाई! 🙏\n\nमैं **किसान मित्र (Kisan Mitra)** हूँ—कृषि सेवा केंद्र का आधिकारिक AI सहायक।\n\nआप मुझसे अपने टोकन, अपॉइंटमेंट, फसल खरीद व भुगतान के बारे में हिंदी या English में पूछ सकते हैं।`;

    return [
      {
        id: 'welcome-msg',
        role: 'model',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || loading) return;

    if (!token) {
      setErrorBanner('कृपया पहले लॉग इन करें। (Authentication required)');
      return;
    }

    setErrorBanner(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    // Append user message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);

    // Prepare history for API (omit welcome message if desired or include last 6)
    const historyPayload = updatedMessages
      .filter(m => !m.isError)
      .slice(-6)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

    try {
      const res = await safeFetchJson<{
        ok: boolean;
        reply: string;
        contextSummary?: ContextSummary;
        error?: string;
      }>('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      if (!res.ok || !res.data || !res.data.reply) {
        const errorText = res.error || res.data?.error || 'सर्वर से उत्तर प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।';
        setErrorBanner(errorText);

        const errorModelMsg: ChatMessage = {
          id: `model-err-${Date.now()}`,
          role: 'model',
          text: `⚠️ ${errorText}`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          isError: true
        };
        setMessages(prev => [...prev, errorModelMsg]);
      } else {
        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, modelMsg]);
        if (res.data.contextSummary) {
          setContextSummary(res.data.contextSummary);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'नेटवर्क कनेक्शन में समस्या है। कृपया इंटरनेट जांचें।';
      setErrorBanner(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          text: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Clear Chat
  const handleClearChat = () => {
    if (window.confirm('क्या आप बातचीत का इतिहास साफ़ करना चाहते हैं? (Clear chat history?)')) {
      const initialGreeting = user?.name
        ? `नमस्ते ${user.name} जी! 🙏 बातचीत रीसेट कर दी गई है। मैं आपकी क्या मदद कर सकता हूँ?`
        : `नमस्ते किसान भाई! 🙏 बातचीत रीसेट कर दी गई है। आप क्या पूछना चाहते हैं?`;

      setMessages([
        {
          id: `reset-${Date.now()}`,
          role: 'model',
          text: initialGreeting,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setErrorBanner(null);
    }
  };

  // Helper to format text with simple markdown bold, line breaks, bullet points
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
          const lineContent = isBullet ? trimmed.replace(/^[\*\-•]\s*/, '') : trimmed;

          // Parse **bold** parts
          const parts = lineContent.split(/(\*\*.*?\*\*)/g);

          const parsedContent = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1">
                <span className="text-emerald-600 font-bold text-base leading-none select-none">•</span>
                <div className="flex-1">{parsedContent}</div>
              </div>
            );
          }

          return <p key={idx}>{parsedContent}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] max-h-[82vh]">
      {/* 1. ASSISTANT HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
              <Bot className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-800 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-base sm:text-lg text-white font-heading">
                किसान मित्र (Kisan AI Assistant)
              </h2>
              <span className="bg-emerald-950/60 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-600/40">
                gemini-3.6-flash
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium">
              कृषि सेवा केंद्र • Real-time Live Queue & Database Grounded
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded-lg text-[11px] text-emerald-100 border border-white/15">
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span>हिंदी / English</span>
          </div>

          <button
            onClick={handleClearChat}
            title="Clear Chat History (बातचीत साफ़ करें)"
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME CONTEXT STATUS BAR */}
      {contextSummary && (
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center space-x-3 overflow-x-auto">
            {contextSummary.hasActiveToken ? (
              <span className="inline-flex items-center font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                <Ticket className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                सक्रिय टोकन: {contextSummary.activeTokenNumber}
              </span>
            ) : (
              <span className="text-slate-600">कोई सक्रिय टोकन नहीं</span>
            )}

            {contextSummary.upcomingBookingsCount > 0 && (
              <span className="inline-flex items-center text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Calendar className="w-3.5 h-3.5 mr-1 text-teal-600" />
                आगामी अपॉइंटमेंट: {contextSummary.upcomingBookingsCount}
              </span>
            )}

            {contextSummary.procurementsCount > 0 && (
              <span className="inline-flex items-center text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Wheat className="w-3.5 h-3.5 mr-1 text-amber-600" />
                खरीद रिकॉर्ड्स: {contextSummary.procurementsCount}
              </span>
            )}
          </div>

          {onNavigateToTab && (
            <div className="hidden md:flex items-center space-x-2 text-[11px] shrink-0">
              <button
                onClick={() => onNavigateToTab('queue')}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                कतार देखें
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateToTab('procurement')}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                उपज खरीद
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. ERROR BANNER */}
      {errorBanner && (
        <div className="bg-rose-50 border-b border-rose-200 p-3 text-xs text-rose-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-rose-700 font-bold hover:underline ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4 text-emerald-200" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 sm:p-4 text-slate-800 shadow-sm ${
                  isUser
                    ? 'bg-emerald-700 text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                    : 'bg-white border border-slate-200/90 rounded-tl-none'
                }`}
              >
                {/* Sender Title and Time */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] mb-1.5 font-medium ${
                    isUser ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  <span className="font-semibold">
                    {isUser ? (user?.name ? `${user.name} (आप)` : 'आप (Farmer)') : 'किसान मित्र (AI)'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Formatted Content */}
                <div className={isUser ? 'text-white text-sm whitespace-pre-wrap' : ''}>
                  {isUser ? msg.text : renderFormattedText(msg.text)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Bot className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-medium text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>किसान मित्र रिकॉर्ड्स देख रहे हैं... (Processing with Gemini 3.6 Flash)</span>
              </div>
              <div className="flex space-x-1.5 mt-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. QUICK PROMPT SUGGESTION CHIPS */}
      <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 overflow-x-auto shrink-0 flex items-center gap-1.5 no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1.5 whitespace-nowrap">
          त्वरित प्रश्न:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={loading}
            className="text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-3 py-1.5 rounded-full border border-slate-300/80 hover:border-emerald-300 font-medium transition-all shadow-2xs whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            {qp.labelHi}
          </button>
        ))}
      </div>

      {/* 6. INPUT BAR */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="हिंदी या English में प्रश्न पूछें (उदा. मेरा टोकन नंबर क्या है?)..."
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            aria-label="Send message"
            className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 sm:px-5 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-1.5 shrink-0 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">भेजें</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center mt-2">
          🔒 AI उत्तर कृषि सेवा केंद्र के वास्तविक डेटाबेस पर आधारित हैं। कोई निजी डेटा या पासवर्ड साझा नहीं किया जाता।
        </p>
      </div>
    </div>
  );
};
