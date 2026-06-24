import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {loadRuntimeConfig} from './api/runtimeConfig';

// Resolve the backend URL from config.json before the first API call,
// mirroring the old Angular app's APP_INITIALIZER. loadRuntimeConfig never
// throws, so the app always boots.
loadRuntimeConfig().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
