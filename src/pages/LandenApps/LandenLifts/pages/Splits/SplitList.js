// src/pages/LandenApps/LandenLifts/Splits/SplitList.jsx
import React from "react";

export default function SplitList({ userId, splits, selectedSplitId, onSelectSplit, onEditSplit }) {
    if (!splits.length) {
        return <p className="lead">No splits available yet. Create one below.</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {splits.map((s) => {
                const isMine = s.user_id === userId;
                const isSelected = selectedSplitId === s.id;

                return (
                    <div
                        key={s.id}
                        className="btn"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            cursor: "default",
                            background: isSelected ? "var(--surface)" : undefined
                        }}
                    >
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                cursor: "pointer",
                                width: "100%"
                            }}
                        >
                            <input
                                type="radio"
                                name="split"
                                value={s.id}
                                checked={isSelected}
                                onChange={() => onSelectSplit(s.id)}
                            />
                            <span style={{ fontWeight: 800 }}>{s.name}</span> <span style={{ color: "#cdd3db" }}>Code: {s.id}</span>

                            {isMine ? (
                                <span style={{ marginLeft: "auto", color: "var(--muted)", fontWeight: 800 }}>Yours</span>
                            ) : null}
                        </label>

                        {isMine ? (
                            <button type="button" className="btn" style={{ whiteSpace: "nowrap" }} onClick={() => onEditSplit(s)}>
                                Edit
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
