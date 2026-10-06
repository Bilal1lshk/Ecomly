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

        .eco-widget * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

        /* ── Launcher ── */
        .eco-launcher {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 72px;
          height: 72px;
          border: none;
          background: transparent;
          cursor: pointer;
          z-index: 9999;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 8px 20px rgba(234,88,12,0.45));
          animation: eco-float 3s ease-in-out infinite;
          transition: filter 0.2s;
        }
        .eco-launcher:hover {
          filter: drop-shadow(0 10px 26px rgba(234,88,12,0.6));
        }

        @keyframes eco-float {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-8px) rotate(1deg); }
        }

        /* wave arm animation */
        .eco-arm-wave {
          transform-origin: 4px 4px;
          animation: arm-wave 1.4s ease-in-out infinite;
        }
        @keyframes arm-wave {
          0%,100% { transform: rotate(0deg); }
          25%     { transform: rotate(-28deg); }
          75%     { transform: rotate(12deg); }
        }

        /* eye blink */
        .eco-eye { animation: eye-blink 3.5s ease-in-out infinite; }
        .eco-eye:nth-child(2) { animation-delay: 0.1s; }
        @keyframes eye-blink {
          0%,90%,100% { scaleY(1); }
          95% { transform: scaleY(0.1); }
        }

        /* antenna bob */
        .eco-antenna { animation: antenna-bob 3s ease-in-out infinite; }
        @keyframes antenna-bob {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-3px); }
        }

        /* Hide robot, show X when open */
        .eco-robot { transition: opacity 0.2s, transform 0.25s; }
        .eco-x-icon {
          position: absolute;
          opacity: 0;
          transform: scale(0.5) rotate(-90deg);
          transition: opacity 0.2s, transform 0.25s;
        }
        .eco-launcher.open .eco-robot { opacity: 0; transform: scale(0.5) rotate(90deg); }
        .eco-launcher.open .eco-x-icon { opacity: 1; transform: scale(1) rotate(0deg); }

        /* Chat Panel */
        .eco-panel {
          position: fixed;
          bottom: 108px;
          right: 24px;
          width: 355px;
          height: 510px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.07);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          transform-origin: bottom right;
          animation: panel-open 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .eco-panel.closing { animation: panel-close 0.2s ease-in forwards; }
        @keyframes panel-open {
          from { opacity:0; transform: scale(0.84) translateY(14px); }
          to   { opacity:1; transform: scale(1)    translateY(0); }
        }
        @keyframes panel-close {
          from { opacity:1; transform: scale(1)    translateY(0); }
          to   { opacity:0; transform: scale(0.84) translateY(14px); }
        }

        /* Header */
        .eco-header {
          background: linear-gradient(135deg, #ea580c 0%, #f97316 55%, #fb923c 100%);
          padding: 13px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .eco-hdr-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.22);
          border: 1.5px solid rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .eco-hdr-name { font-size: 13.5px; font-weight: 600; color: #fff; line-height: 1.2; }
        .eco-hdr-status {
          font-size: 11px; color: rgba(255,255,255,0.82);
          display: flex; align-items: center; gap: 4px; margin-top: 1px;
        }
        .eco-dot { width: 6px; height: 6px; border-radius: 50%; background: #fde68a; animation: dot-blink 1.8s ease-in-out infinite; }
        @keyframes dot-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .eco-close {
          width: 27px; height: 27px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.2); color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          margin-left: auto; transition: background 0.15s; flex-shrink: 0;
        }
        .eco-close:hover { background: rgba(255,255,255,0.32); }

        /* Messages */
        .eco-messages {
          flex: 1; overflow-y: auto; padding: 14px 13px;
          display: flex; flex-direction: column; gap: 9px;
          background: #fff8f5;
        }
        .eco-messages::-webkit-scrollbar { width: 3px; }
        .eco-messages::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 4px; }

        .eco-empty { margin: auto; text-align: center; padding: 20px 14px; }
        .eco-empty-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, #ffedd5, #fed7aa);
          margin: 0 auto 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .eco-empty p { font-size: 12.5px; color: #6b7280; line-height: 1.55; margin:0; }
        .eco-empty strong { color: #ea580c; }

        .eco-row { display: flex; align-items: flex-end; gap: 6px; }
        .eco-row.user { flex-direction: row-reverse; }
        .eco-mini-av {
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, #ea580c, #fb923c);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .eco-bubble {
          max-width: 79%; padding: 8px 13px;
          font-size: 13px; line-height: 1.55; color: #1c1c1c;
          white-space: pre-wrap; word-break: break-word;
        }
        .eco-bubble.bot {
          background: #fff; border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .eco-bubble.user {
          background: linear-gradient(135deg, #ea580c, #f97316);
          color: #fff; border-radius: 16px 4px 16px 16px;
        }

        .eco-typing {
          display: flex; align-items: center; gap: 4px;
          padding: 9px 14px; background: #fff;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07); width: fit-content;
        }
        .eco-typing span {
          width: 6px; height: 6px; border-radius: 50%; background: #f97316;
          animation: dot-bounce 1.2s ease-in-out infinite;
        }
        .eco-typing span:nth-child(2) { animation-delay: 0.18s; }
        .eco-typing span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-5px);opacity:1} }

        .eco-error { font-size: 12px; color: #ef4444; background: #fef2f2; border-radius: 8px; padding: 7px 11px; border: 1px solid #fecaca; }

        /* Input */
        .eco-input-area {
          border-top: 1px solid #ffe4cc; padding: 11px 11px;
          background: #fff; display: flex; align-items: center; gap: 7px; flex-shrink: 0;
        }
        .eco-input {
          flex: 1; border: 1.5px solid #fed7aa; border-radius: 22px;
          padding: 8px 15px; font-size: 13px; color: #1c1c1c;
          background: #fff8f5; outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .eco-input:focus { border-color: #f97316; background: #fff; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
        .eco-input::placeholder { color: #9ca3af; }
        .eco-input:disabled { opacity: 0.6; }
        .eco-send {
          width: 37px; height: 37px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg, #ea580c, #f97316);
          color: white; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(234,88,12,0.38);
        }
        .eco-send:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 4px 12px rgba(234,88,12,0.5); }
        .eco-send:active:not(:disabled) { transform: scale(0.93); }
        .eco-send:disabled { opacity: 0.42; cursor: not-allowed; box-shadow: none; }
        .eco-footer { text-align: center; font-size: 10px; color: #9ca3af; padding: 0 0 9px; background:#fff; flex-shrink:0; }
        .eco-footer a { color: #f97316; text-decoration: none; }
      `}</style>

      <div className="eco-widget">
        {/* ── Chat Panel ── */}
        {isOpen && (
          <div className="eco-panel">
            <div className="eco-header">
              <div className="eco-hdr-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="8" width="16" height="11" rx="3" fill="rgba(255,255,255,0.9)"/>
                  <circle cx="9" cy="13" r="1.5" fill="#ea580c"/>
                  <circle cx="15" cy="13" r="1.5" fill="#ea580c"/>
                  <path d="M9.5 16.2c.7.6 2 .8 3 .3" stroke="#ea580c" strokeWidth="1.1" strokeLinecap="round"/>
                  <rect x="10" y="4" width="4" height="4" rx="1" fill="rgba(255,255,255,0.85)"/>
                  <circle cx="12" cy="3.2" r="1.1" fill="rgba(255,255,255,0.85)"/>
                </svg>
              </div>
              <div style={{flex:1}}>
                <div className="eco-hdr-name">Ecomly Assistant</div>
                <div className="eco-hdr-status"><span className="eco-dot"/>Online · Ready to help</div>
              </div>
              <button className="eco-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="eco-messages">
              {messages.length === 0 && (
                <div className="eco-empty">
                  <div className="eco-empty-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 1.82.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22z" stroke="#ea580c" strokeWidth="1.5" fill="#ffedd5"/>
                      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="#ea580c" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p>Hi there! 👋<br /><strong>Ask me anything</strong> about Ecomly — products, shipping, returns, or policies.</p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`eco-row ${m.role === 'user' ? 'user' : ''}`}>
                  {m.role !== 'user' && (
                    <div className="eco-mini-av">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" fill="white" fillOpacity="0.9"/>
                        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                  )}
                  <div className={`eco-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                    {m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="eco-row">
                  <div className="eco-mini-av">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="white" fillOpacity="0.9"/>
                      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="eco-typing"><span/><span/><span/></div>
                </div>
              )}

              {error && <p className="eco-error" role="alert">{error.message || 'Could not respond. Please try again.'}</p>}
              <div ref={messagesEndRef}/>
            </div>

            <form onSubmit={handleSubmit} className="eco-input-area">
              <input
                className="eco-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Ecomly…"
                disabled={isLoading}
                autoComplete="off"
              />
              <button type="submit" disabled={!canSubmit} className="eco-send" aria-label="Send">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
            <div className="eco-footer">Powered by <a href="#">Ecomly AI</a></div>
          </div>
        )}

        {/* ── 3D Robot Launcher ── */}
        <button
          className={`eco-launcher ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(v => !v)}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {/* 3D Robot SVG */}
          <svg className="eco-robot" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Body gradient - orange 3D */}
              <radialGradient id="bodyGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fed7aa"/>
                <stop offset="40%" stopColor="#f97316"/>
                <stop offset="100%" stopColor="#9a3412"/>
              </radialGradient>
              {/* Head gradient */}
              <radialGradient id="headGrad" cx="38%" cy="28%" r="62%">
                <stop offset="0%" stopColor="#fff7ed"/>
                <stop offset="35%" stopColor="#fb923c"/>
                <stop offset="100%" stopColor="#7c2d12"/>
              </radialGradient>
              {/* Face screen */}
              <radialGradient id="screenGrad" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fff8f0"/>
                <stop offset="60%" stopColor="#fff0e0"/>
                <stop offset="100%" stopColor="#ffe4c4"/>
              </radialGradient>
              {/* Belly panel */}
              <radialGradient id="bellyGrad" cx="40%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#fff0e0"/>
                <stop offset="100%" stopColor="#fed7aa"/>
              </radialGradient>
              {/* Left arm gradient */}
              <radialGradient id="armLGrad" cx="40%" cy="20%" r="70%">
                <stop offset="0%" stopColor="#fdba74"/>
                <stop offset="100%" stopColor="#9a3412"/>
              </radialGradient>
              {/* Right arm gradient (waving) */}
              <radialGradient id="armRGrad" cx="40%" cy="20%" r="70%">
                <stop offset="0%" stopColor="#fdba74"/>
                <stop offset="100%" stopColor="#9a3412"/>
              </radialGradient>
              {/* Leg gradient */}
              <radialGradient id="legGrad" cx="38%" cy="20%" r="70%">
                <stop offset="0%" stopColor="#fdba74"/>
                <stop offset="100%" stopColor="#9a3412"/>
              </radialGradient>
              {/* Ear bolt */}
              <radialGradient id="boltGrad" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fde68a"/>
                <stop offset="100%" stopColor="#b45309"/>
              </radialGradient>
              {/* Shadow */}
              <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(154,52,18,0.3)"/>
                <stop offset="100%" stopColor="rgba(154,52,18,0)"/>
              </radialGradient>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="36" cy="69" rx="18" ry="3.5" fill="url(#shadowGrad)"/>

            {/* === LEFT ARM (down, relaxed) === */}
            <rect x="11" y="32" width="8" height="14" rx="4" fill="url(#armLGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            {/* Left hand */}
            <circle cx="15" cy="48" r="4.2" fill="url(#armLGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            {/* knuckle details */}
            <circle cx="13.5" cy="49.5" r="1.1" fill="#fdba74" opacity="0.6"/>
            <circle cx="16.5" cy="49.5" r="1.1" fill="#fdba74" opacity="0.6"/>

            {/* === RIGHT ARM (waving up) === */}
            <g className="eco-arm-wave" style={{transformOrigin:'53px 34px'}}>
              {/* Upper arm */}
              <rect x="49" y="30" width="8" height="13" rx="4" fill="url(#armRGrad)" stroke="#c2410c" strokeWidth="0.6"/>
              {/* Lower arm angled */}
              <rect x="51" y="19" width="7" height="13" rx="3.5" fill="url(#armRGrad)" stroke="#c2410c" strokeWidth="0.6" transform="rotate(15 54 25)"/>
              {/* Waving hand */}
              <circle cx="55" cy="17" r="4.5" fill="url(#armRGrad)" stroke="#c2410c" strokeWidth="0.6"/>
              {/* finger bumps */}
              <circle cx="53.5" cy="13.5" r="1.5" fill="#fdba74" stroke="#c2410c" strokeWidth="0.5"/>
              <circle cx="56.5" cy="13" r="1.5" fill="#fdba74" stroke="#c2410c" strokeWidth="0.5"/>
              <circle cx="58.5" cy="14.5" r="1.3" fill="#fdba74" stroke="#c2410c" strokeWidth="0.5"/>
            </g>

            {/* === BODY === */}
            <rect x="18" y="30" width="36" height="26" rx="7" fill="url(#bodyGrad)" stroke="#c2410c" strokeWidth="0.8"/>
            {/* Body highlight */}
            <ellipse cx="27" cy="34" rx="6" ry="4" fill="rgba(255,255,255,0.18)" transform="rotate(-10 27 34)"/>

            {/* Belly panel */}
            <rect x="23" y="36" width="26" height="14" rx="4" fill="url(#bellyGrad)" stroke="#fdba74" strokeWidth="0.7"/>
            {/* LED lights on belly */}
            <circle cx="30" cy="41" r="2.2" fill="#f97316"/>
            <circle cx="30" cy="41" r="1.1" fill="#fef3c7"/>
            <circle cx="36" cy="41" r="2.2" fill="#ea580c"/>
            <circle cx="36" cy="41" r="1.1" fill="#fef3c7"/>
            <circle cx="42" cy="41" r="2.2" fill="#fb923c"/>
            <circle cx="42" cy="41" r="1.1" fill="#fef3c7"/>
            {/* Speaker grill */}
            <line x1="26" y1="48" x2="46" y2="48" stroke="#fdba74" strokeWidth="0.8" strokeDasharray="2 2"/>

            {/* === NECK === */}
            <rect x="30" y="25" width="12" height="7" rx="3" fill="url(#bodyGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            {/* neck bolts */}
            <circle cx="31.5" cy="28.5" r="1.2" fill="url(#boltGrad)"/>
            <circle cx="40.5" cy="28.5" r="1.2" fill="url(#boltGrad)"/>

            {/* === HEAD === */}
            <rect x="15" y="8" width="42" height="20" rx="8" fill="url(#headGrad)" stroke="#c2410c" strokeWidth="0.8"/>
            {/* Head top highlight */}
            <ellipse cx="29" cy="11" rx="9" ry="4" fill="rgba(255,255,255,0.22)" transform="rotate(-8 29 11)"/>

            {/* Ear bolts */}
            <circle cx="15" cy="18" r="4" fill="url(#boltGrad)" stroke="#b45309" strokeWidth="0.7"/>
            <circle cx="15" cy="18" r="1.8" fill="#fef9c3"/>
            <circle cx="57" cy="18" r="4" fill="url(#boltGrad)" stroke="#b45309" strokeWidth="0.7"/>
            <circle cx="57" cy="18" r="1.8" fill="#fef9c3"/>

            {/* Face screen */}
            <rect x="20" y="11" width="32" height="14" rx="5" fill="url(#screenGrad)" stroke="#fdba74" strokeWidth="0.7"/>
            {/* screen glare */}
            <rect x="21" y="12" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>

            {/* Eyes */}
            <g className="eco-eye">
              <circle cx="28" cy="18" r="4" fill="#1c1c1c"/>
              <circle cx="28" cy="18" r="2.8" fill="#f97316"/>
              <circle cx="28" cy="18" r="1.5" fill="#1c1c1c"/>
              <circle cx="26.8" cy="16.8" r="0.8" fill="white" opacity="0.9"/>
            </g>
            <g className="eco-eye">
              <circle cx="44" cy="18" r="4" fill="#1c1c1c"/>
              <circle cx="44" cy="18" r="2.8" fill="#f97316"/>
              <circle cx="44" cy="18" r="1.5" fill="#1c1c1c"/>
              <circle cx="42.8" cy="16.8" r="0.8" fill="white" opacity="0.9"/>
            </g>

            {/* Mouth / smile */}
            <path d="M30 24 Q36 27.5 42 24" stroke="#c2410c" strokeWidth="1.3" strokeLinecap="round" fill="none"/>

            {/* === ANTENNA === */}
            <g className="eco-antenna">
              <line x1="36" y1="8" x2="36" y2="3" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="2.5" r="2.5" fill="url(#boltGrad)" stroke="#b45309" strokeWidth="0.6"/>
              <circle cx="36" cy="2.5" r="1.1" fill="#fef9c3"/>
            </g>

            {/* === LEGS === */}
            <rect x="22" y="55" width="11" height="12" rx="4" fill="url(#legGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            <rect x="39" y="55" width="11" height="12" rx="4" fill="url(#legGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            {/* Feet */}
            <rect x="20" y="63" width="15" height="5" rx="2.5" fill="url(#legGrad)" stroke="#c2410c" strokeWidth="0.6"/>
            <rect x="37" y="63" width="15" height="5" rx="2.5" fill="url(#legGrad)" stroke="#c2410c" strokeWidth="0.6"/>
          </svg>

          {/* Close X (shown when open) */}
          <svg className="eco-x-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#f97316"/>
            <path d="M10 10l12 12M22 10L10 22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </>
  );
}