import React from 'react';
import { createRoot } from 'react-dom/client';

export const mountApp = (AppComponent: React.ComponentType) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  root.render(<AppComponent />);
};
