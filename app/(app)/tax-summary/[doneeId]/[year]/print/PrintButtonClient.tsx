"use client";

export function PrintButtonClient() {
  return (
    <button
      className="noprint"
      onClick={() => window.print()}
      style={{
        marginTop: "1.5rem",
        padding: "0.5rem 1rem",
        background: "#751411",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.9rem",
      }}
    >
      Print
    </button>
  );
}
