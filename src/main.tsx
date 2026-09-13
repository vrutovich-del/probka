import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { bootLanguage } from './i18n/languageStore';
import { App } from './app/App';

async function boot(): Promise<void> {
  // The saved language is read before the first paint so the UI never flashes in the wrong one.
  await bootLanguage();
  const root = document.getElementById('root');
  if (!root) throw new Error('#root is missing from index.html');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
