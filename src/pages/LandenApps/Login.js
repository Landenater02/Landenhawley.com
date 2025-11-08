import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function Login() {
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const history = useHistory();
    const location = useLocation();
    const from = (location && location.state && location.state.from) || { pathname: '/landenapps' };

    const clearMessages = () => { setMessage(null); setError(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setMessage('Signed in successfully.');
                // redirect to original page or landenapps
                history.replace(from.pathname || '/landenapps');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Sign-up successful. Check your email to confirm your account.');
                // after sign-up, send to landenapps if a session exists
                const { data } = await supabase.auth.getSession();
                if (data?.session) history.replace(from.pathname || '/landenapps');
            }
        } catch (err) {
            setError(err && err.message ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const Tab = ({ value, children }) => (
        <button
            type="button"
            onClick={() => { clearMessages(); setMode(value); }}
            className={`btn ${mode === value ? 'btn--primary' : ''}`}
            aria-pressed={mode === value}
        >
            {children}
        </button>
    );

    return (
        <main className="container section" style={{ maxWidth: 520 }}>
            <div className="card stack">
                <header className="stack">
                    <h2 style={{ marginBottom: 0 }}>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Tab value="signin">Sign in</Tab>
                        <Tab value="signup">Sign up</Tab>
                    </div>
                </header>

                <form className="stack" onSubmit={handleSubmit} noValidate>
                    <div>
                        <label className="label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            className="input"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                className="input"
                                type={showPw ? 'text' : 'password'}
                                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowPw(s => !s)}
                                aria-label={showPw ? 'Hide password' : 'Show password'}
                                style={{
                                    position: 'absolute',
                                    right: 6,
                                    top: 6,
                                    height: 'calc(100% - 12px)'
                                }}
                            >
                                {showPw ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {mode === 'signup' && (
                            <p style={{ color: 'var(--muted)', marginTop: '.5rem', fontSize: '.9rem' }}>
                                Use at least 6 characters.
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn btn--primary" disabled={loading}>
                            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                        </button>
                    </div>
                </form>

                {message && <p style={{ color: 'green' }}>{message}</p>}
                {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
            </div>
        </main>
    );
}
