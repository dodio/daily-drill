import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { DailyLogProvider } from './store/DailyLogProvider.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('找不到 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <DailyLogProvider>
      <App />
    </DailyLogProvider>
  </StrictMode>,
);
