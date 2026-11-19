import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { loadMarsData } from './data/marsData';

// Start downloading the site database right away (instead of when the first
// component mounts). It is not preloaded from index.html on purpose: that would
// put the 650 KB file ahead of the app's own JavaScript and delay the first paint.
void loadMarsData().catch(() => {
  /* reported by the components that use it */
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
