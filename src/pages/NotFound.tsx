import { navigate } from '../lib/router.ts';

export function NotFound() {
  return (
    <div className="app">
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 40 }}>🧭</div>
        <h2 style={{ margin: '10px 0 4px' }}>这里还没有路</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>回首页看看今天练什么吧</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          回到首页
        </button>
      </div>
    </div>
  );
}
