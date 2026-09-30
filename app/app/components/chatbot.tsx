'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export default function Chatbot() {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/auth/Eco-Bot' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const canSubmit = !isLoading && input.trim().length > 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    void sendMessage({ text });
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .eco-widget * {
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }

        /* ── Floating Launcher Button ── */
        .eco-launcher {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: radial-gradient(circle at 35% 35%, #22d3ee, #0891b2 55%, #0e7490);
          box-shadow: 0 8px 32px rgba(8,145,178,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
          animation: eco-float 3s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: visible;
        }
        .eco-launcher:hover {
          animation: eco-float-fast 0.6s ease-in-out infinite;
        }
        .eco-launcher:active { transform: scale(0.93); }

        @keyframes eco-float {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes eco-float-fast {
          0%,100% { transform: translateY(0) rotate(-3deg) scale(1.06); }
          50%      { transform: translateY(-6px) rotate(3deg) scale(1.09); }
        }

        /* Glow aura */
        .eco-glow {
          position: absolute; inset: -20px; border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.28) 0%, transparent 70%);
          animation: eco-glow-pulse 2.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes eco-glow-pulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.18); }
        }

        /* Orbit rings */
        .eco-orbit {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 2px dashed rgba(34,211,238,0.5);
          animation: eco-spin 6s linear infinite;
          pointer-events: none;
        }
        .eco-orbit2 {
          position: absolute; inset: -14px; border-radius: 50%;
          border: 1.5px dashed rgba(34,211,238,0.22);
          animation: eco-spin 10s linear infinite reverse;
          pointer-events: none;
        }
        @keyframes eco-spin { to { transform: rotate(360deg); } }

        /* Particle dots */
        .eco-particle { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #67e8f9; pointer-events: none; }
        .eco-p1 { top: 10%; left: 80%; animation: eco-orb 4s linear infinite; }
        .eco-p2 { top: 75%; left: 15%; animation: eco-orb 5s linear infinite reverse; opacity: .7; }
        .eco-p3 { top: 20%; left: 5%;  animation: eco-orb 6s linear infinite; opacity: .5; width: 4px; height: 4px; }
        @keyframes eco-orb {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          50%  { transform: translateY(-14px) scale(0.6); opacity: 0.4; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        /* Waving arm */
        .eco-arm {
          position: absolute; right: -18px; top: 32%;
          width: 18px; height: 7px;
          background: linear-gradient(90deg, #38bdf8, #0ea5e9);
          border-radius: 4px;
          transform-origin: left center;
          animation: eco-wave 0.8s ease-in-out infinite alternate;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          pointer-events: none;
        }
        .eco-hand {
          position: absolute; right: -6px; top: -4px;
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #7dd3fc, #0284c7);
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }
        @keyframes eco-wave {
          from { transform: rotate(-30deg); }
          to   { transform: rotate(30deg); }
        }

        /* Speech bubble */
        .eco-speech {
          position: absolute; bottom: calc(100% + 14px); left: 50%;
          transform: translateX(-50%);
          background: white; border-radius: 12px;
          padding: 5px 11px; font-size: 12px; font-weight: 600;
          color: #0891b2; white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          animation: eco-bubble 3s ease-in-out infinite;
          pointer-events: none;
        }
        .eco-speech::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: white; border-bottom: none;
        }
        @keyframes eco-bubble {
          0%,100% { opacity: 1; transform: translateX(-50%) translateY(0); }
          50%      { opacity: 0.85; transform: translateX(-50%) translateY(-4px); }
        }

        /* Icon swap when open */
        .eco-icon-bot { transition: opacity 0.2s, transform 0.2s; }
        .eco-icon-x   { position: absolute; transition: opacity 0.2s, transform 0.2s; opacity: 0; transform: rotate(-90deg) scale(0.6); }
        .eco-launcher.open .eco-icon-bot { opacity: 0; transform: rotate(90deg) scale(0.6); }
        .eco-launcher.open .eco-icon-x   { opacity: 1; transform: rotate(0deg) scale(1); }

        /* Unread badge */
        .eco-badge {
          position: absolute; top: -1px; right: -1px;
          width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #fb923c, #ef4444);
          box-shadow: 0 2px 6px rgba(239,68,68,0.6);
          border: 2.5px solid white;
          font-size: 10px; font-weight: 700; color: white;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Chat Panel ── */
        .eco-panel {
          position: fixed;
          bottom: 104px;
          right: 28px;
          width: 360px;
          height: 520px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          transform-origin: bottom right;
          animation: eco-open 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .eco-panel.closing {
          animation: eco-close 0.2s ease-in forwards;
        }
        @keyframes eco-open {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes eco-close {
          from { opacity: 1; transform: scale(1)    translateY(0); }
          to   { opacity: 0; transform: scale(0.85) translateY(12px); }
        }

        /* Header */
        .eco-header {
          background: linear-gradient(135deg, #16a34a 0%, #059669 60%, #0d9488 100%);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .eco-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .eco-header-text { flex: 1; }
        .eco-header-name {
          font-size: 14px; font-weight: 600; color: #fff;
          line-height: 1.2;
        }
        .eco-header-status {
          font-size: 11px; color: rgba(255,255,255,0.8);
          display: flex; align-items: center; gap: 4px;
          margin-top: 1px;
        }
        .eco-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #86efac;
          animation: eco-blink 1.8s ease-in-out infinite;
        }
        @keyframes eco-blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        .eco-close-btn {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.18);
          color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .eco-close-btn:hover { background: rgba(255,255,255,0.3); }

        /* Messages */
        .eco-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f8fafc;
        }
        .eco-messages::-webkit-scrollbar { width: 4px; }
        .eco-messages::-webkit-scrollbar-track { background: transparent; }
        .eco-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        .eco-empty {
          margin: auto;
          text-align: center;
          padding: 24px 16px;
        }
        .eco-empty-icon {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dcfce7, #d1fae5);
          margin: 0 auto 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .eco-empty p {
          font-size: 13px; color: #64748b; line-height: 1.5;
          margin: 0;
        }
        .eco-empty strong { color: #16a34a; }

        /* Bubbles */
        .eco-row { display: flex; align-items: flex-end; gap: 7px; }
        .eco-row.user { flex-direction: row-reverse; }

        .eco-mini-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #0d9488);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .eco-bubble {
          max-width: 78%;
          padding: 9px 13px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.55;
          color: #1e293b;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .eco-bubble.bot {
          background: #ffffff;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .eco-bubble.user {
          background: linear-gradient(135deg, #16a34a, #059669);
          color: #ffffff;
          border-radius: 16px 4px 16px 16px;
        }

        /* Typing indicator */
        .eco-typing {
          display: flex; align-items: center; gap: 4px;
          padding: 10px 14px;
          background: #fff;
          border-radius: 4px 16px 16px 16px;
          width: fit-content;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .eco-typing span {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #059669;
          animation: eco-bounce 1.2s ease-in-out infinite;
        }
        .eco-typing span:nth-child(2) { animation-delay: 0.18s; }
        .eco-typing span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes eco-bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }

        .eco-error {
          font-size: 12px; color: #ef4444;
          background: #fef2f2;
          border-radius: 8px;
          padding: 8px 12px;
          border: 1px solid #fecaca;
        }

        /* Input area */
        .eco-input-area {
          border-top: 1px solid #e2e8f0;
          padding: 12px 12px 12px;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .eco-input {
          flex: 1;
          border: 1.5px solid #e2e8f0;
          border-radius: 22px;
          padding: 9px 16px;
          font-size: 13px;
          color: #1e293b;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          resize: none;
        }
        .eco-input:focus {
          border-color: #059669;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
        }
        .eco-input::placeholder { color: #94a3b8; }
        .eco-input:disabled { opacity: 0.6; }

        .eco-send {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #16a34a, #059669);
          color: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(5,150,105,0.35);
        }
        .eco-send:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(5,150,105,0.45);
        }
        .eco-send:active:not(:disabled) { transform: scale(0.94); }
        .eco-send:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        .eco-footer {
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          padding: 0 0 10px;
          background: #fff;
          flex-shrink: 0;
        }
        .eco-footer a { color: #059669; text-decoration: none; }
      `}</style>

      <div className="eco-widget">
        {/* ── Chat Panel ── */}
        {isOpen && (
          <div className="eco-panel">
            {/* Header */}
            <div className="eco-header">
              <div className="eco-avatar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C9.24 2 7 4.24 7 7c0 1.63.78 3.07 2 4v1H9a1 1 0 000 2h1v1H9a1 1 0 000 2h1v2a1 1 0 002 0v-2h1a1 1 0 000-2h-1v-1h1a1 1 0 000-2h-1v-1c1.22-.93 2-2.37 2-4 0-2.76-2.24-5-5-5z" fill="rgba(255,255,255,0)" />
                  <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
                  <path d="M9.5 6.5c.5-.5 1.5-.8 2.5-.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="10.5" cy="7" r="0.6" fill="white" />
                  <circle cx="13.5" cy="7" r="0.6" fill="white" />
                  <path d="M10.5 8.8 c.4.4 1.2.6 1.8 0" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" />
                  <path d="M8 13h8a5 5 0 015 5v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1a5 5 0 015-5z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="eco-header-text">
                <div className="eco-header-name">Ecomly Assistant</div>
                <div className="eco-header-status">
                  <span className="eco-dot" />
                  Online · Ready to help
                </div>
              </div>
              <button className="eco-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="eco-messages">
              {messages.length === 0 && (
                <div className="eco-empty">
                  <div className="eco-empty-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22z" stroke="#16a34a" strokeWidth="1.5" fill="#dcfce7" />
                      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p>Hi there! 👋<br /><strong>Ask me anything</strong> about Ecomly — products, shipping, returns, or policies.</p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`eco-row ${m.role === 'user' ? 'user' : ''}`}>
                  {m.role !== 'user' && (
                    <div className="eco-mini-avatar">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" fill="white" fillOpacity="0.9" />
                        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                      </svg>
                    </div>
                  )}
                  <div className={`eco-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                    {m.parts
                      .filter((part) => part.type === 'text')
                      .map((part) => part.text)
                      .join('')}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="eco-row">
                  <div className="eco-mini-avatar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="white" fillOpacity="0.9" />
                      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div className="eco-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {error && (
                <p className="eco-error" role="alert">
                  {error.message || 'Could not respond. Please try again.'}
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="eco-input-area">
              <input
                className="eco-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Ecomly…"
                disabled={isLoading}
                autoComplete="off"
              />
              <button type="submit" disabled={!canSubmit} className="eco-send" aria-label="Send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>

            <div className="eco-footer">Powered by <a href="#">Ecomly AI</a></div>
          </div>
        )}

        {/* ── Launcher ── */}
        <button
          className={`eco-launcher ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {/* Glow + orbit rings */}
          <div className="eco-glow" />
          <div className="eco-orbit" />
          <div className="eco-orbit2" />

          {/* Floating particles */}
          <div className="eco-particle eco-p1" />
          <div className="eco-particle eco-p2" />
          <div className="eco-particle eco-p3" />

          {/* Waving arm */}
          {!isOpen && (
            <div className="eco-arm">
              <div className="eco-hand" />
            </div>
          )}

          {/* Speech bubble */}
          {!isOpen && messages.length === 0 && (
            <div className="eco-speech">Hi there! 👋</div>
          )}

          {/* 3D Robot face */}
          <svg className="eco-icon-bot" width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Head shine */}
            <ellipse cx="20" cy="16" rx="8" ry="5" fill="rgba(255,255,255,0.15)" />
            {/* Antenna */}
            <rect x="24" y="4" width="4" height="8" rx="2" fill="#7dd3fc" />
            <circle cx="26" cy="3" r="3" fill="#38bdf8" />
            <circle cx="26" cy="3" r="1.5" fill="white" opacity="0.7" />
            {/* Face plate */}
            <rect x="10" y="12" width="32" height="26" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            {/* Eyes */}
            <rect x="15" y="19" width="9" height="7" rx="3.5" fill="#1e40af" />
            <rect x="28" y="19" width="9" height="7" rx="3.5" fill="#1e40af" />
            {/* Eye glow */}
            <ellipse cx="19.5" cy="22.5" rx="3" ry="2.5" fill="#60a5fa" />
            <ellipse cx="32.5" cy="22.5" rx="3" ry="2.5" fill="#60a5fa" />
            {/* Eye shine */}
            <circle cx="21" cy="21" r="1.2" fill="white" opacity="0.9" />
            <circle cx="34" cy="21" r="1.2" fill="white" opacity="0.9" />
            {/* Smile */}
            <path d="M18 31 Q26 37 34 31" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Cheeks */}
            <ellipse cx="14" cy="29" rx="3" ry="2" fill="rgba(251,146,60,0.35)" />
            <ellipse cx="38" cy="29" rx="3" ry="2" fill="rgba(251,146,60,0.35)" />
            {/* Ear bolts */}
            <circle cx="10" cy="25" r="3" fill="#0ea5e9" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <circle cx="42" cy="25" r="3" fill="#0ea5e9" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            {/* Neck */}
            <rect x="21" y="38" width="10" height="5" rx="2" fill="rgba(255,255,255,0.2)" />
          </svg>

          {/* Close X icon */}
          <svg className="eco-icon-x" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          {/* Badge */}
          {messages.length === 0 && !isOpen && (
            <div className="eco-badge">1</div>
          )}
        </button>
      </div>
    </>
  );
}