import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from '../../../supabaseClient';

// ===================== STYLES =====================

const legsLayerStyle = {
    position: "absolute",
    left: "25%",
    top: "60%",
    width: "50%",
    height: "50%",
    objectFit: "contain",
    zIndex: 1
};

const shirtLayerStyle = {
    position: "absolute",
    left: "32.5%",
    top: "35%",
    width: "35%",
    height: "35%",
    objectFit: "contain",
    zIndex: 2
};

const headLayerStyle = {
    position: "absolute",
    left: "35%",
    top: "12%",
    width: "30%",
    height: "30%",
    objectFit: "contain",
    zIndex: 3
};

const hatLayerStyle = {
    position: "absolute",
    left: "37%",
    top: "-7%",
    width: "30%",
    height: "30%",
    objectFit: "contain",
    zIndex: 4
};

// =================== END STYLES ===================

function importAll(r) {
    return r.keys().map(function (key) {
        var src = r(key);

        var fileName = key.replace("./", "");
        var baseName = fileName.replace(/\.[^/.]+$/, "");
        var displayName = baseName.replace(/[_-]+/g, " ");

        return {
            src: src,
            name: displayName
        };
    });
}

function safeFilenamePart(s) {
    return String(s || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");
}

function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const meta = parts[0] || "";
    const b64 = parts[1] || "";
    const match = meta.match(/data:(.*?);base64/);
    const mime = (match && match[1]) ? match[1] : "image/png";
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

async function renderAvatarPngBlob(args) {
    const width = args.width;
    const height = args.height;

    function loadImg(src) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function () { resolve(img); };
            img.onerror = reject;
            img.src = src;
        });
    }

    const legsImg = await loadImg(args.legsSrc);
    const shirtImg = await loadImg(args.shirtSrc);
    const headImg = await loadImg(args.headSrc);
    const hatImg = await loadImg(args.hatSrc);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(0, 0, width, height);

    function drawLayer(img, style) {
        const left = parseFloat(String(style.left).replace("%", "")) / 100;
        const top = parseFloat(String(style.top).replace("%", "")) / 100;
        const w = parseFloat(String(style.width).replace("%", "")) / 100;
        const h = parseFloat(String(style.height).replace("%", "")) / 100;

        const dx = left * width;
        const dy = top * height;
        const dw = w * width;
        const dh = h * height;

        const scale = Math.min(dw / img.width, dh / img.height);
        const rw = img.width * scale;
        const rh = img.height * scale;
        const rx = dx + (dw - rw) / 2;
        const ry = dy + (dh - rh) / 2;

        ctx.drawImage(img, rx, ry, rw, rh);
    }

    drawLayer(legsImg, args.legsStyle);
    drawLayer(shirtImg, args.shirtStyle);
    drawLayer(headImg, args.headStyle);
    drawLayer(hatImg, args.hatStyle);

    const dataUrl = canvas.toDataURL("image/png", 0.92);
    return dataUrlToBlob(dataUrl);
}

export default function AvatarGenerator() {
    useEffect(function () {
        document.title = "Avatar Generator | LandenApps";

        var description = "Customize your own avatar for LandenApps!";
        var metaDesc = document.querySelector("meta[name='description']");
        if (metaDesc) {
            metaDesc.setAttribute("content", description);
        }
    }, []);

    const hats = useMemo(
        function () {
            return importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Hats",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            );
        },
        []
    );

    const heads = useMemo(
        function () {
            return importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Head",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            );
        },
        []
    );

    const shirts = useMemo(
        function () {
            return importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Shirt",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            );
        },
        []
    );

    const legs = useMemo(
        function () {
            return importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Legs",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            );
        },
        []
    );

    const [hatIndex, setHatIndex] = useState(0);
    const [headIndex, setHeadIndex] = useState(0);
    const [shirtIndex, setShirtIndex] = useState(0);
    const [legsIndex, setLegsIndex] = useState(0);

    const [toast, setToast] = useState({ open: false, text: "", kind: "success" });
    const toastTimerRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);

    function showToast(text, kind) {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);

        setToast({
            open: true,
            text: text,
            kind: kind || "success"
        });

        toastTimerRef.current = window.setTimeout(function () {
            setToast({ open: false, text: "", kind: "success" });
        }, 2500);
    }

    useEffect(function () {
        return function () {
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        };
    }, []);

    function cycleIndex(current, arr, delta) {
        if (!arr || arr.length === 0) return 0;
        var len = arr.length;
        return (current + delta + len) % len;
    }

    function randomIndex(arr) {
        if (!arr || arr.length === 0) return 0;
        return Math.floor(Math.random() * arr.length);
    }

    function handleRandomize() {
        setHatIndex(randomIndex(hats));
        setHeadIndex(randomIndex(heads));
        setShirtIndex(randomIndex(shirts));
        setLegsIndex(randomIndex(legs));
    }

    var hasAssets =
        hats.length > 0 &&
        heads.length > 0 &&
        shirts.length > 0 &&
        legs.length > 0;

    async function handleSave() {
        if (!hasAssets) return;
        if (isSaving) return;

        setIsSaving(true);

        try {
            const authRes = await supabase.auth.getUser();
            if (authRes.error) throw authRes.error;

            const user = authRes.data && authRes.data.user ? authRes.data.user : null;
            if (!user || !user.id) throw new Error("Not signed in.");

            // 1) DELETE old avatars in this user's folder (user.id/)
            // This requires Storage policies to allow list + delete for this prefix.
            const listRes = await supabase.storage
                .from("avatar")
                .list(user.id, { limit: 100, offset: 0 });

            if (listRes.error) throw listRes.error;

            const files = listRes.data || [];
            if (files.length > 0) {
                const pathsToDelete = files
                    .filter(function (f) { return f && f.name; })
                    .map(function (f) { return user.id + "/" + f.name; });

                if (pathsToDelete.length > 0) {
                    const delRes = await supabase.storage
                        .from("avatar")
                        .remove(pathsToDelete);

                    if (delRes.error) throw delRes.error;
                }
            }

            // 2) render new avatar
            const blob = await renderAvatarPngBlob({
                width: 256,
                height: 256,
                legsSrc: legs[legsIndex].src,
                shirtSrc: shirts[shirtIndex].src,
                headSrc: heads[headIndex].src,
                hatSrc: hats[hatIndex].src,
                legsStyle: legsLayerStyle,
                shirtStyle: shirtLayerStyle,
                headStyle: headLayerStyle,
                hatStyle: hatLayerStyle
            });

            // 3) upload fresh file
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const fileName =
                user.id +
                "/" +
                stamp +
                "__hat-" + safeFilenamePart(hats[hatIndex].name) +
                "__head-" + safeFilenamePart(heads[headIndex].name) +
                "__shirt-" + safeFilenamePart(shirts[shirtIndex].name) +
                "__legs-" + safeFilenamePart(legs[legsIndex].name) +
                ".png";

            const uploadRes = await supabase.storage
                .from("avatar")
                .upload(fileName, blob, {
                    contentType: "image/png",
                    upsert: true
                });

            if (uploadRes.error) throw uploadRes.error;

            // 4) store path in user table (column "avatar")
            const upsertRes = await supabase
                .from("user")
                .upsert(
                    {
                        id: user.id,
                        avatar: fileName
                    },
                    { onConflict: "id" }
                );

            if (upsertRes.error) throw upsertRes.error;

            showToast("Avatar saved.", "success");
        } catch (e) {
            console.error(e);
            showToast((e && e.message) ? e.message : "Failed to save avatar.", "error");
        } finally {
            setIsSaving(false);
        }
    }


    return (
        <main className="container section">
            <h1>Avatar Generator</h1>
            <p>Customize your own avatar for LandenApps.</p>

            {!hasAssets && (
                <p style={{ color: "red" }}>
                    No avatar images found. Check your folder paths.
                </p>
            )}

            {hasAssets && (
                <>
                    <div
                        style={{
                            position: "relative",
                            width: 256,
                            height: 256,
                            margin: "24px auto",
                            borderRadius: 16,
                            overflow: "hidden",
                            border: "1px solid #333",
                            background: "#f4f4f4"
                        }}
                    >
                        <img src={legs[legsIndex].src} alt="legs" style={legsLayerStyle} />
                        <img src={shirts[shirtIndex].src} alt="shirt" style={shirtLayerStyle} />
                        <img src={heads[headIndex].src} alt="head" style={headLayerStyle} />
                        <img src={hats[hatIndex].src} alt="hat" style={hatLayerStyle} />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 12,
                            maxWidth: 400,
                            margin: "0 auto 24px"
                        }}
                    >
                        <LayerControls
                            label="Hat"
                            current={hats[hatIndex].name}
                            onPrev={function () {
                                setHatIndex(function (idx) {
                                    return cycleIndex(idx, hats, -1);
                                });
                            }}
                            onNext={function () {
                                setHatIndex(function (idx) {
                                    return cycleIndex(idx, hats, 1);
                                });
                            }}
                        />

                        <LayerControls
                            label="Head"
                            current={heads[headIndex].name}
                            onPrev={function () {
                                setHeadIndex(function (idx) {
                                    return cycleIndex(idx, heads, -1);
                                });
                            }}
                            onNext={function () {
                                setHeadIndex(function (idx) {
                                    return cycleIndex(idx, heads, 1);
                                });
                            }}
                        />

                        <LayerControls
                            label="Shirt"
                            current={shirts[shirtIndex].name}
                            onPrev={function () {
                                setShirtIndex(function (idx) {
                                    return cycleIndex(idx, shirts, -1);
                                });
                            }}
                            onNext={function () {
                                setShirtIndex(function (idx) {
                                    return cycleIndex(idx, shirts, 1);
                                });
                            }}
                        />

                        <LayerControls
                            label="Legs"
                            current={legs[legsIndex].name}
                            onPrev={function () {
                                setLegsIndex(function (idx) {
                                    return cycleIndex(idx, legs, -1);
                                });
                            }}
                            onNext={function () {
                                setLegsIndex(function (idx) {
                                    return cycleIndex(idx, legs, 1);
                                });
                            }}
                        />
                    </div>

                    <div
                        style={{
                            textAlign: "center",
                            display: "flex",
                            gap: 12,
                            justifyContent: "center"
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleRandomize}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid #444",
                                cursor: "pointer",
                                fontWeight: 600
                            }}
                        >
                            Mix
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "1px solid #444",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                fontWeight: 600,
                                opacity: isSaving ? 0.6 : 1
                            }}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </>
            )}

            {toast.open && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "fixed",
                        left: "50%",
                        bottom: 24,
                        transform: "translateX(-50%)",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "#fff",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                        fontSize: 14,
                        fontWeight: 600,
                        zIndex: 9999
                    }}
                >
                    <span style={{ marginRight: 8 }}>
                        {toast.kind === "error" ? "X" : "OK"}
                    </span>
                    {toast.text}
                </div>
            )}
        </main>
    );
}

function LayerControls(props) {
    var label = props.label;
    var current = props.current;
    var onPrev = props.onPrev;
    var onNext = props.onNext;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8
            }}
        >
            <span style={{ minWidth: 60 }}>{label}</span>

            <button
                type="button"
                onClick={onPrev}
                aria-label={"Previous " + label}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1px solid #444",
                    cursor: "pointer"
                }}
            >
                {"<"}
            </button>

            <span
                style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 12,
                    opacity: 0.7,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                }}
                title={current}
            >
                {current}
            </span>

            <button
                type="button"
                onClick={onNext}
                aria-label={"Next " + label}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1px solid #444",
                    cursor: "pointer"
                }}
            >
                {">"}
            </button>
        </div>
    );
}
