// src/pages/LandenApps/LandenLifts/Data/Data.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../supabaseClient";

/**
 * Uses api.powerliftingdata.com (public API) to compare your estimated 1RM / total
 * to percentiles + optionally fetch the current IPF record for the category.
 *
 * What this file does:
 * 1) Lets you pick a lift (from your split exercises)
 * 2) Builds a time series of "best e1RM per day" from your logged lifts
 * 3) Shows a tiny SVG chart
 * 4) Lets you compare your latest e1RM to powerliftingdata percentiles
 *
 * Notes/assumptions:
 * - Your app stores weights in lbs. powerliftingdata expects KG.
 * - e1RM is estimated using Epley: 1RM = weight * (1 + reps/30)
 * - powerliftingdata "category" is one of: Squat, Bench, Deadlift, Total
 * - If the selected exercise name doesn't look like squat/bench/deadlift, the compare tools are disabled.
 */

const API_BASE = "https://api.powerliftingdata.com";

function toNumberOrNull(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function lbsToKg(lbs) {
    const n = toNumberOrNull(lbs);
    if (n == null) return null;
    return n * 0.45359237;
}

function kgToLbs(kg) {
    const n = toNumberOrNull(kg);
    if (n == null) return null;
    return n / 0.45359237;
}

// Epley e1RM estimate
function epley1RM(weight, reps) {
    const w = toNumberOrNull(weight);
    const r = toNumberOrNull(reps);
    if (w == null || r == null) return null;
    if (w <= 0) return null;
    const repsClamped = clamp(r, 1, 30);
    return w * (1 + repsClamped / 30);
}

function fmtDate(d) {
    return String(d || "");
}

function fmtInt(n) {
    if (n == null) return "-";
    return String(Math.round(n));
}

function safeText(v) {
    return String(v ?? "");
}

function detectCategoryFromExerciseName(name) {
    const s = String(name || "").toLowerCase();

    // conservative keywording: don't mislabel random stuff
    const hasBench = s.includes("bench");
    const hasSquat = s.includes("squat");
    const hasDead = s.includes("deadlift") || s.includes("dead lift");

    if (hasSquat) return "Squat";
    if (hasBench) return "Bench";
    if (hasDead) return "Deadlift";

    return "";
}

// Very simple weightclass mapping for powerliftingdata format:
// Men53, Men59, Men66, Men74, Men83, Men93, Men105, Men120, MenOpen
// Women43, Women47, Women52, Women57, Women63, Women69, Women76, Women84, WomenOpen
function weightClassFromBodyweightKg(sex, bwKg) {
    const bw = toNumberOrNull(bwKg);
    if (!bw || bw <= 0) return "";

    if (sex === "Men") {
        if (bw <= 53) return "Men53";
        if (bw <= 59) return "Men59";
        if (bw <= 66) return "Men66";
        if (bw <= 74) return "Men74";
        if (bw <= 83) return "Men83";
        if (bw <= 93) return "Men93";
        if (bw <= 105) return "Men105";
        if (bw <= 120) return "Men120";
        return "MenOpen";
    }

    if (sex === "Women") {
        if (bw <= 43) return "Women43";
        if (bw <= 47) return "Women47";
        if (bw <= 52) return "Women52";
        if (bw <= 57) return "Women57";
        if (bw <= 63) return "Women63";
        if (bw <= 69) return "Women69";
        if (bw <= 76) return "Women76";
        if (bw <= 84) return "Women84";
        return "WomenOpen";
    }

    return "";
}

/**
 * Tiny dependency-free SVG line chart.
 * points: [{ xLabel: 'YYYY-MM-DD', y: number }]
 * overlay: optional line points in same format
 */
function LineChart({ points, overlayPoints, height = 240 }) {
    const w = 980;
    const h = height;
    const padL = 44;
    const padR = 18;
    const padT = 18;
    const padB = 36;

    const safePoints = (points || []).filter((p) => p && toNumberOrNull(p.y) != null);
    const safeOverlay = (overlayPoints || []).filter((p) => p && toNumberOrNull(p.y) != null);

    if (safePoints.length < 2) {
        return (
            <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Progress chart</div>
                <div style={{ color: "var(--muted)", fontWeight: 800 }}>
                    Not enough data yet. Log this lift on at least two different days.
                </div>
            </div>
        );
    }

    const ys = safePoints.map((p) => p.y).concat(safeOverlay.map((p) => p.y));
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const min = yMin === yMax ? yMin - 1 : yMin;
    const max = yMin === yMax ? yMax + 1 : yMax;

    function xForIndex(i, n) {
        const innerW = w - padL - padR;
        if (n <= 1) return padL;
        return padL + (innerW * i) / (n - 1);
    }

    function yForVal(v) {
        const innerH = h - padT - padB;
        const t = (v - min) / (max - min);
        return padT + innerH * (1 - t);
    }

    function pathFrom(arr) {
        return arr
            .map((p, i) => {
                const x = xForIndex(i, arr.length);
                const y = yForVal(p.y);
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");
    }

    const mainPath = pathFrom(safePoints);
    const overlayPath = safeOverlay.length >= 2 ? pathFrom(safeOverlay) : "";

    // y axis ticks
    const ticks = 4;
    const tickVals = [];
    for (let i = 0; i <= ticks; i++) {
        tickVals.push(min + ((max - min) * i) / ticks);
    }

    // x labels: show first + last only (keeps it clean)
    const firstLabel = safePoints[0].xLabel;
    const lastLabel = safePoints[safePoints.length - 1].xLabel;

    return (
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Progress chart</div>

            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block" }}>
                {/* grid + y ticks */}
                {tickVals.map((tv, i) => {
                    const y = yForVal(tv);
                    return (
                        <g key={i}>
                            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(0,0,0,0.12)" />
                            <text x={padL - 10} y={y + 4} fontSize="12" textAnchor="end" fill="rgba(0,0,0,0.55)">
                                {fmtInt(tv)}
                            </text>
                        </g>
                    );
                })}

                {/* x axis labels */}
                <text x={padL} y={h - 12} fontSize="12" textAnchor="start" fill="rgba(0,0,0,0.55)">
                    {firstLabel}
                </text>
                <text x={w - padR} y={h - 12} fontSize="12" textAnchor="end" fill="rgba(0,0,0,0.55)">
                    {lastLabel}
                </text>

                {/* main line */}
                <path d={mainPath} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="3" />

                {/* overlay line (optional) */}
                {overlayPath ? (
                    <path d={overlayPath} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="3" strokeDasharray="6 6" />
                ) : null}

                {/* points */}
                {safePoints.map((p, i) => {
                    const x = xForIndex(i, safePoints.length);
                    const y = yForVal(p.y);
                    return <circle key={i} cx={x} cy={y} r="4" fill="rgba(0,0,0,0.85)" />;
                })}
            </svg>

            <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800 }}>
                Values shown are best estimated 1RM (Epley) per date.
                {overlayPath ? " Dashed line is comparison percentile curve (kg converted to lbs)." : ""}
            </div>
        </div>
    );
}

export default function Data() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [status, setStatus] = useState({ type: "", msg: "" });

    const [user, setUser] = useState(null);
    const [info, setInfo] = useState(null); // includes body_weight if you have it

    // list of exercises user can select
    const [exerciseOptions, setExerciseOptions] = useState([]); // [{id,name}]
    const [selectedExerciseId, setSelectedExerciseId] = useState("");

    // time series points (lbs e1RM)
    const [points, setPoints] = useState([]); // [{xLabel,y}]

    // comparison results
    const [compareEnabled, setCompareEnabled] = useState(false);
    const [compareSex, setCompareSex] = useState("Men");
    const [compareAgeClass, setCompareAgeClass] = useState("Open");
    const [compareEquipment, setCompareEquipment] = useState("Classic");
    const [compareEvent, setCompareEvent] = useState("SBD"); // SBD or B (bench-only totals)
    const [compareMode, setCompareMode] = useState("percentile"); // percentile | all_percentiles | ipf_record

    const [comparePercentile, setComparePercentile] = useState(null); // number
    const [compareWeightClass, setCompareWeightClass] = useState("");
    const [ipfRecord, setIpfRecord] = useState(null);
    const [overlayPoints, setOverlayPoints] = useState([]); // optional overlay curve

    const selectedExercise = useMemo(() => {
        return exerciseOptions.find((e) => e.id === selectedExerciseId) || null;
    }, [exerciseOptions, selectedExerciseId]);

    const selectedCategory = useMemo(() => {
        const cat = detectCategoryFromExerciseName(selectedExercise?.name);
        return cat;
    }, [selectedExercise]);

    const bodyWeightKg = useMemo(() => {
        const bwLbs = toNumberOrNull(info?.body_weight);
        if (bwLbs == null) return null;
        return lbsToKg(bwLbs);
    }, [info]);

    const inferredWeightClass = useMemo(() => {
        return weightClassFromBodyweightKg(compareSex, bodyWeightKg);
    }, [compareSex, bodyWeightKg]);

    useEffect(() => {
        setCompareWeightClass(inferredWeightClass || "");
    }, [inferredWeightClass]);

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

                // load user_info (for bodyweight + active split if you want)
                const infoRes = await supabase
                    .from("landenlifts_user_info")
                    .select("user_id, body_weight, active_split, current_day")
                    .eq("user_id", u.id)
                    .maybeSingle();

                if (infoRes.error) throw infoRes.error;
                if (cancelled) return;

                setInfo(infoRes.data || null);

                // build exercise picker from split_exercises that exist for this user’s authorized/owned splits is hard.
                // simplest: show exercises that the user has EVER logged in lifts table (unique lift id -> name via split_exercises).
                const liftIdsRes = await supabase
                    .from("landenlifts_lifts")
                    .select("lift")
                    .eq("user_id", u.id)
                    .limit(2000);

                if (liftIdsRes.error) throw liftIdsRes.error;

                const uniqueLiftIds = Array.from(new Set((liftIdsRes.data || []).map((r) => r.lift).filter(Boolean)));

                if (!uniqueLiftIds.length) {
                    setExerciseOptions([]);
                    setSelectedExerciseId("");
                    setPoints([]);
                    setCompareEnabled(false);
                    setStatus({ type: "info", msg: "No lifts logged yet. Log a workout first, then come back here." });
                    return;
                }

                const exRes = await supabase
                    .from("landenlifts_split_exercises")
                    .select("id, name")
                    .in("id", uniqueLiftIds)
                    .order("name", { ascending: true });

                if (exRes.error) throw exRes.error;

                const exList = exRes.data || [];
                if (cancelled) return;

                setExerciseOptions(exList);

                // default select first if none chosen
                const firstId = exList[0]?.id || "";
                setSelectedExerciseId((prev) => prev || firstId);
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load data page." });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    // Load time series for selected exercise
    useEffect(() => {
        let cancelled = false;

        async function loadSeries() {
            if (!user || !selectedExerciseId) return;

            setBusy(true);
            setStatus({ type: "", msg: "" });

            try {
                // Pull lifts for this exercise + session started_at (date)
                const res = await supabase
                    .from("landenlifts_lifts")
                    .select("id, weight, reps, created_at, session, lift, user_id")
                    .eq("user_id", user.id)
                    .eq("lift", selectedExerciseId)
                    .order("created_at", { ascending: true })
                    .limit(3000);

                if (res.error) throw res.error;

                const liftRows = res.data || [];
                if (!liftRows.length) {
                    setPoints([]);
                    setCompareEnabled(false);
                    return;
                }

                // Get sessions for these rows (to group by date)
                const sessionIds = Array.from(new Set(liftRows.map((r) => r.session).filter(Boolean)));

                let sessionById = {};
                if (sessionIds.length) {
                    const sessRes = await supabase
                        .from("landenlifts_session")
                        .select("id, started_at, completed_at")
                        .in("id", sessionIds);

                    if (sessRes.error) throw sessRes.error;

                    (sessRes.data || []).forEach((s) => {
                        sessionById[s.id] = s;
                    });
                }

                // Group by date (use session.started_at if available; fallback to created_at date)
                const byDate = {};
                for (const r of liftRows) {
                    const sess = r.session ? sessionById[r.session] : null;

                    const d =
                        sess?.started_at
                            ? String(sess.started_at)
                            : String(r.created_at || "").slice(0, 10) || "";

                    if (!d) continue;

                    const e = epley1RM(r.weight, r.reps);
                    if (e == null) continue;

                    if (!byDate[d]) byDate[d] = [];
                    byDate[d].push(e);
                }

                const dates = Object.keys(byDate).sort();
                const pts = dates.map((d) => {
                    const best = Math.max(...byDate[d]);
                    return { xLabel: d, y: best }; // lbs
                });

                if (!cancelled) {
                    setPoints(pts);
                }

                // Compare enabled only if we can map this lift to a recognized category
                const cat = detectCategoryFromExerciseName(selectedExercise?.name);
                if (!cancelled) setCompareEnabled(!!cat);
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load lift series." });
            } finally {
                if (!cancelled) setBusy(false);
            }
        }

        loadSeries();
        return () => {
            cancelled = true;
        };
    }, [user, selectedExerciseId, selectedExercise?.name]);

    const latest = useMemo(() => {
        if (!points.length) return null;
        return points[points.length - 1];
    }, [points]);

    const latestE1RMKg = useMemo(() => {
        const lbs = latest?.y;
        const kg = lbsToKg(lbs);
        if (kg == null) return null;
        return kg;
    }, [latest]);

    async function callPowerliftingData(endpoint, params) {
        const sp = new URLSearchParams();
        Object.keys(params || {}).forEach((k) => {
            const v = params[k];
            if (v == null) return;
            const s = String(v).trim();
            if (!s) return;
            sp.set(k, s);
        });

        const url = `${API_BASE}/${endpoint}?${sp.toString()}`;

        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            throw new Error(`API error (${resp.status}): ${text || resp.statusText}`);
        }
        return resp.json();
    }

    async function runComparison() {
        if (!compareEnabled) {
            setStatus({ type: "error", msg: "This exercise doesn't look like Squat/Bench/Deadlift, so compare is disabled." });
            return;
        }

        if (!latestE1RMKg) {
            setStatus({ type: "error", msg: "No recent 1RM estimate found to compare yet." });
            return;
        }

        const wc = compareWeightClass || inferredWeightClass;
        if (!wc) {
            setStatus({
                type: "error",
                msg: "Set your body weight in Setup (or pick a weight class) so we can compare you correctly."
            });
            return;
        }

        // When event is B, powerliftingdata says only Total is allowed for category.
        // We're comparing a single lift, so if user picks event=B, we should block.
        if (compareEvent === "B") {
            setStatus({ type: "error", msg: "Event=B is bench-only totals. Use event=SBD for single-lift percentiles." });
            return;
        }

        const cat = selectedCategory;
        if (!cat) {
            setStatus({ type: "error", msg: "Could not map this exercise to Squat/Bench/Deadlift." });
            return;
        }

        setBusy(true);
        setStatus({ type: "info", msg: "Fetching comparison from powerliftingdata..." });

        try {
            setComparePercentile(null);
            setIpfRecord(null);
            setOverlayPoints([]);

            if (compareMode === "percentile") {
                // percentile?event=SBD&ageclass=Open&equipment=Classic&weightclass=Men93&category=Bench&value=200
                const json = await callPowerliftingData("percentile", {
                    event: "SBD",
                    ageclass: compareAgeClass,
                    equipment: compareEquipment,
                    weightclass: wc,
                    category: cat,
                    value: latestE1RMKg.toFixed(2)
                });

                // Form not documented. We’ll handle common shapes:
                // - { percentile: 72.3 } or { result: 72.3 } or [ { percentile: ... } ]
                let pct = null;
                if (json && typeof json === "object") {
                    if (typeof json.percentile === "number") pct = json.percentile;
                    else if (typeof json.result === "number") pct = json.result;
                    else if (Array.isArray(json) && json.length && typeof json[0]?.percentile === "number") pct = json[0].percentile;
                    else if (Array.isArray(json) && json.length && typeof json[0]?.result === "number") pct = json[0].result;
                }

                setComparePercentile(pct);
                setStatus({ type: "ok", msg: "Comparison loaded." });
            } else if (compareMode === "all_percentiles") {
                // all_percentiles returns 0..100 values (101). We'll overlay a simple curve:
                // x = percentile index, y = kg value converted to lbs, then plot as line across "time" index.
                // BUT our chart x-axis is time; overlaying percentiles against time is not a real mapping.
                // So instead, we overlay a horizontal "goal" curve:
                // We'll take 50th percentile and plot it as constant across your timeline.
                const json = await callPowerliftingData("all_percentiles", {
                    event: "SBD",
                    ageclass: compareAgeClass,
                    equipment: compareEquipment,
                    weightclass: wc,
                    category: cat
                });

                // Not documented. Common patterns:
                // - array length 101 of numbers
                // - { values: [...] }
                let arr = null;
                if (Array.isArray(json)) arr = json;
                else if (json && Array.isArray(json.values)) arr = json.values;
                else if (json && Array.isArray(json.data)) arr = json.data;

                if (!arr || arr.length < 51) {
                    setStatus({ type: "error", msg: "Unexpected all_percentiles response shape." });
                } else {
                    // choose median (50th percentile) as overlay constant line
                    const p50Kg = toNumberOrNull(arr[50]);
                    const p50Lbs = p50Kg == null ? null : kgToLbs(p50Kg);

                    if (p50Lbs == null || !points.length) {
                        setStatus({ type: "error", msg: "Could not build overlay from percentiles." });
                    } else {
                        const ov = points.map((p) => ({ xLabel: p.xLabel, y: p50Lbs }));
                        setOverlayPoints(ov);
                        setStatus({ type: "ok", msg: "Loaded percentiles. Dashed line is the 50th percentile." });
                    }
                }
            } else if (compareMode === "ipf_record") {
                const json = await callPowerliftingData("ipf_record", {
                    federation: "World",
                    ageclass: compareAgeClass,
                    equipment: compareEquipment,
                    weightclass: wc,
                    category: cat
                });

                // Not documented. We'll store raw and render a couple common fields if present.
                setIpfRecord(json);
                setStatus({ type: "ok", msg: "IPF record loaded." });
            } else {
                setStatus({ type: "error", msg: "Unknown compare mode." });
            }
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Failed to fetch comparison." });
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="card">Loading...</div>;
    if (!user) return <div className="card">Not signed in.</div>;

    return (
        <div className="stack">
            <div className="card">
                <h2 style={{ marginBottom: 8 }}>Lifting Data</h2>

                {status.msg ? (
                    <p style={{ marginTop: 0, marginBottom: 0, color: "var(--muted)", fontWeight: 800 }}>
                        {status.msg}
                    </p>
                ) : null}
            </div>

            <div className="card">
                <div className="grid grid--2" style={{ alignItems: "end" }}>
                    <div>
                        <label className="label">Pick a lift</label>
                        <select
                            className="select"
                            value={selectedExerciseId}
                            onChange={(e) => setSelectedExerciseId(e.target.value)}
                            disabled={busy}
                        >
                            {exerciseOptions.length ? (
                                exerciseOptions.map((ex) => (
                                    <option key={ex.id} value={ex.id}>
                                        {safeText(ex.name)}
                                    </option>
                                ))
                            ) : (
                                <option value="">No lifts found</option>
                            )}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ color: "var(--muted)", fontWeight: 900 }}>
                            Category:{" "}
                            <strong>{selectedCategory ? selectedCategory : "Unknown"}</strong>
                        </div>
                        <div style={{ color: "var(--muted)", fontWeight: 900 }}>
                            Latest e1RM:{" "}
                            <strong>{latest ? `${fmtInt(latest.y)} lb` : "-"}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <LineChart points={points} overlayPoints={overlayPoints} />

            <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Compare to powerliftingdata.com</h3>

                {!compareEnabled ? (
                    <p className="lead" style={{ marginTop: 0 }}>
                        This exercise name doesn't look like a squat/bench/deadlift, so I can't map it to powerlifting categories.
                        Rename it (include "bench", "squat", or "deadlift") if you want comparisons.
                    </p>
                ) : (
                    <>
                        <div className="grid grid--3" style={{ alignItems: "end" }}>
                            <div>
                                <label className="label">Sex</label>
                                <select className="select" value={compareSex} onChange={(e) => setCompareSex(e.target.value)} disabled={busy}>
                                    <option value="Men">Men</option>
                                    <option value="Women">Women</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Age class</label>
                                <select
                                    className="select"
                                    value={compareAgeClass}
                                    onChange={(e) => setCompareAgeClass(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="Open">Open</option>
                                    <option value="SubJr">SubJr</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Master1">Master1</option>
                                    <option value="Master2">Master2</option>
                                    <option value="Master3">Master3</option>
                                    <option value="Master4">Master4</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Equipment</label>
                                <select
                                    className="select"
                                    value={compareEquipment}
                                    onChange={(e) => setCompareEquipment(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="Classic">Classic</option>
                                    <option value="Equipped">Equipped</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ height: 10 }} />

                        <div className="grid grid--3" style={{ alignItems: "end" }}>
                            <div>
                                <label className="label">Weight class</label>
                                <select
                                    className="select"
                                    value={compareWeightClass}
                                    onChange={(e) => setCompareWeightClass(e.target.value)}
                                    disabled={busy}
                                >
                                    {/* Men */}
                                    <optgroup label="Men">
                                        <option value="Men53">Men53</option>
                                        <option value="Men59">Men59</option>
                                        <option value="Men66">Men66</option>
                                        <option value="Men74">Men74</option>
                                        <option value="Men83">Men83</option>
                                        <option value="Men93">Men93</option>
                                        <option value="Men105">Men105</option>
                                        <option value="Men120">Men120</option>
                                        <option value="MenOpen">MenOpen</option>
                                    </optgroup>

                                    {/* Women */}
                                    <optgroup label="Women">
                                        <option value="Women43">Women43</option>
                                        <option value="Women47">Women47</option>
                                        <option value="Women52">Women52</option>
                                        <option value="Women57">Women57</option>
                                        <option value="Women63">Women63</option>
                                        <option value="Women69">Women69</option>
                                        <option value="Women76">Women76</option>
                                        <option value="Women84">Women84</option>
                                        <option value="WomenOpen">WomenOpen</option>
                                    </optgroup>
                                </select>

                                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>
                                    Auto-suggested from body weight:{" "}
                                    <strong>{inferredWeightClass || "-"}</strong>
                                </div>
                            </div>

                            <div>
                                <label className="label">Compare mode</label>
                                <select
                                    className="select"
                                    value={compareMode}
                                    onChange={(e) => setCompareMode(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="percentile">Percentile for your latest e1RM</option>
                                    <option value="all_percentiles">Overlay 50th percentile line</option>
                                    <option value="ipf_record">Show current IPF record</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Event</label>
                                <select
                                    className="select"
                                    value={compareEvent}
                                    onChange={(e) => setCompareEvent(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="SBD">SBD (full power)</option>
                                    <option value="B">B (bench-only totals)</option>
                                </select>

                                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>
                                    For single lift comparisons, keep this on <strong>SBD</strong>.
                                </div>
                            </div>
                        </div>

                        <div style={{ height: 12 }} />

                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={runComparison}
                                disabled={busy || !latestE1RMKg || !compareWeightClass}
                            >
                                {busy ? "Loading..." : "Compare"}
                            </button>

                            <div style={{ color: "var(--muted)", fontWeight: 900 }}>
                                Using latest e1RM:{" "}
                                <strong>
                                    {latest ? `${fmtInt(latest.y)} lb` : "-"}
                                </strong>{" "}
                                (<strong>{latestE1RMKg ? `${latestE1RMKg.toFixed(1)} kg` : "-"}</strong>)
                            </div>
                        </div>

                        {/* Results */}
                        <div style={{ height: 12 }} />

                        {compareMode === "percentile" ? (
                            <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 900, marginBottom: 6 }}>Percentile result</div>
                                <div style={{ color: "var(--muted)", fontWeight: 900 }}>
                                    {comparePercentile == null
                                        ? "No percentile loaded yet."
                                        : `You're around the ${comparePercentile.toFixed(1)}th percentile for ${selectedCategory} in ${compareEquipment} ${compareAgeClass} ${compareWeightClass}.`}
                                </div>
                            </div>
                        ) : null}

                        {compareMode === "ipf_record" ? (
                            <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 900, marginBottom: 6 }}>IPF record (raw)</div>
                                <div style={{ color: "var(--muted)", fontWeight: 800, marginBottom: 10 }}>
                                    The API response shape isn’t documented, so this shows the raw JSON.
                                </div>
                                <pre
                                    style={{
                                        margin: 0,
                                        padding: 12,
                                        borderRadius: 10,
                                        border: "1px solid var(--border)",
                                        background: "rgba(0,0,0,0.02)",
                                        overflowX: "auto",
                                        fontSize: 12
                                    }}
                                >
                                    {JSON.stringify(ipfRecord, null, 2)}
                                </pre>
                            </div>
                        ) : null}
                    </>
                )}
            </div>

            <div className="card">
                <div style={{ color: "var(--muted)", fontWeight: 800 }}>
                    Tip: If you want percentiles to match reality better, log your lifts in kg (or tell me your units and I’ll
          remove the lbs->kg assumption).
                </div>
            </div>
        </div>
    );
}
