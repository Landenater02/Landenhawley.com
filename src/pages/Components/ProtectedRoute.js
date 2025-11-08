import React, { useEffect, useState } from 'react';
import { Route, Redirect } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function ProtectedRoute({ component: Component, ...rest }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
      } catch (err) {
        if (!mounted) return;
        setSession(null);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => {
      mounted = false;
      // cleanup subscription if present
      try {
        data?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <Route
      {...rest}
      render={(props) => {
        if (checking) return <div style={{ padding: 20 }}>Checking authentication...</div>;
        if (session) return <Component {...props} session={session} />;
        return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
      }}
    />
  );
}
