
import './App.css';
import {React, useState} from 'react';
import {HashRouter, Route, Routes } from 'react-router-dom';
import Chart from "chart.js/auto";
import { CategoryScale } from "chart.js";
import zoomPlugin from 'chartjs-plugin-zoom';

// load our components
import ShedIndex from './bits/shedIndex.js'
import HoleIndex from './bits/holeIndex.js'
import BoxIndex from './bits/boxIndex.js'
import MosaicIndex from './bits/mosaicIndex.js'
import AboutMD from './bits/aboutMD.js'
import Help from './bits/help.js'
import pako from 'pako';

Chart.register(CategoryScale);
Chart.register(zoomPlugin);

function App() {

  // decompress our dataset
  /*global b64*/
  const decodedData = atob(b64);

  // Convert the base64 string to a Uint8Array
  const uint8Array = new Uint8Array(decodedData.length);
  for (let i = 0; i < decodedData.length; i++) {
    uint8Array[i] = decodedData.charCodeAt(i);
  }

  // Decompress using Pako
  const decompressedBuffer = pako.inflate(uint8Array, { to: 'string' });

  // Parse the JSON string
  /* global data */
  data = JSON.parse(decompressedBuffer);

  // set doc title to shed name
  document.title = data.name[0].toUpperCase() + data.name.slice(1);

  // initialise a hook for annotations
  const [newAnnotations, setAnnotations] = useState({});

  // ensure all holes have an annotation object
  data.holes.map( (h,i) => {
    if (!data[h].hasOwnProperty("annotations")){
      data[h].annotations = {}
    }});

  // add notification for leave or refresh (as annotations will be cleared)
  window.onbeforeunload = function() {
    return "Did you save your annotations?";
  }

  // render main app
  if ('name' in data) {

    // compute total meters
    data.scanned_length = 0;
    data.holes.forEach((h) => {
        let hole_length = 0;
        data[h].boxes.forEach((b) => {
            hole_length = hole_length + data[h][b].length;
        });
        data[h].scanned_length = hole_length;
        data.scanned_length = data.scanned_length + hole_length;
    });

    return (
    <div className="App">
      <header className="App-header">
        <HashRouter>
            <Routes>

                {/* ABOUT PAGE */}
                < Route path='/AboutView/*' element={ <AboutMD data={data} /> } />

                {/* HELPL PAGE */}
                < Route path='/HelpView/*' element={ <Help data={data} /> } />

                {/* SHED INDEX */}
                < Route path='/' element={ <ShedIndex data={data} /> } />

                {/* HOLE INDEX */}
                < Route path='/IndexView/:hole_id' element={<HoleIndex data={data}/>} />

                {/* BOX INDEX */}
                < Route path='/IndexView/:hole_id/:box_id' 
                        element={<BoxIndex data={data} newAnnotations={newAnnotations}
                        setAnnotations={setAnnotations} />} />

                {/* MOSAICS */}
                < Route path='/MosaicView/:hole_id/:layout' 
                        element={<MosaicIndex data={data}
                        newAnnotations={newAnnotations}
                        setAnnotations={setAnnotations} />} />

                {/* 404 */}
                < Route path='*' element={ <p>404: We looked, but couldn't find your rocks... </p> } />

             </Routes>
        </HashRouter>
      </header>
    </div>
    );

  // render loading screen
  } else {
    return (
        <div className="App">
          <header className="App-header">
            <h1>Loading...</h1>
          </header>
        </div>
  );
  }
}

export default App;
