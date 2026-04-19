/**
 * ============================================================================
 * APPLICATION BOOTSTRAP LOGIC — DOM Entry Point
 * ============================================================================
 * 
 * This module is responsible for the physical mounting of the React tree 
 * into the browser's DOM. It abstracts the 'createRoot' call to ensure 
 * consistent initialization.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

export const mountApp = (AppComponent: React.ComponentType) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  // SECTION: DOM Mount Sequence
  // Logic: Initialize the concurrent React root and render the primary App orchestrator.
  const root = createRoot(rootElement);
  root.render(<AppComponent />);
};
