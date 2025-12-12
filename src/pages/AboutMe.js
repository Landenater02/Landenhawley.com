import React, { useEffect, useState } from 'react';

export default function AboutMe() {
    const [html, setHtml] = useState('');

    useEffect(() => {
        document.title = "About Me";
        var description = "Learn all about Landen Hawley, a Software Engineer from Oshkosh,Wi"
        const metaDesc = document.querySelector("meta[name='description']");
        if (metaDesc) {
            metaDesc.setAttribute("content", description);
        }

        fetch('/Pages/aboutme.html')
            .then(res => res.text())
            .then(setHtml)
            .catch(console.error);
    }, []);

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
