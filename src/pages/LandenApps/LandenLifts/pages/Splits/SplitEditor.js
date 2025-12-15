import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../../supabaseClient";
import DayExercisesEditor from "./DayExercisesEditor";

function newClientId() {
    return "ex_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function repsStringToRange(repsStr) {
    const raw = String(repsStr || "").trim();
    if (!raw) return { start: null, end: null, ok: true };

    const cleaned = raw.replace(/\s+/g, "").replace(/–/g, "-").replace(/—/g, "-");

    if (/^\d+$/.test(cleaned)) {
        const n = Number(cleaned);
        return Number.isFinite(n) ? { start: n, end: n, ok: true } : { ok: false };
    }

    if (/^\d+-\d+$/.test(cleaned)) {
        const [aStr, bStr] = cleaned.split("-");
        const a = Number(aStr);
        const b = Number(bStr);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return { ok: false };
        return { start: a, end: b, ok: true };
    }

    return { ok: false };
}

function toIntOrNull(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function toText(v) {
    return String(v ?? "");
}

/**
 * Props expected:
 * - splitId: uuid
 * - onClose: () => void
 * - onDeleted: (deletedSplitId: string) => void   (optional)
 */
export default function EditSplit({ splitId, onClose, onDeleted }) {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);

    const [split, setSplit] = useState(null);
    const [isOwner, setIsOwner] = useState(false);

    const [splitNameDraft, setSplitNameDraft] = useState("");

    const [days, setDays] = useState([]); // [{id, day, name}]
    const [selectedDayId, setSelectedDayId] = useState("");
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedDayNameDraft, setSelectedDayNameDraft] = useState("");

    const [exerciseDrafts, setExerciseDrafts] = useState([]);

    const dayLoading = useMemo(() => loading || (splitId && !split), [loading, splitId, split]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setErr("");

            try {
                const uRes = await supabase.auth.getUser();
                if (uRes.error) throw uRes.error;
                const u = uRes.data?.user ?? null;
                if (!u) throw new Error("Not signed in.");
                if (cancelled) return;
                setUser(u);

                const sRes = await supabase
                    .from("landenlifts_split")
                    .select("id, name, user_id, days_per_week")
                    .eq("id", splitId)
                    .single();

                if (sRes.error) throw sRes.error;

                if (cancelled) return;
                setSplit(sRes.data);
                setSplitNameDraft(sRes.data?.name ?? "");

                const owner = sRes.data?.user_id === u.id;
                setIsOwner(owner);

                const dRes = await supabase
                    .from("landenlifts_split_days")
                    .select("id, day, name, split, user_id")
                    .eq("split", splitId)
                    .order("day", { ascending: true });

                if (dRes.error) throw dRes.error;

                let dayRows = dRes.data || [];
                const dpw = sRes.data?.days_per_week;

                if (dayRows.length === 0 && dpw && dpw >= 1 && dpw <= 7) {
                    const createDays = Array.from({ length: dpw }, (_, i) => ({
                        split: splitId,
                        day: i + 1,
                        name: `Day ${i + 1}`,
                        user_id: u.id
                    }));

                    const insDays = await supabase
                        .from("landenlifts_split_days")
                        .insert(createDays)
                        .select("id, day, name, split, user_id");

                    if (insDays.error) throw insDays.error;
                    dayRows = insDays.data || [];
                }

                if (cancelled) return;
                setDays(dayRows);

                const firstDayId = dayRows[0]?.id ?? "";
                setSelectedDayId(firstDayId);
            } catch (e) {
                console.error(e);
                if (!cancelled) setErr(e?.message || "Failed to load split.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        if (!splitId) {
            setLoading(false);
            setSplit(null);
            setDays([]);
            setSelectedDayId("");
            return () => {
                cancelled = true;
            };
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [splitId]);

    // When selected day changes, load day + exercises
    useEffect(() => {
        let cancelled = false;

        async function runDay() {
            setErr("");

            if (!selectedDayId) {
                setSelectedDay(null);
                setSelectedDayNameDraft("");
                setExerciseDrafts([]);
                return;
            }

            try {
                const dayRow = days.find((d) => d.id === selectedDayId) || null;
                if (cancelled) return;

                setSelectedDay(dayRow);
                setSelectedDayNameDraft(dayRow?.name ?? "");

                const exRes = await supabase
                    .from("landenlifts_split_exercises")
                    .select("id, name, rep_range_start, rep_range_end, rpe, split_day, order_index, user_id, warmup_sets, working_sets")
                    .eq("split_day", selectedDayId)
                    .order("order_index", { ascending: true });

                if (exRes.error) throw exRes.error;

                const mapped = (exRes.data || []).map((r) => {
                    let reps = "";
                    if (r.rep_range_start != null && r.rep_range_end != null) {
                        reps =
                            r.rep_range_start === r.rep_range_end
                                ? String(r.rep_range_start)
                                : `${r.rep_range_start}-${r.rep_range_end}`;
                    }
                    return {
                        id: r.id,
                        client_id: newClientId(),
                        name: r.name ?? "",
                        reps,
                        rpe: r.rpe == null ? "" : String(r.rpe),
                        warmup_sets: r.warmup_sets == null ? "" : String(r.warmup_sets),
                        working_sets: r.working_sets == null ? "" : String(r.working_sets),
                        order_index: r.order_index ?? 1
                    };
                });

                if (!cancelled) {
                    setExerciseDrafts(
                        mapped.length
                            ? mapped
                            : [{ id: null, client_id: newClientId(), name: "", reps: "", rpe: "", warmup_sets: "", working_sets: "", order_index: 1 }]
                    );
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setErr(e?.message || "Failed to load day.");
            }
        }

        runDay();
        return () => {
            cancelled = true;
        };
    }, [selectedDayId, days]);

    const canSave = useMemo(() => {
        if (!isOwner) return false;
        if (!split) return false;
        if (!selectedDay) return false;

        for (const ex of exerciseDrafts || []) {
            if (!ex.reps) continue;
            const parsed = repsStringToRange(ex.reps);
            if (!parsed.ok) return false;
        }

        return true;
    }, [isOwner, split, selectedDay, exerciseDrafts]);

    async function handleSaveAll() {
        if (!user || !split || !selectedDay) return;
        if (!isOwner) {
            setErr("You can only edit splits you own.");
            return;
        }

        setBusy(true);
        setErr("");

        try {
            // 1) Save split name
            const name = (splitNameDraft || "").trim();
            if (!name) throw new Error("Split name is required.");

            const updSplit = await supabase
                .from("landenlifts_split")
                .update({ name })
                .eq("id", split.id)
                .eq("user_id", user.id);

            if (updSplit.error) throw updSplit.error;

            // 2) Save selected day name
            const dayName = (selectedDayNameDraft || "").trim();
            if (!dayName) throw new Error("Day name is required.");

            const updDay = await supabase
                .from("landenlifts_split_days")
                .update({ name: dayName })
                .eq("id", selectedDay.id)
                .eq("split", split.id);

            if (updDay.error) throw updDay.error;

            // 3) Save exercises: insert/update, and delete removed
            const existingRes = await supabase
                .from("landenlifts_split_exercises")
                .select("id")
                .eq("split_day", selectedDay.id);

            if (existingRes.error) throw existingRes.error;

            const existingIds = new Set((existingRes.data || []).map((r) => r.id));
            const keptIds = new Set((exerciseDrafts || []).filter((e) => e.id).map((e) => e.id));

            const toDelete = [];
            existingIds.forEach((id) => {
                if (!keptIds.has(id)) toDelete.push(id);
            });

            if (toDelete.length) {
                const delRes = await supabase
                    .from("landenlifts_split_exercises")
                    .delete()
                    .in("id", toDelete)
                    .eq("split_day", selectedDay.id);

                if (delRes.error) throw delRes.error;
            }

            const payload = (exerciseDrafts || [])
                .map((ex, i) => {
                    const nm = (ex.name || "").trim();
                    if (!nm) return null;

                    const parsed = repsStringToRange(ex.reps);
                    if (!parsed.ok) throw new Error(`Bad reps format for "${nm}". Use 10 or 10-12.`);

                    return {
                        ...(ex.id ? { id: ex.id } : {}),
                        user_id: user.id,
                        split_day: selectedDay.id,
                        name: nm,
                        rep_range_start: parsed.start,
                        rep_range_end: parsed.end,
                        rpe: toIntOrNull(ex.rpe),
                        warmup_sets: toIntOrNull(ex.warmup_sets),
                        working_sets: toIntOrNull(ex.working_sets),
                        order_index: i + 1
                    };
                })
                .filter(Boolean);

            if (payload.length) {
                const upRes = await supabase
                    .from("landenlifts_split_exercises")
                    .upsert(payload, { onConflict: "id" });

                if (upRes.error) throw upRes.error;
            }

            setSplit((prev) => ({ ...prev, name }));
            setDays((prev) => prev.map((d) => (d.id === selectedDay.id ? { ...d, name: dayName } : d)));
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to save.");
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteSplit() {
        if (!user || !split) return;
        if (!isOwner) {
            setErr("You can only delete splits you own.");
            return;
        }

        const ok = window.confirm("Delete this split? This will remove its days and exercises too.");
        if (!ok) return;

        setBusy(true);
        setErr("");

        try {
            const dayIds = (days || []).map((d) => d.id).filter(Boolean);

            if (dayIds.length) {
                const delEx = await supabase.from("landenlifts_split_exercises").delete().in("split_day", dayIds);
                if (delEx.error) throw delEx.error;

                const delDays = await supabase.from("landenlifts_split_days").delete().eq("split", split.id);
                if (delDays.error) throw delDays.error;
            }

            const delAuth = await supabase.from("landenlifts_split_authority").delete().eq("split_id", split.id);
            if (delAuth.error) throw delAuth.error;

            const delSplit = await supabase.from("landenlifts_split").delete().eq("id", split.id).eq("user_id", user.id);
            if (delSplit.error) throw delSplit.error;

            if (onDeleted) onDeleted(split.id);
            onClose();
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to delete split.");
        } finally {
            setBusy(false);
        }
    }

  

    if (loading) {
        return (
            <div className="card">
                <h2>Edit Split</h2>
                <p className="lead">Loading...</p>
            </div>
        );
    }

    if (!split) {
        return (
            <div className="card">
                <h2>Edit Split</h2>
                <p className="lead">Split not found.</p>
                <button type="button" className="btn" onClick={onClose}>
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ marginBottom: "0.25rem" }}>Edit Split</h2>
                    <p className="lead" style={{ marginBottom: 0 }}>
                        You are editing <strong>{split.name}</strong>.
                        {!isOwner ? <> <span style={{ fontWeight: 800, color: "var(--muted)" }}>(read-only)</span></> : null}
                    </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn--primary" onClick={handleSaveAll} disabled={!canSave || busy}>
                        {busy ? "Saving..." : "Save"}
                    </button>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Close
                    </button>
                    <button type="button" className="btn" onClick={handleDeleteSplit} disabled={!isOwner || busy}>
                        Delete split
                    </button>
                </div>
            </div>

            {err ? (
                <p style={{ marginTop: "0.75rem", marginBottom: 0, fontWeight: 800, color: "var(--muted)" }}>
                    {err}
                </p>
            ) : null}

            <div style={{ height: "1rem" }} />

            {/* Split name + Day selector in a single row, aligned */}
            <div
                style={{
                    display: "flex",
                    gap: "1.25rem",
                    alignItems: "flex-start",
                    flexWrap: "wrap"
                }}
            >
                <div style={{ flex: "1 1 420px", minWidth: 320 }}>
                    <label className="label">Split name</label>
                    <input
                        className="input"
                        value={splitNameDraft}
                        onChange={(e) => setSplitNameDraft(e.target.value)}
                        disabled={!isOwner || busy}
                    />
                    <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                        Tip: edit name then hit <strong>Save</strong>.
                    </p>
                    {split.days_per_week ? (
                        <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                            Days per week: <strong>{split.days_per_week}</strong>
                        </p>
                    ) : null}
                </div>

                <div style={{ flex: "1 1 420px", minWidth: 320 }}>
                    <label className="label">Day to edit</label>
                    <select
                        className="select"
                        value={selectedDayId}
                        onChange={(e) => setSelectedDayId(e.target.value)}
                        disabled={busy || !days.length}
                    >
                        {days.length ? (
                            days.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {`${toText(d.name)}`}
                                </option>
                            ))
                        ) : (
                            <option value="">No days found</option>
                        )}
                    </select>
                </div>
            </div>

            <div style={{ height: "1rem" }} />

            <DayExercisesEditor
                dayLoading={dayLoading}
                editBusy={busy || !isOwner}
                selectedDay={selectedDay}
                selectedDayNameDraft={selectedDayNameDraft}
                setSelectedDayNameDraft={setSelectedDayNameDraft}
                exerciseDrafts={exerciseDrafts}
                setExerciseDrafts={setExerciseDrafts}
                
            />
        </div>
    );
}
