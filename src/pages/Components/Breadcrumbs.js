import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Breadcrumbs
 * - Reads the current location.pathname and builds a list of breadcrumb items
 * - Each item is a Link to its cumulative path
 * - Home (/) is shown as 'Home'
 *
 * Usage: <Breadcrumbs />
 */
export default function Breadcrumbs({ separator = ' / ' }) {
	const location = useLocation();
	const { pathname } = location;

	// split pathname into segments (filter removes empty parts)
	const segments = pathname.split('/').filter(Boolean);

	const crumbs = [];
	// if root or a `/home` route, show only 'Home'
	if (segments.length === 0 || (segments.length === 1 && segments[0].toLowerCase() === 'home')) {
		crumbs.push({ name: 'Home', path: '/' });
	} else {
		crumbs.push({ name: 'Home', path: '/' });
		let acc = '';
		segments.forEach((seg) => {
			acc += `/${seg}`;
			// prettify segment name
			const name = seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
			crumbs.push({ name, path: acc });
		});
	}

	return (
		<nav aria-label="Breadcrumb" className="breadcrumbs">
			{crumbs.map((c, i) => (
				<span key={c.path} className="breadcrumb-item">
					{i < crumbs.length - 1 ? (
						<Link to={c.path}>{c.name}</Link>
					) : (
						<span aria-current="page">{c.name}</span>
					)}
					{i < crumbs.length - 1 && <span className="breadcrumb-sep">{separator}</span>}
				</span>
			))}
		</nav>
	);
}

