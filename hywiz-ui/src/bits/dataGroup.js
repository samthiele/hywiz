// define the shed index page
import './dataGroup.css';
import DataPanel from './dataPanel.js';
import AnnotPanel from './annotPanel.js'
import SpectraView from './spectraView.js';
import { React, useState } from 'react';
import { useEffect } from 'react';
import {getHashData, setHashData, getHashString} from './hashData.js';

function selectChangeEvent( event ) {
    let hash = getHashData();
    hash.names.push(event.target.value);
    setHashData(hash);
    event.target.selectedIndex = 0;
    event.target.blur();
}

function deleteElement( index ) {
    let hash = getHashData();
    hash.names.splice( index, 1 ) // remove specified index from hash
    setHashData(hash);
}

function loadImageData(name, url, callback) {
    const img = new Image();
    img.onload = () => {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");

        // set canvas dimensions to image dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // add image to canvas and get data
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0,0,img.width, img.height).data;

        // convert data to a multidimensional array of RGBA values
        const rgbaArray = [];
        for (let i = 0; i < data.length; i += 4) {
            const rgba = [data[i], data[i + 1], data[i + 2], data[i + 3]];
            rgbaArray.push(rgba);
        }

        // reshape the array to (width, height, 4)
        const reshapedArray = [];
        for (let i = 0; i < rgbaArray.length; i += img.width) {
            reshapedArray.push(rgbaArray.slice(i, i + img.width));
        }
        callback( reshapedArray ); // store image and its dims
    }
    img.onerror = (err) => { 
        //console.log("Warning: could not load requested image? ", url)
        callback( [] ); // callback with empty list to flag that this image has been tried but failed
    };
    img.src = url;
}

function DataGroup( props ) {
    // get index data structure
    const data = props.data;

    // get (or set default) hash data
    const hashData = getHashData();

    // define state
    const [showS, setShowS] = useState(false);
    const [showA, setShowA] = useState(false);
    const [svgDims, setSVGDims] = useState([500,100]);
    const [imageData, setImageData ] = useState({});

    // load spectral data for each sensor
    // N.B. these are stored as PNG images so they can be remotely loaded.
    // one PNG image (sensor_idx.png) contains class IDs, while the other
    // (sensor_lib.png) contains the min,median and max spectra for this classID (such that 
    // each row is a class and each column is a band, the first channel contains the minima, etc. )
    const tmp = {}
    const updateImageData = (s, img) => {
        tmp[s] = img; // store until all images have loaded
        if (2*Object.keys( props.sensors ).length === Object.keys(tmp).length 
            && !(2*Object.keys( props.sensors ).length === Object.keys(imageData).length)) {
                setImageData( tmp ); // all images loaded, store
        }
    }
    if (typeof props.depths == 'undefined') { // only load spectra if we are in tray-view mode
        Object.keys( props.sensors ).map((s,i)=>{
            let iurl = props.root + "spectra/" + s + '_idx.png'; // set image url (result image from box)
            //let iurl = props.root + "results/BR_Clays.png"; // for debugging pixel picking, load sensor image
            let surl = props.root + "spectra/" + s + '_lib.png'; // set image url (result image from box)
            loadImageData(s+"_idx", iurl, (arr)=>{updateImageData(s+"_idx", arr);});
            loadImageData(s+"_lib", surl, (arr)=>{updateImageData(s+"_lib", arr);});
            return surl;
        });
    }

    // compute offset per-pixel for offsets specified in depth units.
    let dz = 1;
    let minv = 0;
    let maxv = 0;
    let cz = parseFloat( hashData.viewBox[1] );
    if (typeof props.depths !== 'undefined') {
        dz = 0.1*(props.depths[10] - props.depths[0]) // compute z-resolution using top of the depth array
        minv = props.depths[0];
        maxv = props.depths[props.depths.length - 1 ];
        
        // force URL to use meter mode for mosaics (is easier than computing depths from pixels here...)
        if (!hashData.viewBox[1].includes(".")) {
            hashData.viewBox[1] = "0.0";
            setHashData(hashData);
        }
    } 

    // setup events and get dimensions of our data panels
    useEffect( () => {

        // get and/or update dimensions of data panels
        let c = document.getElementsByClassName('Canvas');
        let setSize = (el) => {
            if (typeof el !== 'undefined'){
                if ( (svgDims[0] !== el.clientWidth) ||
                    (svgDims[1] !== el.clientHeight) ) {
                    setSVGDims([el.clientWidth,el.clientHeight])
                }
            }
        }

        let removeObserver = () => {};
        if (c.length > 0) {
            // check size
            setSize(c[0]);

            // add a resize observer to update again if size changes
            let obs = new ResizeObserver(()=>{ setSize(c[0]); })
            obs.observe(c[0]);
            removeObserver = () => { obs.disconnect() };
        }
        
        // Handle the mouse wheel scroll event
        function scrollEvent( event ) {
            event.stopPropagation();
            let hashData = getHashData();

            // compute offset
            if ( (typeof props.depths !== 'undefined') && (hashData.viewBox[1].includes(".")) ) { // we are using depth-units...
                let newY = parseFloat( hashData.viewBox[1] ) + event.deltaY*dz
                if (newY < minv) {
                    newY = minv;
                } else if (newY > maxv) {
                    newY = maxv;
                }
                hashData.viewBox[1] = newY.toFixed(2); // N.B. we need slightly higher precision here
            } else { // pixel units - easy!
                let newY = parseInt(hashData.viewBox[1]) + event.deltaY;
                hashData.viewBox[1] = newY.toFixed(0);
            }
            setHashData(hashData); // update hash URL which triggers update of image positions
        }

        // component mounted; add our mouse wheel listener
        window.addEventListener('wheel', scrollEvent );
        
        // component dismounted; cleanup our event
        return () => {
            window.removeEventListener('wheel', scrollEvent);
            removeObserver();
        }
    }, []);
    
    // show / hide spectra and annotation panel
    if (props.hole_id in data) { // render properly
        
        // combine annotations from data array and from newAnnotations object
        var annotations = data[ props.hole_id ].annotations;
        if (typeof(annotations) === 'undefined' ) {
            if (props.newAnnotations.hasOwnProperty(props.hole_id )) {
                annotations = props.newAnnotations[ props.hole_id  ].annotations; // annotations only defined in newAnnotations; use these
            }
        } else {
            if (props.newAnnotations.hasOwnProperty(props.hole_id )) {
                // annotations only defined in both newAnnotations and data array; combine keys
                for (let k in props.newAnnotations[ props.hole_id  ].annotations ) { // loop through annotation groups
                    if (annotations.hasOwnProperty(k)){ // merge group values
                        annotations[k] = { ...annotations[k], ...props.newAnnotations[ props.hole_id  ].annotations[k] }
                    } else { // just copy group; easy
                        annotations[k] = props.newAnnotations[ props.hole_id  ].annotations[k]
                    }
                }
            }
        }
        
        // render component
        return (
            <div key= {"DataGroup"+props.hole_id} className="DataGroup">
              <div className="MenuBox">
                {/* Annotations and spectra */ }
                { typeof props.depths !== 'undefined' ? (
                    <div className="menuText" onClick={(e)=>{setShowA(!showA)}}> 
                    { showA ? ( <u>Hide Annotation</u> ) : 
                        ( <u>Annotate</u> ) }
                    </div>
                ) : (
                    <div className="menuText" onClick={(e)=>{setShowS(!showS)}}>
                    { showS ? ( <u>Hide spectra</u> ) : 
                        ( <u>Show spectra</u> ) }
                    </div>
                ) }   

                {/* Help */}
                <div className="menuText"> <p>Add a</p>
                </div>

                {/* Sensors dropdown */}
                <select className="Dropdown" name="sensors" id="sensors"
                onChange={selectChangeEvent} disabled={ Object.keys( props.sensors ).length === 0  } >
                 <option value="0" key={'dummy'}>Sensor</option>;
                 {Object.keys( props.sensors ).map((s,i)=>{
                    return <option value={s} key={'sensor'+s+i}>{s}</option>;
                 })}
                </select>

                {/* Results dropdown */}
                <select className="Dropdown" name="results" id="results"
                    onChange={selectChangeEvent} disabled={ Object.keys( props.results ).length === 0  } >
                 <option value="0" key={'dummy'} >Result</option>;
                 {Object.keys( props.results ).map((k,i)=>{
                    return <option value={k} key={'result'+k+i}>{k}</option>;
                 })}
                </select>

                {/* Annotations dropdown */}
                { (typeof props.depths !== 'undefined') && annotations ? (
                     <select className="Dropdown" name="annotations" id="annotations"
                        onChange={selectChangeEvent} disabled={ Object.keys( annotations ).length === 0  }>
                     <option value="0" key={'ann0'}>Annotation</option>;
                     {Object.keys( annotations ).map((k,i)=>{
                        return <option value={k} key={'ann'+k+i}>{k}</option>;
                     })}
                    </select> ) : (<></>) }

                {/* Help menu */}
                <div className="viewPanel">
                    <p>View: <u onClick={(e)=>{
                        hashData.viewBox[1] = minv.toFixed(2);
                        setHashData(hashData);
                    }}>Top</u><span className="gap"></span>
                    <u onClick={(e)=>{
                        hashData.viewBox[1] = maxv.toFixed(2);
                        setHashData(hashData);
                    }}>Bottom</u><span className="gap"></span>
                    <u onClick={(e)=>{
                        hashData.viewBox[2] = "100";
                        hashData.viewBox[3] = "100";
                        setHashData(hashData);
                    }}>Reset</u><span className="gap"></span>
                    </p>
                </div>
                <div className="menuText"> 
                    <a href={"#/HelpView/"+getHashString(false, true)}>Help</a> </div>
              </div>
              <div className="ContentBox">
                {hashData.names.map((w,i)=>{
                    if ( (w in annotations) && (typeof props.depths === 'undefined') ) {
                        return <></>; // skip annotations in box view
                    } else {
                        return <DataPanel className = "Data" key={w+i} name={w} annotations={annotations}
                            svgDims={svgDims}
                            onDoubleClick={(e)=>{deleteElement(i);}} {...props} />;
                    }
                })}
              </div>

              {/* Render footer box (annotation toolbox or spectral viewer)*/}
              { (showA || showS ) ? (
              <div className="FooterBox">
                { typeof props.depths !== 'undefined' ? 
                (
                    <AnnotPanel data={props.data} newAnnotations={props.newAnnotations} setAnnotations={props.setAnnotations}
                                hole_id={props.hole_id}
                                depths={props.depths}
                                svgDims={svgDims}
                                cz={cz}/>
                ) : 
                (
                    <SpectraView imageData={imageData} 
                                    svgDims={svgDims}
                                    sensors={props.sensors}
                                    data={props.data}/>
                )}
              </div> ) : (<></>) }
            </div>
        );
    } else{
        return <br/>; // render dummy
    }
}

export default DataGroup;