// src/pages/LandenApps/LandenLifts/LandenLifts.jsx
import React from "react";
import { Switch, Route } from "react-router-dom";

import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import SplitPicker from "./pages/Splits/SplitPicker";
// import Data from "./pages/Data";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";


function LandenLifts() {


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
