import React, { useMemo, useState } from "react";

export default function ExerciseCard({ ex, canLog, logged, onAddSet }) {
    const [weight, setWeight] = useState("");
    const [reps, setReps] = useState("");

    const target = useMemo(() => {
        const a = ex.rep_range_start;
        const b = ex.rep_range_end;
        const rpe = ex.rpe;
        const repText = a && b ? `${a}-${b}` : "";
        const rpeText = rpe ? `RPE ${rpe}` : "";
        if (repText && rpeText) return `${repText} @ ${rpeText}`;
        return repText || rpeText || "";
    }, [ex]);

    function submit() {
        const w = Number(weight);
        const r = Number(reps);
        if (!w || !r) return;
        onAddSet(ex.id, w, r);
        setWeight("");
        setReps("");
    }

    return (
        <div className="card" style={{ background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{ex.name}</div>
                    {target ? <div style={{ color: "var(--muted)", fontWeight: 700 }}>{target}</div> : null}
                </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                <input
                    className="input"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    disabled={!canLog}
                    style={{ maxWidth: 180 }}
                />
                <input
                    className="input"
                    placeholder="Reps"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    disabled={!canLog}
                    style={{ maxWidth: 160 }}
                />
                <button type="button" className="btn btn--primary" onClick={submit} disabled={!canLog}>
                    Add set
                </button>
            </div>

            {logged?.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontWeight: 900, marginBottom: "0.5rem" }}>Logged</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {logged.map((s, idx) => (
                            <div
                                key={s.id}
                                className="card"
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    boxShadow: "none",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ fontWeight: 900, minWidth: 44 }}>#{idx + 1}</span>
                                    <span style={{ fontWeight: 800 }}>{s.weight} wt</span>
                                    <span style={{ fontWeight: 800 }}>{s.reps} reps</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
