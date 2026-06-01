import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let hasPendingRefresh = false;
      const updatePrompt = '\u05d9\u05e9 \u05d2\u05e8\u05e1\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05d6\u05de\u05d9\u05e0\u05d4. \u05d4\u05d0\u05dd \u05dc\u05e8\u05e2\u05e0\u05df \u05d0\u05ea \u05d4\u05d3\u05e3?';

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasPendingRefresh) {
          window.location.reload();
        }
      });

      await registration.update();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller &&
            window.confirm(updatePrompt)
          ) {
            hasPendingRefresh = true;
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      if (registration.waiting && window.confirm(updatePrompt)) {
        hasPendingRefresh = true;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
}

window.addEventListener('storage', (event) => {
  if (event.key === 'gcal_auth_state') {
    if (!event.newValue) {
      window.dispatchEvent(new CustomEvent('gcal-auth-expired'));
    } else if (!event.oldValue) {
      window.location.reload();
    }
  }
});
