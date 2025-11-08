import React, { useEffect, useState } from 'react';

export default function AboutMe() {
    const [html, setHtml] = useState('');

    useEffect(() => {
        fetch('/pages/aboutme.html')
            .then(res => res.text())
            .then(setHtml)
            .catch(console.error);
    }, []);

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
