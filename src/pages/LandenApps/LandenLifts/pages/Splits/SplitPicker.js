// src/pages/LandenApps/LandenLifts/Splits/SplitPicker.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../../supabaseClient";
import JoinSplitCard from "./JoinSplitCard";
import SplitList from "./SplitList";
import SplitEditor from "./SplitEditor";
import CreateSplitCard from "./CreateSplitCard";

export default function SplitPicker() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const [splits, setSplits] = useState([]);
    const [selectedSplitId, setSelectedSplitId] = useState("");

    const [status, setStatus] = useState({ type: "", msg: "" }); // {type:'error'|'ok'|'info', msg:string}

    // Editor state (store id, not the row)
    const [editOpen, setEditOpen] = useState(false);
    const [editSplitId, setEditSplitId] = useState("");

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

                // Load active split
                const infoRes = await supabase
                    .from("landenlifts_user_info")
                    .select("active_split")
                    .eq("user_id", u.id)
                    .maybeSingle();
                if (infoRes.error) throw infoRes.error;

                await refreshSplits(u.id);

                if (!cancelled && infoRes.data?.active_split) {
                    setSelectedSplitId(infoRes.data.active_split);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setStatus({ type: "error", msg: e?.message || "Failed to load splits." });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedSplit = useMemo(() => {
        return splits.find((s) => s.id === selectedSplitId) || null;
    }, [splits, selectedSplitId]);

    async function refreshSplits(userId) {
        const authRes = await supabase
            .from("landenlifts_split_authority")
            .select("split_id")
            .eq("user_id", userId);
        if (authRes.error) throw authRes.error;

        const authorizedIds = (authRes.data || []).map((r) => r.split_id).filter(Boolean);

        const ownedRes = await supabase.from("landenlifts_split").select("id").eq("user_id", userId);
        if (ownedRes.error) throw ownedRes.error;

        const ownedIds = (ownedRes.data || []).map((r) => r.id).filter(Boolean);

        const ids = Array.from(new Set([...authorizedIds, ...ownedIds]));
        if (!ids.length) {
            setSplits([]);
            return;
        }

        const splitRes = await supabase
            .from("landenlifts_split")
            .select("id, name, user_id, days_per_week")
            .in("id", ids)
            .order("name", { ascending: true });

        if (splitRes.error) throw splitRes.error;
        setSplits(splitRes.data || []);
    }

    async function setActiveSplit(splitId) {
        if (!user) return;

        // Optimistic UI
        setSelectedSplitId(splitId);
        setStatus({ type: "info", msg: "Updating active split..." });

        try {
            const upRes = await supabase
                .from("landenlifts_user_info")
                .upsert({ user_id: user.id, active_split: splitId, current_day: 1 }, { onConflict: "user_id" });

            if (upRes.error) throw upRes.error;

            setStatus({ type: "ok", msg: "Active split updated." });
        } catch (e) {
            console.error(e);
            // Revert selection if update failed
            setSelectedSplitId(selectedSplit?.id || "");
            setStatus({ type: "error", msg: e?.message || "Failed to update active split." });
        }
    }

    async function openEditorForSplit(splitRow) {
        if (!user) return;

        if (!splitRow?.id) {
            setStatus({ type: "error", msg: "Missing split id." });
            return;
        }

        if (splitRow.user_id !== user.id) {
            setStatus({ type: "error", msg: "You can only edit splits that are yours." });
            return;
        }

        setEditSplitId(splitRow.id);
        setEditOpen(true);
    }

    function closeEditor() {
        setEditOpen(false);
        setEditSplitId("");
        setStatus({ type: "", msg: "" });
    }

    async function onSplitCreated(newSplitRow) {
        if (!user) return;

        try {
            await refreshSplits(user.id);

            if (newSplitRow?.id) {
                await setActiveSplit(newSplitRow.id);
                setEditSplitId(newSplitRow.id);
                setEditOpen(true);
            }

            setStatus({ type: "ok", msg: "Split created." });
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Split created, but failed to refresh." });
        }
    }

    async function onAfterEditorSaved() {
        if (!user) return;
        try {
            await refreshSplits(user.id);
        } catch (e) {
            console.error(e);
        }
    }

    async function onAfterEditorDeleted(deletedSplitId) {
        if (!user) return;

        try {
            if (selectedSplitId === deletedSplitId) {
                await supabase
                    .from("landenlifts_user_info")
                    .upsert({ user_id: user.id, active_split: null }, { onConflict: "user_id" });
                setSelectedSplitId("");
            }

            await refreshSplits(user.id);
            closeEditor();
            setStatus({ type: "ok", msg: "Split deleted." });
        } catch (e) {
            console.error(e);
            setStatus({ type: "error", msg: e?.message || "Deleted, but failed to refresh." });
        }
    }

    async function onJoinedSplit() {
        if (!user) return;
        try {
            await refreshSplits(user.id);
        } catch (e) {
            console.error(e);
        }
    }

    if (loading) return <div className="card">Loading...</div>;
    if (!user) return <div className="card">Not signed in.</div>;

    return (
        <div className="stack">
            {/* NEW: Join split at the top */}
            <JoinSplitCard userId={user.id} onJoined={onJoinedSplit} onStatus={setStatus} />

            <div className="card">
                <h2>Choose Split</h2>

                {status.msg ? (
                    <p style={{ marginTop: "0.25rem", marginBottom: "1rem", color: "var(--muted)", fontWeight: 800 }}>
                        {status.msg}
                    </p>
                ) : null}

                <SplitList
                    userId={user.id}
                    splits={splits}
                    selectedSplitId={selectedSplitId}
                    onSelectSplit={setActiveSplit}
                    onEditSplit={openEditorForSplit}
                />
            </div>

            {editOpen && editSplitId ? (
                <SplitEditor
                    userId={user.id}
                    splitId={editSplitId}
                    onClose={closeEditor}
                    onSaved={onAfterEditorSaved}
                    onDeleted={onAfterEditorDeleted}
                    onStatus={setStatus}
                />
            ) : null}

            <CreateSplitCard userId={user.id} onCreated={onSplitCreated} onStatus={setStatus} />
        </div>
    );
}
