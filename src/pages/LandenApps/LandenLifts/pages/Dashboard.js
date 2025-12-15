// src/pages/LandenApps/LandenLifts/Dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../../../../supabaseClient";

function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function toInt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function roundToNearest5(n) {
    if (!Number.isFinite(n)) return null;
    return Math.round(n / 5) * 5;
}

// Epley 1RM estimate
function e1rm(weight, reps) {
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
    return w * (1 + r / 30);
}

// Approx RPE chart: percent of 1RM for reps at a given RPE (integer RPE 6-10)
const RPE_PERCENT = {
    10: { 1: 1.0, 2: 0.955, 3: 0.922, 4: 0.892, 5: 0.863, 6: 0.837, 7: 0.811, 8: 0.786, 9: 0.762, 10: 0.739, 11: 0.716, 12: 0.694 },
    9: { 1: 0.955, 2: 0.922, 3: 0.892, 4: 0.863, 5: 0.837, 6: 0.811, 7: 0.786, 8: 0.762, 9: 0.739, 10: 0.716, 11: 0.694, 12: 0.672 },
    8: { 1: 0.922, 2: 0.892, 3: 0.863, 4: 0.837, 5: 0.811, 6: 0.786, 7: 0.762, 8: 0.739, 9: 0.716, 10: 0.694, 11: 0.672, 12: 0.651 },
    7: { 1: 0.892, 2: 0.863, 3: 0.837, 4: 0.811, 5: 0.786, 6: 0.762, 7: 0.739, 8: 0.716, 9: 0.694, 10: 0.672, 11: 0.651, 12: 0.63 },
    6: { 1: 0.863, 2: 0.837, 3: 0.811, 4: 0.786, 5: 0.762, 6: 0.739, 7: 0.716, 8: 0.694, 9: 0.672, 10: 0.651, 11: 0.63, 12: 0.61 }
};

function percentFromRpeReps(rpe, reps) {
    const rr = toInt(rpe);
    const rp = toInt(reps);
    if (!rr || !rp) return null;
    const table = RPE_PERCENT[rr];
    if (!table) return null;
    if (rp < 1) return null;
    if (rp > 12) return table[12];
    return table[rp] ?? null;
}

function repsTargetFromRange(ex) {
    const a = ex?.rep_range_start;
    const b = ex?.rep_range_end;
    if (typeof b === "number" && Number.isFinite(b) && b > 0) return b;
    if (typeof a === "number" && Number.isFinite(a) && a > 0) return a;
    return null;
}

function repsRangeLabel(ex) {
    const a = ex?.rep_range_start;
    const b = ex?.rep_range_end;
    if (a && b) return `${a}-${b}`;
    if (a) return String(a);
    if (b) return String(b);
    return "-";
}

function warmupPlan(topSetWeight, warmupSets) {
    const w = Number(topSetWeight);
    const n = toInt(warmupSets) || 0;
    if (!Number.isFinite(w) || w <= 0 || n <= 0) return [];

    const templates = {
        1: [{ pct: 0.6, reps: 5 }],
        2: [{ pct: 0.5, reps: 5 }, { pct: 0.7, reps: 3 }],
        3: [{ pct: 0.4, reps: 5 }, { pct: 0.6, reps: 3 }, { pct: 0.75, reps: 2 }],
        4: [{ pct: 0.4, reps: 5 }, { pct: 0.6, reps: 3 }, { pct: 0.75, reps: 2 }, { pct: 0.85, reps: 1 }]
    };

    const plan = templates[Math.min(n, 4)] || [];
    return plan.map((p) => ({
        weight: roundToNearest5(w * p.pct),
        reps: p.reps
    }));
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState({ type: "", msg: "" }); // error|ok|info

    const [user, setUser] = useState(null);
    const [info, setInfo] = useState(null);

    const [split, setSplit] = useState(null);
    const [days, setDays] = useState([]);
    const [selectedDayId, setSelectedDayId] = useState("");

    const [exercises, setExercises] = useState([]);
    const [currentExerciseId, setCurrentExerciseId] = useState("");

    const [session, setSession] = useState(null);
    const [dayLifts, setDayLifts] = useState([]);

    const [workInputsByExercise, setWorkInputsByExercise] = useState({});
    const [maxByExercise, setMaxByExercise] = useState({});

    const loadingRef = useRef(false);

    const selectedDay = useMemo(() => days.find((d) => d.id === selectedDayId) || null, [days, selectedDayId]);
    const currentExercise = useMemo(() => exercises.find((e) => e.id === currentExerciseId) || null, [exercises, currentExerciseId]);

    const liftsByExercise = useMemo(() => {
        const map = {};
        for (const l of dayLifts || []) {
            const exId = l.lift;
            if (!map[exId]) map[exId] = [];
            map[exId].push(l);
        }
        return map;
    }, [dayLifts]);

    const isExerciseCompleted = useMemo(() => {
        const out = {};
        for (const ex of exercises || []) {
            const needed = toInt(ex.working_sets) || 1;
            const logged = (liftsByExercise[ex.id] || []).length;
            out[ex.id] = logged >= needed;
        }
        return out;
    }, [exercises, liftsByExercise]);

    const recommendation = useMemo(() => {
        if (!currentExercise) return { topSet: null, warmups: [], repsTarget: null, pct: null, maxE1rm: null };

        const repsT = repsTargetFromRange(currentExercise);
        const rpeT = currentExercise?.rpe ?? null;

        const maxRow = maxByExercise[currentExercise.id] || null;
        const maxE = maxRow?.e1rm ?? null;

        const pct = percentFromRpeReps(rpeT, repsT);
        const topSet = (maxE && pct) ? roundToNearest5(maxE * pct) : null;

        const warms = warmupPlan(topSet, currentExercise.warmup_sets);

        return { topSet, warmups: warms, repsTarget: repsT, pct, maxE1rm: maxE };
    }, [currentExercise, maxByExercise]);

    function ensureInputsForExercise(exerciseId) {
        const ex = exercises.find((e) => e.id === exerciseId);
        if (!ex) return;

        setWorkInputsByExercise((prev) => {
            if (prev[exerciseId]) return prev;

            const ws = toInt(ex.working_sets) || 0;
            const count = ws > 0 ? ws : 1;

            const repsT = repsTargetFromRange(ex);
            const rows = Array.from({ length: count }, () => ({
                weight: "",
                reps: repsT ? String(repsT) : ""
            }));

            return { ...prev, [exerciseId]: rows };
        });
    }

    async function fetchMaxForExercise(exerciseId, userId) {
        const res = await supabase
            .from("landenlifts_lifts")
            .select("weight, reps, created_at")
            .eq("user_id", userId)
            .eq("lift", exerciseId)
            .order("weight", { ascending: false })
            .limit(60);

        if (res.error) throw res.error;

        let best = { e1rm: null, bestWeight: null, bestReps: null };
        for (const row of res.data || []) {
            const v = e1rm(row.weight, row.reps);
            if (v && (!best.e1rm || v > best.e1rm)) {
                best = { e1rm: v, bestWeight: row.weight, bestReps: row.reps };
            }
        }

        setMaxByExercise((prev) => ({
            ...prev,
            [exerciseId]: best.e1rm ? best : { e1rm: null, bestWeight: null, bestReps: null }
        }));

        return best;
    }

    async function loadDayExercises(splitDayId, userId) {
        const exRes = await supabase
            .from("landenlifts_split_exercises")
            .select("id, name, rep_range_start, rep_range_end, rpe, split_day, order_index, user_id, warmup_sets, working_sets")
            .eq("split_day", splitDayId)
            .order("order_index", { ascending: true });

        if (exRes.error) throw exRes.error;

        const list = exRes.data || [];
        setExercises(list);

        const first = list[0]?.id || "";
        setCurrentExerciseId(first);

        // prefetch max for first exercise (warmups/recs render quickly)
        if (first && userId) {
            await fetchMaxForExercise(first, userId);
        }

        if (first) ensureInputsForExercise(first);
    }

    async function findTodaySession(u, activeSplitId, splitDayRow) {
        const date = todayISODate();

        const sessRes = await supabase
            .from("landenlifts_session")
            .select("id, user_id, split_id, day, split_day_id, started_at, completed_at")
            .eq("user_id", u.id)
            .eq("split_id", activeSplitId)
            .eq("split_day_id", splitDayRow.id)
            .eq("started_at", date)
            .is("completed_at", null)
            .order("started_at", { ascending: false })
            .limit(1);

        if (sessRes.error) throw sessRes.error;

        const existing = (sessRes.data && sessRes.data[0]) ? sessRes.data[0] : null;
        return existing || null;
    }

    async function refreshDayLifts(sessionId, u) {
        if (!sessionId) {
            setDayLifts([]);
            return;
        }

        const liftRes = await supabase
            .from("landenlifts_lifts")
            .select("id, created_at, user_id, weight, reps, lift, session")
            .eq("user_id", u.id)
            .eq("session", sessionId)
            .order("created_at", { ascending: true });

        if (liftRes.error) throw liftRes.error;
        setDayLifts(liftRes.data || []);
    }

    async function bootstrap() {
        if (loadingRef.current) return;
        loadingRef.current = true;

        setLoading(true);
        setStatus({ type: "", msg: "" });

        try {
            const userRes = await supabase.auth.getUser();
            if (userRes.error) throw userRes.error;
            const u = userRes.data?.user ?? null;
            if (!u) throw new Error("Not signed in.");
            setUser(u);

            const up = await supabase.from("landenlifts_user_info").upsert({ user_id: u.id }, { onConflict: "user_id" });
            if (up.error) throw up.error;

            const infoRes = await supabase
                .from("landenlifts_user_info")
                .select("user_id, body_weight, active_split, current_day")
                .eq("user_id", u.id)
                .maybeSingle();
            if (infoRes.error) throw infoRes.error;

            const inf = infoRes.data || null;
            setInfo(inf);

            if (!inf?.active_split) {
                setSplit(null);
                setDays([]);
                setSelectedDayId("");
                setExercises([]);
                setCurrentExerciseId("");
                setSession(null);
                setDayLifts([]);
                setStatus({ type: "info", msg: "Pick a split first." });
                return;
            }

            const splitRes = await supabase
                .from("landenlifts_split")
                .select("id, name, user_id, days_per_week")
                .eq("id", inf.active_split)
                .single();
            if (splitRes.error) throw splitRes.error;

            setSplit(splitRes.data);

            const dRes = await supabase
                .from("landenlifts_split_days")
                .select("id, day, name, split, user_id")
                .eq("split", inf.active_split)
                .order("day", { ascending: true });
            if (dRes.error) throw dRes.error;

            const dayRows = dRes.data || [];
            setDays(dayRows);

            const cur = toInt(inf.current_day) || 1;
            const match = dayRows.find((d) => d.day === cur) || null;
            const dayId = match?.id || dayRows[0]?.id || "";
            setSelectedDayId(dayId);
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Failed to load dashboard." });
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }

    useEffect(() => {
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!user || !info?.active_split) return;
            if (!selectedDayId) return;

            setBusy(true);
            setStatus({ type: "", msg: "" });

            try {
                // CLEAR FIRST to avoid wiping data after load
                setMaxByExercise({});
                setWorkInputsByExercise({});
                setExercises([]);
                setCurrentExerciseId("");

                await loadDayExercises(selectedDayId, user.id);

                const dayRow = days.find((d) => d.id === selectedDayId) || null;
                const sess = dayRow ? await findTodaySession(user, info.active_split, dayRow) : null;

                if (cancelled) return;
                setSession(sess);
                await refreshDayLifts(sess?.id || null, user);
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load day." });
            } finally {
                if (!cancelled) setBusy(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [selectedDayId, user, info?.active_split, days]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!user || !currentExerciseId) return;

            try {
                if (!maxByExercise[currentExerciseId]) {
                    await fetchMaxForExercise(currentExerciseId, user.id);
                }
                if (!cancelled) ensureInputsForExercise(currentExerciseId);
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load max for exercise." });
            }
        }

        run();
        return () => { cancelled = true; };
    }, [currentExerciseId]); // intentional

    function updateWorkInput(exerciseId, idx, patch) {
        setWorkInputsByExercise((prev) => {
            const rows = prev[exerciseId] ? [...prev[exerciseId]] : [];
            if (!rows[idx]) return prev;
            rows[idx] = { ...rows[idx], ...patch };
            return { ...prev, [exerciseId]: rows };
        });
    }

    async function ensureSessionForLogging() {
        if (!user || !info?.active_split || !selectedDay) return null;
        if (session?.id) return session;

        const date = todayISODate();

        const ins = await supabase
            .from("landenlifts_session")
            .insert({
                user_id: user.id,
                split_id: info.active_split,
                day: selectedDay.day,
                split_day_id: selectedDay.id,
                started_at: date
            })
            .select("id, user_id, split_id, day, split_day_id, started_at, completed_at")
            .single();

        if (ins.error) throw ins.error;

        setSession(ins.data);
        return ins.data;
    }

    async function logCurrentExerciseAndAdvance({ finishWorkout } = { finishWorkout: false }) {
        if (!user || !currentExercise) return;
        if (busy) return;

        setBusy(true);
        setStatus({ type: "", msg: "" });

        try {
            const sess = await ensureSessionForLogging();
            if (!sess?.id) throw new Error("No session available.");

            const rows = workInputsByExercise[currentExercise.id] || [];
            const payload = rows
                .map((r) => {
                    const w = toInt(r.weight);
                    const reps = toInt(r.reps);
                    if (!w || !reps) return null;
                    return {
                        user_id: user.id,
                        weight: w,
                        reps,
                        lift: currentExercise.id,
                        session: sess.id
                    };
                })
                .filter(Boolean);

            if (!payload.length) {
                throw new Error("Enter weight and reps for at least one working set.");
            }

            const ins = await supabase.from("landenlifts_lifts").insert(payload);
            if (ins.error) throw ins.error;

            await refreshDayLifts(sess.id, user);
            await fetchMaxForExercise(currentExercise.id, user.id);

            if (finishWorkout) {
                const nowIso = new Date().toISOString();

                const updSess = await supabase
                    .from("landenlifts_session")
                    .update({ completed_at: nowIso })
                    .eq("id", sess.id)
                    .eq("user_id", user.id);
                if (updSess.error) throw updSess.error;

                const maxDays = (split?.days_per_week && Number.isFinite(split.days_per_week)) ? split.days_per_week : (days?.length || 1);
                const cur = toInt(info?.current_day) || 1;
                const next = (cur >= maxDays) ? 1 : (cur + 1);

                const updUi = await supabase
                    .from("landenlifts_user_info")
                    .update({ current_day: next })
                    .eq("user_id", user.id);
                if (updUi.error) throw updUi.error;

                setStatus({ type: "ok", msg: "Workout finished. Advanced to next day." });
                setInfo((prev) => ({ ...(prev || {}), current_day: next }));

                const nextDayRow = days.find((d) => d.day === next) || null;
                if (nextDayRow?.id) setSelectedDayId(nextDayRow.id);

                setSession(null);
                setDayLifts([]);
                return;
            }

            const idx = exercises.findIndex((e) => e.id === currentExercise.id);
            const nextEx = (idx >= 0 && idx < exercises.length - 1) ? exercises[idx + 1] : null;

            if (nextEx) {
                setCurrentExerciseId(nextEx.id);
                ensureInputsForExercise(nextEx.id);
            } else {
                setStatus({ type: "ok", msg: "Last exercise logged. You can finish the workout now." });
            }
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Failed to log sets." });
        } finally {
            setBusy(false);
        }
    }

    function clickExercise(exId) {
        setCurrentExerciseId(exId);
        ensureInputsForExercise(exId);
    }

    const hasActiveSplit = !!info?.active_split;

    if (loading) return <div className="card">Loading...</div>;

    if (!user) {
        return (
            <div className="card">
                <h2 className="ll-title">Not signed in</h2>
                <p className="lead">Sign in first, then come back here.</p>
            </div>
        );
    }

    if (!hasActiveSplit) {
        return (
            <div className="card">
                <h2 className="ll-title">Dashboard</h2>
                <p className="lead">No active split. Go pick one in Splits.</p>
            </div>
        );
    }

    const currentWorkingSetCount = currentExercise ? (toInt(currentExercise.working_sets) || 1) : 0;
    const currentWarmupSetCount = currentExercise ? (toInt(currentExercise.warmup_sets) || 0) : 0;
    const currentRecommendedTop = recommendation.topSet;

    return (
        <div className="ll-dashboard stack">
            {status.msg ? (
                <div className={`card ll-status ${status.type ? `ll-status--${status.type}` : ""}`}>
                    <p className="ll-status-text">{status.msg}</p>
                </div>
            ) : null}

            {/* Header row (split + day selector) */}
            <div className="card ll-header-card">
                <div className="ll-header-row">
                    <div className="ll-header-left">
                        <div className="ll-page-title">Dashboard</div>
                        <div className="ll-meta-line">
                            Split: <span className="ll-meta-strong">{split?.name || info.active_split}</span>
                        </div>
                    </div>

                    <div className="ll-header-right">
                        <label className="label" htmlFor="ll-day-select">Day</label>
                        <select
                            id="ll-day-select"
                            className="select"
                            value={selectedDayId}
                            onChange={(e) => setSelectedDayId(e.target.value)}
                            disabled={busy || !days.length}
                        >
                            {days.length ? (
                                days.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {String(d.name || "")}
                                    </option>
                                ))
                            ) : (
                                <option value="">No days found</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Current exercise panel */}
            <div className="card ll-current-card">
                {!currentExercise ? (
                    <div className="ll-empty">
                        <div className="ll-empty-title">No exercises for this day</div>
                        <div className="ll-empty-sub">Add exercises in the split editor for this day.</div>
                    </div>
                ) : (
                    <div className="ll-current stack">
                        <div className="ll-current-top">
                            <div className="ll-current-info">
                                <div className="ll-current-name">{currentExercise.name}</div>
                                <div className="ll-current-sub">
                                    Warmups: {currentWarmupSetCount} | Working: {currentWorkingSetCount} | Reps: {repsRangeLabel(currentExercise)} | RPE: {currentExercise.rpe ?? "-"}
                                </div>
                            </div>

                            <div className="ll-current-cta">
                                {(() => {
                                    const idx = exercises.findIndex((e) => e.id === currentExercise.id);
                                    const isLast = idx === exercises.length - 1;
                                    return (
                                        <button
                                            type="button"
                                            className="btn btn--primary ll-primary-cta"
                                            onClick={() => logCurrentExerciseAndAdvance({ finishWorkout: isLast })}
                                            disabled={busy}
                                        >
                                            {busy ? "Saving..." : (isLast ? "Finish workout" : "Complete")}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Sets panel */}
                        <div className="ll-sets card">
                            {/* Warmups */}
                            {currentRecommendedTop && recommendation.warmups.length > 0 ? (
                                <div className="ll-warmups">
                                    {recommendation.warmups.map((w, idx) => (
                                        <div key={idx} className="ll-set-row2 ll-set-row2--warmup">
                                            <div className="ll-set-badge">Warmup #{idx + 1}</div>

                                            <div className="ll-field">
                                                {idx === 0 ? <label className="label">Weight</label> : null}
                                                <input
                                                    className="input ll-input ll-input--warmup"
                                                    value={w.weight}
                                                    placeholder={currentRecommendedTop ? `recommended ${currentRecommendedTop}` : "e.g., 185"}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>

                                            <div className="ll-field">
                                                {idx === 0 ? <label className="label">Reps</label> : null}
                                                <input
                                                    className="input ll-input ll-input--warmup"
                                                    value={w.reps}
                                                    placeholder={recommendation.repsTarget ? `recommended ${recommendation.repsTarget}` : "e.g., 10"}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {/* Working sets */}
                            <div className="ll-working">
                                {(workInputsByExercise[currentExercise.id] || []).map((row, idx) => (
                                    <div key={idx} className="ll-set-row2">
                                        <div className="ll-set-badge">#{idx + 1}</div>

                                        <div className="ll-field">
                                            {idx === 0 ? <label className="label">Weight</label> : null}
                                            <input
                                                className="input ll-input"
                                                value={row.weight}
                                                onChange={(e) => updateWorkInput(currentExercise.id, idx, { weight: e.target.value })}
                                                placeholder={currentRecommendedTop ? `recommended ${currentRecommendedTop}` : "e.g., 185"}
                                                disabled={busy}
                                                inputMode="numeric"
                                            />
                                        </div>

                                        <div className="ll-field">
                                            {idx === 0 ? <label className="label">Reps</label> : null}
                                            <input
                                                className="input ll-input"
                                                value={row.reps}
                                                onChange={(e) => updateWorkInput(currentExercise.id, idx, { reps: e.target.value })}
                                                placeholder={recommendation.repsTarget ? `recommended ${recommendation.repsTarget}` : "e.g., 10"}
                                                disabled={busy}
                                                inputMode="numeric"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Today's plan */}
            <div className="card ll-plan-card">
                <div className="ll-card-title-row">
                    <div className="ll-card-title">Today&apos;s plan</div>
                </div>

                {exercises.length === 0 ? (
                    <div className="ll-muted-strong">No exercises for this day.</div>
                ) : (
                    <div className="ll-plan-list">
                        {exercises.map((ex) => {
                            const isCurrent = ex.id === currentExerciseId;
                            const completed = !!isExerciseCompleted[ex.id];

                            const cls = [
                                "ll-plan-item",
                                isCurrent ? "is-current" : "",
                                completed ? "is-complete" : ""
                            ].filter(Boolean).join(" ");

                            return (
                                <button
                                    key={ex.id}
                                    type="button"
                                    className={cls}
                                    onClick={() => clickExercise(ex.id)}
                                    disabled={busy}
                                >
                                    <div className="ll-plan-top">
                                        <div className="ll-plan-name">{ex.name}</div>
                                        {completed ? <div className="ll-plan-tag">Completed</div> : null}
                                    </div>

                                    <div className="ll-plan-sub">
                                        Warmups: {toInt(ex.warmup_sets) || 0} | Working: {toInt(ex.working_sets) || 1} | Reps: {repsRangeLabel(ex)} | RPE: {ex.rpe ?? "-"}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lifts for the day */}
            <div className="card ll-lifts-card">
                <div className="ll-card-title">Lifts for this workout</div>

                {!session ? (
                    <div className="ll-muted-strong">
                        No session started yet. It will be created when you log your first working set.
                    </div>
                ) : dayLifts.length === 0 ? (
                    <div className="ll-muted-strong">
                        Session started ({session.started_at}), but no lifts logged yet.
                    </div>
                ) : (
                    <div className="ll-lift-list">
                        {dayLifts.map((l, idx) => {
                            const ex = exercises.find((e) => e.id === l.lift) || null;
                            return (
                                <div key={l.id || idx} className="ll-lift-item">
                                    <div className="ll-lift-name">{ex ? ex.name : l.lift}</div>
                                    <div className="ll-lift-val">{l.weight} x {l.reps}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
