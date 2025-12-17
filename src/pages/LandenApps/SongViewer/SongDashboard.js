import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import supabase from "../../../supabaseClient";

import AddSongModal from "./Components/AddSongModal";
import AddToSetlistModal from "./Components/AddToSetlistModal";
import SetlistManagerModal from "./Components/SetlistManagerModal";

function SongDashboard() {
    const history = useHistory();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);

    const [tab, setTab] = useState("songs"); // songs | setlists

    const [songs, setSongs] = useState([]);
    const [query, setQuery] = useState("");

    const [setlists, setSetlists] = useState([]);
    const [selectedSetlistId, setSelectedSetlistId] = useState("");
    const [setlistSongs, setSetlistSongs] = useState([]);

    const [selectedSong, setSelectedSong] = useState(null);

    // modals
    const [showAddSong, setShowAddSong] = useState(false);
    const [showAddToSetlistFor, setShowAddToSetlistFor] = useState(null); // song row
    const [showSetlistManager, setShowSetlistManager] = useState(false);

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErr("");

            try {
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr) throw authErr;

                const u = auth?.user ?? null;
                if (!u) throw new Error("You must be signed in to view your songs.");
                if (!alive) return;

                setUser(u);

                const [songsRes, setlistsRes] = await Promise.all([
                    supabase
                        .from("songs")
                        .select("id, title, url, notes")
                        .eq("user_id", u.id)
                        .order("title", { ascending: true }),
                    supabase
                        .from("setlists")
                        .select("id, name")
                        .eq("user_id", u.id)
                        .order("name", { ascending: true }),
                ]);

                if (!alive) return;

                if (songsRes.error) throw songsRes.error;
                if (setlistsRes.error) throw setlistsRes.error;

                setSongs(songsRes.data || []);
                setSetlists(setlistsRes.data || []);

                // default setlist selection
                const firstSetlistId = (setlistsRes.data || [])[0]?.id || "";
                setSelectedSetlistId(firstSetlistId);
            } catch (e) {
                console.error(e);
                if (alive) setErr(e?.message || "Failed to load songs.");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;

        async function loadSetlistSongs() {
            setSetlistSongs([]);

            if (!user?.id) return;
            if (!selectedSetlistId) return;

            const res = await supabase
                .from("setlist_definitions")
                .select("id, index, song, songs ( id, title, url, notes )")
                .eq("user_id", user.id)
                .eq("setlist", selectedSetlistId)
                .order("index", { ascending: true });

            if (!alive) return;
            if (res.error) {
                setErr(res.error.message);
                return;
            }

            const rows = (res.data || [])
                .map((r) => ({
                    defId: r.id,
                    orderIndex: r.index,
                    id: r.songs?.id ?? r.song,
                    title: r.songs?.title ?? "(missing title)",
                    url: r.songs?.url ?? "",
                    notes: r.songs?.notes ?? "",
                }))
                .filter((x) => x.id);

            setSetlistSongs(rows);
        }

        loadSetlistSongs();
        return () => {
            alive = false;
        };
    }, [user?.id, selectedSetlistId]);

    const filteredSongs = useMemo(() => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return songs;
        return (songs || []).filter((s) => String(s.title || "").toLowerCase().includes(q));
    }, [songs, query]);

    const canView = !!selectedSong?.id;

    const status = useMemo(() => {
        if (loading) return "Loading…";
        if (err) return err;
        return "Ready.";
    }, [loading, err]);

    function goViewSong(song) {
        if (!song?.id) return;
        history.push(`songviewer/song/${song.id}`);
    }

    async function refreshSongsAndSetlists() {
        if (!user?.id) return;

        const [songsRes, setlistsRes] = await Promise.all([
            supabase
                .from("songs")
                .select("id, title, url, notes")
                .eq("user_id", user.id)
                .order("title", { ascending: true }),
            supabase
                .from("setlists")
                .select("id, name")
                .eq("user_id", user.id)
                .order("name", { ascending: true }),
        ]);

        if (songsRes.error) throw songsRes.error;
        if (setlistsRes.error) throw setlistsRes.error;

        setSongs(songsRes.data || []);
        setSetlists(setlistsRes.data || []);

        // keep selection valid
        if (selectedSetlistId) {
            const stillExists = (setlistsRes.data || []).some((s) => s.id === selectedSetlistId);
            if (!stillExists) setSelectedSetlistId((setlistsRes.data || [])[0]?.id || "");
        } else {
            setSelectedSetlistId((setlistsRes.data || [])[0]?.id || "");
        }
    }

    async function deleteSong(song) {
        if (!user?.id || !song?.id) return;
        const ok = window.confirm(`Delete "${song.title}"? This will also remove it from any setlists.`);
        if (!ok) return;

        setBusy(true);
        setErr("");

        try {
            // remove from setlists first (unless you have ON DELETE CASCADE)
            const delDefs = await supabase
                .from("setlist_definitions")
                .delete()
                .eq("user_id", user.id)
                .eq("song", song.id);
            if (delDefs.error) throw delDefs.error;

            const delSong = await supabase
                .from("songs")
                .delete()
                .eq("user_id", user.id)
                .eq("id", song.id);
            if (delSong.error) throw delSong.error;

            setSelectedSong((prev) => (prev?.id === song.id ? null : prev));

            await refreshSongsAndSetlists();
            // also refresh setlist songs if viewing that tab
            if (selectedSetlistId) {
                setSelectedSetlistId((prev) => prev); // trigger effect (noop but stable)
            }
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to delete song.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="section">
            <div className="container stack">
                <div className="card">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                        <div>
                            <h1 style={{ marginBottom: 6 }}>Song Viewer</h1>
                            <p className="lead" style={{ margin: 0 }}>
                                Manage songs and setlists, then view your chart.
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={() => setShowAddSong(true)}
                                disabled={loading || busy || !user}
                                title="Add songs"
                            >
                                <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: 8 }} />
                                Add songs
                            </button>

                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowSetlistManager(true)}
                                disabled={loading || busy || !user}
                                title="Manage setlists"
                            >
                                <i className="fa-solid fa-book" aria-hidden="true" style={{ marginRight: 8 }} />
                                Setlists
                            </button>
                        </div>
                    </div>

                    {status ? (
                        <p style={{ marginTop: ".75rem", marginBottom: 0, fontWeight: 800, color: "var(--muted)" }}>
                            {status}
                        </p>
                    ) : null}

                    <div style={{ height: 12 }} />

                    {/* Tabs */}
                    <div role="tablist" aria-label="Song dashboard tabs" style={{ display: "inline-flex", gap: ".5rem", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className={`btn ${tab === "songs" ? "btn--primary" : ""}`}
                            role="tab"
                            aria-selected={tab === "songs"}
                            onClick={() => setTab("songs")}
                            disabled={busy}
                        >
                            Songs
                        </button>
                        <button
                            type="button"
                            className={`btn ${tab === "setlists" ? "btn--primary" : ""}`}
                            role="tab"
                            aria-selected={tab === "setlists"}
                            onClick={() => setTab("setlists")}
                            disabled={busy}
                        >
                            Setlists
                        </button>
                    </div>
                </div>

                {tab === "songs" ? (
                    <div className="card stack">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
                            <div style={{ flex: "1 1 360px" }}>
                                <label className="label">Search</label>
                                <input
                                    className="input"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Type a title..."
                                    disabled={loading || busy}
                                />
                            </div>

                            <button
                                type="button"
                                className="btn btn--primary"
                                disabled={!canView}
                                onClick={() => goViewSong(selectedSong)}
                                title="View selected song"
                            >
                                View song
                            </button>
                        </div>

                        <div style={{ height: 8 }} />

                        {(filteredSongs || []).length === 0 ? (
                            <p className="lead" style={{ margin: 0 }}>
                                No songs yet. Click <strong>Add songs</strong>.
                            </p>
                        ) : (
                            <div className="stack" style={{ gap: 8 }}>
                                {filteredSongs.map((s) => {
                                    const isSelected = selectedSong?.id === s.id;

                                    return (
                                        <div
                                            key={s.id}
                                            className="card"
                                            style={{
                                                boxShadow: "none",
                                                border: "1px solid var(--border)",
                                                background: isSelected ? "var(--surface)" : undefined,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 10,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn"
                                                style={{ flex: 1, textAlign: "left", cursor: "pointer" }}
                                                onClick={() => setSelectedSong(s)}
                                                disabled={busy}
                                                title="Select"
                                            >
                                                <div style={{ fontWeight: 900 }}>{s.title}</div>
                                                {s.notes ? (
                                                    <div style={{ marginTop: 4, color: "var(--muted)", fontWeight: 800, fontSize: 13 }}>
                                                        {s.notes}
                                                    </div>
                                                ) : null}
                                            </button>

                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => setShowAddToSetlistFor(s)}
                                                    disabled={busy || loading}
                                                    title="Add to setlist"
                                                >
                                                    <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => goViewSong(s)}
                                                    disabled={busy}
                                                    title="View"
                                                >
                                                    View
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => deleteSong(s)}
                                                    disabled={busy}
                                                    title="Delete"
                                                >
                                                    <i className="fa-solid fa-trash" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card stack">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
                            <div style={{ flex: "1 1 360px" }}>
                                <label className="label">Setlist</label>
                                <select
                                    className="select"
                                    value={selectedSetlistId}
                                    onChange={(e) => {
                                        setSelectedSetlistId(e.target.value);
                                        setSelectedSong(null);
                                    }}
                                    disabled={loading || busy || setlists.length === 0}
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

                            <button
                                type="button"
                                className="btn btn--primary"
                                disabled={!canView}
                                onClick={() => goViewSong(selectedSong)}
                                title="View selected song"
                            >
                                View song
                            </button>
                        </div>

                        <div style={{ height: 8 }} />

                        {setlists.length === 0 ? (
                            <p className="lead" style={{ margin: 0 }}>
                                No setlists yet. Click <strong>Setlists</strong> (top right) to create one.
                            </p>
                        ) : setlistSongs.length === 0 ? (
                            <p className="lead" style={{ margin: 0 }}>
                                This setlist is empty.
                            </p>
                        ) : (
                            <div className="stack" style={{ gap: 8 }}>
                                {setlistSongs.map((s) => {
                                    const isSelected = selectedSong?.id === s.id;

                                    return (
                                        <div
                                            key={s.defId}
                                            className="card"
                                            style={{
                                                boxShadow: "none",
                                                border: "1px solid var(--border)",
                                                background: isSelected ? "var(--surface)" : undefined,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 10,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn"
                                                style={{ flex: 1, textAlign: "left", cursor: "pointer" }}
                                                onClick={() => setSelectedSong(s)}
                                                disabled={busy}
                                                title="Select"
                                            >
                                                <div style={{ fontWeight: 900 }}>
                                                    <span style={{ color: "var(--muted)", fontWeight: 900, marginRight: 10 }}>
                                                        #{s.orderIndex}
                                                    </span>
                                                    {s.title}
                                                </div>
                                            </button>

                                            <button type="button" className="btn" onClick={() => goViewSong(s)} disabled={busy} title="View">
                                                View
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Modals */}
                {showAddSong ? (
                    <AddSongModal
                        onClose={() => setShowAddSong(false)}
                        onCreated={async () => {
                            setShowAddSong(false);
                            try {
                                await refreshSongsAndSetlists();
                            } catch (e) {
                                console.error(e);
                                setErr(e?.message || "Added, but failed to refresh.");
                            }
                        }}
                    />
                ) : null}

                {showAddToSetlistFor ? (
                    <AddToSetlistModal
                        song={showAddToSetlistFor}
                        onClose={() => setShowAddToSetlistFor(null)}
                        onUpdated={async () => {
                            setShowAddToSetlistFor(null);
                            try {
                                await refreshSongsAndSetlists();
                                // reload current setlist view if needed
                                if (selectedSetlistId) setSelectedSetlistId((prev) => prev);
                            } catch (e) {
                                console.error(e);
                                setErr(e?.message || "Updated, but failed to refresh.");
                            }
                        }}
                    />
                ) : null}

                {showSetlistManager ? (
                    <SetlistManagerModal
                        onClose={() => setShowSetlistManager(false)}
                        onChanged={async () => {
                            try {
                                await refreshSongsAndSetlists();
                            } catch (e) {
                                console.error(e);
                                setErr(e?.message || "Changed, but failed to refresh.");
                            }
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}

export default SongDashboard;
