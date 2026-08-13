import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Self-hosted fonts (previously loaded from Google Fonts): keeps visitor IPs
// away from third parties and removes a render-blocking cross-origin request.
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element missing');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
