import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import Navbar from './components/Navbar';
import NotFound from './sites/NotFound';
import Home from './sites/Home';
import Footer from './components/Footer';
import FAQ from './sites/FAQ';
import type { coordinateString, MapData } from './types';
import Loading from './components/Loading';
import { useMarsData } from './hooks/useMarsData';
import { readCoordinateFromLocation, useCoordinateUrlSync } from './hooks/useUrlSync';

// AG Grid and the breakthrough icons are only downloaded when their page is opened.
const Finder = lazy(() => import('./sites/Finder'));
const Breakthrough = lazy(() => import('./sites/Breakthrough'));

const loadingMessages = [
  'Assigning idle drones to terraform...',
  'Filtering out passenger applicants with the Idiot trait...',
  'Insulting enemy colony...',
  'Calculating potential for a Meteor to hit the colony...',
  'Forgetting to repair subsurface heaters...',
  'Serving Soylent Green at the Space Diner...',
  'Awaiting additional funding from Earth...',
  'Declaring Independence...',
];

const PAGE_TITLES: Record<string, string> = {
  '/finder': 'Finder',
  '/breakthrough': 'Breakthroughs',
  '/faq': 'FAQ',
};

function AppShell() {
  const [coordString, setCoordString] = useState<coordinateString | null>(
    readCoordinateFromLocation,
  );
  const { data: mapData, progress, error } = useMarsData();
  const { pathname } = useLocation();

  useCoordinateUrlSync(coordString, setCoordString);

  useEffect(() => {
    const parts = [coordString, PAGE_TITLES[pathname], 'Surviving Mars Mapper'].filter(Boolean);
    document.title = parts.join(' · ');
  }, [coordString, pathname]);

  const withData = (render: (data: MapData) => ReactNode) => {
    if (error) return <DataError message={error} />;
    if (!mapData) return <Loading progress={progress} messages={loadingMessages} />;
    return <Suspense fallback={<Loading />}>{render(mapData)}</Suspense>;
  };

  return (
    <>
      <Navbar coordString={coordString} />
      <main id="content" className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                coordString={coordString}
                setCoordString={setCoordString}
                mapData={mapData}
                progress={progress}
                error={error}
              />
            }
          />
          <Route
            path="/finder"
            element={withData((data) => (
              <Finder coordString={coordString} setCoordString={setCoordString} mapData={data} />
            ))}
          />
          <Route
            path="/breakthrough"
            element={withData((data) => (
              <Breakthrough
                coordString={coordString}
                setCoordString={setCoordString}
                mapData={data}
              />
            ))}
          />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function DataError({ message }: { message: string }) {
  return (
    <div className="data-error" role="alert">
      <p>Could not load the map data ({message}).</p>
      <button className="btn" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
