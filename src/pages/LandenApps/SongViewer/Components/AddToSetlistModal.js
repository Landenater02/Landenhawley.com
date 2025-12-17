import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../supabaseClient";

function modalStyles() {
    return {
        overlay: {
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
        },
        modal: {
            width: "min(720px, 100%)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
        },
    };
}

export default function AddToSetlistModal({ song, onClose, onUpdated }) {
    const S = modalStyles();

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);
    const [setlists, setSetlists] = useState([]);
    const [selectedSetlistId, setSelectedSetlistId] = useState("");

    const [newSetlistName, setNewSetlistName] = useState("");

    useEffect(() => {
        let alive = true;

        async function load() {
            setBusy(true);
            setErr("");

            try {
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr) throw authErr;
                const u = auth?.user ?? null;
                if (!u) throw new Error("Not signed in.");
                if (!alive) return;

                setUser(u);

                const res = await supabase
                    .from("setlists")
                    .select("id, name")
                    .eq("user_id", u.id)
                    .order("name", { ascending: true });

                if (!alive) return;
                if (res.error) throw res.error;

                setSetlists(res.data || []);
                setSelectedSetlistId((res.data || [])[0]?.id || "");
            } catch (e) {
                console.error(e);
                if (alive) setErr(e?.message || "Failed to load setlists.");
            } finally {
                if (alive) setBusy(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, []);

    const canAdd = useMemo(() => {
        return !!user?.id && !!song?.id && !!selectedSetlistId && !busy;
    }, [user?.id, song?.id, selectedSetlistId, busy]);

    async function createSetlist() {
        if (!user?.id) return;

        const nm = String(newSetlistName || "").trim();
        if (!nm) {
            setErr("Setlist name is required.");
            return;
        }

        setBusy(true);
        setErr("");

        try {
            const ins = await supabase
                .from("setlists")
                .insert({ user_id: user.id, name: nm })
                .select("id, name")
                .single();

            if (ins.error) throw ins.error;

            const next = [...setlists, ins.data].sort((a, b) => String(a.name).localeCompare(String(b.name)));
            setSetlists(next);
            setSelectedSetlistId(ins.data.id);
            setNewSetlistName("");
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to create setlist.");
        } finally {
            setBusy(false);
        }
    }

    async function addToSetlist() {
        if (!canAdd) return;

        setBusy(true);
        setErr("");

        try {
            // if already exists, bail
            const exists = await supabase
                .from("setlist_definitions")
                .select("id")
                .eq("user_id", user.id)
                .eq("setlist", selectedSetlistId)
                .eq("song", song.id)
                .limit(1);

            if (exists.error) throw exists.error;
            if ((exists.data || []).length) {
                setErr("That song is already in this setlist.");
                return;
            }

            // find max index
            const maxRes = await supabase
                .from("setlist_definitions")
                .select("index")
                .eq("user_id", user.id)
                .eq("setlist", selectedSetlistId)
                .order("index", { ascending: false })
                .limit(1);

            if (maxRes.error) throw maxRes.error;

            const maxIdx = (maxRes.data || [])[0]?.index ?? 0;
            const nextIdx = Number(maxIdx) + 1;

            const ins = await supabase
                .from("setlist_definitions")
                .insert({
                    user_id: user.id,
                    setlist: selectedSetlistId,
                    song: song.id,
                    index: nextIdx,
                });

            if (ins.error) throw ins.error;

            onUpdated?.();
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to add to setlist.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Add to setlist">
            <div style={S.modal} className="stack">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <h2 style={{ margin: 0 }}>Add to setlist</h2>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Close
                    </button>
                </div>

                <div style={{ fontWeight: 900 }}>
                    Song: <span style={{ color: "var(--muted)" }}>{song?.title}</span>
                </div>

                {err ? <p style={{ margin: 0, fontWeight: 900, color: "var(--muted)" }}>{err}</p> : null}

                <div>
                    <label className="label">Choose setlist</label>
                    <select
                        className="select"
                        value={selectedSetlistId}
                        onChange={(e) => setSelectedSetlistId(e.target.value)}
                        disabled={busy || setlists.length === 0}
                    >
                        {setlists.length ? (
                            setlists.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))
                        ) : (
                            <option value="">No setlists yet</option>
                        )}
                    </select>
                </div>

                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn--primary" onClick={addToSetlist} disabled={!canAdd}>
                        {busy ? "Adding..." : "Add"}
                    </button>
                </div>

                <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                    <h3 style={{ marginTop: 0 }}>Create new setlist</h3>
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "end" }}>
                        <div style={{ flex: "1 1 320px" }}>
                            <label className="label">Name</label>
                            <input
                                className="input"
                                value={newSetlistName}
                                onChange={(e) => setNewSetlistName(e.target.value)}
                                placeholder="e.g., Gig 12/16"
                                disabled={busy}
                            />
                        </div>
                        <button type="button" className="btn" onClick={createSetlist} disabled={busy || !String(newSetlistName || "").trim()}>
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
