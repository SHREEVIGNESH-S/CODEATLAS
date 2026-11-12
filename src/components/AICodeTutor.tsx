import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  GraduationCap,
  FileCode,
  CheckCircle,
  Copy,
  Terminal,
  HelpCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { TutorMessage, TutorReference, CodeNode } from '../types/codeatlas';

interface AICodeTutorProps {
  repoName: string;
  presetQuestions: string[];
  activeNode: CodeNode | null;
  codeFiles: Array<{ path: string; content: string; language: string }>;
  onViewFile: (filePath: string, lineStart?: number) => void;
}

export const AICodeTutor: React.FC<AICodeTutorProps> = ({
  repoName,
  presetQuestions,
  activeNode,
  codeFiles,
  onViewFile
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      sender: 'tutor',
      text: `Hello! I am your **CODEATLAS AI Tutor** for **${repoName}**.\n\nI explain repository architecture, execution flows, and design patterns grounded directly in the analyzed source code.\n\nSelect an explanation mode above or ask any architectural question to begin.`,
      timestamp: 'Just now',
      mode: 'intermediate',
      suggestedFollowUps: presetQuestions.slice(0, 3)
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When active node changes, optionally suggest asking about it
  useEffect(() => {
    if (activeNode) {
      setInputText(`Explain how ${activeNode.name} in ${activeNode.path} works and what depends on it.`);
    }
  }, [activeNode]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: TutorMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName,
          question: query,
          mode,
          activeNode,
          codeFiles
        })
      });

      const data = await res.json();
      if (data.success) {
        const tutorMsg: TutorMessage = {
          id: `tutor-${Date.now()}`,
          sender: 'tutor',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode,
          references: data.references,
          suggestedFollowUps: data.suggestedFollowUps
        };
        setMessages((prev) => [...prev, tutorMsg]);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (err: any) {
      const errorMsg: TutorMessage = {
        id: `tutor-err-${Date.now()}`,
        sender: 'tutor',
        text: `Unable to complete explanation: ${err.message || 'Network error'}. Please check repository context or try again.`,
        timestamp: 'Error',
        mode
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (snippet: string, key: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[750px] overflow-hidden">
      
      {/* Top Header with Mode Selection */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#F8FAFC] via-[#EEF5FF] to-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#101828]">AI Code Tutor</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200">
                Grounded AST
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Explaining real repository code for <strong className="text-slate-700">{repoName}</strong>
            </p>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setMode('beginner')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mode === 'beginner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Beginner
          </button>
          <button
            onClick={() => setMode('intermediate')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mode === 'intermediate'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Intermediate
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mode === 'advanced'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Advanced
          </button>
        </div>

      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs'
                  : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-xs'
              }`}
            >
              {/* Header meta */}
              <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-black/5 dark:border-white/10 text-[11px] opacity-75">
                <span className="font-semibold flex items-center gap-1.5">
                  {msg.sender === 'user' ? (
                    'You'
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      CodeAtlas Tutor • {msg.mode.toUpperCase()}
                    </>
                  )}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message text with basic Markdown styling */}
              <div className="text-sm leading-relaxed whitespace-pre-line space-y-2">
                {msg.text}
              </div>

              {/* Source Code References */}
              {msg.references && msg.references.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    Grounded Source References:
                  </div>

                  <div className="space-y-2">
                    {msg.references.map((ref, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            onClick={() => onViewFile(ref.file, parseInt(ref.lines.split('-')[0] || '1', 10))}
                            className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{ref.file}</span>
                            <span className="text-slate-400 font-normal">({ref.lines})</span>
                          </button>
                          
                          {ref.snippet && (
                            <button
                              onClick={() => handleCopyCode(ref.snippet!, `${msg.id}-${idx}`)}
                              className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[10px] cursor-pointer"
                            >
                              {copiedIndex === `${msg.id}-${idx}` ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <p className="text-slate-600 mb-2">{ref.explanation}</p>

                        {ref.snippet && (
                          <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-36">
                            {ref.snippet}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-Ups */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Suggested Explorations:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedFollowUps.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendMessage(question)}
                        className="text-left text-xs bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/70 text-blue-800 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>{question}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-3.5 rounded-xl border border-slate-200 w-fit shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Analyzing repository source files & generating grounded explanation...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Questions Drawer */}
      <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          Quick Questions:
        </span>
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-md border border-slate-200 whitespace-nowrap transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask anything about ${repoName} architecture, middleware, or functions...`}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="inline-flex items-center justify-center p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
