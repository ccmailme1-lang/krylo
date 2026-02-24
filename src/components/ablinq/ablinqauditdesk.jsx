import React from 'react';

const auditData = [
  { id: 'TX-901', event: 'LAYER_SYNC', status: 'VERIFIED', integrity: '0.998' },
  { id: 'TX-902', event: 'PHYSICS_CALC', status: 'PENDING', integrity: '1.000' },
  { id: 'TX-903', event: 'NODE_HANDSHAKE', status: 'VERIFIED', integrity: '0.999' },
];

const AblinqAuditDesk = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#00FF00' }}>
      <header style={{ marginBottom: '2rem', borderLeft: '2px solid #00FF00', paddingLeft: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>[ ABLINQ_AUDIT_LOG ]</h2>
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>SYSTEM_STATUS: OPERATIONAL</span>
      </header>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #333', fontSize: '0.7rem', opacity: 0.5 }}>
            <th style={{ padding: '10px' }}>LOG_ID</th>
            <th style={{ padding: '10px' }}>EVENT_TYPE</th>
            <th style={{ padding: '10px' }}>INTEGRITY</th>
            <th style={{ padding: '10px' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {auditData.map((row) => (
            <tr key={row.id} style={{ borderBottom: '1px solid #111' }}>
              <td style={{ padding: '15px 10px' }}>{row.id}</td>
              <td style={{ padding: '15px 10px' }}>{row.event}</td>
              <td style={{ padding: '15px 10px' }}>{row.integrity}</td>
              <td style={{ padding: '15px 10px', color: row.status === 'VERIFIED' ? '#00FF00' : '#FFA500' }}>
                {`> ${row.status}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AblinqAuditDesk;