import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import supabase from "../../supabaseClient"; 

export default function Navigation() {
    const location = useLocation();
    const pathname = location.pathname;
    const history = useHistory();

    const [session, setSession] = useState(null);

  
    const [avatarUrl, setAvatarUrl] = useState(null);

    useEffect(function () {
        let mounted = true;

        async function checkSession() {
            const res = await supabase.auth.getSession();
            if (!mounted) return;
            setSession(res && res.data ? (res.data.session || null) : null);
        }

        checkSession();

        const sub = supabase.auth.onAuthStateChange(function (_event, nextSession) {
            if (!mounted) return;
            setSession(nextSession || null);
        });

        return function () {
            mounted = false;
            try {
                if (sub && sub.data && sub.data.subscription) sub.data.subscription.unsubscribe();
            } catch (e) { }
        };
    }, []);

   
    useEffect(
        function () {
            let cancelled = false;

            async function loadAvatar() {
                setAvatarUrl(null);

                if (!session || !session.user || !session.user.id) return;

                try {
                    const userId = session.user.id;

                    const res = await supabase
                        .from("user")
                        .select("avatar")
                        .eq("id", userId)
                        .maybeSingle();

                    if (cancelled) return;
                    if (res && res.error) throw res.error;

                    console.log("avatar row:", res.data);

                    const path = res && res.data && res.data.avatar ? res.data.avatar : null;
                    if (!path) return;

                    const pub = supabase.storage
                        .from("avatar")
                        .getPublicUrl(path);

                    const url = pub && pub.data ? pub.data.publicUrl : null;

                    console.log("avatar public url:", url);

                    if (!url) return;

                    setAvatarUrl(url);
                } catch (e) {
                    console.error("Avatar load failed", e);
                    setAvatarUrl(null);
                }
            }


            loadAvatar();

            return function () {
                cancelled = true;
            };
        },
        [session]
    );

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);


    const [mobileOpen, setMobileOpen] = useState(false);
    const mobileMenuRef = useRef(null);

    // close mobile menu on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // close on outside click
    useEffect(() => {
        function onDocClick(e) {
            // close avatar menu
            setMenuOpen(false);

            // close mobile menu if click outside
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
                setMobileOpen(false);
            }
        }
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);


    

    useEffect(function () {
        function onDocClick() {
            setMenuOpen(false);
        }
        document.addEventListener("click", onDocClick);
        return function () {
            document.removeEventListener("click", onDocClick);
        };
    }, []);

    const handleSignOut = async function () {
        try {
            await supabase.auth.signOut();
            setMenuOpen(false);
            history.push("/home");
        } catch (err) {
            console.error("Sign out failed", err);
        }
    };

    const handleUpdateAvatarClick = async function () {
        try {
            setMenuOpen(false);
            history.push("/landenapps/AvatarGenerator");
        } catch (err) {
            console.error("Avatar Switch Failed", err);
        }
    };

    return (
        <header className="app-nav">
            <div className="inner container">
                <div className="brand">
                    <span className="dot" />
                    <span>Landen Hawley</span>
                </div>

                {/* Desktop links */}
                <nav className="nav-links nav-links--desktop" aria-label="Primary navigation">
                    <Link className={"nav-link " + (pathname === "/home" ? "active" : "")} to="/home">
                        Home
                    </Link>
                    <Link className={"nav-link " + (pathname === "/AboutMe" ? "active" : "")} to="/AboutMe">
                        About Me
                    </Link>
                    <Link className={"nav-link " + (pathname.indexOf("/landenapps") === 0 ? "active" : "")} to="/landenapps">
                        LandenApps
                    </Link>
                </nav>

                {/* Mobile hamburger */}
                <div className="nav-mobile" ref={mobileMenuRef}>
                    <button
                        type="button"
                        className="nav-hamburger btn"
                        aria-label="Open menu"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav-panel"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMobileOpen((s) => !s);
                        }}
                    >
                        <span className="hamburger-lines" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                    </button>

                    {mobileOpen ? (
                        <div
                            id="mobile-nav-panel"
                            className="nav-mobile-panel card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="nav-mobile-links">
                                <Link className={"nav-link " + (pathname === "/home" ? "active" : "")} to="/home">
                                    Home
                                </Link>
                                <Link className={"nav-link " + (pathname === "/AboutMe" ? "active" : "")} to="/AboutMe">
                                    About Me
                                </Link>
                                <Link className={"nav-link " + (pathname.indexOf("/landenapps") === 0 ? "active" : "")} to="/landenapps">
                                    LandenApps
                                </Link>
                            </div>

                            <div className="nav-mobile-divider" />

                            {/* User area in mobile menu */}
                            <div className="nav-mobile-user">
                                <div className="nav-mobile-user-row">
                                    <span className={"user-status " + (session ? "online" : "offline")}></span>
                                    <span className="user-label">{session ? "Signed in" : "Signed out"}</span>

                                    {session && avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="avatar"
                                            className="nav-mobile-avatar"
                                        />
                                    ) : null}
                                </div>

                                {session ? (
                                    <div className="nav-mobile-actions">
                                        <button className="btn" onClick={handleUpdateAvatarClick}>
                                            Update Avatar
                                        </button>
                                        <button className="btn" onClick={handleSignOut}>
                                            Sign out
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn"
                                        onClick={() => history.push("/login")}
                                    >
                                        Sign in
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Desktop user dropdown (keep your existing behavior) */}
                <div className="nav-user nav-user--desktop" ref={menuRef}>
                    <div
                        className="nav-user-button"
                        role="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((s) => !s);
                        }}
                        title={session ? "Open menu" : "Sign in"}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                        <span className={"user-status " + (session ? "online" : "offline")}></span>
                        <span className="user-label">{session ? "Signed in" : "Sign in"}</span>

                        {session && avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "9999px",
                                    objectFit: "cover",
                                    border: "1px solid rgba(0,0,0,0.25)"
                                }}
                            />
                        ) : (
                            <div />
                        )}
                    </div>

                    {menuOpen ? (
                        <div className="nav-user-menu" onClick={(e) => e.stopPropagation()}>
                            {session ? (
                                <>
                                    <button className="btn" onClick={handleUpdateAvatarClick}>
                                        Update Avatar
                                    </button>
                                    <button className="btn" onClick={handleSignOut}>
                                        Sign out
                                    </button>
                                </>
                            ) : (
                                <button className="btn" onClick={() => history.push("/login")}>
                                    Sign in
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );

}
