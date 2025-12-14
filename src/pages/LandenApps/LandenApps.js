
import { Link } from 'react-router-dom';
import React, { useEffect } from 'react';

export default function LandenApps() {

    useEffect(() => {
        document.title = "LandenApps";
    }, []);

    var description = "View custom apps made by Landen Hawley"
    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) {
        metaDesc.setAttribute("content", description);
    }

    
    var ThumbnailPath = "/Images/LandenAppsThumbnails/";
    var appPath = "/landenapps/";
    const projects = [
    {
      title: 'Song Viewer',
      href: 'songviewer',
      description:
        'A Supabase + React app that lets you browse and display sheet music charts in real time.',
            image: '/Images/gallery/SongsPCF.png',
    },{
      title: 'Css Px to Rem/Em converter',
      href: 'css-converter',
      description:
        'A tool to convert CSS pixel values to flexible rem or em units.',
      image: ThumbnailPath + 'CssPxtoRem.png',
        },
        {
            title: 'Lucas Murphy Clicker',
            href: 'LucasMurphyClicker',
            description:
                'At the request of my friends: a game where users collect \'Lukes\' by clicking in a Cookie Clicker style fashion',
            image: ThumbnailPath + 'LucasMurphyClicker.png',
        },


    
    ];



  return (
    <main className="container section stack">
      <section className="stack">
      
        <h1>LandenApps</h1>
        <p className="lead">
          My collection of applications and projects — each built to solve real problems and
          showcase what I’m learning.
        </p>
      </section>

      <section className="grid grid--2" style={{ gap: '2rem' }}>
        {projects.map((p) => (
          <article key={p.title} className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 200, overflow: 'hidden' }}>
              <img
                src={p.image}
                alt={p.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div style={{ padding: '1.25rem' }}>
              <h3>{p.title}</h3>
              <p style={{ marginBottom: '1rem' }}>{p.description}</p>
              {p.external ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                >
                  View Application
                </a>
              ) : (
                <Link to={appPath + p.href} className="btn btn--primary">
                  View Application
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
