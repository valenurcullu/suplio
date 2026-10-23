// Build target. Netlify (production) builds without the variable; the GitHub Pages
// workflow sets PUBLIC_DEPLOY_TARGET=github-pages and serves the site under /suplio/.
export const isStaging = import.meta.env.PUBLIC_DEPLOY_TARGET === 'github-pages';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefixes a root-relative path ("/brand/x.svg") with the configured base. */
export const withBase = (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`;

/** Removes the base from a pathname, e.g. "/suplio/consulta-recibida/" → "/consulta-recibida/". */
export const stripBase = (pathname: string) => (base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname);
