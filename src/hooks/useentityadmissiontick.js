// useentityadmissiontick.js -- KRYL-1380. A counter that increments when an entity is admitted at runtime
// (secfileradmission.js dispatches 'krylo-entity-admitted'). Components that compute subjectScope(query) include it in their
// memo dependencies so a subject that was UNRESOLVED when the query was submitted is re-scoped as soon as it is admitted.
import { useEffect, useState } from 'react';
export function useEntityAdmissionTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(n => n + 1);
    window.addEventListener('krylo-entity-admitted', on);
    return () => window.removeEventListener('krylo-entity-admitted', on);
  }, []);
  return tick;
}
