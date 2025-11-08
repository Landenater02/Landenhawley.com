import React, { useEffect, useRef, useState } from 'react';

export default function Home() {
    const containerRef = useRef(null);
    const [html, setHtml] = useState('');

    useEffect(() => {
        // 1) Load your static HTML (no <script> in it)
        // NOTE: Hosting is case-sensitive; the file lives in public/Pages/home.html so
        // request the matching path.
        fetch('/Pages/home.html')
            .then((r) => r.text())
            .then(setHtml)
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!html || !containerRef.current) return;

        // 2) Inject HTML
        containerRef.current.innerHTML = html;

    // 3) Wire up the gallery (since inline <script> won't run)
    // Folder must match the casing used in public/ (hosting is case-sensitive).
    const folder = '/Images/Gallery/';
        const images = [
            'AthleticBandHelper.png',
            'DrumLineLive.png',
            'InternTRatsGame.png',
            'SongsPCF.png',
            'Titan5k.png',
            'VocalConcert.png',
        ];

        const descriptions = {
            'SongsPCF.png': {
                title: 'Songs PCF Project',
                text:
                    'A Power Platform Component Framework (PCF) datagrid that reads songs from a Power App, ' +
                    'lets you select one, and opens the PDF to the exact page.'
            },
            'AthleticBandHelper.png': {
                title: 'Athletic Band Helper',
                text:
                    'A .NET MAUI app for the UWO Athletic Band Director to quickly play back sets during practice.'
            },
            'DrumLineLive.png': {
                title: 'Drum Line Live',
                text:
                    'This is a picture from when I joined the titan thunder marching band and played trumpet as a preamble to a showing of Drum Line Live.'
            },
            'InternTRatsGame.png': {
                title: 'Intern T-Rats Game',
                text:
                    'This is from an intern outing to a TimberRattlers baseball game during my summer internship at Heartland Business Systems in 2025.'
            },
            'VocalConcert.png': {
                title: 'Vocal Concert',
                text:
                    'Me and My friends after a vocal jazz concert at UWO.'
            },
            'Titan5k.png': {
                title: 'Titan 5k',
                text:
                    'Me and My friends after a Titan 5k run at UWO.'
            }
        };

        const img = containerRef.current.querySelector('#gallery-image');
        const modal = containerRef.current.querySelector('#gallery-modal');
        const modalTitle = containerRef.current.querySelector('#modal-title');
        const modalDescription = containerRef.current.querySelector('#modal-description');
        const closeModal = containerRef.current.querySelector('#close-modal');

        if (!img || !modal || !modalTitle || !modalDescription || !closeModal) return;

        // Ensure transition is set
        img.style.transition = 'opacity 1s ease';

        // Align index with whatever src is currently in the HTML
        let index = Math.max(
            0,
            images.findIndex((name) => (folder + name).toLowerCase() === img.src.toLowerCase())
        );
        if (index === -1) {
            index = 0;
            img.src = folder + images[0];
        }

        const rotate = () => {
            img.style.opacity = 0;
            const t1 = setTimeout(() => {
                index = (index + 1) % images.length;
                img.src = folder + images[index];
                img.style.opacity = 1;
            }, 1000);
            return t1;
        };

        const interval = setInterval(rotate, 4000);
        let timeoutId = null;

        // Click → open modal
        const handleOpen = () => {
            const currentImage = images[index];
            const info = descriptions[currentImage];
            if (info == null) {
                return;
            }
            modalTitle.textContent = info?.title ?? 'Untitled Project';
            modalDescription.textContent = info?.text ?? 'No description available yet.';
            modal.style.display = 'flex';
        };

        const handleClose = () => (modal.style.display = 'none');
        const handleBackdrop = (e) => {
            if (e.target === modal) handleClose();
        };

        img.addEventListener('click', handleOpen);
        closeModal.addEventListener('click', handleClose);
        modal.addEventListener('click', handleBackdrop);

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
            if (timeoutId) clearTimeout(timeoutId);
            img.removeEventListener('click', handleOpen);
            closeModal.removeEventListener('click', handleClose);
            modal.removeEventListener('click', handleBackdrop);
        };
    }, [html]);

    return <div ref={containerRef} />;
}

