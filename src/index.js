import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ScanlinesProvider } from './contexts/ScanlinesContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AvatarProvider } from './contexts/AvatarContext';
import { WallpaperProvider } from './contexts/WallpaperContext';
import { DialogProvider } from './contexts/DialogContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <ScanlinesProvider>
        <AvatarProvider>
          <WallpaperProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </WallpaperProvider>
        </AvatarProvider>
      </ScanlinesProvider>
    </SettingsProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();