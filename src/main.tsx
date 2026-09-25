import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import App from './App';
import './index.css';

// Hide the WebView's default context menu (reload, inspect etc.), we have our
// own per-component ones. Text fields and selected text still get the native
// menu so right-click copy/paste/spellcheck keeps working.
document.addEventListener('contextmenu', (e) => {
  const target = e.target instanceof Element ? e.target : null;
  const editable = target?.closest(
    'textarea, [contenteditable]:not([contenteditable="false"]), ' +
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="color"]):not([type="file"])'
  );
  const hasSelection = (window.getSelection()?.toString() ?? '').length > 0;
  if (editable || hasSelection) return;
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
