// define the panel that contains all actual content.
import './dataPanel.css';
import {getHashData, setHashData, getHashString, getDepthIndex} from './hashData.js';

const font_size = 1.5; // font size in pixels

// wrapper component for ImageData, TextData and WireData
function DataPanel( props ) {
    let svgWidth = props.svgDims[0]; // clearer later on
    let svgHeight = props.svgDims[1];
    let aspx = svgHeight / svgWidth; // aspect ratio of the svg view window
    
    // get displayed object data
    let object = {};
    let legend = false;
    let img = false;
    let annot = false;
    if (typeof props.sensors[props.name] !== 'undefined'){
        object = props.sensors[props.name];
        img = props.root + props.name + ".png"; // set image url
    } else if (typeof props.results[props.name] !== 'undefined') {
        object = props.results[props.name];
        if (props.root.includes('fence') || props.root.includes('pole')){
            img = props.root + props.name + ".png"; // set image url (mosaic image)
        } else {
            img = props.root + "results/" + props.name + ".png"; // set image url (result image from box)
        }
        legend = 'leg/LEG_'+props.name.split('_')[props.name.split('_').length - 1] + ".png"; // set legend url
    } else if (typeof props.annotations[props.name] !== 'undefined') {
        object = props.annotations[ props.name ];
        annot = true;
    } else {
        return(<></>); // object not defined in this instance
    }

    // get image or data dims
    let width = 100; // default value for non-image data
    let height = width*aspx; // default height to SVG height
    if (typeof object.dims !== 'undefined') {
        if (props.rotate) {
            width = props.sensors[Object.keys(props.sensors)[0]].dims[1]; // object.dims[1]; // get dims of image from metadata
            height = props.sensors[Object.keys(props.sensors)[0]].dims[0]; // object.dims[0];
        } else {
            width = props.sensors[Object.keys(props.sensors)[0]].dims[0]; //object.dims[0]; // get dims of image from metadata
            height = props.sensors[Object.keys(props.sensors)[0]].dims[1]; //object.dims[1];
        }
    } else if (typeof props.depths !== 'undefined') {
        height = props.depths.length; // get height from length of depth array [ for annotations and wireline data ]
        if (props.rotate) {
            width = props.sensors[Object.keys(props.sensors)[0]].dims[1]; // get width from first image object to maintain consistent scaling
        } else {
            width = props.sensors[Object.keys(props.sensors)[0]].dims[0];
        }
    }

    // get scale and offset from hashdata
    const hashData = getHashData();
    let xscroll = parseInt(hashData.viewBox[0]);
    let yscroll = parseInt(hashData.viewBox[1]);
    let xscale = parseInt(hashData.viewBox[2]) / 100.0;
    let yscale = parseInt(hashData.viewBox[3]) / 100.0;

    let eWidth = width * xscale; // effective width of the viewport (used for scaling element)
    let eHeight = eWidth * aspx; // effective height of the viewport
    let vh = eHeight / 100.0; // vh unit for drawing in SVG element
        
    // convert offset float to pixel offset if needed
    if (typeof props.depths !== 'undefined') {
        if (hashData.viewBox[1].includes(".")) { // depth!
            let cd = parseFloat(hashData.viewBox[1]); // cursor depth
            if (cd < props.depths[1] ){
                yscroll = -(50*vh); // place cursor at top of hole
            } else if (cd > props.depths[props.depths.length - 1 ] ) {
                cd = props.depths[props.depths.length - 2 ] ; // place cursor at bottom of hole
                yscroll = parseInt( props.depths.length*yscale - (50*vh) );
            } else {
                yscroll = parseInt( getDepthIndex(parseFloat(hashData.viewBox[1]), props.depths )*yscale - (50*vh) ); // convert depth to pixels
            }
        } 
    }

    // compute depth of reference line and the box this falls in
    let zd="unk";
    let boxURL=""; // link to box on click
    let boxDepths = [];
    if (typeof props.depths !== 'undefined') {
        // find depth of center point (reference line)
        const zix = parseInt( (0.5*eHeight+parseInt(yscroll))/(yscale));
        if ( (zix > 0) && (zix < props.depths.length) ) {
            zd = props.depths.at(zix).toFixed(2) + "m";
        }

        // get depth of all boxes
        props.data[props.hole_id].boxes.map( (b,i) => {
            boxDepths.push( props.data[props.hole_id][b].end ); return 0; } );

        // get current box
        let cbox = props.data[props.hole_id].boxes[ getDepthIndex( props.depths.at(zix), boxDepths ) ];
        if (cbox) {
            zd = zd + " (" + cbox.split('_')[0] + ")";
        }

        // build box url
        let hash = getHashString(true, true);
        boxURL = '#/IndexView/'+props.hole_id+'/'+cbox+'/'+hash;
    }

    // handle click events
    let click = (evt) => {
        // shift-click; open image in a new tab
        if (evt.shiftKey || evt.altKey) {
            if (img) {
                window.open(img, '_blank');
            }
        } else { // left-click; set location of spectral probe
            if( typeof props.depths == 'undefined') {
                // Calculate relative coordinates of the click event
                let e = evt.target;
                if (e instanceof SVGImageElement){
                    let dim = e.getBoundingClientRect();
                    let x = (evt.clientX-dim.left)/xscale; // x in pixels
                    let y = (evt.clientY-dim.top)/yscale; // y in pixels
                    x = (x / dim.width)*xscale - 0.5; // relative to center (-0.5 to 0.5) 
                    y = (y / dim.width)*yscale - 0.5; // relative to center (-0.5 to 0.5)
                    // Add pixel coordinates to our hashdata and redirect
                    hashData.xy = [x.toFixed(4), y.toFixed(4)];
                    setHashData(hashData);
                }
            }
        }
    }
    
    // return rendered panel with SVG image
    return (
        <div className="PanelDiv" onDoubleClick={props.onDoubleClick}
             style={ {maxWidth: eWidth}}>
            <div className="Column">
                <div className="Title">
                  {legend ? (
                    <><div className="LegendText"><a href={legend} target="_blank" rel="noreferrer">{props.name}</a>
                        <div className="LegendImageDiv" style={{width: svgWidth}}>
                            <img className="LegendImage" src={legend} alt='legend'
                                onError={(e)=>{e.target.style.display='none';}}/>
                        </div></div>
                    </>
                  ) : (
                    <div className="LegendText">{props.name}</div>
                  )}
                </div>
                <svg className="Canvas" width="100%" height="100%" preserveAspectRatio="none" 
                        onClick={click} viewBox={`${-eWidth/2} 0 ${eWidth} ${eHeight}`} style={{fill:"#282c34"}}>

                    {/* background */}
                    <rect x="-50%" y="0" width="100%" height="100%" fill="#282c34"/>

                    {/* scroll box */}
                     <g transform={`translate(${xscroll},${-yscroll})`}>
                        <g transform={`scale(${xscale}, ${yscale})`}>
                            {/* image data component? */}
                            {img ? (<ImageData height={height} width={width}
                                    src={img} {...props} />) : (<></>)}
                                          
                            {/* plot probe (if specified in URL)*/}
                            { (hashData.xy && (typeof props.depths == 'undefined') ) ? (
                                <g>
                                    <circle cx={(parseFloat(hashData.xy[0])*eWidth/xscale)} 
                                        cy={(parseFloat(hashData.xy[1])+0.5)*eWidth/xscale} r={10} 
                                        key={"probeOuter1"} 
                                        stroke='white'
                                        strokeWidth="5"
                                        fill='none'/>
                                    <circle cx={(parseFloat(hashData.xy[0])*eWidth/xscale)} 
                                        cy={(parseFloat(hashData.xy[1])+0.5)*eWidth/xscale} r={10} 
                                        key={"probeOuter2"} 
                                        stroke='black'
                                        fill='none'/>
                                    <circle cx={(parseFloat(hashData.xy[0])*eWidth/xscale)} 
                                        cy={(parseFloat(hashData.xy[1])+0.5)*eWidth/xscale} r={3} 
                                        key={"probeInner1"} 
                                        fill='white'/>
                                    <circle cx={(parseFloat(hashData.xy[0])*eWidth/xscale)} 
                                        cy={(parseFloat(hashData.xy[1])+0.5)*eWidth/xscale} r={1} 
                                        key={"probeInner2"} 
                                        fill='black'/>
                                </g>
                                ) : (<></>)}
                        </g>

                        {/* top and EOH markers */}
                        { typeof props.depths !== 'undefined' ? (
                        <g>
                            <line style={{stroke:"rgb(255,255,255)", strokeWidth:vh}}
                                   x1="-50%" y1="0" x2="50%"  y2="0" />
                            <line style={{stroke:"rgb(0,0,0)", strokeWidth:0.5*vh}}
                               x1="-50%" y1="0" x2="50%"  y2="0"/>

                            <line style={{stroke:"rgb(255,255,255)", strokeWidth:vh}}
                                   x1="-50%" y1={props.depths.length*yscale} x2="50%"  y2={props.depths.length*yscale} />
                            <line style={{stroke:"rgb(0,0,0)", strokeWidth:0.5*vh}}
                               x1="-50%" y1={props.depths.length*yscale} x2="50%"  y2={props.depths.length*yscale}/>
                        </g> ) : (<></>) }

                        {/* annotation component? */}
                        { (typeof props.depths !== 'undefined') && annot ? (
                        <g style={{stroke:"rgb(255,255,255)", fill:"rgb(0,0,0)", fontSize:font_size*vh, strokeWidth:0.1*font_size*vh}} >
                            <AnnotationData height={height} width={width} vh={vh} title={props.title}
                                  yscale={yscale} depths={props.depths} src={object}/>
                        </g> ) : (<></>) }
                     </g>

                    {/* depth markers */}
                    {props.grid ? (<g>
                            <line style={{stroke:"rgb(255,255,255)", strokeWidth:0.5*font_size*vh}}
                               x1="-50%" y1="50%" x2="50%"  y2="50%" />
                            <line style={{stroke:"rgb(0,0,0)", strokeWidth:0.25*font_size*vh}}
                               x1="-50%" y1="50%" x2="50%"  y2="50%"/>
                        <g style={{stroke:"rgb(255,255,255)", fill:"rgb(0,0,0)", fontSize:font_size*vh}} >
                            <a href={boxURL}>
                                <text strokeWidth={0.25*font_size*vh} x="-48%" y="48%">{zd}</text>
                                <text strokeWidth="0" x="-48%" y="48%">{zd}</text>
                            </a>
                        </g>
                        </g> ) : (<></>) }
                </svg>
            </div>
        </div>
    );
}

// draw an image dataset
export function ImageData( props ) {
    // sort out rotation and translation of image, as needed
    let T = `translate(${-props.width/2}, 0)`; // no rotation, translate so origin is in middle of x-axis
    let imgWidth = props.width;
    let imgHeight = props.height;
    if (props.rotate) {
        imgWidth = props.height; // get actual image dims (n.b. width and height have already been swapped!)
        imgHeight = props.width;
        T = `scale(-1, 1) translate(0 -${imgHeight*0.5}) rotate(90, 0, ${imgHeight*0.5})`; // we need to apply this rotation
    }
    return (
           <image href={props.src} transform={T} preserveAspectRatio="none" width={imgWidth} height={imgHeight} />
    )
}

// draw an annotations object
export function AnnotationData( props ) {


    // setup hover function (replace title text)
    // get original title

    let mouseIn = (evt) => {
        if (evt.target.getAttribute('desc') !== '') {
            document.getElementById("titletext").textContent = evt.target.getAttribute('desc'); }
    }
    let mouseOut = (evt) => {
        if (evt.target.getAttribute('desc') !== '') {
            document.getElementById("titletext").textContent = props.title; }
    };

    // compute scales for numeric data (min and max)
    let mn = 999999;
    let mx = -999999;
    Object.keys(props.src).map( (k,i) => {
        let v = parseFloat(props.src[k].name);
        if (!isNaN(v)) {
            if (v < mn){ mn = v }
            if (v > mx){ mx = v }
        }
    } );

    return ( <>
    { Object.keys(props.src).map( (k,i) => {

        let vh = props.vh; // shorter

        // get start and end depth
        let start = getDepthIndex( props.src[k].start, props.depths );
        let end = start;
        if ( props.src[k].start !== props.src[k].end ) {
            end = getDepthIndex( props.src[k].end, props.depths );
        }

        // compute x coordinates
        let cx = "-40%";
        let tx = "-35%";
        let v = parseFloat(props.src[k].name);
        if (!isNaN(v)) {
            cx = (100*( (v-mn) / (mx-mn)) - 50)
            if (cx > 0){ tx = cx-20+'%' }
            else {tx = cx+5+'%'}
            cx=cx+"%";
        }
        if (start === end) {
            return (  <g key={k+i}>
                            <circle cx={cx} cy={start*props.yscale} r={font_size*vh*0.2} key={k+i+"c"} />
                            { props.src[k].type === "link" ? (
                                <a href={props.src[k].value} target="_blank" rel="noreferrer">
                                <text fill="white" strokeWidth="0"
                                  x={tx} y={start*props.yscale + 0.6*vh}
                                  textDecoration="underline" >{props.src[k].name}   </text>
                                </a> ) : (
                                <text fill="white" strokeWidth="0"
                                  onMouseEnter={mouseIn} onMouseLeave={mouseOut}
                                  x={tx} y={start*props.yscale + 0.6*vh}
                                  desc={props.src[k].value}> {props.src[k].name} </text> ) }
                      </g>)
        } else {
            return ( <g key={k+i}>
                         <line x1={cx} y1={start*props.yscale}
                               x2={cx} y2={end*props.yscale} key={k+i+"l"} />
                         <circle cx={cx} cy={start*props.yscale} r={font_size*vh*0.2} key={k+i+"s"} />
                         <circle cx={cx} cy={end*props.yscale} r={font_size*vh*0.2} key={k+i+"e"} />
                         <text fill="white" strokeWidth="0" x={tx} y={(start+0.5*(end-start))*props.yscale + 0.6*vh }>{props.src[k].name}</text>

                         { props.src[k].type === "link" ? (
                                <a href={props.src[k].value} target="_blank" rel="noreferrer">
                                 <text fill="white" strokeWidth="0" x={tx}
                                    y={(start+0.5*(end-start))*props.yscale + 0.6*vh }
                                    textDecoration="underline" >{k}</text>
                                </a> ) : (
                                 <text fill="white" strokeWidth="0" x={tx}
                                  onMouseEnter={mouseIn} onMouseLeave={mouseOut}
                                  y={(start+0.5*(end-start))*props.yscale + 0.6*vh }
                                  desc={props.src[k].value}>{props.src[k].name}</text>
                         ) }

                     </g> )
        }
        } ) }
    </>);
}

export default DataPanel;