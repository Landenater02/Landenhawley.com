import React from 'react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container stack" style={{ textAlign: 'center' }}>
                <p><strong>Landen Hawley</strong></p>

                <nav className="nav-links" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <a className="nav-link" href="/home">Home</a>
                    <a className="nav-link" href="/AboutMe">About Me</a>
                    <a className="nav-link" href="mailto:hawlel75@uwosh.edu">Contact</a>
                    <a className="nav-link" href="https://github.com/Landenater02" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a className="nav-link" href="https://www.linkedin.com/in/landen-hawley/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </nav>

                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '1rem' }}>
                     {year} Landen Hawley. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
