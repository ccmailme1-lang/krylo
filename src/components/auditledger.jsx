import react, { useref, useeffect, usestate } from "react";
import { useauditcontext } from "../../context/auditcontext";

// ─── physics constants ────────────────────────────────────────────────────────
const row_height   = 44;
const slam_ms      = 719;
const slam_curve   = "cubic-bezier(0.23, 1, 0.32, 1)";
const slam_ease    = `${slam_ms}ms ${slam_curve}`;

const columns = [
  { key: "seq",    label: "#",       width: 40  },
  { key: "ts",     label: "time",    width: 96  },
  { key: "actor",  label: "actor",   width: 120 },
  { key: "action", label: "action",  width: 148 },
  { key: "status", label: "status",  width: 88  },
  { key: "delta",  label: "Δ",       width: 68  },
];

// ─── internal row logic ──────────────────────────────────────────────────────
function ledgerrow({ entry, index, is_new }) {
  const row_ref = useref(null);

  useeffect(() => {
    if (!is_new || !row_ref.current) return;
    const node = row_ref.current;
    node.style.transform = `translateY(${row_height}px)`;
    node.style.opacity = "0";
    void node.offsetHeight; // force reflow
    node.style.transition = `transform ${slam_ease}, opacity ${slam_ease}`;
    node.style.transform = "translateY(0px)";
    node.style.opacity = "1";
  }, [is_new]);

  return (
    <div ref={row_ref} style={{
      height: row_height,
      display: 'flex',
      alignItems: 'center',
      background: index % 2 === 0 ? "#090909" : "#0d0d0d",
      borderBottom: "1px solid #111122",
      fontSize: '11px',
      fontFamily: 'monospace',
      paddingLeft: '10px'
    }}>
      <span style={{ width: 40, color: '#334' }}>{String(index + 1).padStart(3, '0')}</span>
      <span style={{ width: 96, color: '#567' }}>{entry.ts}</span>
      <span style={{ width: 120, color: '#89a' }}>{entry.actor}</span>
      <span style={{ width: 148, color: '#ccd' }}>{entry.action}</span>
      <span style={{ width: 88, color: '#00ff87' }}>{entry.status}</span>
      <span style={{ width: 68, color: '#445', textAlign: 'right' }}>{entry.delta}</span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function auditledger() {
  const { ledger } = useauditcontext();
  const prev_ids = useref(new Set());

  return (
    <div style={{ width: '560px', background: '#000', color: '#abc', height: '100%' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #112', color: '#345', fontSize: '10px' }}>
        AUDIT DESK // STACKED_LEDGER
      </div>
      <div style={{ display: 'flex', background: '#02020a', height: '30px', alignItems: 'center', paddingLeft: '10px' }}>
        {columns.map(col => (
          <span key={col.key} style={{ width: col.width, fontSize: '9px', textTransform: 'uppercase', color: '#234' }}>
            {col.label}
          </span>
        ))}
      </div>
      <div style={{ overflow: 'hidden' }}>
        {ledger.map((entry, idx) => {
          const is_new = !prev_ids.current.has(entry.id);
          if (is_new) prev_ids.current.add(entry.id);
          return <ledgerrow key={entry.id} entry={entry} index={idx} is_new={is_new} />;
        })}
      </div>
    </div>
  );
}