// FIX: Moved import statements to the top of the file.
// An import declaration can only be used at the top level of a namespace or module.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

try {
    console.log('index.tsx: Module execution started.');

    const rootElement = document.getElementById('root');
    console.log('index.tsx: Searched for #root element.');

    if (!rootElement) {
      console.error('index.tsx: Root element #root not found in the DOM.');
      throw new Error("Could not find root element to mount to");
    }
    
    console.log('index.tsx: Root element found:', rootElement);

    const root = ReactDOM.createRoot(rootElement);
    console.log('index.tsx: React root created.');

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('index.tsx: App component rendered into root.');

} catch (error) {
    console.error('index.tsx: A critical error occurred during initialization.', error);
    const rootDiv = document.getElementById('root');
    if (rootDiv) {
        rootDiv.innerHTML = `
            <div style="color: #ff9999; padding: 20px; border: 1px solid #ff4d4d; margin: 20px; background-color: #2b0000; font-family: monospace;">
                <h1 style="color: #ff4d4d;">Application Failed to Load</h1>
                <p style="color: #ffcccc;">A critical error occurred during startup. This usually happens when the browser cannot process the application script. Please check the browser console for details.</p>
                <h3 style="margin-top: 1rem; color: #ff9999;">Error Details:</h3>
                <pre style="white-space: pre-wrap; word-wrap: break-word; color: #ffcccc; margin-top: 0.5rem;">${(error as Error).stack || (error as Error).message}</pre>
            </div>
        `;
    }
}