import { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Papa from 'papaparse';
import './App.css';
import Navbar from './components/Navbar';
import NotFound from './sites/NotFound';
import Home from './sites/Home';
import Footer from './components/Footer';
import FAQ from './sites/FAQ';
import Finder from './sites/Finder';
import type { coordinateString } from './types';
import Loading from './components/Loading';
import Breakthrough from './sites/Breakthrough';

const loadingMessages = [
  "Assigning idle drones to terraform...",
  "Filtering out passenger applicants with the Idiot trait...",
  "Insulting enemy colony...",
  "Calculating potential for a Meteor to hit the colony...",
  "Forgetting to repair subsurface heaters...",
  "Serving Soylent Green at the Space Diner...",
  "Awaiting additional funding from Earth...",
  "Declaring Independence..."
];

function App() {
  const [coordString, setCoordStringState] = useState<coordinateString | null>(null);
  const [mapData, setMapData] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const fetchMarsData = async () => {
      try {
        const response = await fetch('/mars_data.csv');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        let loaded = 0;
        let csvText = '';

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            loaded += value.length;
            if (total > 0) {
              setLoadingProgress(Math.round((loaded / total) * 100));
            }
            csvText += decoder.decode(value, { stream: true });
          }
          csvText += decoder.decode();
        }

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dataDictionary: Record<string, any> = {};
            results.data.forEach((row: any) => {
              if (row.Coords) {
                dataDictionary[row.Coords.trim()] = row;
              }
            });
            setMapData(dataDictionary);
            setIsLoadingData(false);
          },
          error: (error: any) => {
            console.error("Error parsing CSV:", error);
            setIsLoadingData(false);
          }
        });

      } catch (error) {
        console.error("Error fetching CSV:", error);
        setIsLoadingData(false);
      }
    };

    fetchMarsData();
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            isLoadingData ? (
              <Loading progress={loadingProgress} messages={loadingMessages} />
            ) : (
              <Home
                coordString={coordString}
                setCoordString={(val: string | null) => setCoordStringState(val as coordinateString)}
                mapData={mapData}
              />
            )
          }
        />
        <Route
          path="/finder"
          element={
            isLoadingData ? (
              <Loading progress={loadingProgress} messages={loadingMessages} />
            ) : (
              <Finder
                setCoordString={(val: string | null) => setCoordStringState(val as coordinateString)}
                mapData={mapData}
              />
            )
          }
        />
        <Route
          path="/breakthrough"
          element={
            isLoadingData ? (
              <Loading progress={loadingProgress} messages={loadingMessages} />
            ) : (
              <Breakthrough
                coordString={coordString}
                mapData={mapData}
              />
            )
          }
        />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;