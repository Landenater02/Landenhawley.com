import { useState, useEffect, useRef,useCallback } from "react";
import {
    Button,
    Container,
    Typography,
    Snackbar,
    Box,
    IconButton,
} from "@mui/material";
import Shop from "./Shop";


const levels = {
    1: {
        name: "Lukes Bedroom",
        cost: 0,
        background: "/Images/Pages/LucasMurphyClicker/LukesRoom.png",
        song: "/Images/Pages/LucasMurphyClicker/LukesRoom.mp3",
    },
    2: {
        name: "Christmas Luke",
        cost: 35000,
        background: "/Images/Pages/LucasMurphyClicker/Christmas.png",
        song: "/Images/Pages/LucasMurphyClicker/Christmas.mp3",
    },
    3: {
        name: "City",
        cost: 120000,
        background: "/Images/Pages/LucasMurphyClicker/City.png",
        song: "/Images/Pages/LucasMurphyClicker/City.mp3",
    },

    4: {
        name: "Luke's Zen Garden",
        cost: 300000,
        background: "/Images/Pages/LucasMurphyClicker/ZenGarden.png",
        song: "/Images/Pages/LucasMurphyClicker/ZenGarden.mp3",
    },
    5: {
        name: "Desert Luke",
        cost: 500000,
        background: "/Images/Pages/LucasMurphyClicker/Desert.png",
        song: "/Images/Pages/LucasMurphyClicker/Desert.mp3",
    },
    6: {
        name: "Lucas's Hell Storm",
        cost: 750000,
        background: "/Images/Pages/LucasMurphyClicker/Hell.png",
        song: "/Images/Pages/LucasMurphyClicker/Hell.mp3",
    },
    7: {
        name: "Boss Luke",
        cost: 1000000,
        background: "/Images/Pages/LucasMurphyClicker/BossLevel.png",
        song: "/Images/Pages/LucasMurphyClicker/BossLevelLMC.mp3",
    },

}

function LucasMurphyClicker() {
    const [Lukes, setLukes] = useState(0);
    const [upgrade, setUpgrade] = useState(1);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // level / background
    const [level, setLevel] = useState(1);

    // boss fight (level 5)
    const [bossHits, setBossHits] = useState(0);
    const [gameWon, setGameWon] = useState(false);

    


    const bossLevelHealth = 20; // test


    // Captain and upgrades
    const [captainCount, setCaptainCount] = useState(0);
    const [doubleLukes, setDoubleLukes] = useState(false);
    const [goldenClick, setGoldenClick] = useState(false);
    const [captainTraining, setCaptainTraining] = useState(false);
    const [luckyCrits, setLuckyCrits] = useState(false);

    // Captain coffee temporary boost
    const [coffeeBoostActive, setCoffeeBoostActive] = useState(false);
    const [coffeeBoostSecondsLeft, setCoffeeBoostSecondsLeft] = useState(0);
    const [peanutButterBoostActive, setpeanutButterBoostActive] = useState(false);
    const [peanutButterBoostSecondsLeft, setpeanutButterBoostSecondsLeft] = useState(0);

    const coffeeTimerRef = useRef(null);
    const peanutButterTimerRef = useRef(null);
    // shop view toggle
    const [showShop, setShowShop] = useState(false);

    // Captain shake animation flag
    const [captainShake, setCaptainShake] = useState(false);

    //const LukesBedroom = 1;
    const ChristmasLuke = 2;
    //const City = 3;
    //const LukesZenGarden = 4;
   // const DesertLuke = 5;
    const LucasHellStorm = 6;
    const BossLuke = 7;

    
   
    // images
    const IMG_CLICKING = "/Images/Pages/LucasMurphyClicker/LucasMurphy.jpg";
    const IMG_WAITING = "/Images/Pages/LucasMurphyClicker/Lucas_Waiting.jpeg";
    const IMG_GOOFY = "/Images/Pages/LucasMurphyClicker/Lucas_Goofy.jpeg";
    const IMG_SMILING = "/Images/Pages/LucasMurphyClicker/Lucas Smiling.jpeg";
    const SHOP_ICON = "/Images/Pages/LucasMurphyClicker/shop.png";
    const Cappy = "/Images/Pages/LucasMurphyClicker/captain.jpeg";
    const CappyLick = "/Images/Pages/LucasMurphyClicker/captainlick.jpeg";

    // Sound FX (make sure these match your actual file extensions)
    const Taps = [
        "/Images/Pages/LucasMurphyClicker/Tap1LMC.wav",
        "/Images/Pages/LucasMurphyClicker/Tap2LMC.wav",
        "/Images/Pages/LucasMurphyClicker/Tap3LMC.wav",
    ];

    // backgrounds and music
   
  

    const getBackgroundForLevel = (lvl) => {
        return levels[lvl]?.background || levels[1].background;
    };

    const getMusicForLevel = useCallback(
        (lvl) => levels[lvl]?.song || levels[1].song,
        []
    );


    const [currentImg, setCurrentImg] = useState(IMG_WAITING);

    const FAST_CLICK_MS = 125;
    const SLOW_CLICK_MS = 300;
    const STOP_DELAY_MS = 2000;

    const lastClickAtRef = useRef(0);
    const stopTimerRef = useRef(null);
    const hasClickedRef = useRef(false);

    const [borderColor, setBorderColor] = useState("transparent");

    // background music ref
    const musicRef = useRef(null);

    // winter freeze (level 2) state
    const [isFreezing, setIsFreezing] = useState(false);
    const [freezeSeconds, setFreezeSeconds] = useState(0);
    const FREEZE_DELAY_MS = 3000;
    const FREEZE_PENALTY_STEP = 15;
    const freezeStartTimeoutRef = useRef(null);
    const freezeIntervalRef = useRef(null);

    // loss text flash (for winter penalty)
    const [lossFlash, setLossFlash] = useState(false);
    const [lastLossAmount, setLastLossAmount] = useState(0);
    const lossFlashTimeoutRef = useRef(null);

    // track previous level to detect transitions
    const prevLevelRef = useRef(1);

    // boss Luke position (level 5) as percentages of viewport
    const [bossPos, setBossPos] = useState({ top: 20, left: 20 });

    // fireballs for level 4
    const [fireballs, setFireballs] = useState([]);
    const fireballIdRef = useRef(0);

    // Luke DOM ref (for fireball targeting)
    const lukeRef = useRef(null);
    const [fireTarget, setFireTarget] = useState({ x: 0.5, y: 0.5 });

    // red hit flash (fireball hit)
    const [hitFlash, setHitFlash] = useState(false);
    const hitFlashTimeoutRef = useRef(null);

    // init audio object once
    useEffect(() => {
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0.4;
        musicRef.current = audio;

        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    // update fireball target to center of Luke in viewport
    useEffect(() => {
        const updateTarget = () => {
            if (!lukeRef.current) return;
            const rect = lukeRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const vw =
                window.innerWidth || document.documentElement.clientWidth || 1;
            const vh =
                window.innerHeight || document.documentElement.clientHeight || 1;
            setFireTarget({
                x: cx / vw,
                y: cy / vh,
            });
        };

        updateTarget();
        window.addEventListener("resize", updateTarget);
        return () => {
            window.removeEventListener("resize", updateTarget);
        };
    }, [showShop, level]);

    // helper: stop and clear all freezing-related state
    const cancelFreeze = () => {
        setIsFreezing(false);
        setFreezeSeconds(0);
        if (freezeStartTimeoutRef.current) {
            clearTimeout(freezeStartTimeoutRef.current);
            freezeStartTimeoutRef.current = null;
        }
        if (freezeIntervalRef.current) {
            clearInterval(freezeIntervalRef.current);
            freezeIntervalRef.current = null;
        }
        if (lossFlashTimeoutRef.current) {
            clearTimeout(lossFlashTimeoutRef.current);
            lossFlashTimeoutRef.current = null;
        }
        setLossFlash(false);
    };

    // if we open the shop, pause winter freeze
    useEffect(() => {
        if (showShop) {
            cancelFreeze();
        }
    }, [showShop]);

    // helper: clear upgrades when entering level 5 (boss level) and reset Lukes
    const resetUpgradesForBoss = () => {
        setUpgrade(1);
        setCaptainCount(0);
        setDoubleLukes(false);
        setGoldenClick(false);
        setCaptainTraining(false);
        setLuckyCrits(false);

        setCoffeeBoostActive(false);
        setCoffeeBoostSecondsLeft(0);
        if (coffeeTimerRef.current) {
            clearInterval(coffeeTimerRef.current);
            coffeeTimerRef.current = null;
        }

        setLukes(0);
        setBossHits(0);
        setGameWon(false);
        setShowShop(false);
    };

    // full reset back to level 1 after winning
    const resetToLevelOne = () => {
        setLevel(1);
        setLukes(0);
        setUpgrade(1);
        setCaptainCount(0);
        setDoubleLukes(false);
        setGoldenClick(false);
        setCaptainTraining(false);
        setLuckyCrits(false);

        setCoffeeBoostActive(false);
        setCoffeeBoostSecondsLeft(0);
        if (coffeeTimerRef.current) {
            clearInterval(coffeeTimerRef.current);
            coffeeTimerRef.current = null;
        }

        setBossHits(0);
        setGameWon(false);
        setShowShop(false);
        cancelFreeze();
        setCurrentImg(IMG_WAITING);
        setBorderColor("transparent");
    };

  
    // load from storage
    useEffect(() => {
        const savedLukes = localStorage.getItem("Lukes");
        const savedUpgrade = localStorage.getItem("upgrade");
        const savedCaptainCount = localStorage.getItem("captainCount");
        const savedDoubleLukes = localStorage.getItem("doubleLukes");
        const savedGoldenClick = localStorage.getItem("goldenClick");
        const savedCaptainTraining = localStorage.getItem("captainTraining");
        const savedLuckyCrits = localStorage.getItem("luckyCrits");
        const savedLevel = localStorage.getItem("level");

        if (savedLukes) setLukes(Number(savedLukes));
        if (savedUpgrade) setUpgrade(Number(savedUpgrade));
        if (savedCaptainCount) setCaptainCount(Number(savedCaptainCount));
        if (savedDoubleLukes) setDoubleLukes(JSON.parse(savedDoubleLukes));
        if (savedGoldenClick) setGoldenClick(JSON.parse(savedGoldenClick));
        if (savedCaptainTraining)
            setCaptainTraining(JSON.parse(savedCaptainTraining));
        if (savedLuckyCrits) setLuckyCrits(JSON.parse(savedLuckyCrits));
        if (savedLevel) setLevel(Number(savedLevel));
    }, []);

    // save to storage (not saving bossHits or gameWon; those are per-run)
    useEffect(() => {
        localStorage.setItem("Lukes", Lukes);
        localStorage.setItem("upgrade", upgrade);
        localStorage.setItem("captainCount", captainCount);
        localStorage.setItem("doubleLukes", doubleLukes);
        localStorage.setItem("goldenClick", goldenClick);
        localStorage.setItem("captainTraining", captainTraining);
        localStorage.setItem("luckyCrits", luckyCrits);
        localStorage.setItem("level", level);
    }, [
        Lukes,
        upgrade,
        captainCount,
        doubleLukes,
        goldenClick,
        captainTraining,
        luckyCrits,
        level,
    ]);

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

            setCurrentImg(pickIdleFace());
            setBorderColor("yellow");

            window.setTimeout(() => {
                setCurrentImg(IMG_WAITING);
                setBorderColor("transparent");
            }, 900);
        }, STOP_DELAY_MS);
    };

    

    // cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
            if (coffeeTimerRef.current) clearInterval(coffeeTimerRef.current);
            if (freezeStartTimeoutRef.current)
                clearTimeout(freezeStartTimeoutRef.current);
            if (freezeIntervalRef.current) clearInterval(freezeIntervalRef.current);
            if (lossFlashTimeoutRef.current)
                clearTimeout(lossFlashTimeoutRef.current);
            if (hitFlashTimeoutRef.current)
                clearTimeout(hitFlashTimeoutRef.current);
        };
    }, []);

    const handleClick = () => {
        if (gameWon) return;

        // Play random tap sound whenever you click Luke
        if (Taps.length > 0) {
            const randomTap = Taps[Math.floor(Math.random() * Taps.length)];
            const tapAudio = new Audio(randomTap);
            tapAudio.volume = 0.7;
            tapAudio.play().catch(() => { });
        }

        if (musicRef.current && musicRef.current.paused) {
            musicRef.current.play().catch(() => { });
        }

        if (showShop) return;

        cancelFreeze();
        scheduleFreezeStart();

        if (level === BossLuke ) {
            setBossHits((prev) => {
                const next = prev + 1;
                if (next >= bossLevelHealth) {
                    setGameWon(true);
                }
                return next;
            });
        }

        let perClick = upgrade;
        if (goldenClick) perClick += 5;
        if (doubleLukes) perClick = perClick * 2;

        const critMultiplier = luckyCrits && Math.random() < 0.1 ? 5 : 1;
        const lukesToAdd = perClick * critMultiplier;
        
        setLukes((prev) => prev + lukesToAdd);
        
        const now = Date.now();
        const delta = now - lastClickAtRef.current;
        lastClickAtRef.current = now;

        hasClickedRef.current = true;

        if (delta <= FAST_CLICK_MS) {
            setCurrentImg(IMG_CLICKING);
            setBorderColor("green");
        } else if (delta <= SLOW_CLICK_MS) {
            setBorderColor("red");
        } else {
            setBorderColor("red");
        }

        triggerCaptainShake();
        scheduleStoppedState();
    };

    const handlePurchaseSnackbar = () => {
        setSnackbarOpen(true);
    };




    //========================================================
    //=================Captain Logic==========================
    //========================================================

    const startCoffeeBoost = () => {
        if (coffeeTimerRef.current) {
            clearInterval(coffeeTimerRef.current);
            coffeeTimerRef.current = null;
        }

        setCoffeeBoostActive(true);
        setCoffeeBoostSecondsLeft(30);

        coffeeTimerRef.current = setInterval(() => {
            setCoffeeBoostSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(coffeeTimerRef.current);
                    coffeeTimerRef.current = null;
                    setCoffeeBoostActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startPeanutButterBoost = () => {
        if (peanutButterTimerRef.current) {
            clearInterval(peanutButterTimerRef.current);
            peanutButterTimerRef.current = null;
        }

        setpeanutButterBoostActive(true);
        setpeanutButterBoostSecondsLeft(90);

        peanutButterTimerRef.current = setInterval(() => {
            setpeanutButterBoostSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(peanutButterTimerRef.current);
                    peanutButterTimerRef.current = null;
                    setpeanutButterBoostActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const triggerCaptainShake = () => {
        setCaptainShake(false);
        window.requestAnimationFrame(() => {
            setCaptainShake(true);
            window.setTimeout(() => {
                setCaptainShake(false);
            }, 300);
        });
    };

    // Captain auto clicker (paused in shop, boss level, or game won)
    useEffect(() => {
        if (captainCount <= 0 || showShop || gameWon || level === BossLuke) {
            return;
        }

        let intervalMs = 1000;
        if (captainTraining) intervalMs = intervalMs / 2;
        if (coffeeBoostActive) intervalMs = intervalMs / 2;
        if (peanutButterBoostActive) intervalMs = intervalMs / 4;

        const basePerClick = upgrade + (goldenClick ? 5 : 0);
        const doubleMult = doubleLukes ? 2 : 1;
        const perTickPerCaptain = basePerClick * doubleMult;
        const lukesPerTick = perTickPerCaptain * captainCount * (peanutButterBoostActive ? 2.5 : 1);

        const interval = setInterval(() => {
            if (!isFreezing) {
                setLukes((prev) => prev + lukesPerTick);
                triggerCaptainShake();
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [
        captainCount,
        upgrade,
        doubleLukes,
        goldenClick,
        captainTraining,
        coffeeBoostActive,
        showShop,
        gameWon,
        level,
        peanutButterBoostActive,
        isFreezing,
        BossLuke
    ]);


    // Captains in a rotating ring
    const renderCaptains = () => {
        if (captainCount <= 0) return null;

        const radius = 115;
        const dogs = [];

        const frozenCaptains = isFreezing && freezeSeconds >= 6;
        const captainImageSrc = frozenCaptains
            ? Cappy
            : captainShake
                ? CappyLick
                : Cappy;

        for (let i = 0; i < captainCount; i++) {
            const angle = (2 * Math.PI * i) / captainCount;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            dogs.push(
                <Box
                    key={i}
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform:
                            "translate(-50%, -50%) translate(" +
                            x +
                            "px, " +
                            y +
                            "px)",
                        pointerEvents: "none",
                    }}
                >
                    <img
                        src={captainImageSrc}
                        alt="Captain"
                        style={{
                            width: "4.25rem",
                            height: "4.25rem",
                            borderRadius: "50%",
                            border: "3px solid white",
                            boxShadow: "0 0 6px rgba(0,0,0,0.4)",
                            objectFit: "cover",
                            animation:
                                frozenCaptains || !captainShake
                                    ? "none"
                                    : "captainShake 0.3s ease-in-out",
                            filter: frozenCaptains
                                ? "hue-rotate(200deg) saturate(1.5)"
                                : "none",
                            transition: "filter 0.4s ease",
                        }}
                    />
                </Box>
            );
        }
        const baseDuration = peanutButterBoostActive? 2: coffeeBoostActive?6 :  8;

        


        const orbitDuration = isFreezing
            ? baseDuration + freezeSeconds * 2
            : baseDuration;
        const orbitAnimation = frozenCaptains
            ? "none"
            : "captainOrbit " + orbitDuration + "s linear infinite";

        return (
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    animation: orbitAnimation,
                    transformOrigin: "50% 50%",
                }}
            >
                {dogs}
            </Box>
        );
    };
    //========================================================
    //^^^^^^^^^^^^^^^^^Captain Logic^^^^^^^^^^^^^^^^^^^^^^^^^^
    //========================================================




    //========================================================
    //==============Level-specific Logic======================
    //========================================================

    //level 2: winter freeze scheduling
    const scheduleFreezeStart = () => {
        if (level !== ChristmasLuke || showShop || gameWon) return;

        if (freezeStartTimeoutRef.current) {
            clearTimeout(freezeStartTimeoutRef.current);
        }

        freezeStartTimeoutRef.current = setTimeout(() => {
            if (level !== ChristmasLuke || showShop || gameWon) return;

            setIsFreezing(true);
            setFreezeSeconds(0);

            if (freezeIntervalRef.current) {
                clearInterval(freezeIntervalRef.current);
            }

            freezeIntervalRef.current = setInterval(() => {
                setFreezeSeconds((prevSeconds) => {
                    const nextSeconds = prevSeconds + 1;
                    const loss = FREEZE_PENALTY_STEP * nextSeconds;

                    setLukes((prevLukes) => {
                        const lossAmount = Math.min(loss, prevLukes);
                        const newLukes = Math.max(0, prevLukes - lossAmount);
                        setLastLossAmount(lossAmount);
                        setLossFlash(true);
                        if (lossFlashTimeoutRef.current) {
                            clearTimeout(lossFlashTimeoutRef.current);
                        }
                        lossFlashTimeoutRef.current = setTimeout(() => {
                            setLossFlash(false);
                        }, 700);
                        return newLukes;
                    });

                    return nextSeconds;
                });
            }, 1000);
        }, FREEZE_DELAY_MS);
    };




    const currentBackground = getBackgroundForLevel(level);
    const isBossLevel = level === BossLuke;

    

    // decide filter for Luke (red hit has priority over blue freeze)
    let lukeFilter = "none";
    if (hitFlash) {
        lukeFilter = "hue-rotate(-40deg) saturate(2)";
    } else if (isFreezing && level === ChristmasLuke) {
        lukeFilter = "hue-rotate(200deg) saturate(1.5)";
    }
    // Fireball spawning and movement (level 4 only, paused in shop and when game won)
    useEffect(() => {
        if (level !== LucasHellStorm || showShop || gameWon) {
            setFireballs([]);
            return;
        }

        const centerX = fireTarget.x;
        const centerY = fireTarget.y;
        const hitRadius = 0.12;
        const tickMs = 80;
        const speedFactor = 0.01;

        const makeFireball = () => {
            const side = Math.floor(Math.random() * 4);
            let x = 0;
            let y = 0;

            if (side === 0) {
                x = Math.random();
                y = -0.1;
            } else if (side === 1) {
                x = 1.1;
                y = Math.random();
            } else if (side === 2) {
                x = Math.random();
                y = 1.1;
            } else {
                x = -0.1;
                y = Math.random();
            }

            const targetOffsetX = (Math.random() - 0.5) * 0.2;
            const targetOffsetY = (Math.random() - 0.5) * 0.2;
            const tx = centerX + targetOffsetX;
            const ty = centerY + targetOffsetY;

            const dx = tx - x;
            const dy = ty - y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const vx = (dx / dist) * speedFactor;
            const vy = (dy / dist) * speedFactor;

            const isRed = Math.random() < 0.6;
            const color = isRed ? "red" : "blue";
            const hp = isRed ? 1 : 2;

            const id = fireballIdRef.current++;
            return { id, x, y, vx, vy, color, hp };
        };

        const interval = setInterval(() => {
            setFireballs((prev) => {
                let updated = prev.map((f) => ({
                    ...f,
                    x: f.x + f.vx,
                    y: f.y + f.vy,
                }));

                const survivors = [];

                updated.forEach((f) => {
                    const dx = f.x - centerX;
                    const dy = f.y - centerY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < hitRadius * hitRadius) {
                        setLukes((prevLukes) => {
                            const loss = Math.floor(prevLukes * 0.25);
                            const newLukes = Math.max(0, prevLukes - loss);
                            return newLukes;
                        });

                        // flash Luke red on hit
                        setHitFlash(true);
                        if (hitFlashTimeoutRef.current) {
                            clearTimeout(hitFlashTimeoutRef.current);
                        }
                        hitFlashTimeoutRef.current = setTimeout(() => {
                            setHitFlash(false);
                        }, 300);

                        return;
                    }

                    if (f.x < -0.3 || f.x > 1.3 || f.y < -0.3 || f.y > 1.3) {
                        return;
                    }

                    survivors.push(f);
                });

                // fewer fireballs: lower spawn chance and cap
                if (Math.random() < 0.04 && survivors.length < 5) {
                    survivors.push(makeFireball());
                }

                return survivors;
            });
        }, tickMs);

        return () => clearInterval(interval);
    }, [level, showShop, gameWon, fireTarget, setLukes]);

    const handleFireballClick = (e, id) => {
        e.stopPropagation();
        if (showShop || gameWon || level !== LucasHellStorm) return;

        setFireballs((prev) => {
            const next = [];
            for (const f of prev) {
                if (f.id === id) {
                    const newHp = f.hp - 1;
                    if (newHp > 0) {
                        // change to red, "1" style on first hit if it was blue
                        next.push({ ...f, hp: newHp, color: "red" });
                    }
                } else {
                    next.push(f);
                }
            }
            return next;
        });
    };

    // switch music and handle level-specific side effects when level changes
    useEffect(() => {
        const prevLevel = prevLevelRef.current;

        if (musicRef.current) {
            const audio = musicRef.current;
            const newSrc = getMusicForLevel(level);

            audio.pause();
            audio.src = newSrc;
            audio.load();
            audio.play().catch(() => { });
        }

        // freezing only applies to level 2; leaving level 2 cancels freeze
        if (level !== ChristmasLuke) {
            cancelFreeze();
        }

        // entering level 5 from a different level: boss mode, clear upgrades and Lukes
        if (isBossLevel && prevLevel !== BossLuke) {
            resetUpgradesForBoss();
        }

     
        if (level !== LucasHellStorm) {
            setFireballs([]);
        }

        prevLevelRef.current = level;
    }, [level, BossLuke, isBossLevel, getMusicForLevel]);

    // randomize boss position while in level 5
    useEffect(() => {
        if (level !== BossLuke || showShop || gameWon) return;

        const moveBoss = () => {
            const top = 10 + Math.random() * 80;
            const left = 10 + Math.random() * 80;
            setBossPos({ top, left });
        };

        moveBoss();

        const interval = setInterval(moveBoss, 600);
        return () => clearInterval(interval);
    }, [level, showShop, gameWon]);



    //========================================================
    //^^^^^^^^^^^^^^^^Level-Specific Logic^^^^^^^^^^^^^^^^^^^^ 
    //========================================================
















    //========================================================
    //==============      Rendering    =======================
    //========================================================

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                backgroundImage: `url(${currentBackground})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                pt: 4,
                pb: 4,
            }}
        >
            <style>{`
        @keyframes captainShake {
          0% { transform: scale(1); }
          25% { transform: scale(1.05) rotate(-5deg); }
          50% { transform: scale(1.05) rotate(5deg); }
          75% { transform: scale(1.05) rotate(-5deg); }
          100% { transform: scale(1); }
        }

        @keyframes captainOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

            {/* Level 4 fireballs overlay */}
            {level === LucasHellStorm && !showShop && !gameWon && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        pointerEvents: "none",
                        zIndex: 6,
                    }}
                >
                    {fireballs.map((f) => (
                        <Box
                            key={f.id}
                            onClick={(e) => handleFireballClick(e, f.id)}
                            sx={{
                                position: "absolute",
                                top: f.y * 100 + "%",
                                left: f.x * 100 + "%",
                                transform: "translate(-50%, -50%)",
                                width: "4.5rem",
                                height: "4.5rem",
                                borderRadius: "50%",
                                background:
                                    f.color === "red"
                                        ? "radial-gradient(circle, #ffaaaa 0%, #ff0000 70%)"
                                        : "radial-gradient(circle, #aaaaff 0%, #0000ff 70%)",
                                boxShadow: "0 0 12px rgba(0,0,0,0.6)",
                                border:
                                    f.color === "red"
                                        ? "2px solid #ffdddd"
                                        : "2px solid #ddddff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                pointerEvents: "auto",
                                cursor: "pointer",
                                userSelect: "none",
                            }}
                        >
                            {f.hp}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Boss overlay */}
            {isBossLevel && !gameWon && !showShop && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        pointerEvents: "none",
                        zIndex: 5,
                    }}
                >
                    <Button
                        onClick={handleClick}
                        variant="contained"
                        sx={{
                            position: "absolute",
                            top: bossPos.top + "%",
                            left: bossPos.left + "%",
                            transform: "translate(-50%, -50%)",
                            background: "none",
                            boxShadow: "none",
                            padding: 0,
                            minWidth: "auto",
                            pointerEvents: "auto",
                            transition:
                                "top 0.25s linear, left 0.25s linear, transform 0.15s ease-in-out",
                            "&:hover": {
                                transform:
                                    "translate(-50%, -50%) scale(1.1)",
                                boxShadow: "none",
                            },
                        }}
                    >
                        <img
                            src={currentImg}
                            alt="Lucas Murphy"
                            style={{
                                borderRadius: "50%",
                                width: "12rem",
                                height: "9rem",
                                border:
                                    borderColor === "transparent"
                                        ? "0px solid transparent"
                                        : "6px solid " + borderColor,
                                boxSizing: "border-box",
                                filter: lukeFilter,
                                transition: "filter 0.2s ease",
                            }}
                        />
                    </Button>
                </Box>
            )}

            {/* Victory overlay */}
            {gameWon && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                    }}
                >
                    <Box
                        sx={{
                            backgroundColor: "white",
                            borderRadius: 2,
                            p: 4,
                            textAlign: "center",
                            maxWidth: 400,
                        }}
                    >
                        <Typography variant="h4" gutterBottom>
                            Victory!
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            You defeated Boss Luke with {bossHits} clicks.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={resetToLevelOne}
                            sx={{ mt: 2 }}
                        >
                            Reset to Level 1
                        </Button>
                    </Box>
                </Box>
            )}

            <Container
                maxWidth="sm"
                sx={{
                    textAlign: "center",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: 2,
                    pb: 3,
                }}
            >
                <Typography variant="h3" gutterBottom>
                    Lucas Murphy Clicker
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    Level {level}
                </Typography>

                <Typography variant="h6" gutterBottom>
                    Lukes: {Lukes}
                </Typography>

                {isBossLevel && !gameWon && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Boss health: {bossHits} / 75 clicks
                    </Typography>
                )}

                {coffeeBoostActive && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Coffee Boost: {coffeeBoostSecondsLeft}s remaining
                    </Typography>
                )}

                {peanutButterBoostActive && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Peanut Butter Boost: {peanutButterBoostSecondsLeft}s remaining
                    </Typography>
                )}

                {captainCount > 0 && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Captains working: {captainCount}
                    </Typography>
                )}

                {showShop && !isBossLevel ? (
                    <>
                        <Box mb={2}>
                            <Button variant="outlined" onClick={() => setShowShop(false)}>
                                Back to Game
                            </Button>
                        </Box>

                        <Shop
                            Lukes={Lukes}
                            level={level}
                            upgrade={upgrade}
                            captainCount={captainCount}
                            doubleLukes={doubleLukes}
                            goldenClick={goldenClick}
                            captainTraining={captainTraining}
                            luckyCrits={luckyCrits}
                            coffeeBoostActive={coffeeBoostActive}
                            coffeeBoostSecondsLeft={coffeeBoostSecondsLeft}
                            setLukes={setLukes}
                            setLevel={setLevel}
                            setUpgrade={setUpgrade}
                            setCaptainCount={setCaptainCount}
                            setDoubleLukes={setDoubleLukes}
                            setGoldenClick={setGoldenClick}
                            setCaptainTraining={setCaptainTraining}
                            setLuckyCrits={setLuckyCrits}
                            startCoffeeBoost={startCoffeeBoost}
                            SHOP_ICON={SHOP_ICON}
                            onPurchase={handlePurchaseSnackbar}
                            startPeanutButterBoost={startPeanutButterBoost}
                            peanutButterBoostActive={peanutButterBoostActive}
                            peanutButterBoostSecondsLeft={peanutButterBoostSecondsLeft}
                            BossLuke={BossLuke}
                        />
                    </>
                ) : (
                    <>
                        {!isBossLevel && (
                            <Box
                                sx={{
                                    position: "relative",
                                    mt: 4,
                                    width: "18rem",
                                    height: "18rem",
                                    margin: "0 auto",
                                }}
                            >
                                {renderCaptains()}

                                <Button
                                    ref={lukeRef}
                                    onClick={handleClick}
                                    variant="contained"
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        background: "none",
                                        boxShadow: "none",
                                        "&:hover": {
                                            transform:
                                                "translate(-50%, -50%) scale(1.1)",
                                            transition:
                                                "transform 0.3s ease-in-out",
                                            boxShadow: "none",
                                        },
                                        padding: 0,
                                        minWidth: "auto",
                                    }}
                                >
                                    <img
                                        src={currentImg}
                                        alt="Lucas Murphy"
                                        style={{
                                            borderRadius: "50%",
                                            width: "12rem",
                                            height: "9rem",
                                            border:
                                                borderColor === "transparent"
                                                    ? "0px solid transparent"
                                                    : "6px solid " + borderColor,
                                            boxSizing: "border-box",
                                            filter: lukeFilter,
                                            transition: "filter 0.2s ease",
                                        }}
                                    />
                                </Button>

                                {lossFlash && level === ChristmasLuke && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: "50%",
                                            left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            pointerEvents: "none",
                                            zIndex: 4,
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                color: "red",
                                                fontWeight: "bold",
                                                textShadow: "1px 1px 2px #000",
                                            }}
                                        >
                                            -{lastLossAmount}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {!isBossLevel && (
                            <Box
                                mt={3}
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                            >
                                <IconButton
                                    onClick={() => setShowShop(true)}
                                    sx={{ p: 0.5, borderRadius: 2 }}
                                >
                                    <img
                                        src={SHOP_ICON}
                                        alt="Open Shop"
                                        style={{
                                            width: "64px",
                                            height: "64px",
                                            imageRendering: "pixelated",
                                        }}
                                    />
                                </IconButton>

                                <Typography variant="caption">Open Shop</Typography>
                            </Box>
                        )}
                    </>
                )}

                

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    message="Upgrade Purchased!"
                />
            </Container>
        </Box>
    );
}
export default LucasMurphyClicker;
//========================================================
//^^^^^^^^^^^^^^^^^^^ Rendering ^^^^^^^^^^^^^^^^^^^^^^^^^^
//========================================================