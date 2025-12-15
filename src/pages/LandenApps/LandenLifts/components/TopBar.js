import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function TopBar() {
    const location = useLocation();

    const isActive = (path) =>
        location.pathname === path ||
        (path !== "/landenlifts" && location.pathname.startsWith(path));
    const isExactActive = (path) => location.pathname === path;
    return (
        <header className="app-nav">
            <div className="container">
                <div className="inner">
                    <div className="brand">
                        <span className="dot" />
                        <span>LandenLifts</span>
                    </div>

                    <nav className="nav-links">
                        <Link className={`nav-link ${isExactActive("/landenapps/landenlifts") ? "active" : ""}`} to="/landenapps/landenlifts">
                            Dashboard
                        </Link>
                        <Link className={`nav-link ${isActive("/landenapps/landenlifts/splits") ? "active" : ""}`} to="/landenapps/landenlifts/splits">
                            Splits
                        </Link>
                        {/*<Link className={`nav-link ${isActive("/landenlifts/data") ? "active" : ""}`} to="/landenlifts/data">*/}
                        {/*    Data*/}
                        {/*</Link>*/}
                        <Link className={`nav-link ${isActive("/landenapps/landenlifts/setup") ? "active" : ""}`} to="/landenapps/landenlifts/setup">
                            Setup
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}
