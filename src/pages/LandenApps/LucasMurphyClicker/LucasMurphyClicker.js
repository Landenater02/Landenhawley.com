import { useState, useEffect, useRef } from "react";
import { Button, Container, Typography, Box, Snackbar } from "@mui/material";

function LucasMurphyClicker() {
    const [Lukes, setLukes] = useState(0);
    const [upgrade, setUpgrade] = useState(1);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [autoClicker, setAutoClicker] = useState(false);
    const [doubleLukes, setDoubleLukes] = useState(false);

    // ---------- IMAGE ----------
    const IMG_CLICKING = "/Images/Pages/LucasMurphyClicker/LucasMurphy.jpg";
    const IMG_WAITING = "/Images/Pages/LucasMurphyClicker/Lucas_Waiting.jpeg";
    const IMG_GOOFY = "/Images/Pages/LucasMurphyClicker/Lucas_Goofy.jpeg";
    const IMG_SMILING = "/Images/Pages/LucasMurphyClicker/Lucas Smiling.jpeg";

    const [currentImg, setCurrentImg] = useState(IMG_WAITING);

    // ---------- SPEED THRESHOLDS ----------
    // Green: very fast
    const FAST_CLICK_MS = 200;

    // Red: "decently slow cadence" (not stopped, but slow-ish)
    // Anything > FAST and <= SLOW gets red.
    const SLOW_CLICK_MS = 600;

    // When you stop clicking, after 1s show random face (yellow border), then default to waiting.
    const STOP_DELAY_MS = 1000;

    const lastClickAtRef = useRef(0);
    const stopTimerRef = useRef(null);
    const hasClickedRef = useRef(false);

    // NEW: border color state
    const [borderColor, setBorderColor] = useState("transparent");

    const upgradeCost = 10 * upgrade;
    const autoClickerCost = 50;
    const doubleLukesCost = 100;

    useEffect(() => {
        const savedLukes = localStorage.getItem("Lukes");
        const savedUpgrade = localStorage.getItem("upgrade");
        const savedAutoClicker = localStorage.getItem("autoClicker");
        const savedDoubleLukes = localStorage.getItem("doubleLukes");

        if (savedLukes) setLukes(Number(savedLukes));
        if (savedUpgrade) setUpgrade(Number(savedUpgrade));
        if (savedAutoClicker) setAutoClicker(JSON.parse(savedAutoClicker));
        if (savedDoubleLukes) setDoubleLukes(JSON.parse(savedDoubleLukes));
    }, []);

    useEffect(() => {
        localStorage.setItem("Lukes", Lukes);
        localStorage.setItem("upgrade", upgrade);
        localStorage.setItem("autoClicker", autoClicker);
        localStorage.setItem("doubleLukes", doubleLukes);
    }, [Lukes, upgrade, autoClicker, doubleLukes]);

    useEffect(() => {
        let interval;
        if (autoClicker) {
            interval = setInterval(() => {
                setLukes((prevLukes) => prevLukes + upgrade);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [autoClicker, upgrade]);

    useEffect(() => {
        return () => {
            if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
        };
    }, []);

    const pickIdleFace = () => {
        return Math.random() < 0.5 ? IMG_GOOFY : IMG_SMILING;
    };

    const scheduleStoppedState = () => {
        if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);

        stopTimerRef.current = window.setTimeout(() => {
            if (!hasClickedRef.current) {
                setCurrentImg(IMG_WAITING);
                setBorderColor("transparent");
                return;
            }

            // Yellow and persist while the random image is shown
            setCurrentImg(pickIdleFace());
            setBorderColor("yellow");

            // Then default to waiting
            window.setTimeout(() => {
                setCurrentImg(IMG_WAITING);
                setBorderColor("transparent");
            }, 900);
        }, STOP_DELAY_MS);
    };

    const handleClick = () => {
        setLukes((prev) => prev + (doubleLukes ? upgrade * 2 : upgrade));

        const now = Date.now();
        const delta = now - lastClickAtRef.current;
        lastClickAtRef.current = now;

        hasClickedRef.current = true;

        // Border logic:
        // - Green when clicking fast enough
        // - Red when not fast (but still clicking at a cadence)
        if (delta <= FAST_CLICK_MS) {
            setCurrentImg(IMG_CLICKING);
            setBorderColor("green");
        } else if (delta <= SLOW_CLICK_MS) {
            setBorderColor("red");
        } else {
            // very slow taps feel basically like "not clicking fast"
            // keep it red too
            setBorderColor("red");
        }

        scheduleStoppedState();
    };

    const buyUpgrade = () => {
        if (Lukes >= upgradeCost) {
            setLukes(Lukes - upgradeCost);
            setUpgrade(upgrade + 1);
            setSnackbarOpen(true);
        }
    };

    const buyAutoClicker = () => {
        if (Lukes >= autoClickerCost && !autoClicker) {
            setLukes(Lukes - autoClickerCost);
            setAutoClicker(true);
            setSnackbarOpen(true);
        }
    };

    const buyDoubleLukes = () => {
        if (Lukes >= doubleLukesCost && !doubleLukes) {
            setLukes(Lukes - doubleLukesCost);
            setDoubleLukes(true);
            setSnackbarOpen(true);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ textAlign: "center", mt: 4 }}>
            <Typography variant="h3" gutterBottom>
                Lucas Murphy Clicker
            </Typography>
            <Typography variant="h6">Lukes: {Lukes}</Typography>

            <Button
                onClick={handleClick}
                variant="contained"
                sx={{
                    mt: 4,
                    background: "none",
                    boxShadow: "none",
                    "&:hover": {
                        transform: "scale(1.1)",
                        transition: "transform 0.3s ease-in-out",
                        boxShadow: "none"
                    },
                    padding: 0
                }}
            >
                <img
                    src={currentImg}
                    alt="Lucas Murphy"
                    width="50"
                    style={{
                        borderRadius: "50%",
                        width: "10rem",
                        height: "10rem",
                       
                        border: borderColor === "transparent" ? "0px solid transparent" : "6px solid " + borderColor,
                        boxSizing: "border-box"
                    }}
                />
            </Button>

            <Box mt={4}>
                <Button onClick={buyUpgrade} variant="outlined" disabled={Lukes < upgradeCost}>
                    Buy Upgrade (Cost: {upgradeCost} Lukes)
                </Button>
                <Typography variant="body1">Upgrade Level: {upgrade}</Typography>

                <Button
                    onClick={buyAutoClicker}
                    variant="outlined"
                    disabled={Lukes < autoClickerCost || autoClicker}
                    sx={{ mt: 2 }}
                >
                    Buy Auto Clicker (Cost: {autoClickerCost} Lukes)
                </Button>

                <Button
                    onClick={buyDoubleLukes}
                    variant="outlined"
                    disabled={Lukes < doubleLukesCost || doubleLukes}
                    sx={{ mt: 2 }}
                >
                    Buy Double Lukes (Cost: {doubleLukesCost} Lukes)
                </Button>
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="Upgrade Purchased!"
            />
        </Container>
    );
}

export default LucasMurphyClicker;
