import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="card">
            <h2>Not found</h2>
            <Link to="/landenlifts">Go back</Link>
        </div>
    );
}
