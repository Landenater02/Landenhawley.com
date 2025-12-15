// src/pages/LandenApps/LandenLifts/Splits/CreateSplitCard.jsx
import React, { useState } from "react";
import supabase from "../../../../../supabaseClient";

export default function CreateSplitCard({ userId, onCreated, onStatus }) {
    const [creating, setCreating] = useState(false);
    const [newSplitName, setNewSplitName] = useState("");
    const [newSplitDaysPerWeek, setNewSplitDaysPerWeek] = useState("");

    function toIntOrNull(v) {
        const s = String(v ?? "").trim();
        if (!s) return null;
        const n = Number(s);
        if (!Number.isFinite(n)) return null;
        return Math.trunc(n);
    }

    async function createSplit() {
        const name = String(newSplitName || "").trim();
        if (!name) {
            onStatus?.({ type: "error", msg: "Split name is required." });
            return;
        }

        const dpw = toIntOrNull(newSplitDaysPerWeek);
        if (dpw == null || dpw < 1 || dpw > 7) {
            onStatus?.({ type: "error", msg: "Days per week is required and must be 1-7." });
            return;
        }

        setCreating(true);
        onStatus?.({ type: "info", msg: "Creating split..." });

        try {
            // 1) Create split
            const ins = await supabase
                .from("landenlifts_split")
                .insert({ name, user_id: userId, days_per_week: dpw })
                .select("id, name, user_id, days_per_week")
                .single();

            if (ins.error) throw ins.error;

            // 2) Grant authority (optional but fine)
            const authIns = await supabase
                .from("landenlifts_split_authority")
                .insert({ user_id: userId, split_id: ins.data.id });

            if (authIns.error) {
                // not fatal, but log it
                console.warn("Authority insert failed:", authIns.error);
            }

            // 3) Create split days using correct schema:
            //    split_days has columns: split (uuid), day (int2), name (text), user_id (uuid)
            const days = Array.from({ length: dpw }, (_, i) => ({
                split: ins.data.id,       // IMPORTANT: split, not split_id
                day: i + 1,
                name: "Day " + (i + 1),
                user_id: userId
            }));

            const dayIns = await supabase.from("landenlifts_split_days").insert(days);
            if (dayIns.error) throw dayIns.error;

            setNewSplitName("");
            setNewSplitDaysPerWeek("");

            onStatus?.({ type: "ok", msg: "Split created." });
            onCreated?.(ins.data);
        } catch (e) {
            console.error(e);
            onStatus?.({ type: "error", msg: e?.message || "Failed to create split." });
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="card">
            <h2 style={{ marginBottom: "0.5rem" }}>Create a new split</h2>

            <div className="grid grid--2" style={{ alignItems: "end" }}>
                <div>
                    <label className="label">Split name</label>
                    <input
                        className="input"
                        placeholder="e.g., Push Pull Legs"
                        value={newSplitName}
                        onChange={(e) => setNewSplitName(e.target.value)}
                        disabled={creating}
                    />
                </div>

                <div>
                    <label className="label">Days per week</label>
                    <input
                        className="input"
                        placeholder="e.g., 3"
                        value={newSplitDaysPerWeek}
                        onChange={(e) => setNewSplitDaysPerWeek(e.target.value)}
                        disabled={creating}
                    />
                </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                <button type="button" className="btn btn--primary" onClick={createSplit} disabled={creating}>
                    {creating ? "Creating..." : "Create split"}
                </button>
            </div>
        </div>
    );
}
