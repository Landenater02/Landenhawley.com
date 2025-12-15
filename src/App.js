// App.js
import React, { useEffect } from 'react';
import { Switch, Route, Redirect, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import AboutMe from './pages/AboutMe';
import Login from './pages/LandenApps/Login';
import LandenApps from './pages/LandenApps/LandenApps';
import SongViewer from './pages/LandenApps/SongViewer/SongViewer';
import ProtectedRoute from './pages/Components/ProtectedRoute';
import Navigation from './pages/Components/Navigation';
import Breadcrumbs from './pages/Components/Breadcrumbs';
import Footer from './pages/Components/Footer';
import CssPxConverter from './pages/LandenApps/CssPxConverter/CssPxConverter';
import AvatarGenerator from './pages/LandenApps/AvatarGenerator/AvatarGenerator';
import LucasMurphyClicker from './pages/LandenApps/LucasMurphyClicker/LucasMurphyClicker';
import LandenLifts from './pages/LandenApps/LandenLifts/LandenLifts';

function RouteRenderer() {
    const { pathname } = useLocation();
    if (pathname.startsWith('/login')) return null;
    return <Breadcrumbs />;
}

/**
 * Adds/removes the LandenLifts manifest link only while you're inside /landenapps/landenlifts
 * (keeps the rest of the site from becoming the "LandenLifts" PWA)
 */
function LandenLiftsPwaHead() {
    const { pathname } = useLocation();
    const isLifts =
        pathname === '/landenapps/landenlifts' ||
        pathname.startsWith('/landenapps/landenlifts/');

    useEffect(() => {
        const id = 'll-manifest';
        let link = document.getElementById(id);

        if (isLifts) {
            if (!link) {
                link = document.createElement('link');
                link.id = id;
                link.rel = 'manifest';
                document.head.appendChild(link);
            }
            link.href = '/landenapps/landenlifts/manifest.webmanifest';

            // Optional but nice: set theme-color for the installed app chrome
            let theme = document.querySelector('meta[name="theme-color"]');
            if (!theme) {
                theme = document.createElement('meta');
                theme.setAttribute('name', 'theme-color');
                document.head.appendChild(theme);
            }
            theme.setAttribute('content', '#0090FD');
        } else {
            if (link) link.remove();
            // leaving theme-color alone is fine; you can also reset if you want
        }
    }, [isLifts]);

    return null;
}

function AppShell() {
    const { pathname } = useLocation();

    // show nav everywhere except:
    // - login
    // - routes deeper than /landenapps (e.g. /landenapps/landenlifts)
    const isLogin = pathname === '/login' || pathname.startsWith('/login/');
    const isLandenAppsRoot = pathname === '/landenapps';
    const isDeeperThanLandenApps = pathname.startsWith('/landenapps/') && !isLandenAppsRoot;

    const showNav = !isLogin && !isDeeperThanLandenApps;
    const showFooter = !isLogin;

    return (
        <div>
            <LandenLiftsPwaHead />

            {showNav ? <Navigation /> : null}

            {/* Breadcrumbs shown globally except on the login page */}
            <div className="container app-content">
                <RouteRenderer />
            </div>

            <Switch>
                {/* Home route */}
                <Route exact path="/home" component={Home} />
                <Route exact path="/">
                    <Redirect to="/home" />
                </Route>

                {/* About me */}
                <Route exact path="/AboutMe" component={AboutMe} />

                <Route exact path="/login" component={Login} />

                {/* Protected routes for LandenApps */}
                <ProtectedRoute exact path="/landenapps" component={LandenApps} />
                <ProtectedRoute exact path="/landenapps/songviewer" component={SongViewer} />
                <ProtectedRoute exact path="/landenapps/css-converter" component={CssPxConverter} />
                <ProtectedRoute exact path="/landenapps/AvatarGenerator" component={AvatarGenerator} />
                <ProtectedRoute exact path="/landenapps/LucasMurphyClicker" component={LucasMurphyClicker} />

               
                <ProtectedRoute exact path="/landenapps/landenlifts" component={LandenLifts} />
             
            <ProtectedRoute path="/landenapps/landenlifts/:rest*" component={LandenLifts} />
         

                {/* 404 Not Found route */}
                <Route path="*">
                    <h2>404 - Not Found</h2>
                    <p>The page you're looking for doesn't exist.</p>
                </Route>
            </Switch>

            {showFooter ? <Footer /> : null}
        </div>
    );
}

export default function App() {
    return <AppShell />;
}
