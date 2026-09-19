'use client';
import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Create 1 month',
  'Create 3 months',
  'Create 6 months',
  'Create 12 months',
  'Check account status for client@email.com',
  'Extend subscription for client@email.com by 30 days',
  'Send email to client@email.com with their credentials',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your ProMax AI assistant. I can create 1, 3, 6 or 12 month subscriptions, check account statuses, and more. What would you like to do?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    const res = await fetch('/api/admin/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: messages }),
    });
    const data = await res.json();
    setLoading(false);
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
  }

  return (
    <div className="h-[calc(100dvh-88px)] sm:h-[calc(100dvh-104px)] md:h-[calc(100vh-64px)]" style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AI Assistant</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Natural language commands for managing your IPTV business</p>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)} className="text-left" style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--muted)', padding: '6px 12px', borderRadius: 20, fontSize: 12,
          }}>{s}</button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflow: 'auto', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16,
      }} className="min-h-0 p-3 sm:p-5">
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className="min-w-0 break-words" style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: 12,
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
              color: m.role === 'user' ? '#000' : 'var(--text)',
              fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>
              {m.role === 'assistant' && <span style={{ fontSize: 11, color: 'var(--accent)', display: 'block', marginBottom: 4, fontWeight: 600 }}>✦ ProMax AI</span>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ background: 'var(--surface2)', padding: '12px 16px', borderRadius: 12, color: 'var(--muted)', fontSize: 13 }}>
              ✦ Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Type a command… e.g. 'Create 1 month'"
          className="min-w-0"
          style={{ flex: 1 }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          background: 'var(--accent)', color: '#000', fontWeight: 700,
          padding: '10px 20px', borderRadius: 'var(--radius)', whiteSpace: 'nowrap'
        }}>Send</button>
      </div>
    </div>
  );
}
