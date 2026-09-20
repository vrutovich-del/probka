import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { bootLanguage } from './i18n/languageStore';
import { requestPersistentStorage } from './lib/storage';
import { App } from './app/App';

async function boot(): Promise<void> {
  // The saved language is read before the first paint so the UI never flashes in the wrong one.
  await bootLanguage();
  // Not awaited: the garage should paint whatever the browser decides about keeping it.
  void requestPersistentStorage();
  const root = document.getElementById('root');
  if (!root) throw new Error('#root is missing from index.html');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
