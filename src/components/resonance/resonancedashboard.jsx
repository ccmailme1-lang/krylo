import React from "react";

/**
 * Resonance Vessels Dashboard
 * 6-slot symmetrical command console UI
 */

const domains = [
  { id: "01", name: "ONCORE", type: "STRUCTURAL", color: "green" },
  { id: "02", name: "INCORE", type: "INFORMATION", color: "blue" },
  { id: "03", name: "UPCORE", type: "STRATEGIC", color: "green" },
  { id: "04", name: "OUTCORE", type: "COMMUNICATION", color: "blue" },
  { id: "05", name: "DOWNCORE", type: "EXECUTION", color: "green" },
  { id: "06", name: "BEYONDCORE", type: "TRANSCENDENCE", color: "blue" }
];

function Waveform({ color }) {
  return (
    <div className="relative w-full h-24 flex items-center justify-center overflow-hidden">
      <svg viewBox="0 0 600 120" className="w-full h-full opacity-90">
        <path
          d="M0,60 C40,10 80,110 120,60 C160,10 200,110 240,60 C280,10 320,110 360,60 C400,10 440,110 480,60 C520,10 560,110 600,60"
          fill="none"
          stroke={color === "green" ? "#39ff88" : "#4cc3ff"}
          strokeWidth="2.2"
        />
        <path
          d="M0,60 C40,90 80,30 120,60 C160,90 200,30 240,60 C280,90 320,30 360,60 C400,90 440,30 480,60 C520,90 560,30 600,60"
          fill="none"
          stroke={color === "green" ? "#39ff88" : "#4cc3ff"}
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
    </div>
  );
}

function Gauge({ value }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-14 h-14 rounded-full border border-white/20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" />
        <span className="text-xs text-white/80">{value}%</span>
      </div>
    </div>
  );
}

function Vessel({ domain }) {
  const color = domain.color;

  return (
    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-lg">

      {/* Header */}
      <div className="flex justify-between items-center text-xs tracking-widest text-white/70">
        <span>RES-VSL {domain.id}</span>
        <span>{domain.name}</span>
      </div>

      <div className="text-[10px] text-white/40 uppercase">
        {domain.type} DOMAIN
      </div>

      {/* Waveform Core */}
      <Waveform color={color} />

      {/* Telemetry */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-white/60 font-mono">
        <span>ADO VEL 2.41</span>
        <span>PAT FLU 0.67</span>
        <span>COH SYN 98.1%</span>
        <span>ENT RDY 0.42</span>
        <span>FRQ RES 7.83Hz</span>
        <span>PHS FLX 0.38</span>
      </div>

      {/* Bottom Row */}
      <div className="flex justify-between items-center pt-2 border-t border-white/10">
        <Gauge value={92 + Number(domain.id)} />
        <div className="text-[9px] text-white/40 tracking-wider">
          META:{domain.id}-{domain.name.slice(0, 3)}
        </div>
      </div>
    </div>
  );
}

export default function ResonanceDashboard() {
  return (
    <div className="w-full bg-black text-white p-4">
      <div className="grid grid-cols-6 gap-3">
        {domains.map((d) => (
          <Vessel key={d.id} domain={d} />
        ))}
      </div>
    </div>
  );
}
