import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/ibm-plex-mono';
import App from './app.jsx';
import GuestGate          from './components/guestgate.jsx';
import { PrismProvider }   from './context/PrismContext.jsx';
import { SurfaceProvider } from './context/SurfaceContext.jsx';
import './index.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GuestGate>
      <PrismProvider>
        <SurfaceProvider>
          <App />
        </SurfaceProvider>
      </PrismProvider>
    </GuestGate>
  </React.StrictMode>
);
