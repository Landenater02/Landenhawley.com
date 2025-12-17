// src/pages/LandenApps/LandenLifts/Setup/Setup.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../supabaseClient";

function toIntOrNull(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function toFloatOrNull(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
}

function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function uniqById(list) {
    const seen = new Set();
    const out = [];
    for (const r of list || []) {
        if (!r || !r.id) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push(r);
    }
    return out;
}

export default function Setup() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState({ type: "", msg: "" }); // error|ok|info

    const [user, setUser] = useState(null);
    const [info, setInfo] = useState(null); // { user_id, body_weight, active_split, current_day }

    const [split, setSplit] = useState(null); // {id,name,days_per_week}

    // NEW: split days + selected day
    const [days, setDays] = useState([]); // [{id, day, name}]
    const [selectedDayId, setSelectedDayId] = useState("");

    // exercises are now filtered by selected day
    const [exercises, setExercises] = useState([]); // split_exercises rows for selected day

    const [bodyWeightDraft, setBodyWeightDraft] = useState("");

    // max drafts keyed by exercise id: { weight: "", reps: "", date: "YYYY-MM-DD" }
    const [maxDrafts, setMaxDrafts] = useState({});

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setStatus({ type: "", msg: "" });

            try {
                const userRes = await supabase.auth.getUser();
                if (userRes.error) throw userRes.error;

                const u = userRes.data?.user ?? null;
                if (!u) throw new Error("Not signed in.");
                if (cancelled) return;

                setUser(u);

                // Ensure user_info exists
                const up = await supabase
                    .from("landenlifts_user_info")
                    .upsert({ user_id: u.id }, { onConflict: "user_id" });
                if (up.error) throw up.error;

                // Load user_info
                const infoRes = await supabase
                    .from("landenlifts_user_info")
                    .select("user_id, body_weight, active_split, current_day")
                    .eq("user_id", u.id)
                    .maybeSingle();
                if (infoRes.error) throw infoRes.error;

                const inf = infoRes.data || null;
                if (cancelled) return;

                setInfo(inf);
                setBodyWeightDraft(inf?.body_weight == null ? "" : String(inf.body_weight));

                if (!inf?.active_split) {
                    setSplit(null);
                    setDays([]);
                    setSelectedDayId("");
                    setExercises([]);
                    setMaxDrafts({});
                    setStatus({ type: "info", msg: "Pick a split first (Splits tab), then come back to Setup." });
                    return;
                }

                // Split
                const splitRes = await supabase
                    .from("landenlifts_split")
                    .select("id, name, days_per_week")
                    .eq("id", inf.active_split)
                    .single();
                if (splitRes.error) throw splitRes.error;

                if (cancelled) return;
                setSplit(splitRes.data);

                // Days (for selector)
                const daysRes = await supabase
                    .from("landenlifts_split_days")
                    .select("id, day, name")
                    .eq("split", inf.active_split)
                    .order("day", { ascending: true });
                if (daysRes.error) throw daysRes.error;

                const dayList = daysRes.data || [];
                if (!dayList.length) {
                    setDays([]);
                    setSelectedDayId("");
                    setExercises([]);
                    setMaxDrafts({});
                    setStatus({ type: "info", msg: "No days found for this split yet. Create days in Split Editor." });
                    return;
                }

                if (cancelled) return;
                setDays(dayList);

                // Default selected day:
                // - prefer user_info.current_day if it exists
                // - otherwise first day
                const curDayNum = toIntOrNull(inf?.current_day);
                const match = curDayNum ? dayList.find((d) => d.day === curDayNum) : null;
                setSelectedDayId((match?.id || dayList[0]?.id) ?? "");
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load setup." });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    // Load exercises for selected day (and prefill max drafts for those exercises)
    useEffect(() => {
        let cancelled = false;

        async function runDayExercises() {
            if (!user || !info?.active_split || !selectedDayId) return;

            setStatus((prev) => (prev?.type === "error" ? prev : { type: "", msg: "" }));

            try {
                // get exercises for selected day only
                const exRes = await supabase
                    .from("landenlifts_split_exercises")
                    .select("id, name, split_day, order_index")
                    .eq("split_day", selectedDayId)
                    .order("order_index", { ascending: true });

                if (exRes.error) throw exRes.error;

                const exList = uniqById(exRes.data || []);
                if (cancelled) return;

                setExercises(exList);

                // Prefill max drafts for these exercises (merge; don't wipe other days' drafts)
                const fallbackDate = todayISODate();
                const exIds = exList.map((e) => e.id).filter(Boolean);

                let maxByLiftId = {};
                if (exIds.length) {
                    const maxRes = await supabase
                        .from("landenlifts_lifts")
                        .select("lift, weight, reps, created_at")
                        .eq("user_id", user.id)
                        .in("lift", exIds)
                        .order("lift", { ascending: true })
                        .order("weight", { ascending: false })
                        .order("reps", { ascending: false })
                        .limit(5000);

                    if (maxRes.error) throw maxRes.error;

                    const seenLift = new Set();
                    for (const row of maxRes.data || []) {
                        const liftId = row.lift;
                        if (!liftId) continue;
                        if (seenLift.has(liftId)) continue;
                        seenLift.add(liftId);
                        maxByLiftId[liftId] = row;
                    }
                }

                setMaxDrafts((prev) => {
                    const next = { ...(prev || {}) };
                    for (const ex of exList) {
                        // preserve whatever user already typed for this exercise
                        if (next[ex.id]) continue;

                        const m = maxByLiftId[ex.id];
                        const created = m?.created_at ? String(m.created_at).slice(0, 10) : "";
                        next[ex.id] = {
                            weight: m?.weight != null ? String(m.weight) : "",
                            reps: m?.reps != null ? String(m.reps) : "1",
                            date: created || fallbackDate,
                        };
                    }
                    return next;
                });
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load exercises for day." });
            }
        }

        runDayExercises();
        return () => {
            cancelled = true;
        };
    }, [user, info?.active_split, selectedDayId]);

    const canSaveBodyWeight = useMemo(() => {
        if (!user) return false;
        const bw = toFloatOrNull(bodyWeightDraft);
        if (bw == null) return false;
        if (bw <= 0 || bw > 1000) return false;
        return true;
    }, [user, bodyWeightDraft]);

    const anyMaxFilled = useMemo(() => {
        // only consider maxes for currently displayed exercises
        for (const ex of exercises || []) {
            const row = maxDrafts?.[ex.id];
            const w = toIntOrNull(row?.weight);
            if (w && w > 0) return true;
        }
        return false;
    }, [maxDrafts, exercises]);

    function updateMaxDraft(exId, patch) {
        setMaxDrafts((prev) => ({
            ...(prev || {}),
            [exId]: { ...(prev?.[exId] || {}), ...patch },
        }));
    }

    async function saveBodyWeight() {
        if (!user) return;
        if (!canSaveBodyWeight) {
            setStatus({ type: "error", msg: "Enter a valid body weight first." });
            return;
        }

        setBusy(true);
        setStatus({ type: "info", msg: "Saving body weight..." });

        try {
            const bw = toFloatOrNull(bodyWeightDraft);

            const upd = await supabase
                .from("landenlifts_user_info")
                .update({ body_weight: bw })
                .eq("user_id", user.id);
            if (upd.error) throw upd.error;

            setInfo((prev) => ({ ...(prev || {}), body_weight: bw }));
            setStatus({ type: "ok", msg: "Body weight saved." });
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Failed to save body weight." });
        } finally {
            setBusy(false);
        }
    }

    async function saveMaxesToLifts() {
        if (!user) return;
        if (!split) {
            setStatus({ type: "error", msg: "No active split found. Pick a split first." });
            return;
        }
        if (!selectedDayId) {
            setStatus({ type: "error", msg: "Pick a day first." });
            return;
        }

        // Only save maxes for exercises shown (selected day)
        const payload = [];
        for (const ex of exercises || []) {
            const d = maxDrafts?.[ex.id];
            const w = toIntOrNull(d?.weight);
            if (!w || w <= 0) continue;

            const reps = toIntOrNull(d?.reps) || 1;
            const date = String(d?.date || todayISODate());

            payload.push({
                lift: ex.id,
                user_id: user.id,
                weight: w,
                reps,
                __date: date,
            });
        }

        if (!payload.length) {
            setStatus({ type: "error", msg: "Enter at least one max weight for this day to save." });
            return;
        }

        setBusy(true);
        setStatus({ type: "info", msg: "Saving maxes..." });

        try {
            const byDate = {};
            for (const row of payload) {
                const d = row.__date;
                if (!byDate[d]) byDate[d] = [];
                byDate[d].push(row);
            }

            for (const date of Object.keys(byDate)) {
                // Attach to the SELECTED day (not current_day)
                const splitDayId = selectedDayId;

                // Look for an open session for this split + selected day + date
                const sessFind = await supabase
                    .from("landenlifts_session")
                    .select("id, user_id, split_id, split_day_id, started_at, completed_at")
                    .eq("user_id", user.id)
                    .eq("split_id", split.id)
                    .eq("split_day_id", splitDayId)
                    .eq("started_at", date)
                    .is("completed_at", null)
                    .order("started_at", { ascending: false })
                    .limit(1);

                if (sessFind.error) throw sessFind.error;

                let sessId = sessFind.data?.[0]?.id || null;

                if (!sessId) {
                    // derive numeric day for the session row
                    const selDayNum =
                        days.find((d) => d.id === selectedDayId)?.day ??
                        (toIntOrNull(info?.current_day) || 1);

                    const sessIns = await supabase
                        .from("landenlifts_session")
                        .insert({
                            user_id: user.id,
                            split_id: split.id,
                            day: selDayNum,
                            split_day_id: splitDayId,
                            started_at: date,
                        })
                        .select("id")
                        .single();
                    if (sessIns.error) throw sessIns.error;
                    sessId = sessIns.data.id;
                }

                const liftsRows = byDate[date].map((r) => ({
                    user_id: r.user_id,
                    lift: r.lift,
                    weight: r.weight,
                    reps: r.reps,
                    session: sessId,
                }));

                const ins = await supabase.from("landenlifts_lifts").insert(liftsRows);
                if (ins.error) throw ins.error;
            }

            setStatus({ type: "ok", msg: "Maxes saved to lifts. You can go to Dashboard now." });
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Failed to save maxes." });
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="card">Loading...</div>;

    if (!user) {
        return (
            <div className="card">
                <h2 style={{ marginBottom: "0.75rem" }}>Not signed in</h2>
                <p className="lead">Sign in first, then come back here.</p>
            </div>
        );
    }

    return (
        <div className="stack">
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ marginBottom: "0.25rem" }}>Setup</h2>
                        <p className="lead" style={{ marginBottom: 0 }}>
                            Set your body weight and enter maxes.
                        </p>
                    </div>
                </div>

                {status.msg ? (
                    <p style={{ marginTop: "0.75rem", marginBottom: 0, fontWeight: 800, color: "var(--muted)" }}>
                        {status.msg}
                    </p>
                ) : null}
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Body weight</h3>

                <div className="grid grid--2" style={{ alignItems: "end" }}>
                    <div>
                        <label className="label">Body weight (lbs)</label>
                        <input
                            className="input"
                            value={bodyWeightDraft}
                            onChange={(e) => setBodyWeightDraft(e.target.value)}
                            placeholder="e.g., 180"
                            disabled={busy}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn--primary" onClick={saveBodyWeight} disabled={busy || !canSaveBodyWeight}>
                            {busy ? "Saving..." : "Save body weight"}
                        </button>
                    </div>
                </div>

                <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--muted)", fontWeight: 800 }}>
                    Current saved: <strong>{info?.body_weight == null ? "-" : String(info.body_weight)}</strong> lbs
                </p>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Exercise maxes</h3>

                {!info?.active_split ? (
                    <p className="lead">No active split yet. Go to Splits and choose one first.</p>
                ) : (
                    <>
                        <p style={{ marginTop: 0, color: "var(--muted)", fontWeight: 800 }}>
                            Active split: <strong>{split?.name || info.active_split}</strong>
                        </p>

                        {/* NEW: Day selector */}
                        {days.length ? (
                            <div className="grid grid--2" style={{ alignItems: "end" }}>
                                <div>
                                    <label className="label">Day to set maxes for</label>
                                    <select
                                        className="select"
                                        value={selectedDayId}
                                        onChange={(e) => setSelectedDayId(e.target.value)}
                                        disabled={busy}
                                    >
                                        {days.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name ? `${d.name}` : `Day ${d.day}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                               
                            </div>
                        ) : null}

                        <div style={{ height: 12 }} />

                        {days.length && !selectedDayId ? (
                            <p className="lead">Pick a day above.</p>
                        ) : exercises.length === 0 ? (
                            <p className="lead">No exercises found for this day yet. Add exercises in Split Editor first.</p>
                        ) : (
                            <div className="stack" style={{ gap: 10 }}>
                                {exercises.map((ex) => {
                                    const d = maxDrafts?.[ex.id] || { weight: "", reps: "1", date: todayISODate() };
                                    return (
                                        <div key={ex.id} className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                                <div style={{ fontWeight: 900 }}>{ex.name}</div>
                                            </div>

                                            <div style={{ height: 10 }} />

                                            <div className="grid grid--3" style={{ alignItems: "end" }}>
                                                <div>
                                                    <label className="label">Max weight</label>
                                                    <input
                                                        className="input"
                                                        value={d.weight}
                                                        onChange={(e) => updateMaxDraft(ex.id, { weight: e.target.value })}
                                                        placeholder="e.g., 225"
                                                        disabled={busy}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="label">Reps</label>
                                                    <input
                                                        className="input"
                                                        value={d.reps}
                                                        onChange={(e) => updateMaxDraft(ex.id, { reps: e.target.value })}
                                                        placeholder="1"
                                                        disabled={busy}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="label">Date</label>
                                                    <input
                                                        className="input"
                                                        value={d.date}
                                                        onChange={(e) => updateMaxDraft(ex.id, { date: e.target.value })}
                                                        placeholder={todayISODate()}
                                                        disabled={busy}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ height: 12 }} />

                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={saveMaxesToLifts}
                                disabled={busy || !anyMaxFilled || exercises.length === 0 || !selectedDayId}
                            >
                                {busy ? "Saving..." : "Save maxes"}
                            </button>
                        </div>

                        <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--muted)", fontWeight: 800 }}>
                            This information will be used to estimate the amount of weight to suggest on your Dashboard.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
