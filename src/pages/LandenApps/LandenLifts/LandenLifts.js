// src/pages/LandenApps/LandenLifts/LandenLifts.jsx
import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "react-router-dom";

import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import SplitPicker from "./pages/Splits/SplitPicker";
// import Data from "./pages/Data";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";

function useLandenLiftsServiceWorker() {
    const { pathname } = useLocation();
    const isLifts =
        pathname === "/landenapps/landenlifts" ||
        pathname.startsWith("/landenapps/landenlifts/");

    const didRegisterRef = React.useRef(false);

    useEffect(() => {
        if (!isLifts) return;
        if (didRegisterRef.current) return;
        didRegisterRef.current = true;

        if (!("serviceWorker" in navigator)) return;

        (async () => {
            try {
                // If already registered for this scope, don't re-register
                const existing = await navigator.serviceWorker.getRegistration("/landenapps/landenlifts/");
                if (existing) return;

                await navigator.serviceWorker.register("/landenapps/landenlifts/sw.js", {
                    scope: "/landenapps/landenlifts/"
                });
            } catch (e) {
                console.error("SW register failed:", e);
            }
        })();
    }, [isLifts]);
}


function LandenLifts() {
    useLandenLiftsServiceWorker();

    return (
        <div className="ll-app">
            <TopBar />

            <main className="ll-main">
                <div className="container">
                    <Switch>
                        <Route exact path="/landenapps/landenlifts" component={Dashboard} />
                        <Route exact path="/landenapps/landenlifts/splits" component={SplitPicker} />
                        {/* <Route exact path="/landenapps/landenlifts/data" component={Data} /> */}
                        <Route exact path="/landenapps/landenlifts/setup" component={Setup} />
                        <Route component={NotFound} />
                    </Switch>
                </div>
            </main>
        </div>
    );
}

export default LandenLifts;
