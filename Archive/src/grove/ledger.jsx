// File: src/glove/ledger.jsx
// Status: Meat on the Bones / Tangible Visual
// Verified Dependencies: react

const ledger = ({ nodes }) => {
  return (
    <div className="ledger-container">
      {nodes.map((node, index) => (
        <div 
          key={index} 
          className="signal-node"
          style={{ 
            transform: `translateZ(${index * -50}px) translateY(${index * 20}px)`,
            opacity: 1 - (index * 0.15) 
          }}
        >
          <div className="node-header">signal_node_{index}</div>
          <p className="node-content">{node.etr.toLowerCase()}</p>
          <div className="node-feedback">{node.feedback}</div>
        </div>
      ))}
    </div>
  );
};

export default ledger;