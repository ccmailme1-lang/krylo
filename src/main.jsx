import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/ibm-plex-mono';
import App from './app.jsx';
import ErrorBoundary from './components/errorboundary.jsx';
import { PrismProvider }   from './context/PrismContext.jsx';
import { SurfaceProvider } from './context/SurfaceContext.jsx';
import './index.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrismProvider>
      <SurfaceProvider>
        <ErrorBoundary label="Application">
          <App />
        </ErrorBoundary>
      </SurfaceProvider>
    </PrismProvider>
  </React.StrictMode>
);
