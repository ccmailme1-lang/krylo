import react, { usestate } from 'react';
import { useauditcontext } from '../../context/auditcontext';

const ignitionlayer = () => {
  const { dispatch, is_halted } = useauditcontext();
  const [val, setval] = usestate('');

  const slam_entry = (e) => {
    if (e.key === 'Enter' && val.trim()) {
      dispatch({
        type: 'append_entry',
        payload: {
          entry: {
            origin_id: 'glove_input',
            action: val,
            status: 'ok',
            delta: 0,
            actor: 'concec'
          }
        }
      });
      setval('');
    }
  };

  return (
    <div style={{ position: 'relative', width: '400px' }}>
      <input
        type="text"
        value={val}
        disabled={is_halted}
        onChange={(e) => setval(e.target.value)}
        onKeyDown={slam_entry}
        placeholder={is_halted ? "SYSTEM HALTED" : "IGNITE TRUTH..."}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderbottom: '1px solid #333',
          color: '#ffffff',
          fontfamily: 'monospace',
          outline: 'none',
          padding: '10px',
          textAlign: 'center',
          transition: 'border 0.719s ease'
        }}
      />
    </div>
  );
};

export default ignitionlayer;