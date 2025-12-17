// SongView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import supabase from "../../../supabaseClient";

import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";


import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
const PDF_WORKER_URL =
    "https://unpkg.com/pdfjs-dist@5.4.449/legacy/build/pdf.worker.mjs";
function isProbablyPdf(url) {
    const u = String(url || "").toLowerCase();
    return u.includes(".pdf") || u.startsWith("data:application/pdf");
}

function parsePageFromNotes(notes) {
    const n = String(notes || "");
    const m = n.match(/\bpage\s*:\s*(\d+)\b/i);
    if (!m) return null;
    const page = Number(m[1]);
    return Number.isFinite(page) && page > 0 ? page : null;
}

function parseBookFromNotes(notes) {
    const n = String(notes || "");
    const m = n.match(/\bbook\s*:\s*([^|]+)\b/i);
    if (!m) return "";
    return String(m[1] || "").trim();
}

export default function SongView() {
    const history = useHistory();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [song, setSong] = useState(null);

    // If this is a "book song", we resolve the *book PDF url* from book_pages.
    const [bookPdfUrl, setBookPdfUrl] = useState("");

    // IMPORTANT: do NOT wrap this in useMemo/useEffect/etc.
    // This plugin uses hooks internally.
    const layoutPluginInstance = defaultLayoutPlugin();


    // Load song row
    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErr("");
            setSong(null);
            setBookPdfUrl("");

            try {
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr) throw authErr;

                const user = auth?.user;
                if (!user) throw new Error("Not signed in.");

                const res = await supabase
                    .from("songs")
                    .select("id, title, url, notes")
                    .eq("user_id", user.id)
                    .eq("id", id)
                    .maybeSingle();

                if (!alive) return;
                if (res.error) throw res.error;
                if (!res.data) throw new Error("Song not found.");

                setSong(res.data);
            } catch (e) {
                console.error(e);
                if (alive) setErr(e?.message || "Failed to load song.");
            } finally {
                if (alive) setLoading(false);
            }
        }

        if (id) load();
        else {
            setLoading(false);
            setErr("Missing song id.");
        }

        return () => {
            alive = false;
        };
    }, [id]);

    // Resolve a book song's PDF url using book_pages (book + page from notes)
    useEffect(() => {
        let alive = true;

        async function resolveBookPdf() {
            setBookPdfUrl("");

            const notes = song?.notes || "";
            const book = parseBookFromNotes(notes);
            const page = parsePageFromNotes(notes);

            if (!book || !page) return;

            try {
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr) throw authErr;

                const user = auth?.user;
                if (!user) return;

                const res = await supabase
                    .from("book_pages")
                    .select("url")
                    .eq("user_id", user.id)
                    .eq("book", book)
                    .eq("page", page)
                    .maybeSingle();

                if (!alive) return;

                if (res.error) {
                    console.warn(res.error);
                    return;
                }

                const u = res.data?.url ? String(res.data.url) : "";
                if (u) setBookPdfUrl(u);
            } catch (e) {
                console.error(e);
            }
        }

        if (song?.id) resolveBookPdf();

        return () => {
            alive = false;
        };
    }, [song?.id, song?.notes]);

    const rawUrl = song?.url || "";
    const page = useMemo(() => parsePageFromNotes(song?.notes), [song?.notes]);
    const book = useMemo(() => parseBookFromNotes(song?.notes), [song?.notes]);

    const displayUrl = useMemo(() => (bookPdfUrl ? bookPdfUrl : rawUrl), [bookPdfUrl, rawUrl]);
    const isPdf = useMemo(() => isProbablyPdf(displayUrl), [displayUrl]);

    // react-pdf-viewer uses 0-based page index
    const initialPage = useMemo(() => {
        if (!page) return 0;
        const p0 = Number(page) - 1;
        return Number.isFinite(p0) && p0 >= 0 ? p0 : 0;
    }, [page]);

    if (loading) return <div className="card">Loading...</div>;

    if (err) {
        return (
            <div className="card stack">
                <h2 style={{ marginTop: 0 }}>Song</h2>
                <p className="lead">{err}</p>
                <button type="button" className="btn" onClick={() => history.push("/songviewer")}>
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className="section">
            <div className="container stack">
                <div
                    className="card"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0 }}>{song?.title}</h2>

                        {song?.notes ? (
                            <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>
                                {song.notes}
                            </div>
                        ) : null}

                        {(book || page) ? (
                            <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>
                                {book ? (
                                    <>
                                        Book: <strong>{book}</strong>
                                    </>
                                ) : null}
                                {book && page ? <span> · </span> : null}
                                {page ? (
                                    <>
                                        Page: <strong>{page}</strong>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                        {isPdf && displayUrl ? (
                            <a className="btn" href={displayUrl} target="_blank" rel="noreferrer">
                                Open PDF
                            </a>
                        ) : null}

                        <button type="button" className="btn" onClick={() => history.push("/songviewer")}>
                            Back
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: 12 }}>
                    {!displayUrl ? (
                        <p className="lead" style={{ margin: 0 }}>
                            No chart URL saved for this song.
                        </p>
                    ) : isPdf ? (
                        <div style={{ height: "80vh" }}>
                                <Worker workerUrl={PDF_WORKER_URL}>
                                <Viewer
                                    fileUrl={displayUrl}
                                    plugins={[layoutPluginInstance]}
                                    initialPage={initialPage}
                                />
                            </Worker>
                        </div>
                    ) : (
                        <img
                            src={displayUrl}
                            alt={song?.title || "Song chart"}
                            style={{ width: "100%", height: "auto", borderRadius: 10, display: "block" }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
