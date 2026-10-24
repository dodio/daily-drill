import { useRoute } from './lib/router.ts';
import { Home } from './pages/Home.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { MathPage } from './modules/math/MathPage.tsx';
import { RecitePage } from './modules/recite/RecitePage.tsx';

export default function App() {
  const route = useRoute();

  switch (route) {
    case '/':
      return <Home />;
    case '/math':
      return <MathPage />;
    case '/recite':
      return <RecitePage />;
    default:
      return <NotFound />;
  }
}
