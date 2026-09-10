import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Kisan Queue Application Notice" fallbackMessage="An unexpected issue occurred while rendering the portal. Please retry.">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

