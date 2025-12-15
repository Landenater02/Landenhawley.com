// src/pages/LandenApps/LandenLifts/Splits/JoinSplitCard.jsx
import React, { useMemo, useState } from "react";
import supabase from "../../../../../supabaseClient";

function normalizeUuid(s) {
    return String(s || "").trim();
}

function looksLikeUuid(s) {
    const v = normalizeUuid(s);
    // basic UUID v4-ish check (accepts any valid UUID format)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default function JoinSplitCard({ userId, onJoined, onStatus }) {
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);

    const canSubmit = useMemo(() => {
        if (!userId) return false;
        return looksLikeUuid(code);
    }, [userId, code]);

    async function join() {
        if (!userId) return;

        const splitId = normalizeUuid(code);
        if (!looksLikeUuid(splitId)) {
            onStatus && onStatus({ type: "error", msg: "Enter a valid split UUID." });
            return;
        }

        setBusy(true);
        onStatus && onStatus({ type: "info", msg: "Adding split access..." });

        try {
            // confirm split exists
            const splitRes = await supabase
                .from("landenlifts_split")
                .select("id, name, user_id")
                .eq("id", splitId)
                .maybeSingle();

            if (splitRes.error) throw splitRes.error;
            if (!splitRes.data?.id) {
                onStatus && onStatus({ type: "error", msg: "No split found for that code." });
                return;
            }

            // if it's yours, no need for authority row
            if (splitRes.data.user_id === userId) {
                onStatus && onStatus({ type: "ok", msg: "That split is already yours." });
                onJoined && onJoined(splitRes.data);
                setCode("");
                return;
            }

            // insert authority row (ignore duplicates if user already has access)
            const ins = await supabase
                .from("landenlifts_split_authority")
                .insert({ user_id: userId, split_id: splitId });

            // If you have a unique constraint (user_id, split_id), Supabase may error on duplicates.
            // We treat that as "already joined".
            if (ins.error) {
                const msg = String(ins.error.message || "");
                const isDup =
                    msg.toLowerCase().includes("duplicate") ||
                    msg.toLowerCase().includes("unique") ||
                    msg.toLowerCase().includes("already exists");
                if (!isDup) throw ins.error;
            }

            onStatus && onStatus({ type: "ok", msg: `Access granted: ${splitRes.data.name}` });
            onJoined && onJoined(splitRes.data);
            setCode("");
        } catch (e) {
            console.error(e);
            onStatus && onStatus({ type: "error", msg: e?.message || "Failed to join split." });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card">
            <h2 style={{ marginBottom: "0.25rem" }}>Join a split</h2>
            <p className="lead" style={{ marginTop: 0 }}>
                Paste a split code to get access to someone else's split.
            </p>

            <div className="grid grid--2" style={{ alignItems: "end" }}>
                <div>
                    <label className="label">Split code</label>
                    <input
                        className="input"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g., 6f2b2a8e-7f0b-4f2f-9f79-7c3b0d5e1a2b"
                        disabled={busy}
                    />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={join}
                        disabled={busy || !canSubmit}
                    >
                        {busy ? "Adding..." : "Add split"}
                    </button>
                </div>
            </div>

            <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--muted)", fontWeight: 800 }}>
                Tip: you can only edit splits you own.
            </p>
        </div>
    );
}
