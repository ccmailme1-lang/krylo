import react, { createContext as createcontext, useContext as usecontext, useReducer as usereducer } from 'react';

const audit_context = createcontext();

const initial_state = {
  ledger: [],
  is_halted: false
};

function audit_reducer(state, action) {
  switch (action.type) {
    case 'append_entry':
      return { 
        ...state, 
        ledger: [action.payload.entry, ...state.ledger].slice(0, 44) 
      };
    case 'system_halt':
      return { ...state, is_halted: true };
    default:
      return state;
  }
}

// 1. Primary Exports (PascalCase for React/Vite)
export const AuditProvider = ({ children }) => {
  const [state, dispatch] = usereducer(audit_reducer, initial_state);
  return (
    <audit_context.Provider value={{ ...state, dispatch }}>
      {children}
    </audit_context.Provider>
  );
};

export const useAuditContext = () => usecontext(audit_context);

// 2. Aliased Exports (Lowercase for your Logic/SOP)
export const auditprovider = AuditProvider;
export const useauditcontext = useAuditContext;