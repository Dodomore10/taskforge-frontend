import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// TASKFORGE AI — Production-Grade AI Assistant Platform
// Frontend calls /api/ai/chat on your backend (secure)
// ============================================================

// ── API Config ───────────────────────────────────────────────
// In development: calls localhost:3001
// In production: calls your Railway backend URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function callAI(payload) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Utility helpers ──────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── AI Engine ────────────────────────────────────────────────
async function generateSystemPrompt(config) {
  const data = await callAI({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `You are an expert AI systems architect. Generate a HIGHLY SPECIALIZED system prompt for an AI assistant with the following configuration:

Assistant Name: ${config.name}
Specific Task: ${config.task}
Description: ${config.description}
Output Style: ${config.outputStyle}
Input Types: ${config.inputTypes.join(", ")}
Tool Access: ${config.tools.join(", ")}
Memory Type: ${config.memoryType}

Generate a system prompt that:
1. Strictly limits the assistant to ONLY the defined task - no scope creep
2. Defines exact output format and structure
3. Includes self-correction logic
4. Adds domain-specific guardrails
5. Specifies how to handle edge cases and out-of-scope requests
6. Optimizes for the specific output style requested
7. Is production-ready and robust

Return ONLY the system prompt text, no explanations or meta-commentary.`
    }],
  });
  return data.content?.[0]?.text || "System prompt generation failed.";
}

async function runAssistant(assistant, userInput, conversationHistory = []) {
  const messages = [...conversationHistory, { role: "user", content: userInput }];
  const data = await callAI({
    model: "claude-sonnet-4-20250514",
    max_tokens: assistant.maxTokens || 1000,
    system: assistant.systemPrompt,
    messages,
  });
  const text = data.content?.[0]?.text || "No response.";
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { text, tokens };
}

async function runPromptTest(systemPrompt, testInput) {
  const data = await callAI({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: testInput }],
  });
  return {
    text: data.content?.[0]?.text || "No response.",
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

// ── Initial demo data ────────────────────────────────────────
const DEMO_ASSISTANTS = [
  {
    id: uid(),
    name: "YouTube Script Writer",
    description: "Generates viral, engaging YouTube scripts with hooks, body, and CTAs",
    task: "Write high-retention YouTube video scripts optimized for audience engagement",
    outputStyle: "Structured script with timestamps",
    inputTypes: ["text", "URL"],
    tools: ["web search"],
    memoryType: "short-term",
    automationTrigger: "manual",
    temperature: 0.8,
    maxTokens: 2000,
    status: "active",
    systemPrompt: "You are an expert YouTube scriptwriter specializing in high-retention content...",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    endpoint: `/api/v1/assistants/${uid()}/run`,
    apiKey: "tf_" + uid() + uid(),
    logs: [],
    totalRuns: 47,
    totalTokens: 134200,
    errors: 2,
    version: 1,
    promptVersions: [],
  },
  {
    id: uid(),
    name: "Stock Analyst",
    description: "Analyzes stocks, generates reports, and provides buy/sell signals",
    task: "Perform comprehensive stock analysis including technicals, fundamentals, and sentiment",
    outputStyle: "Structured financial report with ratings",
    inputTypes: ["text", "API trigger"],
    tools: ["web search", "code execution"],
    memoryType: "long-term",
    automationTrigger: "scheduled",
    temperature: 0.3,
    maxTokens: 3000,
    status: "active",
    systemPrompt: "You are a professional stock market analyst with 20 years of experience...",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    endpoint: `/api/v1/assistants/${uid()}/run`,
    apiKey: "tf_" + uid() + uid(),
    logs: [],
    totalRuns: 128,
    totalTokens: 892400,
    errors: 5,
    version: 3,
    promptVersions: [],
  },
];

// ── Theme & Design Tokens ─────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #080c10;
  --bg2: #0d1117;
  --bg3: #161b22;
  --bg4: #1c2333;
  --border: #21262d;
  --border2: #30363d;
  --text: #e6edf3;
  --text2: #8b949e;
  --text3: #484f58;
  --accent: #00e5ff;
  --accent2: #7c3aed;
  --accent3: #10b981;
  --accent4: #f59e0b;
  --danger: #f85149;
  --glow: 0 0 20px rgba(0,229,255,0.15);
  --glow2: 0 0 40px rgba(0,229,255,0.08);
  --radius: 8px;
  --radius2: 12px;
  --font-display: 'Syne', sans-serif;
  --font-mono: 'Space Mono', monospace;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-display);
  line-height: 1.6;
  overflow-x: hidden;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text3); }

.bg-grid {
  position: fixed; inset: 0; z-index: 0;
  background-image:
    linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.bg-orb { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; opacity: 0.06; }
.bg-orb-1 { top: -200px; right: -200px; background: var(--accent); }
.bg-orb-2 { bottom: -200px; left: -200px; background: var(--accent2); }

.app { position: relative; z-index: 1; min-height: 100vh; }
.sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 220px; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; z-index: 100; }
.main { margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column; }
.topbar { position: sticky; top: 0; z-index: 50; height: 60px; background: rgba(8,12,16,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 16px; }
.content { flex: 1; padding: 28px; max-width: 1400px; width: 100%; }

.logo { padding: 20px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
.logo-icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: var(--bg); font-family: var(--font-mono); box-shadow: var(--glow); }
.logo-text { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
.logo-text span { color: var(--accent); }

.nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav-section { font-size: 10px; font-weight: 700; color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase; padding: 8px 8px 4px; margin-top: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius); font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s ease; border: 1px solid transparent; }
.nav-item:hover { background: var(--bg3); color: var(--text); }
.nav-item.active { background: rgba(0,229,255,0.08); color: var(--accent); border-color: rgba(0,229,255,0.15); }
.nav-item .icon { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; }
.nav-badge { margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px; background: var(--accent); color: var(--bg); border-radius: 9px; font-size: 10px; font-weight: 700; font-family: var(--font-mono); display: flex; align-items: center; justify-content: center; }
.sidebar-footer { padding: 12px 8px; border-top: 1px solid var(--border); }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius2); padding: 20px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.card:hover { border-color: var(--border2); }
.card-glow { box-shadow: var(--glow2); border-color: rgba(0,229,255,0.2); }
.card-title { font-size: 15px; font-weight: 700; }
.card-desc { font-size: 13px; color: var(--text2); line-height: 1.5; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 700; font-family: var(--font-display); cursor: pointer; border: none; transition: all 0.15s ease; white-space: nowrap; }
.btn-primary { background: var(--accent); color: var(--bg); box-shadow: 0 0 16px rgba(0,229,255,0.25); }
.btn-primary:hover { background: #26eaff; box-shadow: 0 0 24px rgba(0,229,255,0.4); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border2); }
.btn-secondary:hover { background: var(--bg4); }
.btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border); }
.btn-ghost:hover { background: var(--bg3); color: var(--text); }
.btn-danger { background: rgba(248,81,73,0.1); color: var(--danger); border: 1px solid rgba(248,81,73,0.3); }
.btn-danger:hover { background: rgba(248,81,73,0.2); }
.btn-success { background: rgba(16,185,129,0.1); color: var(--accent3); border: 1px solid rgba(16,185,129,0.3); }
.btn-success:hover { background: rgba(16,185,129,0.2); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-lg { padding: 12px 24px; font-size: 15px; }
.btn-icon { padding: 7px; width: 32px; height: 32px; justify-content: center; }

.badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.5px; }
.badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
.badge-active { background: rgba(16,185,129,0.1); color: var(--accent3); border: 1px solid rgba(16,185,129,0.2); }
.badge-active::before { background: var(--accent3); box-shadow: 0 0 6px var(--accent3); }
.badge-paused { background: rgba(245,158,11,0.1); color: var(--accent4); border: 1px solid rgba(245,158,11,0.2); }
.badge-paused::before { background: var(--accent4); }
.badge-draft { background: var(--bg3); color: var(--text2); border: 1px solid var(--border2); }
.badge-draft::before { background: var(--text2); }
.badge-error { background: rgba(248,81,73,0.1); color: var(--danger); border: 1px solid rgba(248,81,73,0.2); }
.badge-error::before { background: var(--danger); }

.form-group { margin-bottom: 18px; }
.form-label { display: block; font-size: 12px; font-weight: 700; color: var(--text2); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
.form-input, .form-textarea, .form-select { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius); padding: 10px 14px; color: var(--text); font-family: var(--font-display); font-size: 14px; transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; resize: none; }
.form-input:focus, .form-textarea:focus, .form-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,229,255,0.08); }
.form-textarea { min-height: 100px; line-height: 1.6; }
.form-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b949e' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
.form-hint { font-size: 11px; color: var(--text3); margin-top: 5px; }
.range-input { width: 100%; accent-color: var(--accent); }

.checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; }
.checkbox-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius); background: var(--bg3); border: 1px solid var(--border2); cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text2); transition: all 0.15s ease; user-select: none; }
.checkbox-item:hover { border-color: var(--text3); color: var(--text); }
.checkbox-item.checked { background: rgba(0,229,255,0.08); border-color: rgba(0,229,255,0.3); color: var(--accent); }
.checkbox-item input { display: none; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius2); padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 11px; font-weight: 700; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; }
.stat-value { font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--text); line-height: 1; }
.stat-sub { font-size: 11px; color: var(--text2); }
.stat-accent { color: var(--accent); }
.stat-green { color: var(--accent3); }
.stat-yellow { color: var(--accent4); }
.stat-red { color: var(--danger); }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.assistant-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius2); padding: 20px; display: flex; flex-direction: column; gap: 14px; transition: all 0.2s ease; cursor: pointer; position: relative; overflow: hidden; }
.assistant-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); opacity: 0; transition: opacity 0.2s ease; }
.assistant-card:hover { border-color: rgba(0,229,255,0.2); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.assistant-card:hover::before { opacity: 1; }
.assistant-icon { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.assistant-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.meta-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; background: var(--bg3); border: 1px solid var(--border); font-size: 11px; color: var(--text2); font-family: var(--font-mono); }
.assistant-stats { display: flex; gap: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
.astat { display: flex; flex-direction: column; gap: 2px; }
.astat-val { font-size: 16px; font-weight: 800; font-family: var(--font-mono); color: var(--text); }
.astat-key { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
.modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp 0.2s ease; }
.modal-lg { max-width: 900px; }
.modal-xl { max-width: 1100px; }
.modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.modal-title { font-size: 18px; font-weight: 800; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }

.stepper { display: flex; align-items: center; gap: 0; margin-bottom: 28px; }
.step { display: flex; align-items: center; gap: 8px; flex: 1; }
.step:last-child { flex: none; }
.step-circle { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: var(--font-mono); color: var(--text3); flex-shrink: 0; transition: all 0.2s ease; }
.step-circle.active { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 12px rgba(0,229,255,0.3); }
.step-circle.done { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.step-label { font-size: 12px; font-weight: 600; color: var(--text3); white-space: nowrap; }
.step-label.active { color: var(--accent); }
.step-label.done { color: var(--text2); }
.step-line { flex: 1; height: 1px; background: var(--border2); margin: 0 8px; }
.step-line.done { background: var(--accent); opacity: 0.4; }

.code-block { background: var(--bg); border: 1px solid var(--border2); border-radius: var(--radius); padding: 16px; font-family: var(--font-mono); font-size: 12px; color: var(--text2); line-height: 1.7; overflow-x: auto; white-space: pre-wrap; word-break: break-word; max-height: 280px; overflow-y: auto; }

.chat-container { display: flex; flex-direction: column; height: 500px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.chat-msg { display: flex; gap: 10px; max-width: 85%; }
.chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
.chat-bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.6; }
.chat-msg.assistant .chat-bubble { background: var(--bg3); border: 1px solid var(--border); color: var(--text); border-bottom-left-radius: 4px; }
.chat-msg.user .chat-bubble { background: rgba(0,229,255,0.12); border: 1px solid rgba(0,229,255,0.2); color: var(--text); border-bottom-right-radius: 4px; }
.chat-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.chat-msg.assistant .chat-avatar { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
.chat-msg.user .chat-avatar { background: var(--bg4); border: 1px solid var(--border2); }
.chat-input-row { display: flex; gap: 8px; padding: 12px 0 0; border-top: 1px solid var(--border); }
.chat-input { flex: 1; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius); padding: 10px 14px; color: var(--text); font-family: var(--font-display); font-size: 14px; outline: none; }
.chat-input:focus { border-color: var(--accent); }

.log-entry { font-family: var(--font-mono); font-size: 12px; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; display: flex; gap: 12px; align-items: flex-start; }
.log-entry.info { background: rgba(0,229,255,0.04); color: var(--text2); }
.log-entry.success { background: rgba(16,185,129,0.06); color: var(--accent3); }
.log-entry.error { background: rgba(248,81,73,0.06); color: var(--danger); }
.log-time { color: var(--text3); flex-shrink: 0; }

.progress-bar { height: 4px; background: var(--bg4); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); transition: width 0.3s ease; }

.tabs { display: flex; gap: 2px; background: var(--bg3); border-radius: var(--radius); padding: 3px; margin-bottom: 20px; }
.tab { flex: 1; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; text-align: center; transition: all 0.15s ease; }
.tab.active { background: var(--bg); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
.tab:hover:not(.active) { color: var(--text); }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius2); padding: 12px 18px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: slideInRight 0.25s ease; min-width: 260px; max-width: 360px; }
.toast.success { border-left: 3px solid var(--accent3); }
.toast.error { border-left: 3px solid var(--danger); }
.toast.info { border-left: 3px solid var(--accent); }

.spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text2); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: var(--text2); max-width: 320px; margin: 0 auto 20px; }

.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.section-title { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
.section-sub { font-size: 13px; color: var(--text2); margin-top: 2px; }

.divider { height: 1px; background: var(--border); margin: 20px 0; }

.info-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.info-row:last-child { border-bottom: none; }
.info-key { font-weight: 700; color: var(--text2); min-width: 150px; flex-shrink: 0; }
.info-val { color: var(--text); font-family: var(--font-mono); font-size: 12px; word-break: break-all; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.animate-pulse { animation: pulse 1.5s ease infinite; }

@media (max-width: 900px) {
  .sidebar { width: 60px; }
  .sidebar .logo-text, .sidebar .nav-item span:not(.icon), .sidebar .nav-section, .sidebar .nav-badge { display: none; }
  .main { margin-left: 60px; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
}

.flex { display: flex; } .flex-col { flex-direction: column; }
.items-center { align-items: center; } .justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; } .mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
.text-sm { font-size: 13px; } .text-xs { font-size: 11px; } .text-muted { color: var(--text2); } .text-accent { color: var(--accent); }
.font-mono { font-family: var(--font-mono); } .font-bold { font-weight: 700; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-full { width: 100%; } .flex-1 { flex: 1; }
`;

// ── Sub-components ────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  return (
    <div className={`toast ${type}`}>
      <span style={{ fontSize: 16 }}>{icons[type]}</span>
      <span>{msg}</span>
      <span style={{ marginLeft: "auto", cursor: "pointer", color: "var(--text3)" }} onClick={onClose}>✕</span>
    </div>
  );
}

function Spinner() { return <div className="spinner" />; }

function StatusBadge({ status }) {
  const map = { active: "Active", paused: "Paused", draft: "Draft", error: "Error" };
  return <span className={`badge badge-${status}`}>{map[status] || status}</span>;
}

function CheckboxGroup({ options, value, onChange }) {
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="checkbox-group">
      {options.map((opt) => (
        <label key={opt} className={`checkbox-item ${value.includes(opt) ? "checked" : ""}`} onClick={() => toggle(opt)}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => {}} />{opt}
        </label>
      ))}
    </div>
  );
}

// ── Create Assistant Wizard ───────────────────────────────────
const STEP_LABELS = ["Basic Info", "Behavior", "Tools & I/O", "Automation", "Review"];
const TASK_TEMPLATES = [
  { emoji: "🎬", name: "YouTube Script Writer", task: "Write high-retention YouTube video scripts with hooks, structure, and CTAs", outputStyle: "Structured script with [HOOK], [INTRO], [BODY], [CTA] sections" },
  { emoji: "📈", name: "Stock Analyst", task: "Perform comprehensive stock analysis including technical, fundamental, and sentiment analysis", outputStyle: "Structured financial report with ratings and recommendations" },
  { emoji: "⚖️", name: "Legal Drafter", task: "Draft precise legal documents, contracts, and clauses", outputStyle: "Formal legal document with numbered clauses" },
  { emoji: "🐛", name: "Code Debugger", task: "Debug code, identify root causes, and provide fix explanations", outputStyle: "Structured debug report with root cause, fix, and explanation" },
  { emoji: "🔬", name: "Research Summarizer", task: "Summarize research papers and extract key insights", outputStyle: "Executive summary with key findings, methodology, and implications" },
  { emoji: "🤖", name: "ML Trainer", task: "Design ML training pipelines, optimize hyperparameters, analyze results", outputStyle: "Technical report with configurations and performance metrics" },
  { emoji: "✍️", name: "Custom", task: "", outputStyle: "" },
];

function CreateAssistantModal({ onClose, onCreated, showToast }) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", task: "", outputStyle: "", inputTypes: ["text"], tools: [], memoryType: "short-term", automationTrigger: "manual", temperature: 0.7, maxTokens: 1000, selectedTemplate: null });
  const [systemPrompt, setSystemPrompt] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTemplate = (t) => {
    if (t.name !== "Custom") { set("name", t.name); set("task", t.task); set("outputStyle", t.outputStyle); }
    set("selectedTemplate", t.name);
  };

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.task.trim();
    if (step === 1) return form.outputStyle.trim();
    return true;
  };

  const handleNext = async () => {
    if (step === 3) {
      setGenerating(true);
      try {
        const prompt = await generateSystemPrompt(form);
        setSystemPrompt(prompt);
      } catch (e) {
        setSystemPrompt(`You are ${form.name}, an AI assistant specialized in: ${form.task}. Always respond in the following format: ${form.outputStyle}. Stay strictly within your defined scope.`);
        showToast("Used fallback prompt: " + e.message, "info");
      }
      setGenerating(false);
    }
    setStep((s) => s + 1);
  };

  const handleCreate = () => {
    const assistant = { id: uid(), ...form, systemPrompt, status: "active", createdAt: now(), endpoint: `/api/v1/assistants/${uid()}/run`, apiKey: "tf_" + uid() + uid(), logs: [], totalRuns: 0, totalTokens: 0, errors: 0, version: 1, promptVersions: [{ version: 1, prompt: systemPrompt, createdAt: now() }] };
    onCreated(assistant);
    showToast(`"${assistant.name}" deployed!`, "success");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div><div className="modal-title">Create AI Assistant</div><div className="text-sm text-muted mt-2">Step {step + 1} of {STEP_LABELS.length}</div></div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="stepper">
            {STEP_LABELS.map((l, i) => (
              <div key={l} className="step" style={{ flex: i < STEP_LABELS.length - 1 ? 1 : "none" }}>
                <div className={`step-circle ${i < step ? "done" : i === step ? "active" : ""}`}>{i < step ? "✓" : i + 1}</div>
                <div className={`step-label ${i < step ? "done" : i === step ? "active" : ""}`}>{l}</div>
                {i < STEP_LABELS.length - 1 && <div className={`step-line ${i < step ? "done" : ""}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div className="form-label">Quick Start Template</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  {TASK_TEMPLATES.map((t) => (
                    <div key={t.name} onClick={() => handleTemplate(t)} style={{ padding: "10px 12px", borderRadius: 8, background: form.selectedTemplate === t.name ? "rgba(0,229,255,0.08)" : "var(--bg3)", border: `1px solid ${form.selectedTemplate === t.name ? "rgba(0,229,255,0.3)" : "var(--border2)"}`, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{t.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: form.selectedTemplate === t.name ? "var(--accent)" : "var(--text2)" }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Assistant Name *</label><input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. YouTube Script Writer" /></div>
                <div className="form-group"><label className="form-label">Short Description</label><input className="form-input" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What does it do?" /></div>
              </div>
              <div className="form-group"><label className="form-label">Specific Task to Master *</label><textarea className="form-textarea" value={form.task} onChange={(e) => set("task", e.target.value)} placeholder="Be very specific about what this assistant should do..." /><div className="form-hint">The more specific, the better the AI will be optimized.</div></div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="form-group"><label className="form-label">Output Style *</label><textarea className="form-textarea" value={form.outputStyle} onChange={(e) => set("outputStyle", e.target.value)} placeholder="e.g. Structured script with [HOOK], [INTRO], [3 MAIN POINTS], [CTA]" style={{ minHeight: 80 }} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Memory Type</label>
                  <select className="form-select" value={form.memoryType} onChange={(e) => set("memoryType", e.target.value)}>
                    <option value="none">None — Stateless</option>
                    <option value="short-term">Short-term — Session only</option>
                    <option value="long-term">Long-term — Persistent</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Temperature: {form.temperature}</label><input type="range" className="range-input" min="0" max="1" step="0.1" value={form.temperature} onChange={(e) => set("temperature", parseFloat(e.target.value))} /><div className="flex justify-between text-xs text-muted mt-2"><span>Precise (0)</span><span>Creative (1)</span></div></div>
              </div>
              <div className="form-group"><label className="form-label">Max Tokens: {form.maxTokens}</label><input type="range" className="range-input" min="256" max="4000" step="128" value={form.maxTokens} onChange={(e) => set("maxTokens", parseInt(e.target.value))} /></div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="form-group"><label className="form-label">Input Types</label><CheckboxGroup options={["text", "file", "URL", "API trigger", "webhook"]} value={form.inputTypes} onChange={(v) => set("inputTypes", v)} /></div>
              <div className="form-group"><label className="form-label">Tool Access</label><CheckboxGroup options={["web search", "code execution", "API calls", "file reading", "database query", "email send"]} value={form.tools} onChange={(v) => set("tools", v)} /></div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="form-group"><label className="form-label">Automation Trigger</label>
                <select className="form-select" value={form.automationTrigger} onChange={(e) => set("automationTrigger", e.target.value)}>
                  <option value="manual">Manual — Run on demand</option>
                  <option value="webhook">Webhook — External HTTP trigger</option>
                  <option value="scheduled">Scheduled — Cron-based</option>
                  <option value="chained">Chained — Output of another assistant</option>
                </select>
              </div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, padding: 14 }}>
                <div className="text-sm font-bold" style={{ marginBottom: 8 }}>⚡ AI Prompt Generation</div>
                <div className="text-sm text-muted">Click "Next" to auto-generate a highly specialized system prompt using Claude AI.</div>
              </div>
              {generating && <div className="flex items-center gap-3 mt-3" style={{ color: "var(--accent)" }}><Spinner /><span className="text-sm">Generating optimized system prompt...</span></div>}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="assistant-icon" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 24 }}>🤖</div>
                <div><div style={{ fontSize: 18, fontWeight: 800 }}>{form.name}</div><div className="text-sm text-muted">{form.description}</div></div>
                <StatusBadge status="active" />
              </div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="info-row"><span className="info-key">Task</span><span className="info-val">{form.task}</span></div>
                <div className="info-row"><span className="info-key">Output Style</span><span className="info-val">{form.outputStyle}</span></div>
                <div className="info-row"><span className="info-key">Memory</span><span className="info-val">{form.memoryType}</span></div>
                <div className="info-row"><span className="info-key">Automation</span><span className="info-val">{form.automationTrigger}</span></div>
              </div>
              <div className="form-group"><label className="form-label">Generated System Prompt</label><div className="code-block">{systemPrompt || "Generating..."}</div></div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>← Back</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {step < 4 ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={!canNext() || generating}>
              {generating ? <><Spinner /> Generating...</> : step === 3 ? "Generate Prompt →" : "Next →"}
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleCreate}>🚀 Deploy Assistant</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Assistant Detail Modal ────────────────────────────────────
function AssistantDetailModal({ assistant, onClose, onUpdate, showToast }) {
  const [tab, setTab] = useState("run");
  const [messages, setMessages] = useState([{ role: "assistant", content: `Hi! I'm **${assistant.name}**. I'm specialized in: ${assistant.task}. How can I help?` }]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [editPrompt, setEditPrompt] = useState(assistant.systemPrompt);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || running) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setRunning(true);
    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));
      const { text, tokens } = await runAssistant(assistant, userMsg, history);
      setMessages((m) => [...m, { role: "assistant", content: text }]);
      const logEntry = { time: now(), type: "success", msg: `Run completed. Tokens: ${tokens}` };
      onUpdate({ ...assistant, totalRuns: assistant.totalRuns + 1, totalTokens: assistant.totalTokens + tokens, logs: [logEntry, ...assistant.logs].slice(0, 50) });
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Error: " + e.message }]);
      onUpdate({ ...assistant, errors: assistant.errors + 1, logs: [{ time: now(), type: "error", msg: e.message }, ...assistant.logs].slice(0, 50) });
      showToast("Run failed: " + e.message, "error");
    }
    setRunning(false);
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTesting(true); setTestResult(null);
    try { setTestResult(await runPromptTest(editPrompt, testInput)); }
    catch (e) { setTestResult({ text: "Test failed: " + e.message, tokens: 0 }); }
    setTesting(false);
  };

  const savePrompt = () => {
    const newVersion = { version: (assistant.promptVersions?.length || 0) + 1, prompt: editPrompt, createdAt: now() };
    onUpdate({ ...assistant, systemPrompt: editPrompt, version: newVersion.version, promptVersions: [...(assistant.promptVersions || []), newVersion] });
    showToast("Prompt updated & versioned", "success");
  };

  const toggleStatus = () => { const s = assistant.status === "active" ? "paused" : "active"; onUpdate({ ...assistant, status: s }); showToast(`Assistant ${s}`, "info"); };
  const formatMsg = (c) => c.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: "92vh" }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="assistant-icon" style={{ width: 40, height: 40, fontSize: 20 }}>🤖</div>
            <div><div className="modal-title">{assistant.name}</div><div className="flex items-center gap-2 mt-2"><StatusBadge status={assistant.status} /><span className="text-xs text-muted font-mono">v{assistant.version}</span></div></div>
          </div>
          <div className="flex gap-2">
            <button className={`btn btn-sm ${assistant.status === "active" ? "btn-danger" : "btn-success"}`} onClick={toggleStatus}>{assistant.status === "active" ? "⏸ Pause" : "▶ Resume"}</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="tabs" style={{ margin: "0 24px", marginTop: 16, flexShrink: 0 }}>
          {["run", "prompt", "logs", "config"].map((t) => (
            <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "run" ? "🚀 Run" : t === "prompt" ? "✏️ Prompt" : t === "logs" ? "📋 Logs" : "⚙️ Config"}
            </div>
          ))}
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          {tab === "run" && (
            <div className="chat-container">
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    <div className="chat-avatar">{m.role === "assistant" ? "🤖" : "👤"}</div>
                    <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
                  </div>
                ))}
                {running && <div className="chat-msg assistant"><div className="chat-avatar">🤖</div><div className="chat-bubble animate-pulse" style={{ color: "var(--text3)" }}>Thinking...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-row">
                <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder={`Ask ${assistant.name}...`} disabled={assistant.status !== "active"} />
                <button className="btn btn-primary" onClick={sendMessage} disabled={running || !input.trim() || assistant.status !== "active"}>{running ? <Spinner /> : "Send"}</button>
              </div>
            </div>
          )}
          {tab === "prompt" && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-muted">v<span className="font-mono text-accent">{assistant.version}</span></div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={handleTest} disabled={testing}>{testing ? <><Spinner /> Testing...</> : "▶ Test"}</button>
                  <button className="btn btn-primary btn-sm" onClick={savePrompt}>💾 Save</button>
                </div>
              </div>
              <textarea className="form-textarea" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} style={{ minHeight: 200, fontFamily: "var(--font-mono)", fontSize: 12 }} />
              <div className="form-group mt-3"><label className="form-label">Test Input</label><div className="flex gap-2"><input className="form-input" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Enter test input..." /></div></div>
              {testResult && <div className="card mt-3"><div className="flex justify-between mb-2"><span className="text-sm font-bold">Result</span><span className="text-xs font-mono text-muted">{testResult.tokens} tokens</span></div><div className="code-block">{testResult.text}</div></div>}
              {assistant.promptVersions?.length > 1 && (
                <div className="mt-4">
                  <div className="text-sm font-bold mb-2 text-muted">Version History</div>
                  {[...assistant.promptVersions].reverse().map((v) => (
                    <div key={v.version} className="flex justify-between items-center" style={{ padding: "8px 10px", background: "var(--bg3)", borderRadius: 6, marginBottom: 4 }}>
                      <span className="font-mono text-xs text-accent">v{v.version}</span>
                      <span className="text-xs text-muted">{fmtDate(v.createdAt)}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditPrompt(v.prompt)}>Restore</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "logs" && (
            <div>
              <div className="flex justify-between items-center mb-3"><div className="text-sm text-muted">{assistant.logs.length} entries</div><button className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...assistant, logs: [] })}>Clear</button></div>
              {assistant.logs.length === 0 ? <div className="text-sm text-muted">No logs yet.</div> : assistant.logs.map((l, i) => <div key={i} className={`log-entry ${l.type}`}><span className="log-time">{fmtDate(l.time)}</span><span>{l.msg}</span></div>)}
            </div>
          )}
          {tab === "config" && (
            <div>
              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-label">Total Runs</div><div className="stat-value stat-accent">{assistant.totalRuns}</div></div>
                <div className="stat-card"><div className="stat-label">Tokens</div><div className="stat-value">{(assistant.totalTokens / 1000).toFixed(1)}k</div></div>
                <div className="stat-card"><div className="stat-label">Errors</div><div className="stat-value stat-red">{assistant.errors}</div></div>
                <div className="stat-card"><div className="stat-label">Version</div><div className="stat-value stat-green">v{assistant.version}</div></div>
              </div>
              <div className="card">
                <div className="info-row"><span className="info-key">API Endpoint</span><span className="info-val">{assistant.endpoint}</span></div>
                <div className="info-row"><span className="info-key">API Key</span><span className="info-val">{assistant.apiKey}</span></div>
                <div className="info-row"><span className="info-key">Temperature</span><span className="info-val">{assistant.temperature}</span></div>
                <div className="info-row"><span className="info-key">Max Tokens</span><span className="info-val">{assistant.maxTokens}</span></div>
                <div className="info-row"><span className="info-key">Memory</span><span className="info-val">{assistant.memoryType}</span></div>
                <div className="info-row"><span className="info-key">Created</span><span className="info-val">{fmtDate(assistant.createdAt)}</span></div>
              </div>
              <button className="btn btn-ghost btn-sm mt-4" onClick={() => { const blob = new Blob([JSON.stringify(assistant, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${assistant.name.replace(/\s+/g, "_")}.json`; a.click(); showToast("Exported", "success"); }}>📦 Export Config</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────
function DashboardView({ assistants, onCreateNew, onSelectAssistant }) {
  const totalRuns = assistants.reduce((s, a) => s + a.totalRuns, 0);
  const totalTokens = assistants.reduce((s, a) => s + a.totalTokens, 0);
  const activeCount = assistants.filter((a) => a.status === "active").length;
  const errorCount = assistants.reduce((s, a) => s + a.errors, 0);
  return (
    <div>
      <div className="section-header"><div><div className="section-title">Dashboard</div><div className="section-sub">Monitor your AI assistant fleet</div></div><button className="btn btn-primary btn-lg" onClick={onCreateNew}>+ New Assistant</button></div>
      <div className="stat-grid">
        <div className="stat-card card-glow"><div className="stat-label">Active</div><div className="stat-value stat-accent">{activeCount}</div><div className="stat-sub">{assistants.length} total</div></div>
        <div className="stat-card"><div className="stat-label">Total Runs</div><div className="stat-value">{totalRuns.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Tokens Used</div><div className="stat-value">{(totalTokens / 1000).toFixed(1)}<span style={{ fontSize: 14 }}>k</span></div></div>
        <div className="stat-card"><div className="stat-label">Errors</div><div className={`stat-value ${errorCount > 0 ? "stat-red" : "stat-green"}`}>{errorCount}</div></div>
      </div>
      <div className="section-header mt-4"><div className="font-bold">Your Assistants</div></div>
      {assistants.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🤖</div><div className="empty-title">No assistants yet</div><div className="empty-desc">Create your first specialized AI assistant.</div><button className="btn btn-primary" onClick={onCreateNew}>+ Create Assistant</button></div>
      ) : (
        <div className="grid-auto">
          {assistants.map((a) => (
            <div key={a.id} className="assistant-card" onClick={() => onSelectAssistant(a)}>
              <div className="flex items-center gap-3"><div className="assistant-icon">🤖</div><div style={{ flex: 1, minWidth: 0 }}><div className="card-title truncate">{a.name}</div><StatusBadge status={a.status} /></div></div>
              <div className="card-desc">{a.task?.slice(0, 90)}{a.task?.length > 90 ? "..." : ""}</div>
              <div className="assistant-meta">{a.inputTypes?.map((t) => <span key={t} className="meta-tag">📥 {t}</span>)}{a.tools?.slice(0, 2).map((t) => <span key={t} className="meta-tag">🔧 {t}</span>)}</div>
              <div className="assistant-stats">
                <div className="astat"><div className="astat-val">{a.totalRuns}</div><div className="astat-key">Runs</div></div>
                <div className="astat"><div className="astat-val">{(a.totalTokens / 1000).toFixed(1)}k</div><div className="astat-key">Tokens</div></div>
                <div className="astat"><div className="astat-val" style={{ color: a.errors > 0 ? "var(--danger)" : "var(--accent3)" }}>{a.errors}</div><div className="astat-key">Errors</div></div>
                <div className="astat"><div className="astat-val" style={{ color: "var(--accent)" }}>v{a.version}</div><div className="astat-key">Version</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssistantsView({ assistants, onCreateNew, onSelectAssistant, onDelete, onClone, showToast }) {
  const [search, setSearch] = useState("");
  const filtered = assistants.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.task?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="section-header"><div><div className="section-title">All Assistants</div></div><button className="btn btn-primary" onClick={onCreateNew}>+ New</button></div>
      <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search..." style={{ maxWidth: 300, marginBottom: 16 }} />
      {filtered.map((a) => (
        <div key={a.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer", marginBottom: 10 }} onClick={() => onSelectAssistant(a)}>
          <div className="assistant-icon" style={{ width: 38, height: 38, fontSize: 18, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}><div className="flex items-center gap-2"><div className="font-bold">{a.name}</div><StatusBadge status={a.status} /></div><div className="text-sm text-muted truncate">{a.task}</div></div>
          <div className="flex gap-2 text-sm text-muted" style={{ flexShrink: 0 }}><span className="font-mono">{a.totalRuns} runs</span></div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm" onClick={() => { onClone(a); showToast("Cloned", "success"); }}>Clone</button>
            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Delete "${a.name}"?`)) onDelete(a.id); }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsView({ assistants }) {
  const total = assistants.reduce((s, a) => ({ runs: s.runs + a.totalRuns, tokens: s.tokens + a.totalTokens, errors: s.errors + a.errors }), { runs: 0, tokens: 0, errors: 0 });
  const topByRuns = [...assistants].sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 5);
  return (
    <div>
      <div className="section-header"><div className="section-title">Analytics</div></div>
      <div className="stat-grid">
        <div className="stat-card card-glow"><div className="stat-label">Total Runs</div><div className="stat-value stat-accent">{total.runs.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Total Tokens</div><div className="stat-value">{(total.tokens / 1000).toFixed(1)}k</div></div>
        <div className="stat-card"><div className="stat-label">Error Rate</div><div className="stat-value">{total.runs > 0 ? ((total.errors / total.runs) * 100).toFixed(1) : 0}%</div></div>
        <div className="stat-card"><div className="stat-label">Avg Tokens/Run</div><div className="stat-value">{total.runs > 0 ? Math.round(total.tokens / total.runs) : 0}</div></div>
      </div>
      <div className="card mt-4">
        <div className="card-title mb-3">Top Assistants by Usage</div>
        {topByRuns.length === 0 ? <div className="text-sm text-muted">No data yet</div> : topByRuns.map((a, i) => {
          const pct = topByRuns[0].totalRuns > 0 ? (a.totalRuns / topByRuns[0].totalRuns) * 100 : 0;
          return <div key={a.id} style={{ marginBottom: 12 }}><div className="flex justify-between text-sm mb-2"><span>{i + 1}. {a.name}</span><span className="font-mono text-muted">{a.totalRuns} runs</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div></div>;
        })}
      </div>
    </div>
  );
}

function AutomationView({ assistants, showToast }) {
  const [workflows, setWorkflows] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newWf, setNewWf] = useState({ name: "", trigger: "scheduled", cron: "0 9 * * *", assistantId: assistants[0]?.id || "" });
  return (
    <div>
      <div className="section-header"><div><div className="section-title">Automations</div></div><button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New</button></div>
      {showCreate && (
        <div className="card card-glow mb-4">
          <div className="card-title mb-3">New Automation</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={newWf.name} onChange={(e) => setNewWf({ ...newWf, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Assistant</label><select className="form-select" value={newWf.assistantId} onChange={(e) => setNewWf({ ...newWf, assistantId: e.target.value })}>{assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Trigger</label><select className="form-select" value={newWf.trigger} onChange={(e) => setNewWf({ ...newWf, trigger: e.target.value })}><option value="scheduled">Scheduled</option><option value="webhook">Webhook</option><option value="manual">Manual</option></select></div>
            {newWf.trigger === "scheduled" && <div className="form-group"><label className="form-label">Cron</label><input className="form-input" value={newWf.cron} onChange={(e) => setNewWf({ ...newWf, cron: e.target.value })} style={{ fontFamily: "var(--font-mono)" }} /></div>}
          </div>
          <div className="flex gap-2"><button className="btn btn-primary" onClick={() => { setWorkflows((w) => [...w, { id: uid(), ...newWf, status: "active", runs: 0 }]); setShowCreate(false); showToast("Automation created", "success"); }} disabled={!newWf.name}>Create</button><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button></div>
        </div>
      )}
      {workflows.length === 0 ? <div className="empty-state"><div className="empty-icon">⚡</div><div className="empty-title">No automations</div></div> : workflows.map((wf) => {
        const a = assistants.find((x) => x.id === wf.assistantId);
        return <div key={wf.id} className="card mb-3"><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg4)", display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div><div style={{ flex: 1 }}><div className="font-bold">{wf.name}</div><div className="text-sm text-muted">{a?.name} · {wf.trigger}</div></div><StatusBadge status={wf.status} /><button className="btn btn-danger btn-sm" onClick={() => setWorkflows((w) => w.filter((x) => x.id !== wf.id))}>Delete</button></div></div>;
      })}
    </div>
  );
}

function ImportView({ onImport, showToast }) {
  const [json, setJson] = useState("");
  return (
    <div>
      <div className="section-header"><div className="section-title">Import Assistant</div></div>
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-title mb-3">Paste Config JSON</div>
        <textarea className="form-textarea" value={json} onChange={(e) => setJson(e.target.value)} style={{ minHeight: 200, fontFamily: "var(--font-mono)", fontSize: 12 }} placeholder='{"name": "My Assistant", "task": "..."}' />
        <button className="btn btn-primary mt-3" onClick={() => { try { const c = JSON.parse(json); if (!c.name || !c.task) throw new Error("Missing name or task"); onImport({ ...c, id: uid(), createdAt: now(), status: "draft", totalRuns: 0, totalTokens: 0, errors: 0, version: 1, logs: [] }); setJson(""); showToast("Imported!", "success"); } catch (e) { showToast("Import failed: " + e.message, "error"); } }} disabled={!json.trim()}>📥 Import</button>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async () => { if (!form.email || !form.password) return; setLoading(true); await sleep(800); onAuth({ id: uid(), email: form.email, name: form.name || form.email.split("@")[0] }); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="flex items-center justify-center gap-3 mb-8"><div className="logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>TF</div><div style={{ fontSize: 26, fontWeight: 800 }}>Task<span style={{ color: "var(--accent)" }}>Forge</span> <span style={{ color: "var(--text2)", fontWeight: 400 }}>AI</span></div></div>
        <div className="card card-glow">
          <div className="tabs" style={{ marginBottom: 20 }}><div className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Sign In</div><div className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>Sign Up</div></div>
          {mode === "signup" && <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" /></div>}
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></div>
          <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" /></div>
          <button className="btn btn-primary w-full btn-lg" onClick={handleSubmit} disabled={loading || !form.email || !form.password}>{loading ? <><Spinner /> Authenticating...</> : mode === "login" ? "Sign In →" : "Create Account →"}</button>
          <div className="text-xs text-muted mt-3" style={{ textAlign: "center" }}>Demo: enter any email/password</div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function TaskForgeAI() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [assistants, setAssistants] = useState(DEMO_ASSISTANTS);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "info") => setToast({ msg, type, id: uid() }), []);
  const updateAssistant = useCallback((updated) => { setAssistants((prev) => prev.map((a) => a.id === updated.id ? updated : a)); setSelectedAssistant((s) => s?.id === updated.id ? updated : s); }, []);
  const cloneAssistant = (a) => setAssistants((prev) => [...prev, { ...a, id: uid(), name: a.name + " (Clone)", status: "draft", totalRuns: 0, totalTokens: 0, errors: 0, createdAt: now(), apiKey: "tf_" + uid() + uid(), version: 1, logs: [], promptVersions: [] }]);

  const NAV = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "assistants", icon: "🤖", label: "Assistants", badge: assistants.length },
    { id: "analytics", icon: "📊", label: "Analytics" },
    { id: "automation", icon: "⚡", label: "Automations" },
    { id: "import", icon: "📥", label: "Import" },
  ];

  if (!user) return (<><style>{CSS}</style><div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="app"><AuthScreen onAuth={setUser} /></div></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <div className="app">
        <aside className="sidebar">
          <div className="logo"><div className="logo-icon">TF</div><div className="logo-text">Task<span>Forge</span></div></div>
          <nav className="nav">
            <div className="nav-section">Platform</div>
            {NAV.map((n) => (<div key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span>{n.badge != null && <span className="nav-badge">{n.badge}</span>}</div>))}
          </nav>
          <div className="sidebar-footer">
            <div className="nav-item"><span className="icon">👤</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>{user.name}</span></div>
            <div className="nav-item" onClick={() => setUser(null)}><span className="icon">↩</span><span>Sign Out</span></div>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div style={{ flex: 1 }} />
            <div className="flex items-center gap-3">
              <div style={{ padding: "4px 10px", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20, fontSize: 11, color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>PRO</div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--bg)", fontWeight: 700 }}>{user.name[0].toUpperCase()}</span>
                <span>{user.name}</span>
              </div>
            </div>
          </div>
          <div className="content">
            {view === "dashboard" && <DashboardView assistants={assistants} onCreateNew={() => setShowCreate(true)} onSelectAssistant={setSelectedAssistant} />}
            {view === "assistants" && <AssistantsView assistants={assistants} onCreateNew={() => setShowCreate(true)} onSelectAssistant={setSelectedAssistant} onDelete={(id) => { setAssistants((p) => p.filter((a) => a.id !== id)); showToast("Deleted", "info"); }} onClone={cloneAssistant} showToast={showToast} />}
            {view === "analytics" && <AnalyticsView assistants={assistants} />}
            {view === "automation" && <AutomationView assistants={assistants} showToast={showToast} />}
            {view === "import" && <ImportView onImport={(a) => { setAssistants((p) => [...p, a]); setView("assistants"); }} showToast={showToast} />}
          </div>
        </main>
        {showCreate && <CreateAssistantModal onClose={() => setShowCreate(false)} onCreated={(a) => setAssistants((p) => [...p, a])} showToast={showToast} />}
        {selectedAssistant && <AssistantDetailModal assistant={selectedAssistant} onClose={() => setSelectedAssistant(null)} onUpdate={updateAssistant} showToast={showToast} />}
        {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}
