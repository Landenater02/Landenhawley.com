import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../../supabaseClient";

// Bucket (songs: images + pdfs)
const SONG_UPLOADS_BUCKET = "songs";

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
            width: "min(980px, 100%)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
        },
    };
}

function toIntOrNull(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

// mapping parser: "Title, 12"
function parseSongTuples(text) {
    const raw = String(text || "").trim();
    if (!raw) return { ok: false, error: "Paste lines like: Song Title, 12" };

    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { ok: false, error: "No rows found." };

    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        const title = parts[0] || "";
        const page = toIntOrNull(parts[1]);

        if (!title) return { ok: false, error: `Row ${i + 1}: title is required.` };
        if (!page || page <= 0) return { ok: false, error: `Row ${i + 1}: page must be a positive number.` };

        rows.push({ title, page });
    }

    return { ok: true, rows };
}

function isPdf(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    return type === "application/pdf" || name.endsWith(".pdf");
}

async function uploadFileToBucket(bucket, userId, file) {
    const ext = String(file.name || "").split(".").pop() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
    const path = `${userId}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

    const up = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
    });
    if (up.error) throw up.error;

    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl || "";
    if (!publicUrl) {
        throw new Error(`Upload succeeded but no public URL. Make bucket "${bucket}" public or switch to signed URLs.`);
    }
    return publicUrl;
}

export default function AddSongModal({ onClose, onCreated }) {
    const S = modalStyles();

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);

    // order: upload song -> upload book
    const [type, setType] = useState("song"); // song | book
    const [bookMode, setBookMode] = useState("existing"); // existing | new

    // existing book picks
    const [books, setBooks] = useState([]); // distinct book strings
    const [selectedBook, setSelectedBook] = useState("");
    const [pages, setPages] = useState([]); // {id, page, url}
    const [selectedPageId, setSelectedPageId] = useState("");
    const selectedPage = useMemo(() => pages.find((p) => p.id === selectedPageId) || null, [pages, selectedPageId]);

    const [titleDraft, setTitleDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");

    // upload song (image OR pdf)
    const [songFile, setSongFile] = useState(null);

    // new book (single PDF)
    const [newBookName, setNewBookName] = useState("");
    const [newBookPdfFile, setNewBookPdfFile] = useState(null); // File (PDF)
    const [newBookMapping, setNewBookMapping] = useState(""); // "title,page"

    useEffect(() => {
        let alive = true;

        async function init() {
            setBusy(true);
            setErr("");

            try {
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr) throw authErr;

                const u = auth?.user ?? null;
                if (!u) throw new Error("Not signed in.");
                if (!alive) return;
                setUser(u);

                const booksRes = await supabase
                    .from("book_pages")
                    .select("book")
                    .eq("user_id", u.id);

                if (!alive) return;
                if (booksRes.error) throw booksRes.error;

                const distinct = Array.from(
                    new Set((booksRes.data || []).map((r) => String(r.book || "").trim()).filter(Boolean))
                ).sort();

                setBooks(distinct);
                setSelectedBook(distinct[0] || "");
            } catch (e) {
                console.error(e);
                if (alive) setErr(e?.message || "Failed to load books.");
            } finally {
                if (alive) setBusy(false);
            }
        }

        init();
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;

        async function loadPages() {
            setPages([]);
            setSelectedPageId("");

            if (!user?.id) return;
            if (!selectedBook) return;

            const res = await supabase
                .from("book_pages")
                .select("id, url, page, book")
                .eq("user_id", user.id)
                .eq("book", selectedBook)
                .order("page", { ascending: true });

            if (!alive) return;
            if (res.error) {
                setErr(res.error.message);
                return;
            }

            const list = (res.data || []).map((r) => ({
                id: r.id,
                url: r.url || "", // this is the BOOK PDF URL (stored in the SAME songs bucket)
                page: r.page,
            }));

            setPages(list);
            setSelectedPageId(list[0]?.id || "");
        }

        if (type === "book" && bookMode === "existing") loadPages();
        return () => {
            alive = false;
        };
    }, [type, bookMode, user?.id, selectedBook]);

    const canCreate = useMemo(() => {
        if (!user?.id) return false;
        if (busy) return false;

        if (type === "song") {
            return !!String(titleDraft || "").trim() && !!songFile;
        }

        // type === "book"
        if (bookMode === "existing") {
            return !!String(titleDraft || "").trim() && !!selectedBook && !!selectedPage?.url && !!selectedPage?.page;
        }

        // new book
        if (!String(newBookName || "").trim()) return false;
        if (!newBookPdfFile || !isPdf(newBookPdfFile)) return false;

        const parsed = parseSongTuples(newBookMapping);
        if (!parsed.ok) return false;

        return true;
    }, [
        user?.id,
        busy,
        type,
        titleDraft,
        songFile,
        bookMode,
        selectedBook,
        selectedPage?.url,
        selectedPage?.page,
        newBookName,
        newBookPdfFile,
        newBookMapping,
    ]);

    async function create() {
        if (!user?.id) return;
        if (!canCreate) return;

        setBusy(true);
        setErr("");

        try {
            // ========== Upload song (image or PDF) ==========
            if (type === "song") {
                const url = await uploadFileToBucket(SONG_UPLOADS_BUCKET, user.id, songFile);

                const fileNote = isPdf(songFile) ? "PDF" : "Image";
                const notes = [String(notesDraft || "").trim(), `File: ${fileNote}`].filter(Boolean).join(" | ");

                const ins = await supabase
                    .from("songs")
                    .insert({
                        user_id: user.id,
                        title: String(titleDraft).trim(),
                        url,
                        notes,
                    });

                if (ins.error) throw ins.error;

                onCreated?.();
                return;
            }

            // ========== Book song ==========
            if (bookMode === "existing") {
                const pageNum = selectedPage.page;
                const book = selectedBook;

                const notes = [
                    String(notesDraft || "").trim(),
                    book ? `Book: ${book}` : "",
                    pageNum != null ? `Page: ${pageNum}` : "",
                ]
                    .filter(Boolean)
                    .join(" | ");

                const ins = await supabase
                    .from("songs")
                    .insert({
                        user_id: user.id,
                        title: String(titleDraft).trim(),
                        url: selectedPage.url, // SAME book PDF URL
                        notes,
                    });

                if (ins.error) throw ins.error;

                onCreated?.();
                return;
            }

            // ========== Upload new book (single PDF) + mapping ==========
            const book = String(newBookName).trim();

            // 1) upload the book pdf once (to the SAME songs bucket)
            const bookPdfUrl = await uploadFileToBucket(SONG_UPLOADS_BUCKET, user.id, newBookPdfFile);

            // 2) parse mapping
            const parsed = parseSongTuples(newBookMapping);
            if (!parsed.ok) throw new Error(parsed.error || "Bad mapping.");

            // 3) insert book_pages rows for unique pages referenced (all share the same book PDF url)
            const uniquePages = Array.from(new Set(parsed.rows.map((r) => Number(r.page)))).sort((a, b) => a - b);

            const bpPayload = uniquePages.map((p) => ({
                user_id: user.id,
                book,
                page: p,
                url: bookPdfUrl,
            }));

            const bpIns = await supabase.from("book_pages").insert(bpPayload);
            if (bpIns.error) throw bpIns.error;

            // 4) create songs for each mapping row (url is the book PDF; notes include page)
            const songsToInsert = parsed.rows.map((r) => ({
                user_id: user.id,
                title: r.title,
                url: bookPdfUrl,
                notes: `Book: ${book} | Page: ${r.page}`,
            }));

            const songsIns = await supabase.from("songs").insert(songsToInsert);
            if (songsIns.error) throw songsIns.error;

            onCreated?.();
        } catch (e) {
            console.error(e);
            setErr(e?.message || "Failed to create.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Add">
            <div style={S.modal} className="stack">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <h2 style={{ margin: 0 }}>Add</h2>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Close
                    </button>
                </div>

                {err ? <p style={{ margin: 0, fontWeight: 900, color: "var(--muted)" }}>{err}</p> : null}

                {/* Type switch (order: Upload song, Upload book) */}
                <div role="radiogroup" aria-label="Add type" className="sv-pillgroup">
                    <button
                        type="button"
                        className={`btn ${type === "song" ? "btn--primary" : ""}`}
                        role="radio"
                        aria-checked={type === "song"}
                        onClick={() => setType("song")}
                        disabled={busy}
                    >
                        Upload song
                    </button>

                    <button
                        type="button"
                        className={`btn ${type === "book" ? "btn--primary" : ""}`}
                        role="radio"
                        aria-checked={type === "book"}
                        onClick={() => setType("book")}
                        disabled={busy}
                    >
                        Upload book
                    </button>
                </div>

                {type === "song" ? (
                    <div className="card stack" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                        <div className="grid grid--2" style={{ alignItems: "end" }}>
                            <div>
                                <label className="label">Song title</label>
                                <input
                                    className="input"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    placeholder="e.g., Sing Sing Sing"
                                    disabled={busy}
                                />
                            </div>

                            <div>
                                <label className="label">Notes (optional)</label>
                                <input
                                    className="input"
                                    value={notesDraft}
                                    onChange={(e) => setNotesDraft(e.target.value)}
                                    placeholder="Anything you want…"
                                    disabled={busy}
                                />
                            </div>
                        </div>

                        <div className="sv-file">
                            <label className="label">Upload chart (image or PDF)</label>

                            <label className={`sv-file__btn ${busy ? "is-disabled" : ""}`}>
                                Choose file
                                <input
                                    className="sv-file__input"
                                    type="file"
                                    accept="image/*,application/pdf,.pdf"
                                    disabled={busy}
                                    onChange={(e) => setSongFile(e.target.files?.[0] || null)}
                                />
                            </label>

                            <div className="sv-file__meta">
                                {songFile ? (
                                    <>
                                        Selected: <strong>{songFile.name}</strong>{" "}
                                        <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                                            ({isPdf(songFile) ? "PDF" : "Image"})
                                        </span>
                                    </>
                                ) : (
                                    <span style={{ color: "var(--muted)", fontWeight: 800 }}>No file chosen</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card stack" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
                        {/* Book mode (order: New book, Existing book) */}
                        <div role="radiogroup" aria-label="Book mode" className="sv-pillgroup">
                            <button
                                type="button"
                                className={`btn ${bookMode === "new" ? "btn--primary" : ""}`}
                                role="radio"
                                aria-checked={bookMode === "new"}
                                onClick={() => setBookMode("new")}
                                disabled={busy}
                            >
                                New book
                            </button>
                            <button
                                type="button"
                                className={`btn ${bookMode === "existing" ? "btn--primary" : ""}`}
                                role="radio"
                                aria-checked={bookMode === "existing"}
                                onClick={() => setBookMode("existing")}
                                disabled={busy}
                            >
                                Existing book
                            </button>
                        </div>

                        {bookMode === "existing" ? (
                            <>
                                <div className="grid grid--2" style={{ alignItems: "end" }}>
                                    <div>
                                        <label className="label">Book</label>
                                        <select
                                            className="select"
                                            value={selectedBook}
                                            onChange={(e) => setSelectedBook(e.target.value)}
                                            disabled={busy || books.length === 0}
                                        >
                                            {books.length ? (
                                                books.map((b) => (
                                                    <option key={b} value={b}>
                                                        {b}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No books yet</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label">Page</label>
                                        <select
                                            className="select"
                                            value={selectedPageId}
                                            onChange={(e) => setSelectedPageId(e.target.value)}
                                            disabled={busy || pages.length === 0}
                                        >
                                            {pages.length ? (
                                                pages.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        Page {p.page}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No pages for this book</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid--2" style={{ alignItems: "end", marginTop: 10 }}>
                                    <div>
                                        <label className="label">Song title</label>
                                        <input
                                            className="input"
                                            value={titleDraft}
                                            onChange={(e) => setTitleDraft(e.target.value)}
                                            placeholder="e.g., Sing Sing Sing"
                                            disabled={busy}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Notes (optional)</label>
                                        <input
                                            className="input"
                                            value={notesDraft}
                                            onChange={(e) => setNotesDraft(e.target.value)}
                                            placeholder="Anything you want…"
                                            disabled={busy}
                                        />
                                    </div>
                                </div>

                                {selectedPage?.url ? (
                                    <p style={{ margin: 0, color: "var(--muted)", fontWeight: 800 }}>
                                        This will link to the book PDF and open to page <strong>{selectedPage.page}</strong> (handled on the display page).
                                    </p>
                                ) : null}
                            </>
                        ) : (
                            <>
                                <div className="grid grid--2" style={{ alignItems: "end" }}>
                                    <div>
                                        <label className="label">New book name</label>
                                        <input
                                            className="input"
                                            value={newBookName}
                                            onChange={(e) => setNewBookName(e.target.value)}
                                            placeholder="e.g., Real Book Vol. 1"
                                            disabled={busy}
                                        />
                                    </div>

                                    <div className="sv-file">
                                        <label className="label">Upload book PDF</label>

                                        <label className={`sv-file__btn ${busy ? "is-disabled" : ""}`}>
                                            Choose PDF
                                            <input
                                                className="sv-file__input"
                                                type="file"
                                                accept="application/pdf,.pdf"
                                                disabled={busy}
                                                onChange={(e) => setNewBookPdfFile(e.target.files?.[0] || null)}
                                            />
                                        </label>

                                        <div className="sv-file__meta">
                                            {newBookPdfFile ? (
                                                <>
                                                    Selected: <strong>{newBookPdfFile.name}</strong>
                                                </>
                                            ) : (
                                                <span style={{ color: "var(--muted)", fontWeight: 800 }}>No PDF chosen</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <label className="label">Songs mapping (Title, PageNumber)</label>
                                    <textarea
                                        className="textarea"
                                        rows={7}
                                        value={newBookMapping}
                                        onChange={(e) => setNewBookMapping(e.target.value)}
                                        placeholder={`Autumn Leaves, 12
All The Things You Are, 35
Blue Bossa, 51`}
                                        disabled={busy}
                                    />
                                    <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800, fontSize: 13 }}>
                                        This will create songs that all point to the same PDF, with the page number stored in notes.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn--primary" onClick={create} disabled={!canCreate}>
                        {busy ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
