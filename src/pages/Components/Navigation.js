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

    const handleAvatarClick = function (e) {
        e.stopPropagation();
        setMenuOpen(function (s) {
            return !s;
        });
    };

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

                <nav className="nav-links">
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

                <div className="nav-user" ref={menuRef}>
                    <div
                        className="nav-user-button"
                        role="button"
                        onClick={handleAvatarClick}
                        title={session ? "Open menu" : "Sign in"}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                       
                        

                        <span className={"user-status " + (session ? "online" : "offline")}></span>

                        {/* your label */}
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
                            <div></div>
                        )}
                    </div>

                    {menuOpen ? (
                        <div className="nav-user-menu" onClick={function (e) { e.stopPropagation(); }}>
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
                                <button
                                    className="btn"
                                    onClick={function () {
                                        setMenuOpen(false);
                                        history.push("/login");
                                    }}
                                >
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
