import React from 'react';
import ReactDOM from 'react-dom/client';
import oracle from './oracle'; // Unique name, zero collision

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <oracle />
  </React.StrictMode>
);