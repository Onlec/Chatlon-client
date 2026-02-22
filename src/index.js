import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { DialogProvider } from './contexts/DialogContext';
import { ScanlinesProvider } from './contexts/ScanlinesContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AvatarProvider } from './contexts/AvatarContext';
import { WallpaperProvider } from './contexts/WallpaperContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DialogProvider>
      <SettingsProvider>
        <ScanlinesProvider>
          <AvatarProvider>
            <WallpaperProvider>
              <App />
            </WallpaperProvider>
          </AvatarProvider>
        </ScanlinesProvider>
      </SettingsProvider>
    </DialogProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
