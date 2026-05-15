import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import { PrismProvider }   from './context/PrismContext.jsx';
import { SurfaceProvider } from './context/SurfaceContext.jsx';
import './index.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrismProvider>
      <SurfaceProvider>
        <App />
      </SurfaceProvider>
    </PrismProvider>
  </React.StrictMode>
);
