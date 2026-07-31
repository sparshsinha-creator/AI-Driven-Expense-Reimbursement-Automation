import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineXMark,
  HiOutlineMinus,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { findChatbotResponse } from "../data/chatbotResponses";

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg-${idCounter}`;
}

function makeWelcomeMessage() {
  return {
    id: nextId(),
    sender: "bot",
    text: "Hi! I'm the ClaimPilot AI assistant. Ask me about receipts, policy limits, approvals, security, or anything else about how claims move through the pipeline.",
    timestamp: new Date(),
    streaming: false,
  };
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => [makeWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const bodyRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const streamIntervalRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearInterval(streamIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    function handleOpenRequest() {
      setIsOpen(true);
      setIsMinimized(false);
    }
    window.addEventListener("open-chat-assistant", handleOpenRequest);
    return () => window.removeEventListener("open-chat-assistant", handleOpenRequest);
  }, []);

  function streamBotResponse(fullText) {
    const botId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: botId, sender: "bot", text: "", timestamp: new Date(), streaming: true },
    ]);

    let index = 0;
    streamIntervalRef.current = setInterval(() => {
      index += 3;
      const done = index >= fullText.length;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: done ? fullText : fullText.slice(0, index), streaming: !done }
            : m
        )
      );
      if (done) clearInterval(streamIntervalRef.current);
    }, 18);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: nextId(), sender: "user", text: trimmed, timestamp: new Date(), streaming: false },
    ]);
    setInput("");
    setIsTyping(true);

    const response = findChatbotResponse(trimmed);
    const delay = Math.min(1200, 500 + response.length * 4);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      streamBotResponse(response);
    }, delay);
  }

  function handleClear() {
    clearTimeout(typingTimeoutRef.current);
    clearInterval(streamIntervalRef.current);
    setIsTyping(false);
    setMessages([makeWelcomeMessage()]);
  }

  function toggleOpen() {
    setIsOpen((open) => {
      if (open) return false;
      setIsMinimized(false);
      return true;
    });
  }

  return (
    <div className="chat-assistant">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chat-window${isMinimized ? " chat-window-minimized" : ""}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="chat-header">
              <div className="chat-header-title">
                <HiOutlineSparkles size={18} />
                <span>ClaimPilot AI Assistant</span>
              </div>
              <div className="chat-header-actions">
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={handleClear}
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <HiOutlineTrash size={16} />
                </button>
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={() => setIsMinimized((m) => !m)}
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  <HiOutlineMinus size={16} />
                </button>
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  title="Close"
                >
                  <HiOutlineXMark size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div className="chat-body" ref={bodyRef}>
                  {messages.map((m) => (
                    <div key={m.id} className={`chat-bubble-row chat-bubble-row-${m.sender}`}>
                      <div className={`chat-bubble chat-bubble-${m.sender}`}>
                        <p>
                          {m.text}
                          {m.streaming && <span className="chat-cursor" />}
                        </p>
                        <span className="chat-timestamp">{formatTime(m.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="chat-bubble-row chat-bubble-row-bot">
                      <div className="chat-bubble chat-bubble-bot chat-typing">
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                      </div>
                    </div>
                  )}
                </div>

                <form className="chat-input-row" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about receipts, limits, approvals..."
                    aria-label="Type a message"
                  />
                  <button type="submit" className="chat-send-btn" aria-label="Send message">
                    <HiOutlinePaperAirplane size={18} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="chat-fab"
        onClick={toggleOpen}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
      >
        {isOpen ? <HiOutlineXMark size={26} /> : <HiOutlineChatBubbleLeftRight size={26} />}
      </motion.button>
    </div>
  );
}
