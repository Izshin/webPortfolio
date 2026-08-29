/**
 * URL for a file in public/. Vite only rewrites asset paths it sees in index.html or in
 * imports, so every runtime string has to carry the deploy base itself (GitHub Pages
 * serves this project site from /<repo>/, not from the domain root).
 */
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
