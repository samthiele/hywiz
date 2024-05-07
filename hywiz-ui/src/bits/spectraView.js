// define the panel that contains all actual content.
import './spectraView.css';
import { Line } from 'react-chartjs-2';
import {getHashData, setHashData} from './hashData.js';
import {useRef} from 'react'

/**
 *  Sorts all arrays together with the first. Pass either a list of arrays, or a map. Any key is accepted.
 *     Array|Object arrays               [sortableArray, ...otherArrays]; {sortableArray: [], secondaryArray: [], ...}
 *     Function comparator(?,?) -> int   optional compareFunction, compatible with Array.sort(compareFunction)
*      https://stackoverflow.com/questions/11499268/sort-two-arrays-the-same-way  
*/
function sortArrays(arrays, comparator = (a, b) => (a < b) ? -1 : (a > b) ? 1 : 0) {
    let arrayKeys = Object.keys(arrays);
    let sortableArray = Object.values(arrays)[0];
    let indexes = Object.keys(sortableArray);
    let sortedIndexes = indexes.sort((a, b) => comparator(sortableArray[a], sortableArray[b]));

    let sortByIndexes = (array, sortedIndexes) => sortedIndexes.map(sortedIndex => array[sortedIndex]);

    if (Array.isArray(arrays)) {
        return arrayKeys.map(arrayIndex => sortByIndexes(arrays[arrayIndex], sortedIndexes));
    } else {
        let sortedArrays = {};
        arrayKeys.forEach((arrayKey) => {
            sortedArrays[arrayKey] = sortByIndexes(arrays[arrayKey], sortedIndexes);
        });
        return sortedArrays;
    }
}

function SpectraView( props ) {
    
    // get hash data (this includes the probe location)
    const hashData = getHashData();
    
    // get probe location
    if (!hashData.xy){
        hashData.xy = [0,0]; // init
        setHashData(hashData); // redirect
    }
    let x = parseFloat(hashData.xy[0]);
    let y = parseFloat(hashData.xy[1]);

    // get info needed to convert SVG coords to image coords
    //let svgWidth = props.svgDims[0]; 
    //let xscale = parseInt(hashData.viewBox[2]) / 100.0;
    //let yscale = parseInt(hashData.viewBox[3]) / 100.0;

    // loop through sensors and aggregate wavelength and reflectance info!
    var xValues = [];
    var yMin = [];
    var yMed = [];
    var yMax = [];
    for (let s in props.sensors) {
        const img = props.imageData[s+"_idx"];
        const spectra = props.imageData[s+"_lib"];
        if ( (typeof img !== 'undefined') && (typeof spectra !== 'undefined')
             && (img.length !== 0) && (spectra.length !== 0) ) {
            
            // compute pixel in image coordinates
            const imgWidth = img[0].length;
            const imgHeight = img.length;
            //const sf = (imgWidth / svgWidth);
            const px = Math.max(
                Math.min( parseInt((y+0.5)*imgHeight), imgWidth-1),0); // N.B. image is rotated 90 degrees!
            const py = Math.max(
                Math.min( parseInt((x+0.5)*imgHeight), imgHeight-1),0);

            //const px = parseInt( xscale*y*sf); // N.B. image is rotated 90 degrees!
            //const py = parseInt( yscale*x*sf);

            // get class ID at point
            const c = img[py][px][0];
            
            // get corresponding spectra
            if (c > 0) {
                for (let b = 0; b < spectra.length; b++){
                    xValues.push(parseFloat(props.data['sensors'][s][b])); // todo; replace with actual wavelength!
                    yMin.push( spectra[b][c][0] / 255.0);
                    yMed.push( spectra[b][c][1] / 255.0);
                    yMax.push( spectra[b][c][2] / 255.0);
                }
            } else {
                for (let b = 0; b < spectra.length; b++){
                    xValues.push(parseFloat(props.data['sensors'][s][b])); // todo; replace with actual wavelength!
                    yMin.push( 0 );
                    yMed.push( 0 );
                    yMax.push( 0 );
                }
            }
        }
    }
    
    // sort by wavelength!
    const sorted = sortArrays([xValues, yMin, yMed, yMax]);
    xValues = sorted[0];
    yMin = sorted[1];
    yMed = sorted[2];
    yMax = sorted[3];

    // compile dataset for chartJS
    const data = {
        labels: xValues,
        datasets: [
          {
            label: null,
            data: yMin,
            fill: false,
            borderColor: 'rgb(180, 180, 180)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: null,
            data: yMed,
            fill: false,
            borderColor: 'rgb(240, 240, 240)',
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: null,
            data: yMax,
            fill: false,
            borderColor: 'rgb(180, 180, 180)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
          },
        ],
      };

    // define plot options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
        plugins: {
            legend: { display: false },
            zoom: {
              pan: {
                enabled: true,
                mode:'xy',
                scaleMode: 'xy',
                modifierKey:'shift',
              },
              limits: {
                // axis limits
              },
              zoom: {
                drag: { enabled: true }, 
                pinch: { enabled: true },
                mode: 'xy',
              }
            }
        },
        scales: {
            x: {
                display: true, // Hide x-axis labels
                ticks: {
                    color: 'white',  // Set y-axis color to blue
                },
                grid: {
                    color: 'rgb(180,180,180)',
                }, 
            },
            y: {
                display: true, // Hide y-axis labels
                ticks: {
                    color: 'white',  // Set y-axis color to blue
                },
                grid: {
                    color: 'rgb(180,180,180)',
                }, 
                axis: {
                    color: 'rgb(200,200,200)',
                    borderWidth: 2,
                },
                suggestedMin: 0,
                suggestedMax: 1,
            },
        }
    };

    // setup double click to reset zoom
    const chartRef = useRef(null);
    const resetZoom = () => {
        chartRef.current.resetZoom();
    }

    // return plot (if data was found)
    return( 
        xValues.length > 0 ? (
            <Line ref={chartRef}
                    className="chart" 
                    data={data} 
                    options={options} 
                    onDoubleClick={resetZoom}/> ) : (
            <p>Error - no spectral data was found for this box.</p>)
        )
}

export default SpectraView;