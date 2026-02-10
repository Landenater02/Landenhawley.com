import {
    Box,
    Button,
    Typography,
    Paper,
    Stack,
    Divider,
    Tooltip,
} from "@mui/material";

// Base costs (already on the higher side)
const BASE_UPGRADE_COST = 25;
const CAPTAIN_BASE_COST = 120;
const DOUBLE_LUKES_COST = 500;
const GOLDEN_CLICK_COST = 900;
const CAPTAIN_TRAINING_COST = 1400;
const LUCKY_CRITS_COST = 2000;
const COFFEE_COST = 250;


// Extra Captain treat scaling
const PEANUT_BUTTER_BASE_COST = 220;

// Fun extras
const EU5_COST = 2600;
const YOGA_MAT_COST = 900;
const BACKPACK_COST = 1800;
const FLUTE_COST = 1100;
const APRON_COST = 1500;
const DND_NIGHT_COST = 1300;
const SANDALS_COST = 800;
const SPYDER_HOODIE_COST = 2200;

// Level-up
const LEVEL_BASE_COST = 30000;

// Superlinear cost growth for upgrades / captains
function superCost(base, level) {
    const n = level + 1;
    return Math.round(base * n * (1 + Math.log(n + 1)));
}

// Level up cost: base * (1 + log2(level))
function getLevelUpCost(level) {
    const log2 = Math.log2 ? Math.log2(level) : Math.log(level) / Math.log(2);
    return Math.round(LEVEL_BASE_COST * (1 + log2));
}

function Shop({
    Lukes,
    level,
    upgrade,
    captainCount,
    doubleLukes,
    goldenClick,
    captainTraining,
    luckyCrits,
    coffeeBoostActive,
    coffeeBoostSecondsLeft,
    setLukes,
    setLevel,
    setUpgrade,
    setCaptainCount,
    setDoubleLukes,
    setGoldenClick,
    setCaptainTraining,
    setLuckyCrits,
    startCoffeeBoost,
    SHOP_ICON,
    onPurchase,
    startPeanutButterBoost,
    peanutButterBoostActive,
    peanutButterBoostSecondsLeft,
    maxLevel

}) {
    const upgradeCost = superCost(BASE_UPGRADE_COST, upgrade);
    const nextCaptainCost = superCost(CAPTAIN_BASE_COST, captainCount);
    const peanutButterCost = superCost(PEANUT_BUTTER_BASE_COST, captainCount);

    const levelUpCost = getLevelUpCost(level);
    const canLevelUp = Lukes >= levelUpCost;


    //==========================================
    //=========== DEV FUNCTIONS ================
    //==========================================
    const devAddLukes = () => {
        setLukes((prev) => prev + 100000000);
    };

    const devReset = () => {
        setCaptainCount(0);
        setLukes(0);
        setLevel(1);
        setDoubleLukes(false);
        setGoldenClick(false);
        setCaptainTraining(false);
        setLuckyCrits(false);

    }

    const devNavigateNext = () => {
        setLevel(level+1);

    }
    const devNavigateLast = () => {
        setLevel(level - 1);

    }
    //==========================================
    //==========================================


    const tryBuy = (cost, onSuccess) => {
        if (Lukes < cost) return;
        setLukes(prev => prev - cost);
        onSuccess();
        if (onPurchase) onPurchase();
    };

    const handleLevelUp = () => {
        if (!canLevelUp) return;
        setLukes(0);
        setLevel(prev => prev + 1);
        if (onPurchase) onPurchase();
    };

    

    // Helper so tooltips work even when the button is disabled
    const tooltipButton = (title, button) => (
        <Tooltip arrow title={title}>
            <span>{button}</span>
        </Tooltip>
    );

    return (



        <Box mt={4}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <Button
                
                startIcon={<i className="fa-solid fa-left-long" />}
                disabled={level <= 1}
                onClick={() =>
                    devNavigateLast()
                }
                sx={{ mb: 1 }}
            >
              
            </Button>
            <p>Level Switch</p>
            <Button

                startIcon={<i className="fa-solid fa-right-long" />}
                disabled={level >=maxLevel}
                onClick={() =>
                    devNavigateNext()
                }
                sx={{ mb: 1 }}
                >
            
               
                </Button>
            </div>
            <Box mt={1}>
                {tooltipButton(
                    "Prestige: resets your Lukes to zero and advances your room to the next level.",
                    <Button
                        fullWidth
                        onClick={handleLevelUp}
                        disabled={!canLevelUp}
                        sx={{
                            fontWeight: "bold",
                            mb: 1,
                            border: canLevelUp ? "2px solid #ffd700" : "2px solid #ddd"  ,
                            color: canLevelUp ? "#3b2b00" : "#ddd",
                            backgroundColor: canLevelUp ? "#ffd700" : "#ddd",
                            "&:hover": {
                                backgroundColor: canLevelUp ? "#ffeb73" : "#ddd",
                            },
                        }}
                    >
                        Level Up (cost: {levelUpCost} Lukes)
                    </Button>
                )}
            </Box>
            <Paper
                elevation={4}
                sx={{
                    p: 3,
                    maxWidth: "100%",
                    backgroundColor: "rgba(255,255,255,0.9)",
                }}
            >
                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ mb: 2 }}
                >
                    {SHOP_ICON && (
                        <img
                            src={SHOP_ICON}
                            alt="Shop"
                            style={{
                                width: "80px",
                                height: "80px",
                                imageRendering: "pixelated",
                            }}
                        />
                    )}
                    <Box>
                        <Typography variant="h4">Lucas Shop</Typography>
                        <Typography variant="subtitle1">
                            Wallet: {Lukes} Lukes
                        </Typography>
                        <Typography variant="subtitle2">Level {level}</Typography>
                    </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Core stat upgrades */}
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        Core Upgrades
                    </Typography>

                    {tooltipButton(
                        "Practice mashing the button. Increases Lukes gained per click.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-hand-pointer" />}
                            disabled={Lukes < upgradeCost}
                            onClick={() =>
                                tryBuy(upgradeCost, () => setUpgrade(u => u + 1))
                            }
                            sx={{ mb: 1 }}
                        >
                            Finger Strength Lv {upgrade} - Cost: {upgradeCost}
                        </Button>
                    )}

                    {tooltipButton(
                        "Doubles all Lukes gained from every click permanently.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-clone" />}
                            disabled={Lukes < DOUBLE_LUKES_COST || doubleLukes}
                            onClick={() =>
                                tryBuy(DOUBLE_LUKES_COST, () => setDoubleLukes(true))
                            }
                            sx={{ mb: 1 }}
                        >
                            Double Lukes - Cost: {DOUBLE_LUKES_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Each click gives +5 extra Lukes on top of all other bonuses.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-star" />}
                            disabled={Lukes < GOLDEN_CLICK_COST || goldenClick}
                            onClick={() =>
                                tryBuy(GOLDEN_CLICK_COST, () => setGoldenClick(true))
                            }
                        >
                            Golden Click - Cost: {GOLDEN_CLICK_COST}
                        </Button>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Captain section */}
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        Captain The Dog
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Captain automatically gives Lukes for you every interval.
                    </Typography>

                    {tooltipButton(
                        "Luke's trusted companion. Each Captain adds automatic Lukes every tick.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-dog" />}
                            disabled={Lukes < nextCaptainCost}
                            onClick={() =>
                                tryBuy(nextCaptainCost, () =>
                                    setCaptainCount(c => c + 1)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Captain helper (owned: {captainCount}) - Cost: {nextCaptainCost}
                        </Button>
                    )}

                    {tooltipButton(
                        "Teaches Captain some new tricks. Permanently speeds up Captain's auto clicks.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-graduation-cap" />}
                            disabled={Lukes < CAPTAIN_TRAINING_COST || captainTraining}
                            onClick={() =>
                                tryBuy(CAPTAIN_TRAINING_COST, () =>
                                    setCaptainTraining(true)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Captain Training - Cost: {CAPTAIN_TRAINING_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "A strong brew for Captain. Halves Captain's interval for 30 seconds.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-mug-hot" />}
                            disabled={
                                Lukes < COFFEE_COST ||
                                coffeeBoostActive ||
                                captainCount === 0
                            }
                            onClick={() =>
                                tryBuy(COFFEE_COST, () => startCoffeeBoost())
                            }
                            sx={{ mb: 1 }}
                        >
                            Captain Coffee - Cost: {COFFEE_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Captain loves peanut butter.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-cookie-bite" />}
                            disabled={
                                Lukes < peanutButterCost ||
                                coffeeBoostActive ||
                                captainCount === 0
                            }
                            onClick={() =>
                                tryBuy(peanutButterCost, () => startPeanutButterBoost())
                            }
                            sx={{ mb: 1 }}
                        >
                            Peanut Butter Feast - Cost: {peanutButterCost}
                        </Button>
                    )}

                    {coffeeBoostActive && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Captain Coffee active: {coffeeBoostSecondsLeft}s left
                        </Typography>
                    )}
                    {peanutButterBoostActive && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Peanut Butter boost active: {peanutButterBoostSecondsLeft}s left
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Fun extras */}
                <Box mb={2}>
                    <Typography variant="h6" gutterBottom>
                        Fun Extras
                    </Typography>

                    {tooltipButton(
                        "Gives your clicks a 10 percent chance to explode for 5x Lukes.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-dice" />}
                            disabled={Lukes < LUCKY_CRITS_COST || luckyCrits}
                            onClick={() =>
                                tryBuy(LUCKY_CRITS_COST, () => setLuckyCrits(true))
                            }
                            sx={{ mb: 1 }}
                        >
                            Lucky Lukes - Cost: {LUCKY_CRITS_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "One more turn... Grants a big burst of Lukes based on your setup.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-gamepad" />}
                            disabled={Lukes < EU5_COST}
                            onClick={() =>
                                tryBuy(EU5_COST, () =>
                                    setLukes(prev =>
                                        prev + 500 + 100 * (upgrade + captainCount)
                                    )
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            EU5 All-Nighter - Cost: {EU5_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "A little stretch goes a long way. Slightly improves click strength.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-leaf" />}
                            disabled={Lukes < YOGA_MAT_COST}
                            onClick={() =>
                                tryBuy(YOGA_MAT_COST, () =>
                                    setUpgrade(u => u + 1)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Yoga Mat - Cost: {YOGA_MAT_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Hauls everything everywhere. Stronger shoulders, stronger clicks (+2 strength).",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-mountain" />}
                            disabled={Lukes < BACKPACK_COST}
                            onClick={() =>
                                tryBuy(BACKPACK_COST, () =>
                                    setUpgrade(u => u + 2)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Super Heavy Backpack - Cost: {BACKPACK_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Lets the flute carry for a bit. Grants an instant pile of Lukes.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-music" />}
                            disabled={Lukes < FLUTE_COST}
                            onClick={() =>
                                tryBuy(FLUTE_COST, () =>
                                    setLukes(prev =>
                                        prev + 300 + 50 * upgrade
                                    )
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Flute Solo - Cost: {FLUTE_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Apron on, chef mode engaged. Adds an extra Captain helper.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-utensils" />}
                            disabled={Lukes < APRON_COST}
                            onClick={() =>
                                tryBuy(APRON_COST, () =>
                                    setCaptainCount(c => c + 1)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Chef Apron - Cost: {APRON_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Roll for chaos. Big flat Luke gain and permanent Lucky Lukes.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-dice-d20" />}
                            disabled={Lukes < DND_NIGHT_COST}
                            onClick={() =>
                                tryBuy(DND_NIGHT_COST, () => {
                                    setLukes(prev => prev + 1000);
                                    setLuckyCrits(true);
                                })
                            }
                            sx={{ mb: 1 }}
                        >
                            DND Night - Cost: {DND_NIGHT_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Clearly peak footwear. Adds a small bump to click strength.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-shoe-prints" />}
                            disabled={Lukes < SANDALS_COST}
                            onClick={() =>
                                tryBuy(SANDALS_COST, () =>
                                    setUpgrade(u => u + 1)
                                )
                            }
                            sx={{ mb: 1 }}
                        >
                            Trusty Sandals - Cost: {SANDALS_COST}
                        </Button>
                    )}

                    {tooltipButton(
                        "Comfy and cracked. Big strength boost, and if you do not own Double Lukes yet, this hoodie unlocks it.",
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<i className="fas fa-spider" />}
                            disabled={Lukes < SPYDER_HOODIE_COST}
                            onClick={() =>
                                tryBuy(SPYDER_HOODIE_COST, () => {
                                    setUpgrade(u => u + 2);
                                    if (!doubleLukes) {
                                        setDoubleLukes(true);
                                    }
                                })
                            }
                        >
                            Spyder Hoodie - Cost: {SPYDER_HOODIE_COST}
                        </Button>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

             
                

                {/* DEV buttons */}
                {/* ============================================================ */}
                <Box mt={3}>
                   

                    <Button
                     
                        color="secondary"
                        fullWidth
                        variant="outlined"
                        startIcon={<i className="fa-solid fa-wand-magic" />}
                        sx={{ mb: 1 }}
                        onClick={devAddLukes}
                    >
                        DEV: +100,000,000 Lukes
                    </Button>
                    <Button color="secondary"
                    fullWidth
                    variant="outlined"
                    startIcon={<i className="fa-solid fa-wand-magic" />}
                    sx={{ mb: 1 }}onClick={devReset}>DEV Reset</Button>
                </Box>
                {/* ============================================================ */}

            </Paper>
        </Box>
    );
}

export default Shop;
