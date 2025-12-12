import React from 'react';
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
function RouteRenderer() {
    // show Breadcrumbs on all pages except the login page
    const { pathname } = useLocation();
    if (pathname.startsWith('/login')) return null;
    return <Breadcrumbs />;
}
function App() {
    return (
        <div>
            <Navigation />
            {/* Breadcrumbs shown globally except on the login page */}
            <div className="container" style={{ paddingTop: 12 }}>
                <RouteRenderer />
            </div>

            <Switch>

                
                
                {/* Home route */ }
                <Route exact path="/home" component={Home} />
                <Route exact path="/">
                    <Redirect to="/home" />
                </Route>
                {/* About me */}
                <Route exact path="/AboutMe" component={AboutMe} />

               

                <Route exact path="/login" component={Login} />

                {/* Protected routes for LandenApps */}
                {/* =================================================== */}
                <ProtectedRoute exact path="/landenapps" component={LandenApps} />
                <ProtectedRoute exact path="/landenapps/songviewer" component={SongViewer} />
                <ProtectedRoute exact path="/landenapps/css-converter" component={CssPxConverter} />
                <ProtectedRoute exact path="/landenapps/AvatarGenerator" component={AvatarGenerator} />
                
                {/* =================================================== */}


                {/* 404 Not Found route */} 
                <Route path="*">
                    <h2>404 - Not Found</h2>
                    <p>The page you're looking for doesn't exist.</p>
                </Route>
                
            </Switch>
            <Footer />
        </div>
    );
}

export default App;
