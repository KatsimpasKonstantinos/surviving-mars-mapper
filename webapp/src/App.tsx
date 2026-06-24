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

function App() {
  const [coordString, setCoordStringState] = useState<coordinateString | null>(null);
  const [mapData, setMapData] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    fetch('/mars_data.csv')
      .then(response => response.text())
      .then(csvText => {
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
          }
        });
      })
      .catch(error => console.error("Error loading CSV:", error));
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            isLoadingData ? (
              <div>Loading</div>
            ) : (
                <Home 
                coordString={coordString} 
                setCoordString={(val: string | null) => setCoordStringState(val as any)} 
                mapData={mapData} 
              />
            )
          }
        />
        <Route 
          path="/finder" 
          element={isLoadingData ? <div>Loading...</div> : <Finder coordString={coordString} setCoordString={(val: string | null) => setCoordStringState(val as any)} mapData={mapData}/>} 
        />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;