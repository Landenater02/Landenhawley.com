// App.js
import React from 'react';
import { Switch, Route, Redirect, useLocation } from 'react-router-dom';

import Home from './pages/Home';
import AboutMe from './pages/AboutMe';
import Login from './pages/LandenApps/Login';
import LandenApps from './pages/LandenApps/LandenApps';

import ProtectedRoute from './pages/Components/ProtectedRoute';
import Navigation from './pages/Components/Navigation';
import Breadcrumbs from './pages/Components/Breadcrumbs';
import Footer from './pages/Components/Footer';
import CssPxConverter from './pages/LandenApps/CssPxConverter/CssPxConverter';
import AvatarGenerator from './pages/LandenApps/AvatarGenerator/AvatarGenerator';
import LucasMurphyClicker from './pages/LandenApps/LucasMurphyClicker/LucasMurphyClicker';
import LandenLifts from './pages/LandenApps/LandenLifts/LandenLifts';
/* 
import SongDashboard from './pages/LandenApps/SongViewer/SongDashboard';
import SongView from './pages/LandenApps/SongViewer/SongView';
*/


function RouteRenderer() {
    const { pathname } = useLocation();
    if (pathname === '/login' || pathname.startsWith('/login/')) return null;
    return <Breadcrumbs />;
}



function AppShell() {
    const { pathname } = useLocation();

  

    const isLandenAppsRoot = pathname === '/landenapps';
    const isDeeperThanLandenApps =
        pathname.startsWith('/landenapps/') && !isLandenAppsRoot;

    // show nav everywhere except deep app routes
    const showNav = !isDeeperThanLandenApps;

    // footer rule is independent
    const showFooter = true;


    return (
        <div>
          

            {showNav ? <Navigation /> : null}

            <div className="container app-content">
                <RouteRenderer />
            </div>

            <Switch>
                <Route exact path="/home" component={Home} />
                <Route exact path="/">
                    <Redirect to="/home" />
                </Route>

                <Route exact path="/AboutMe" component={AboutMe} />
                <Route exact path="/login" component={Login} />

                <ProtectedRoute exact path="/landenapps" component={LandenApps} />
                {/* 
                <Route exact path="/landenapps/songviewer" component={SongDashboard} />
                <Route exact path="/landenapps/songviewer/song/:id" component={SongView} />
                */}
                <ProtectedRoute exact path="/landenapps/css-converter" component={CssPxConverter} />
                <ProtectedRoute exact path="/landenapps/AvatarGenerator" component={AvatarGenerator} />
                <ProtectedRoute exact path="/landenapps/LucasMurphyClicker" component={LucasMurphyClicker} />
             

                <ProtectedRoute path="/landenapps/landenlifts" component={LandenLifts} />

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
