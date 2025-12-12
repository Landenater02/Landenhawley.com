import React, { useEffect, useMemo, useState } from "react";

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
    top:"-12%",
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
        () =>
            importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Hats",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            ),
        []
    );

    const heads = useMemo(
        () =>
            importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Head",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            ),
        []
    );

    const shirts = useMemo(
        () =>
            importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Shirt",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            ),
        []
    );

    const legs = useMemo(
        () =>
            importAll(
                require.context(
                    "../../../../public/Images/Pages/AvatarGenerator/Legs",
                    false,
                    /\.(png|jpe?g|svg)$/
                )
            ),
        []
    );

    const [hatIndex, setHatIndex] = useState(0);
    const [headIndex, setHeadIndex] = useState(0);
    const [shirtIndex, setShirtIndex] = useState(0);
    const [legsIndex, setLegsIndex] = useState(0);

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
                        <img
                            src={legs[legsIndex].src}
                            alt="legs"
                            style={legsLayerStyle}
                        />
                        <img
                            src={shirts[shirtIndex].src}
                            alt="shirt"
                            style={shirtLayerStyle}
                        />
                        <img
                            src={heads[headIndex].src}
                            alt="head"
                            style={headLayerStyle}
                        />
                        <img
                            src={hats[hatIndex].src}
                            alt="hat"
                            style={hatLayerStyle}
                        />
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

                    <div style={{ textAlign: "center" }}>
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
                    </div>
                </>
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
