import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── CHUNK PRELOAD & NEW DEPLOYMENT AUTO-RECOVERY ───
// When a new build is deployed to Vercel, old chunk hashes are replaced.
// If an active session tries to fetch a deleted chunk, reload to get the latest index.html.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected (new deployment version). Auto-reloading...', event);
  const lastReload = sessionStorage.getItem('vite_preload_reload_ts');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('vite_preload_reload_ts', now.toString());
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Expected a JavaScript module script')
  ) {
    console.warn('[App] Out-of-date chunk detected. Reloading page...', message);
    const lastReload = sessionStorage.getItem('chunk_reload_ts');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_reload_ts', now.toString());
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
