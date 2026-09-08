import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Mic, Upload, Activity,
  Cpu, Waves, Radio, History as HistoryIcon, BarChart3, Settings as SettingsIcon,
  CheckCircle2, Circle, Loader2, X, Lock, Smartphone, KeyRound, ScanFace,
  AlertTriangle, PlayCircle, ChevronRight, FileAudio, PauseCircle, Trash2,
  Fingerprint, EyeOff, Database, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

/* =========================================================================
   DESIGN TOKENS
   ========================================================================= */
const C = {
  void: "#070A12",
  panel: "#0E141F",
  panelRaised: "#131B29",
  panelHi: "#182234",
  border: "#212C3E",
  borderHi: "#2D3B54",
  text: "#E7ECF5",
  textDim: "#8593AB",
  textFaint: "#5B6981",
  cyan: "#2DD4E8",
  cyanDim: "#1A8A9C",
  purple: "#9D7FF0",
  purpleDim: "#6A57A8",
  green: "#3ED598",
  amber: "#F5B94E",
  red: "#F5646C",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.vx-display { font-family: 'Space Grotesk', sans-serif; }
.vx-body { font-family: 'Inter', sans-serif; }
.vx-mono { font-family: 'IBM Plex Mono', monospace; }
@keyframes vx-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes vx-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes vx-dash { to { stroke-dashoffset: 0; } }
@keyframes vx-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.vx-rise { animation: vx-rise .35s ease-out both; }
`;

/* =========================================================================
   DOMAIN LOGIC — risk engine, types (documented via JSDoc), demo data
   ========================================================================= */

// Prediction = "AUTHENTIC" | "AI_GENERATED" | "INCONCLUSIVE"
// RiskLevel  = "LOW" | "MEDIUM" | "HIGH"

function getRiskLevel(riskScore) {
  if (riskScore <= 30) return "LOW";
  if (riskScore <= 60) return "MEDIUM";
  return "HIGH";
}

function calculateRiskScore(features, confidence, prediction) {
  const { syntheticArtifactScore, spectralAnomaly, prosodicAnomaly, voiceprintAnomaly } = features;
  const modelSignal = prediction === "AI_GENERATED" ? confidence : prediction === "INCONCLUSIVE" ? confidence * 0.6 : 100 - confidence;
  const raw =
    syntheticArtifactScore * 0.30 +
    spectralAnomaly * 0.25 +
    prosodicAnomaly * 0.20 +
    voiceprintAnomaly * 0.15 +
    modelSignal * 0.10;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

const RISK_META = {
  LOW: { color: C.green, label: "LOW RISK", icon: ShieldCheck,
    copy: "No significant impersonation indicators detected.",
    action: "Continue normal verification and monitoring." },
  MEDIUM: { color: C.amber, label: "MEDIUM RISK", icon: ShieldQuestion,
    copy: "Some voice characteristics show potential anomalies.",
    action: "Perform additional identity verification." },
  HIGH: { color: C.red, label: "HIGH RISK", icon: ShieldAlert,
    copy: "Strong indicators of potential AI-generated or cloned voice detected.",
    action: "Do not rely on voice authentication alone. Require secondary authentication before sensitive actions." },
};

const PREDICTION_META = {
  AUTHENTIC: { label: "AUTHENTIC VOICE", color: C.green },
  AI_GENERATED: { label: "AI-GENERATED VOICE DETECTED", color: C.red },
  INCONCLUSIVE: { label: "INCONCLUSIVE", color: C.amber },
};

const DEMO_SCENARIOS = {
  authentic: {
    key: "authentic",
    label: "Authentic Human Voice",
    source: "Uploaded Audio",
    prediction: "AUTHENTIC",
    confidence: 96,
    features: { spectralAnomaly: 8, prosodicAnomaly: 10, voiceprintAnomaly: 7, syntheticArtifactScore: 5 },
  },
  cloned: {
    key: "cloned",
    label: "AI-Cloned Voice",
    source: "Incoming Call",
    prediction: "AI_GENERATED",
    confidence: 94,
    features: { spectralAnomaly: 87, prosodicAnomaly: 72, voiceprintAnomaly: 91, syntheticArtifactScore: 89 },
  },
  uncertain: {
    key: "uncertain",
    label: "Uncertain Voice",
    source: "Incoming Call",
    prediction: "INCONCLUSIVE",
    confidence: 61,
    features: { spectralAnomaly: 45, prosodicAnomaly: 51, voiceprintAnomaly: 42, syntheticArtifactScore: 49 },
  },
};

function buildResult(scenario) {
  const riskScore = calculateRiskScore(scenario.features, scenario.confidence, scenario.prediction);
  return {
    prediction: scenario.prediction,
    confidence: scenario.confidence,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    features: scenario.features,
    processingTime: 1.2 + Math.random() * 0.6,
    source: scenario.source,
    timestamp: new Date(),
  };
}

const PIPELINE_STAGES = [
  { key: "input", label: "Audio Input", icon: Mic },
  { key: "preprocess", label: "Preprocessing", icon: Cpu },
  { key: "features", label: "Feature Extraction", icon: BarChart3 },
  { key: "model", label: "AI Detection Model", icon: Activity },
  { key: "prediction", label: "Authenticity Analysis", icon: ScanFace },
  { key: "risk", label: "Risk Assessment", icon: Shield },
];

/* =========================================================================
   SHARED PRIMITIVES
   ========================================================================= */

function Panel({ children, style, ...rest }) {
  return (
    <div
      style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span
      className="vx-mono"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 9px", borderRadius: 5, fontSize: 11, letterSpacing: 0.4,
        color, background: `${color}1A`, border: `1px solid ${color}40`,
      }}
    >
      {children}
    </span>
  );
}

function RadialGauge({ value, color, size = 168, thickness = 12, label, sublabel }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.borderHi} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.4s" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="vx-mono" style={{ fontSize: size * 0.2, fontWeight: 600, color: C.text, lineHeight: 1 }}>
          {Math.round(value)}%
        </div>
        {sublabel && <div className="vx-mono" style={{ fontSize: 11, color, marginTop: 6 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="vx-body" style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 12 }}>
      {children}
    </div>
  );
}

/* =========================================================================
   NAVIGATION
   ========================================================================= */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Shield },
  { key: "live", label: "Live Detection", icon: Radio },
  { key: "history", label: "Analysis History", icon: HistoryIcon },
  { key: "threat", label: "Threat Intelligence", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function Sidebar({ page, setPage }) {
  return (
    <div style={{ width: 232, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "22px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={17} color={C.void} strokeWidth={2.5} />
          </div>
          <div className="vx-display" style={{ fontSize: 17, fontWeight: 700, color: C.text }}>VoxShield AI</div>
        </div>
        <div className="vx-body" style={{ fontSize: 11.5, color: C.textFaint, marginTop: 5, marginLeft: 1 }}>AI Voice Security Platform</div>
      </div>
      <nav style={{ padding: "14px 12px", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="vx-body"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", marginBottom: 3, borderRadius: 7, border: "none",
                cursor: "pointer", fontSize: 13.5, fontWeight: 500, textAlign: "left",
                background: active ? C.panelHi : "transparent",
                color: active ? C.cyan : C.textDim,
                borderLeft: active ? `2px solid ${C.cyan}` : "2px solid transparent",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: C.green, animation: "vx-pulse 2s infinite" }} />
          <span className="vx-mono" style={{ fontSize: 11, color: C.green, letterSpacing: 0.5 }}>SYSTEM ONLINE</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PIPELINE VISUAL
   ========================================================================= */

function PipelineVisual({ activeIndex, complete }) {
  return (
    <Panel style={{ padding: "22px 24px" }}>
      <SectionLabel>Detection Pipeline</SectionLabel>
      <div style={{ display: "flex", alignItems: "center" }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = complete || i < activeIndex;
          const active = !complete && i === activeIndex;
          const state = done ? "done" : active ? "active" : "waiting";
          const color = state === "done" ? C.green : state === "active" ? C.cyan : C.textFaint;
          return (
            <React.Fragment key={stage.key}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 96 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                  background: state === "waiting" ? C.panelRaised : `${color}1A`,
                  border: `1px solid ${state === "waiting" ? C.border : color}`,
                  position: "relative", overflow: "hidden",
                }}>
                  {active ? <Loader2 size={18} color={color} className="vx-spin" style={{ animation: "spin 1s linear infinite" }} />
                    : done ? <CheckCircle2 size={18} color={color} /> : <Icon size={16} color={color} />}
                </div>
                <div className="vx-mono" style={{ fontSize: 10, color, marginTop: 8, textAlign: "center", lineHeight: 1.3 }}>
                  {stage.label}
                </div>
                <div className="vx-mono" style={{ fontSize: 9, color: state === "waiting" ? C.textFaint : color, marginTop: 3, opacity: 0.8 }}>
                  {state === "done" ? "COMPLETE" : state === "active" ? "RUNNING" : "WAITING"}
                </div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ flex: 1, height: 1, background: done ? C.green : C.border, marginBottom: 30, transition: "background 0.3s" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </Panel>
  );
}

/* =========================================================================
   RESULT / FEATURES / MODEL CARD / PREVENTION
   ========================================================================= */

function ResultPanel({ result }) {
  const pMeta = PREDICTION_META[result.prediction];
  const rMeta = RISK_META[result.riskLevel];
  const RIcon = rMeta.icon;
  return (
    <div className="vx-rise" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
      <Panel style={{ padding: 24, borderColor: `${pMeta.color}40` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <RIcon size={22} color={pMeta.color} />
          <div className="vx-display" style={{ fontSize: 19, fontWeight: 700, color: pMeta.color }}>{pMeta.label}</div>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <div>
            <div className="vx-mono" style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>AI MODEL CONFIDENCE</div>
            <div className="vx-mono" style={{ fontSize: 30, fontWeight: 600, color: C.text }}>{result.confidence.toFixed(1)}%</div>
          </div>
          <div>
            <div className="vx-mono" style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>IMPERSONATION RISK</div>
            <div className="vx-mono" style={{ fontSize: 30, fontWeight: 600, color: rMeta.color }}>{result.riskScore}%</div>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Badge color={rMeta.color}>{rMeta.label}</Badge>
          <div className="vx-body" style={{ fontSize: 13, color: C.textDim, marginTop: 10, lineHeight: 1.5 }}>{rMeta.copy}</div>
          <div className="vx-body" style={{ fontSize: 12.5, color: C.text, marginTop: 8, lineHeight: 1.5 }}>
            <span style={{ color: C.textFaint }}>Recommended action — </span>{rMeta.action}
          </div>
        </div>
        <div className="vx-body" style={{ fontSize: 11, color: C.textFaint, marginTop: 14, display: "flex", alignItems: "center", gap: 5 }}>
          <Database size={11} /> Prototype Demo Inference · not a certified detection result
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 16 }}>
        <Panel style={{ flex: 1, padding: "18px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="vx-mono" style={{ fontSize: 10.5, color: C.textDim, letterSpacing: 0.6, marginBottom: 10 }}>MODEL CONFIDENCE</div>
          <RadialGauge value={result.confidence} color={C.purple} size={128} thickness={9} sublabel={result.prediction.replace("_", "-")} />
        </Panel>
        <Panel style={{ flex: 1, padding: "18px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="vx-mono" style={{ fontSize: 10.5, color: C.textDim, letterSpacing: 0.6, marginBottom: 10 }}>IMPERSONATION RISK</div>
          <RadialGauge value={result.riskScore} color={rMeta.color} size={128} thickness={9} sublabel={rMeta.label} />
        </Panel>
      </div>
    </div>
  );
}

function RiskScale({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 99, overflow: "hidden", background: `linear-gradient(90deg, ${C.green} 0%, ${C.green} 30%, ${C.amber} 31%, ${C.amber} 60%, ${C.red} 61%, ${C.red} 100%)` }}>
        <div style={{
          position: "absolute", top: -3, left: `${pct}%`, width: 2, height: 14, background: C.text,
          transform: "translateX(-1px)", transition: "left 1s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      <div className="vx-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textFaint, marginTop: 6 }}>
        <span>0 · LOW</span><span>31 · MEDIUM</span><span>61 · HIGH</span><span>100</span>
      </div>
    </div>
  );
}

function FeatureBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span className="vx-body" style={{ fontSize: 12.5, color: C.textDim }}>{label}</span>
        <span className="vx-mono" style={{ fontSize: 12, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: C.panelRaised, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function FeatureEvidence({ features }) {
  const items = [
    { label: "Synthetic Artifacts", value: features.syntheticArtifactScore },
    { label: "Spectral Anomaly", value: features.spectralAnomaly },
    { label: "Prosodic Anomaly", value: features.prosodicAnomaly },
    { label: "Voiceprint Anomaly", value: features.voiceprintAnomaly },
  ];
  const colorFor = (v) => (v > 60 ? C.red : v > 30 ? C.amber : C.green);
  return (
    <Panel className="vx-rise" style={{ padding: 22 }}>
      <SectionLabel>Feature Evidence — Prototype Feature Analysis</SectionLabel>
      {items.map((it) => <FeatureBar key={it.label} label={it.label} value={it.value} color={colorFor(it.value)} />)}
      <div className="vx-body" style={{ fontSize: 11, color: C.textFaint, marginTop: 6, lineHeight: 1.5 }}>
        Demo values shown; a connected ML pipeline would derive these from MFCC, mel spectrogram, spectral rolloff/flatness, pitch, energy, speaking rate, speaker embeddings and neural-vocoder artifact analysis.
      </div>
    </Panel>
  );
}

function ModelCard() {
  return (
    <Panel className="vx-rise" style={{ padding: 22 }}>
      <SectionLabel>Voice Authenticity Detection Model</SectionLabel>
      <div className="vx-display" style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 14 }}>VoxShield Hybrid Detector</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
        {[
          ["Conceptual architecture", "CNN + BiLSTM + Attention"],
          ["Inference", "Real-time"],
          ["Inputs", "Mel spectrogram, acoustic + prosodic features, voice embeddings"],
          ["Output classes", "Authentic / AI-Generated / Inconclusive"],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="vx-mono" style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 3 }}>{k.toUpperCase()}</div>
            <div className="vx-body" style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.4 }}>{v}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PreventionPanel({ result, onVerify }) {
  if (result.riskLevel === "LOW") return null;
  const rMeta = RISK_META[result.riskLevel];
  return (
    <Panel className="vx-rise" style={{ padding: 22, borderColor: `${rMeta.color}40`, background: `linear-gradient(180deg, ${rMeta.color}0D, transparent)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        <AlertTriangle size={17} color={rMeta.color} />
        <div className="vx-display" style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>Attack Prevention &amp; Response</div>
      </div>
      <div className="vx-body" style={{ fontSize: 12.5, color: C.textDim, marginBottom: 14 }}>
        {result.riskLevel === "HIGH" ? "Potential voice-cloning impersonation attack." : "Anomalies detected — confirm identity before proceeding."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 16px", marginBottom: 16 }}>
        {(result.riskLevel === "HIGH"
          ? ["Require MFA", "Verify identity through trusted device", "Do not authorize sensitive transaction", "Notify security team", "Log security event"]
          : ["Perform additional identity check", "Flag for manual review", "Log security event"]
        ).map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <CheckCircle2 size={13} color={rMeta.color} />
            <span className="vx-body" style={{ fontSize: 12.5, color: C.text }}>{t}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onVerify}
        className="vx-body"
        style={{
          background: rMeta.color, color: C.void, border: "none", borderRadius: 7,
          padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 7,
        }}
      >
        <Lock size={14} /> Initiate Secondary Verification
      </button>
    </Panel>
  );
}

function VerificationModal({ onClose }) {
  const [chosen, setChosen] = useState(null);
  const methods = [
    { key: "otp", label: "OTP", icon: Smartphone },
    { key: "face", label: "Face Verification", icon: ScanFace },
    { key: "pin", label: "Secure PIN", icon: KeyRound },
    { key: "device", label: "Trusted Device", icon: Fingerprint },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,6,10,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <Panel style={{ width: 400, padding: 26, borderColor: C.borderHi }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="vx-display" style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Secondary Verification Required</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textFaint }}><X size={17} /></button>
        </div>
        <div className="vx-body" style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>Choose a verification method to confirm the caller's identity.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {methods.map((m) => {
            const Icon = m.icon;
            const active = chosen === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setChosen(m.key)}
                className="vx-body"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "16px 8px", borderRadius: 8, cursor: "pointer",
                  background: active ? `${C.cyan}14` : C.panelRaised,
                  border: `1px solid ${active ? C.cyan : C.border}`,
                  color: active ? C.cyan : C.textDim, fontSize: 12, fontWeight: 500,
                }}
              >
                <Icon size={20} />
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="vx-body" style={{ flex: 1, padding: "10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textDim, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button
            disabled={!chosen}
            onClick={onClose}
            className="vx-body"
            style={{ flex: 1, padding: "10px", borderRadius: 7, border: "none", background: chosen ? C.cyan : C.borderHi, color: chosen ? C.void : C.textFaint, fontSize: 13, fontWeight: 600, cursor: chosen ? "pointer" : "not-allowed" }}
          >
            Verify Identity
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   AUDIO INPUT (upload simulation)
   ========================================================================= */

function AudioInputPanel({ scenario, setScenario, onAnalyze, running }) {
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  return (
    <Panel style={{ padding: 22 }}>
      <SectionLabel>Audio Input</SectionLabel>
      <div style={{ display: "flex", gap: 14 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            flex: 1, border: `1px dashed ${C.borderHi}`, borderRadius: 9, padding: "22px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
            background: C.panelRaised,
          }}
        >
          <input ref={inputRef} type="file" accept=".wav,.mp3,.m4a,.flac" style={{ display: "none" }} onChange={handlePick} />
          <Upload size={20} color={C.cyan} />
          <div className="vx-body" style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>
            {fileName ? fileName : "Click to upload audio"}
          </div>
          <div className="vx-mono" style={{ fontSize: 10, color: C.textFaint }}>WAV · MP3 · M4A · FLAC</div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="vx-body" style={{ fontSize: 11.5, color: C.textDim, marginBottom: 8 }}>Demo audio sample</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.values(DEMO_SCENARIOS).map((s) => (
              <button
                key={s.key}
                onClick={() => setScenario(s.key)}
                className="vx-body"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 11px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                  background: scenario === s.key ? `${C.cyan}14` : "transparent",
                  border: `1px solid ${scenario === s.key ? C.cyan : C.border}`,
                  color: scenario === s.key ? C.cyan : C.textDim,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><FileAudio size={13} /> {s.label}</span>
                {scenario === s.key && <CheckCircle2 size={13} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={running}
        className="vx-body"
        style={{
          marginTop: 16, width: "100%", padding: "11px", borderRadius: 8, border: "none",
          background: running ? C.borderHi : `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
          color: running ? C.textFaint : C.void, fontSize: 13.5, fontWeight: 600,
          cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {running ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…</> : <><PlayCircle size={15} /> Analyze Voice</>}
      </button>
    </Panel>
  );
}

/* =========================================================================
   DASHBOARD PAGE
   ========================================================================= */

function useAnalysisRunner(pushHistory) {
  const [scenario, setScenario] = useState("cloned");
  const [phase, setPhase] = useState("idle"); // idle | running | complete
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  const run = useCallback(() => {
    if (phase === "running") return;
    setPhase("running");
    setResult(null);
    setStageIndex(0);
    let i = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= PIPELINE_STAGES.length) {
        clearInterval(timerRef.current);
        const s = DEMO_SCENARIOS[scenario];
        const r = buildResult(s);
        setResult(r);
        setPhase("complete");
        pushHistory && pushHistory(r);
      } else {
        setStageIndex(i);
      }
    }, 480);
  }, [scenario, phase, pushHistory]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { scenario, setScenario, phase, stageIndex, result, run };
}

function DashboardPage({ pushHistory }) {
  const { scenario, setScenario, phase, stageIndex, result, run } = useAnalysisRunner(pushHistory);
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="vx-display" style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          Real-Time Voice Cloning Detection
        </div>
        <div className="vx-body" style={{ fontSize: 13.5, color: C.textDim, maxWidth: 620, lineHeight: 1.5 }}>
          Analyze incoming voice signals for synthetic speech and impersonation indicators before sensitive actions are authorized.
        </div>
      </div>

      <AudioInputPanel scenario={scenario} setScenario={setScenario} onAnalyze={run} running={phase === "running"} />

      {phase !== "idle" && <PipelineVisual activeIndex={stageIndex} complete={phase === "complete"} />}

      {result && (
        <>
          <ResultPanel result={result} />
          <RiskScaleCard result={result} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FeatureEvidence features={result.features} />
            <ModelCard />
          </div>
          <PreventionPanel result={result} onVerify={() => setShowModal(true)} />
        </>
      )}

      {showModal && <VerificationModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function RiskScaleCard({ result }) {
  const rMeta = RISK_META[result.riskLevel];
  return (
    <Panel className="vx-rise" style={{ padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <SectionLabel>Impersonation Risk Scale</SectionLabel>
        <span className="vx-mono" style={{ fontSize: 11, color: rMeta.color }}>{result.riskScore}% · {rMeta.label}</span>
      </div>
      <RiskScale value={result.riskScore} />
    </Panel>
  );
}

/* =========================================================================
   LIVE DETECTION PAGE
   ========================================================================= */

function LivePage({ pushHistory }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { scenario, setScenario, phase, stageIndex, result, run } = useAnalysisRunner(pushHistory);
  const timerRef = useRef(null);

  const startRecording = () => {
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopRecording = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    run();
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  const bars = Array.from({ length: 40 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="vx-display" style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Live Detection</div>

      <Panel style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div className="vx-body" style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>Simulated caller sample</div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.values(DEMO_SCENARIOS).map((s) => (
                <button key={s.key} onClick={() => setScenario(s.key)} className="vx-body"
                  style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11.5, cursor: "pointer",
                    background: scenario === s.key ? `${C.cyan}14` : "transparent",
                    border: `1px solid ${scenario === s.key ? C.cyan : C.border}`,
                    color: scenario === s.key ? C.cyan : C.textDim }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {recording && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: C.red, animation: "vx-pulse 1s infinite" }} />
              <span className="vx-mono" style={{ fontSize: 11, color: C.red }}>MICROPHONE ACTIVE</span>
            </div>
          )}
        </div>

        <div style={{ height: 84, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, background: C.panelRaised, borderRadius: 8, marginBottom: 16 }}>
          {bars.map((_, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 2, background: recording ? C.cyan : C.borderHi,
              height: recording ? `${18 + Math.sin(i * 0.7 + seconds) * 14 + Math.random() * 12}px` : 6,
              transition: "height 0.15s ease",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="vx-mono" style={{ fontSize: 20, color: C.text }}>
            {recording ? `00:${String(seconds % 60).padStart(2, "0")}` : "00:00"}
          </div>
          {!recording ? (
            <button onClick={startRecording} disabled={phase === "running"} className="vx-body"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: "none",
                background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`, color: C.void, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              <Mic size={15} /> Start Live Detection
            </button>
          ) : (
            <button onClick={stopRecording} className="vx-body"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: `1px solid ${C.red}`,
                background: "transparent", color: C.red, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              <PauseCircle size={15} /> Stop Recording
            </button>
          )}
        </div>
      </Panel>

      {phase !== "idle" && <PipelineVisual activeIndex={stageIndex} complete={phase === "complete"} />}
      {result && (
        <>
          <ResultPanel result={result} />
          <PreventionPanel result={result} onVerify={() => {}} />
        </>
      )}
    </div>
  );
}

/* =========================================================================
   HISTORY PAGE
   ========================================================================= */

function HistoryPage({ log }) {
  const [filter, setFilter] = useState("ALL");
  const rows = filter === "ALL" ? log : log.filter((r) => r.riskLevel === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="vx-display" style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Analysis History</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "LOW", "MEDIUM", "HIGH"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="vx-mono"
              style={{ padding: "6px 11px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: filter === f ? C.panelHi : "transparent",
                border: `1px solid ${filter === f ? C.cyan : C.border}`,
                color: filter === f ? C.cyan : C.textDim }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="vx-body" style={{ fontSize: 13, color: C.textFaint }}>No analyses yet. Run a detection from the Dashboard or Live Detection page.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Timestamp", "Source", "Prediction", "Confidence", "Risk Score", "Risk Level", "Processing"].map((h) => (
                  <th key={h} className="vx-mono" style={{ textAlign: "left", padding: "11px 16px", fontSize: 10.5, color: C.textFaint, fontWeight: 500 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const rMeta = RISK_META[r.riskLevel];
                const pMeta = PREDICTION_META[r.prediction];
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="vx-mono" style={{ padding: "11px 16px", fontSize: 12, color: C.textDim }}>{r.timestamp.toLocaleTimeString()}</td>
                    <td className="vx-body" style={{ padding: "11px 16px", fontSize: 12.5, color: C.text }}>{r.source}</td>
                    <td style={{ padding: "11px 16px" }}><span className="vx-mono" style={{ fontSize: 11.5, color: pMeta.color }}>{r.prediction.replace("_", "-")}</span></td>
                    <td className="vx-mono" style={{ padding: "11px 16px", fontSize: 12.5, color: C.text }}>{r.confidence.toFixed(1)}%</td>
                    <td className="vx-mono" style={{ padding: "11px 16px", fontSize: 12.5, color: rMeta.color }}>{r.riskScore}%</td>
                    <td style={{ padding: "11px 16px" }}><Badge color={rMeta.color}>{r.riskLevel}</Badge></td>
                    <td className="vx-mono" style={{ padding: "11px 16px", fontSize: 12, color: C.textDim }}>{r.processingTime.toFixed(1)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* =========================================================================
   THREAT INTELLIGENCE PAGE
   ========================================================================= */

function StatCard({ label, value, color }) {
  return (
    <Panel style={{ padding: "16px 18px" }}>
      <div className="vx-mono" style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div className="vx-mono" style={{ fontSize: 24, fontWeight: 600, color: color || C.text }}>{value}</div>
    </Panel>
  );
}

function ThreatPage({ log }) {
  const total = log.length;
  const aiDetected = log.filter((r) => r.prediction === "AI_GENERATED").length;
  const highRisk = log.filter((r) => r.riskLevel === "HIGH").length;
  const avgRisk = total ? Math.round(log.reduce((a, r) => a + r.riskScore, 0) / total) : 0;
  const avgConf = total ? (log.reduce((a, r) => a + r.confidence, 0) / total).toFixed(1) : "0.0";
  const avgTime = total ? (log.reduce((a, r) => a + r.processingTime, 0) / total).toFixed(1) : "0.0";

  const distribution = [
    { name: "Low", value: log.filter((r) => r.riskLevel === "LOW").length, color: C.green },
    { name: "Medium", value: log.filter((r) => r.riskLevel === "MEDIUM").length, color: C.amber },
    { name: "High", value: log.filter((r) => r.riskLevel === "HIGH").length, color: C.red },
  ];
  const predData = [
    { name: "Authentic", value: log.filter((r) => r.prediction === "AUTHENTIC").length },
    { name: "AI-Generated", value: aiDetected },
    { name: "Inconclusive", value: log.filter((r) => r.prediction === "INCONCLUSIVE").length },
  ];
  const trend = log.slice().reverse().map((r, i) => ({ i: i + 1, risk: r.riskScore }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="vx-display" style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Threat Intelligence</div>
      <div className="vx-body" style={{ fontSize: 11.5, color: C.textFaint, marginTop: -12 }}>Prototype Demonstration Data</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatCard label="Total Audio Analyzed" value={total} />
        <StatCard label="AI Voices Detected" value={aiDetected} color={C.red} />
        <StatCard label="High Risk Incidents" value={highRisk} color={C.red} />
        <StatCard label="Average Risk Score" value={`${avgRisk}%`} color={C.amber} />
        <StatCard label="Average Confidence" value={`${avgConf}%`} color={C.purple} />
        <StatCard label="Avg Processing Time" value={`${avgTime}s`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel style={{ padding: 20, height: 260 }}>
          <SectionLabel>Risk Distribution</SectionLabel>
          {total === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
                <Tooltip contentStyle={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel style={{ padding: 20, height: 260 }}>
          <SectionLabel>Real vs AI-Generated</SectionLabel>
          {total === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={predData}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill={C.cyan} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel style={{ padding: 20, height: 240 }}>
        <SectionLabel>Risk Score Trend</SectionLabel>
        {total === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height="82%">
            <LineChart data={trend}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="i" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="risk" stroke={C.purple} strokeWidth={2} dot={{ r: 3, fill: C.purple }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: "80%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="vx-body" style={{ fontSize: 12, color: C.textFaint }}>Run an analysis to populate this chart.</span>
    </div>
  );
}

/* =========================================================================
   SETTINGS PAGE
   ========================================================================= */

function SettingsPage() {
  const items = [
    { icon: EyeOff, title: "Audio retention", body: "Raw voice recordings are not retained beyond the analysis session unless explicitly saved." },
    { icon: Lock, title: "Encryption", body: "Audio and metadata are encrypted in transit and at rest." },
    { icon: ShieldQuestion, title: "Voice is a signal, not proof", body: "Detection output is a risk indicator, not absolute proof of impersonation — it should inform, not replace, human judgment." },
    { icon: KeyRound, title: "Never the sole factor", body: "Voice authentication should never be the only factor guarding a sensitive action; pair it with MFA for high-risk decisions." },
    { icon: AlertTriangle, title: "Escalation on high risk", body: "High-risk events automatically trigger a secondary verification requirement." },
    { icon: Mic, title: "Consent", body: "Users must provide explicit microphone consent before any live capture begins." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
      <div className="vx-display" style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Privacy &amp; Security</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Panel key={it.title} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <Icon size={16} color={C.cyan} />
                <div className="vx-body" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{it.title}</div>
              </div>
              <div className="vx-body" style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{it.body}</div>
            </Panel>
          );
        })}
      </div>

      <Panel style={{ padding: 18 }}>
        <div className="vx-body" style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Architecture note</div>
        <div className="vx-body" style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
          This build uses deterministic prototype inference for demonstration. The service layer (analyzeAudio, analyzeLiveAudio,
          calculateRiskScore, getRiskLevel) is structured to swap in a Python FastAPI backend running librosa preprocessing,
          feature extraction, and a trained PyTorch classifier without changing the frontend contract.
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [log, setLog] = useState([]);

  const pushHistory = (r) => setLog((prev) => [r, ...prev].slice(0, 50));

  return (
    <div className="vx-body" style={{ display: "flex", height: "100vh", background: C.void, color: C.text }}>
      <style>{FONTS}</style>
      <Sidebar page={page} setPage={setPage} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 60px" }}>
          {page === "dashboard" && <DashboardPage pushHistory={pushHistory} />}
          {page === "live" && <LivePage pushHistory={pushHistory} />}
          {page === "history" && <HistoryPage log={log} />}
          {page === "threat" && <ThreatPage log={log} />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
