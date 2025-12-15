import React from "react";

export default function KeyValue({ label, value }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <div style={{ color: "var(--muted)", fontWeight: 800 }}>{label}</div>
            <div style={{ fontWeight: 900 }}>{value}</div>
        </div>
    );
}
