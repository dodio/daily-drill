import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { DailyLogProvider } from './store/DailyLogProvider.tsx';

// iOS Safari 不一定服从 viewport 的 user-scalable=no，阻止双指手势作为兜底。
const preventPageZoom = (event: Event) => event.preventDefault();
document.addEventListener('gesturestart', preventPageZoom, { passive: false });
document.addEventListener('gesturechange', preventPageZoom, { passive: false });

const container = document.getElementById('root');
if (!container) throw new Error('找不到 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <DailyLogProvider>
      <App />
    </DailyLogProvider>
  </StrictMode>,
);
