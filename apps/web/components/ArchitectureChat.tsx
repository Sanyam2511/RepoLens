"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getStoredAuthSession, workerFetch } from "../lib/auth";

type ChatMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

export default function ArchitectureChat({ repoUrl }: { repoUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const saved = localStorage.getItem(`repolens-chat-${repoUrl}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
    } else {
      setMessages([]);
    }
  }, [repoUrl]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`repolens-chat-${repoUrl}`, JSON.stringify(messages));
    }
  }, [messages, repoUrl]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const isGibberish = (text: string) => {
      const clean = text.trim().toLowerCase();
      if (/(asdf|qwer|zxcv|hjkl|tyui|ghjk|vbnm)/.test(clean)) return true;
      if (/(.)\1{4,}/.test(clean)) return true;
      if (clean.length >= 5 && /^[bcdfghjklmnpqrstvwxz]+$/.test(clean)) return true;
      if (!clean.includes(" ") && clean.length > 40) return true;
      return false;
    };

    if (isGibberish(input)) {
      setMessages([
        ...messages,
        { role: "user", parts: [{ text: input.trim() }] },
        { role: "model", parts: [{ text: "Please enter a valid question or command regarding the repository architecture." }] },
      ]);
      setInput("");
      return;
    }

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", parts: [{ text: input.trim() }] },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await workerFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          repoUrl,
          messages: newMessages,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      let currentResponse = "";
      
      setMessages([...newMessages, { role: "model", parts: [{ text: "" }] }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                currentResponse += parsed.text;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, parts: [{ text: currentResponse }] },
                  ];
                });
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: "Sorry, I encountered an error computing the response. Please try again." }] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#232F72] text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-105 hover:bg-[#1C255A]"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-[0_10px_40px_rgb(0,0,0,0.15)] animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--color-accent)]" />
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">RepoLens Q&A</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-col flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--color-text-tertiary)] mt-10">
            Ask me anything about the architecture of this repository!
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === "user" ? "self-end items-end max-w-[85%]" : "self-start items-start max-w-[95%]"
            }`}
          >
            <div className={`flex items-center gap-2 mb-1.5 px-1 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              )}
              <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
                {msg.role === "user" ? "You" : "RepoLens AI"}
              </span>
            </div>
            <div
              className={`px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] rounded-2xl rounded-tr-sm whitespace-pre-wrap"
                  : "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] rounded-2xl rounded-tl-sm shadow-sm"
              }`}
            >
              {msg.role === "user" ? (
                msg.parts[0].text
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>
                    {msg.parts[0].text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "model" && (
          <div className="self-start flex flex-col items-start max-w-[85%]">
             <div className="flex items-center gap-2 mb-1.5 px-1">
                <Bot className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <span className="text-xs font-medium text-[var(--color-text-tertiary)]">RepoLens AI</span>
             </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-[var(--color-border-subtle)] bg-transparent px-4 py-2.5 text-sm text-[var(--color-text-tertiary)] shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border-subtle)] p-3 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] pr-1.5 pl-4 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 focus-within:border-[var(--color-accent)] transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this repo..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[var(--color-accent-hover)]"
          >
            <Send className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
