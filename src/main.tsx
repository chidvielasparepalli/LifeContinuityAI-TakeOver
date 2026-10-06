import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeLanguageProvider } from './components/ThemeLanguageContext.tsx';
import { SafeClerkProvider } from './lib/clerkSafe.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeLanguageProvider>
      <SafeClerkProvider>
        <App />
      </SafeClerkProvider>
    </ThemeLanguageProvider>
  </StrictMode>,
);

