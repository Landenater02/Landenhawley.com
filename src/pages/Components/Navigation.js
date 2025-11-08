import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function Navigation() {
    const { pathname } = useLocation();
    const history = useHistory();
    const [session, setSession] = useState(null);

    useEffect(() => {
        let mounted = true;
        async function checkSession() {
            const { data } = await supabase.auth.getSession();
            if (!mounted) return;
            setSession(data?.session ?? null);
        }
        checkSession();

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setSession(session ?? null);
        });

        return () => {
            mounted = false;
            try { data?.subscription?.unsubscribe?.(); } catch (e) { }
        };
    }, []);

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleAvatarClick = (e) => {
        // toggle menu instead of immediate navigation
        e.stopPropagation();
        setMenuOpen((s) => !s);
    };

    useEffect(() => {
        function onDocClick() {
            setMenuOpen(false);
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            setMenuOpen(false);
            history.push('/home');
        } catch (err) {
            console.error('Sign out failed', err);
        }
    };

    const handleOpenLandenApps = () => {
        setMenuOpen(false);
        history.push('/landenapps');
    };

    return (
        <header className="app-nav">
            <div className="inner container">
                <div className="brand">
                    <span className="dot" />
                    <span>Landen Hawley</span>
                </div>
                <nav className="nav-links">
                    <Link className={`nav-link ${pathname === '/home' ? 'active' : ''}`} to="/home">Home</Link>
                    <Link className={`nav-link ${pathname === '/AboutMe' ? 'active' : ''}`} to="/AboutMe">About Me</Link>
                    <Link className={`nav-link ${pathname.startsWith('/landenapps') ? 'active' : ''}`} to="/landenapps">LandenApps</Link>
                </nav>

                <div className="nav-user" ref={menuRef}>
                    <div className="nav-user-button" role="button" onClick={handleAvatarClick} title={session ? 'Open menu' : 'Sign in'}>
                        <i className="fa-regular fa-circle-user user-icon" aria-hidden="true"></i>
                        <span className={`user-status ${session ? 'online' : 'offline'}`}></span>
                        <span className="user-label">{session ? 'Signed in' : 'Sign in'}</span>
                    </div>

                    {menuOpen && (
                        <div className="nav-user-menu" onClick={(e) => e.stopPropagation()}>
                            {session ? (
                                <>
                                   
                                    <button className="btn" onClick={handleSignOut}>Sign out</button>
                                </>
                            ) : (
                                <button className="btn" onClick={() => { setMenuOpen(false); history.push('/login'); }}>Sign in</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
