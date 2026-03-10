import React, { useState, useEffect } from "react";
const AuditLedger = () => {
  const [nodes, setNodes] = useState([]);
  useEffect(() => {
    const handler = () => {
      const lat = 20 + Math.random()*50;
      const lon = -140 + Math.random()*200;
      const x = 280 + (lon/180)*280;
      const yBase = 280 - (lat/90)*280;
      const y = yBase * (0.85 + 0.15*Math.cos(lat*Math.PI/180));
      setNodes(prev => [...prev, { id: "k-"+Date.now(), x: Math.max(12,Math.min(548,x)), y: Math.max(12,Math.min(548,y)), drift: Math.random()>0.6?0.85+Math.random()*0.15:Math.random(), entropy: Math.random() }]);
    };
    window.addEventListener("truth-drift-sim", handler);
    return () => window.removeEventListener("truth-drift-sim", handler);
  }, []);
  return (
    <div id="signal-canvas">
      {nodes.map(n => <div key={n.id} className={"signal-node"+(n.drift>0.8?" high-drift":"")} style={{ left:n.x+"px", top:n.y+"px", opacity:(0.5+n.entropy*0.5).toFixed(2) }} />)}
    </div>
  );
};
export default AuditLedger;
