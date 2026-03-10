import "./searchhome.css";

const SearchHome = () => {
  const snapshots = [
    { label: "audit desk", title: "ablinq ledger", status: "live", color: "#4ade80" },
    { label: "ecosystem", title: "nooma unified", status: "sync", color: "#60a5fa" },
    { label: "friction", title: "tracking listener", status: "active", color: "#fbbf24" },
    { label: "accountability", title: "truth engine", status: "locked", color: "#f87171" }
  ];

  return (
    <div className="search-portal">
      <div className="search-header">
        <h1 className="logo