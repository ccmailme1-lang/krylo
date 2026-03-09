// ablinqauditdesk.jsx
// WO-225 — Audit Desk root. Mounts LookingFunnel.
// Location: src/components/ablinq/ablinqauditdesk.jsx

import React from "react";
import LookingFunnel from "../lookingfunnel.jsx";

export default function AblinqAuditDesk() {

  const handleSearch = (query) => {
    console.log("[AuditDesk] Query submitted:", query);
    // Route to audit results view
  };

  return (
    <LookingFunnel
      isReceding={false}
      onSubmit={handleSearch}
    />
  );
}