

export default function DayExercisesEditor({
    dayLoading,
    editBusy,
    selectedDay,
    selectedDayNameDraft,
    setSelectedDayNameDraft,
    exerciseDrafts,
    setExerciseDrafts,
    onSaveDay
}) {
    function parseRepsString(repsStr) {
        const s = String(repsStr || "").trim();
        if (!s) return { ok: true };

        const cleaned = s.replace(/\s+/g, "");
        if (/^\d+$/.test(cleaned)) return { ok: true };
        if (/^\d+-\d+$/.test(cleaned)) return { ok: true };
        return { ok: false };
    }

    function normalizeOrder(list) {
        return list.map((r, i) => ({ ...r, order_index: i + 1 }));
    }

    function emptyExerciseDraft(nextOrderIndex) {
        return { id: null, name: "", reps: "", rpe: "", warmup_sets: "", working_sets: "", order_index: nextOrderIndex };
    }

    function addExerciseRow() {
        setExerciseDrafts((prev) => {
            const nextOrder = (prev.length ? prev[prev.length - 1].order_index : 0) + 1;
            return [...prev, emptyExerciseDraft(nextOrder)];
        });
    }

    function removeExerciseRow(idx) {
        setExerciseDrafts((prev) => {
            const copy = [...prev];
            copy.splice(idx, 1);
            if (!copy.length) return [emptyExerciseDraft(1)];
            return normalizeOrder(copy);
        });
    }

    function moveExercise(idx, dir) {
        setExerciseDrafts((prev) => {
            const next = [...prev];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return prev;
            const tmp = next[idx];
            next[idx] = next[j];
            next[j] = tmp;
            return normalizeOrder(next);
        });
    }

    function updateExercise(idx, patch) {
        setExerciseDrafts((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...patch };
            return copy;
        });
    }

    

    if (dayLoading) return <p className="lead">Loading day...</p>;

    return (
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                    <label className="label">Selected day name</label>
                    <input
                        className="input"
                        value={selectedDayNameDraft}
                        onChange={(e) => setSelectedDayNameDraft(e.target.value)}
                        disabled={editBusy}
                    />
                </div>

                
            </div>

            <div style={{ height: "1rem" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <h3 style={{ margin: 0 }}>Exercises</h3>
                <button type="button" className="btn" onClick={addExerciseRow} disabled={editBusy}>
                    Add exercise
                </button>
            </div>

            <div style={{ height: "0.75rem" }} />

            <div className="stack">
                {exerciseDrafts.map((ex, idx) => {
                    const repsBad = ex.reps && !parseRepsString(ex.reps).ok;

                    return (
                        <div key={idx} className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                                <div style={{ fontWeight: 800 }}>#{idx + 1}</div>

                                <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                                    <button type="button" className="btn" onClick={() => moveExercise(idx, -1)} disabled={idx === 0 || editBusy}>
                                        Up
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => moveExercise(idx, 1)}
                                        disabled={idx === exerciseDrafts.length - 1 || editBusy}
                                    >
                                        Down
                                    </button>
                                    <button type="button" className="btn" onClick={() => removeExerciseRow(idx)} disabled={editBusy}>
                                        Remove
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: "0.75rem" }} />

                            <div className="grid grid--3">
                                <div>
                                    <label className="label">Name</label>
                                    <input
                                        className="input"
                                        value={ex.name}
                                        onChange={(e) => updateExercise(idx, { name: e.target.value })}
                                        placeholder="e.g., Bench press"
                                        disabled={editBusy}
                                    />
                                </div>

                                <div>
                                    <label className="label">Reps</label>
                                    <input
                                        className="input"
                                        value={ex.reps}
                                        onChange={(e) => updateExercise(idx, { reps: e.target.value })}
                                        placeholder="e.g., 10-12 or 10"
                                        disabled={editBusy}
                                        style={repsBad ? { borderColor: "var(--brand)" } : undefined}
                                    />
                                    {repsBad ? (
                                        <div style={{ marginTop: "0.35rem", fontWeight: 800, color: "var(--muted)" }}>
                                            Bad reps format. Use 10-12 or 10.
                                        </div>
                                    ) : null}
                                </div>

                                <div>
                                    <label className="label">RPE</label>
                                    <input
                                        className="input"
                                        value={ex.rpe}
                                        onChange={(e) => updateExercise(idx, { rpe: e.target.value })}
                                        placeholder="e.g., 8"
                                        disabled={editBusy}
                                    />
                                </div>
                            </div>

                            <div style={{ height: "0.75rem" }} />

                            <div className="grid grid--2">
                                <div>
                                    <label className="label">Warmup sets</label>
                                    <input
                                        className="input"
                                        value={ex.warmup_sets}
                                        onChange={(e) => updateExercise(idx, { warmup_sets: e.target.value })}
                                        placeholder="e.g., 2"
                                        disabled={editBusy}
                                    />
                                </div>
                                <div>
                                    <label className="label">Working sets</label>
                                    <input
                                        className="input"
                                        value={ex.working_sets}
                                        onChange={(e) => updateExercise(idx, { working_sets: e.target.value })}
                                        placeholder="e.g., 3"
                                        disabled={editBusy}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            
        </div>
    );
}
