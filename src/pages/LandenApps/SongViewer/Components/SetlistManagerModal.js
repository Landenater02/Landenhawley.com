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
            width: "min(780px, 100%)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
        },
    };
}

export default function SetlistManagerModal({ onClose, onChanged }) {
    const S = modalStyles();

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);

    const [setlists, setSetlists] = useState([]);
    const [newName, setNewName] = useState("");

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

                if (res.error) throw res.error;
                if (!alive) return;

                setSetlists(res.data || []);
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

    const canCreate = useMemo(() => {
        return !!user?.id && !!String(newName || "").trim() && !busy;
    }, [user?.id, newName, busy]);

    async function createSetlist() {
        if (!canCreate) return;

        setBusy(true);
        setErr("");

        try {
            const nm = String(newName || "").trim();

            const ins = await supabase
                .from("setlists")
                .insert({ user_id: user.id, name: nm })
                .select("id, name")
                .single();

            if (ins.error) throw ins.error;

            const next = [...setlists, ins.data].sort((a, b) => String(a.name).localeCompare(String(b.name)));
            setSetlists(next);
            setNewName("");

            onChanged?.();
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to create setlist.");
        } finally {
            setBusy(false);
        }
    }

    async function deleteSetlist(row) {
        if (!user?.id || !row?.id) return;
        const ok = window.confirm(`Delete setlist "${row.name}"?`);
        if (!ok) return;

        setBusy(true);
        setErr("");

        try {
            // delete definitions first (unless FK cascade exists)
            const delDefs = await supabase
                .from("setlist_definitions")
                .delete()
                .eq("user_id", user.id)
                .eq("setlist", row.id);
            if (delDefs.error) throw delDefs.error;

            const del = await supabase
                .from("setlists")
                .delete()
                .eq("user_id", user.id)
                .eq("id", row.id);
            if (del.error) throw del.error;

            setSetlists((prev) => (prev || []).filter((s) => s.id !== row.id));
            onChanged?.();
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to delete setlist.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Setlists">
            <div style={S.modal} className="stack">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <h2 style={{ margin: 0 }}>Setlists</h2>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Close
                    </button>
                </div>

                {err ? <p style={{ margin: 0, fontWeight: 900, color: "var(--muted)" }}>{err}</p> : null}

                <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                    <h3 style={{ marginTop: 0 }}>Create setlist</h3>
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "end" }}>
                        <div style={{ flex: "1 1 340px" }}>
                            <label className="label">Name</label>
                            <input
                                className="input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Wedding gig"
                                disabled={busy}
                            />
                        </div>

                        <button type="button" className="btn btn--primary" onClick={createSetlist} disabled={!canCreate}>
                            Create
                        </button>
                    </div>
                </div>

                <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                    <h3 style={{ marginTop: 0 }}>Existing</h3>

                    {setlists.length === 0 ? (
                        <p className="lead" style={{ margin: 0 }}>No setlists yet.</p>
                    ) : (
                        <div className="stack" style={{ gap: 8 }}>
                            {setlists.map((s) => (
                                <div
                                    key={s.id}
                                    className="card"
                                    style={{
                                        boxShadow: "none",
                                        border: "1px solid var(--border)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                    }}
                                >
                                    <div style={{ fontWeight: 900 }}>{s.name}</div>
                                    <button type="button" className="btn" onClick={() => deleteSetlist(s)} disabled={busy} title="Delete setlist">
                                        <i className="fa-solid fa-trash" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
