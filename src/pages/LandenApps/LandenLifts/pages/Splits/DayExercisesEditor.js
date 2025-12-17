import React, { useMemo, useRef, useState } from "react";

export default function DayExercisesEditor({
    dayLoading,
    editBusy,
    selectedDay,
    selectedDayNameDraft,
    setSelectedDayNameDraft,
    exerciseDrafts,
    setExerciseDrafts,
    onSaveDay,
}) {
    // ====== helpers ======
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
        return {
            id: null,
            name: "",
            reps: "",
            rpe: "",
            warmup_sets: "",
            working_sets: "",
            order_index: nextOrderIndex,
        };
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

    // ====== drag & drop state ======
    const [dragIdx, setDragIdx] = useState(null);
    const [overIdx, setOverIdx] = useState(null);

    // stable keys for draft rows (so drag doesn't glitch when reordering)
    const keyMapRef = useRef(new Map());
    const getRowKey = (ex, idx) => {
        if (ex?.id) return `id:${ex.id}`;
        const m = keyMapRef.current;
        if (!m.has(ex)) m.set(ex, `tmp:${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`);
        return m.get(ex);
    };

    function reorder(from, to) {
        if (from === to || from == null || to == null) return;
        setExerciseDrafts((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return normalizeOrder(next);
        });
    }

    function onDropAt(targetIdx) {
        if (editBusy) return;
        if (dragIdx == null) return;
        reorder(dragIdx, targetIdx);
        setDragIdx(null);
        setOverIdx(null);
    }

    const canSave = useMemo(() => {
        if (editBusy) return false;
        if (!selectedDay) return false;
        const dn = String(selectedDayNameDraft || "").trim();
        if (!dn) return false;
        return true;
    }, [editBusy, selectedDay, selectedDayNameDraft]);

    if (dayLoading) return <p className="lead">Loading day...</p>;

    return (
        <div className="inner-card ll-sets">
            {/* ====== Day header ====== */}
            <div className="ll-header-row">
                <div className="ll-header-left">
                    <label className="label">Selected day name</label>
                    <input
                        className="input"
                        value={selectedDayNameDraft}
                        onChange={(e) => setSelectedDayNameDraft(e.target.value)}
                        disabled={editBusy}
                    />
                </div>

                <div className="ll-header-right ll-actions" style={{ justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={onSaveDay}
                        disabled={!canSave}
                        title="Save day"
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="ll-divider" />

            {/* ====== Exercises header ====== */}
            <div className="ll-card-title-row">
                <h3 className="ll-card-title" style={{ margin: 0 }}>
                    Exercises
                </h3>

                <div className="ll-actions">
                    <button
                        type="button"
                        className="btn"
                        onClick={addExerciseRow}
                        disabled={editBusy}
                        aria-label="Add exercise"
                        title="Add exercise"
                    >
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="stack">
                {exerciseDrafts.map((ex, idx) => {
                    const repsBad = ex.reps && !parseRepsString(ex.reps).ok;

                    const isDragging = dragIdx === idx;
                    const isOver = overIdx === idx;

                    return (
                        <div
                            key={getRowKey(ex, idx)}
                            className={`card ${isDragging ? "sv-dragging" : ""} ${isOver ? "sv-over" : ""}`}
                            style={{ boxShadow: "none", border: "1px solid var(--border)" }}
                            draggable={!editBusy}
                            onDragStart={(e) => {
                                if (editBusy) return;
                                setDragIdx(idx);
                                setOverIdx(idx);
                                try {
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(idx));
                                } catch { }
                            }}
                            onDragOver={(e) => {
                                if (editBusy) return;
                                e.preventDefault(); // required to allow drop
                                if (overIdx !== idx) setOverIdx(idx);
                            }}
                            onDragEnter={(e) => {
                                if (editBusy) return;
                                e.preventDefault();
                                if (overIdx !== idx) setOverIdx(idx);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                onDropAt(idx);
                            }}
                            onDragEnd={() => {
                                setDragIdx(null);
                                setOverIdx(null);
                            }}
                        >
                            {/* top row */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                                    <div className="ll-pill" title="Drag to reorder">
                                        <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                                    </div>
                                    <div style={{ fontWeight: 800 }}>#{idx + 1}</div>
                                   
                                </div>

                                <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => moveExercise(idx, -1)}
                                        disabled={idx === 0 || editBusy}
                                        aria-label="Move up"
                                        title="Move up"
                                    >
                                        <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                                    </button>

                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => moveExercise(idx, 1)}
                                        disabled={idx === exerciseDrafts.length - 1 || editBusy}
                                        aria-label="Move down"
                                        title="Move down"
                                    >
                                        <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                                    </button>

                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => removeExerciseRow(idx)}
                                        disabled={editBusy}
                                        aria-label="Remove exercise"
                                        title="Remove exercise"
                                    >
                                        <i className="fa-solid fa-trash" aria-hidden="true" />
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
