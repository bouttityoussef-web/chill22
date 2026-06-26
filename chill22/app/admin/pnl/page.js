'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../lib/supabase-browser';

const DEFAULT_EXPENSES = [
  { label: 'Panel (d4kpanel)', amount: '' },
  { label: 'Ads (Facebook)', amount: '' },
  { label: 'Ads (Google)', amount: '' },
  { label: 'Domain / Hosting', amount: '' },
];

export default function PnLPage() {
  const [mode, setMode] = useState('month'); // 'today' | 'month'
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => { loadRevenue(); }, [mode]);

  async function loadRevenue() {
    const sb = createClient();
    const now = new Date();
    let from;
    if (mode === 'today') { from = new Date(); from.setHours(0,0,0,0); }
    else { from = new Date(now.getFullYear(), now.getMonth(), 1); }
    const { data } = await sb.from('orders').select('amount').eq('status','paid').gte('created_at', from.toISOString());
    setRevenue((data||[]).reduce((s,o) => s+(o.amount||0), 0));
  }

  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const profit = revenue - totalExpenses;

  function updateExpense(i, val) {
    setExpenses(prev => prev.map((e, idx) => idx===i ? {...e, amount: val} : e));
  }

  function addCustom() {
    if (!customLabel) return;
    setExpenses(prev => [...prev, { label: customLabel, amount: customAmount }]);
    setCustomLabel(''); setCustomAmount('');
  }

  function removeExpense(i) {
    setExpenses(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Profit & Loss</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Track your revenue, expenses and net profit</p>

      {/* Period toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:28 }}>
        {[['today','Today'],['month','This Month']].map(([val,label]) => (
          <button key={val} onClick={() => setMode(val)} style={{ padding:'7px 18px', borderRadius:20, fontSize:13, fontWeight:600, background: mode===val?'var(--accent)':'var(--surface2)', color: mode===val?'#000':'var(--muted)', border:'1px solid var(--border)' }}>{label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:32 }}>
        {[
          { label:'Revenue', value: revenue, color:'var(--accent2)' },
          { label:'Total Expenses', value: totalExpenses, color:'var(--danger)' },
          { label:'Net Profit', value: profit, color: profit>=0?'var(--accent)':'var(--danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:700, color }}>${value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:24, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Profit Margin</span>
          <span style={{ fontSize:13, color:'var(--muted)' }}>{revenue > 0 ? ((profit/revenue)*100).toFixed(1) : 0}%</span>
        </div>
        <div style={{ height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width: revenue>0 ? `${Math.max(0,Math.min(100,(profit/revenue)*100))}%` : '0%', background: profit>=0?'var(--accent)':'var(--danger)', borderRadius:4, transition:'width 0.4s' }} />
        </div>
      </div>

      {/* Expenses */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:24 }}>
        <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Expenses</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {expenses.map((e, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input value={e.label} onChange={ev => setExpenses(prev => prev.map((x,xi) => xi===i?{...x,label:ev.target.value}:x))} style={{ flex:2 }} placeholder="Expense name" />
              <input value={e.amount} onChange={ev => updateExpense(i, ev.target.value)} type="number" placeholder="$0.00" style={{ flex:1 }} />
              <button onClick={() => removeExpense(i)} style={{ background:'transparent', color:'var(--danger)', padding:'8px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:16, lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid var(--border)', marginTop:16, paddingTop:16 }}>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>Add custom expense</p>
          <div style={{ display:'flex', gap:10 }}>
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Label (e.g. SMS credits)" style={{ flex:2 }} />
            <input value={customAmount} onChange={e => setCustomAmount(e.target.value)} type="number" placeholder="$0.00" style={{ flex:1 }} />
            <button onClick={addCustom} style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'9px 16px', borderRadius:'var(--radius)', whiteSpace:'nowrap' }}>+ Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
