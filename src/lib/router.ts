import { useSyncExternalStore } from 'react';

/**
 * 极简 hash 路由。
 * 用 hash 而不是 History API 的原因：纯静态托管（GitHub Pages / 对象存储）不需要配 404 回退，
 * 刷新任意子路径都不会 404，也不需要引入 react-router。
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getSnapshot(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw.startsWith('/') ? raw : '/';
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '/');
}

export function navigate(path: string): void {
  if (getSnapshot() === path) return;
  window.location.hash = path;
  window.scrollTo(0, 0);
}
