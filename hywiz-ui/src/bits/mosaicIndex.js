// define the shed index page
import './mosaicIndex.css';
import Container from './container.js';
import DataGroup from './dataGroup.js';
import {useParams} from 'react-router-dom';
import { useEffect } from 'react';
import {getHashString, setHashData, getHashData} from './hashData.js';

function MosaicIndex( props ) {
    // get data array
    let data = props.data;

    // get data from route
    const params = useParams();
    const hole_id = params.hole_id;
    const mosaic_type = params.layout;

    // get depth info
    const hole = data[hole_id];
    let depths = hole.fence.depths;
    if (mosaic_type === 'pole'){
        depths = hole.pole.depths;
    }

    // get mosaic type
    let mURL = 'pole';
    let mName = 'Pole';
    if (mosaic_type === 'pole')
    {
        mURL = 'fence';
        mName = 'Fence';
    }

    // get hash data
    let default_sensors = Object.keys( data[ data.holes[0] ][ data[ data.holes[0] ].boxes[0] ].sensors );
    if (hole_id in data){
        default_sensors = Object.keys( data[ hole_id ][ data[ hole_id ].boxes[0] ].sensors );
    }
    let hash = getHashString(false, true, default_sensors);
    let hashData = {}
    if (hash.length > 0) {
        hashData = getHashData();
    }

    // add keypress events
    useEffect( () => {
        // component mounted; add key event
        function keyEvent( event ) {
            if (event.altKey){ // adjust aspect ratio
                let hashData = getHashData();
                if (event.key === 'ArrowUp') { hashData.viewBox[3] = parseInt(hashData.viewBox[3])-5 }
                else if (event.key === 'ArrowDown') { hashData.viewBox[3] = parseInt(hashData.viewBox[3])+5 }
                else if (event.key === 'ArrowLeft') { hashData.viewBox[2] = parseInt(hashData.viewBox[2])-5 }
                else if (event.key === 'ArrowRight') { hashData.viewBox[2] = parseInt(hashData.viewBox[2])+5 }
                setHashData(hashData);
            } else if (event.shiftKey) {
                if (event.key === 'ArrowUp' || event.key === 'ArrowRight')
                    { hashData.viewBox[2] = parseInt(hashData.viewBox[2])+5;
                      hashData.viewBox[3] = parseInt(hashData.viewBox[3])+5; }
                else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft')
                    { hashData.viewBox[2] = parseInt(hashData.viewBox[2])-5;
                      hashData.viewBox[3] = parseInt(hashData.viewBox[3])-5; }
                setHashData(hashData);
            } else {
                if ((event.key === 'ArrowUp') ||  (event.key === 'ArrowDown')){ // change last image up / down
                    // get available image and results images
                    let hashData = getHashData();
                    let sensors =  Object.keys(data[hole_id][data[hole_id].boxes[0]].sensors);
                    let results = Object.keys(data[hole_id][data[hole_id].boxes[0]].results);

                    // get last image in hash data
                    var i = hashData.names.length - 1;
                    let im = []; // array to navigate with
                    let cim = '';
                    for (i; i > 0; i-- ) {
                        cim = hashData.names[i];
                        if (sensors.includes(cim)) {
                            im = sensors;
                            break;
                        } else if (results.includes(cim)) {
                            im = results;
                            break;
                        }
                    }

                    let ix = im.indexOf(cim); // new index
                    if (event.key === 'ArrowDown') {
                        ix = ix - 1;
                        if (ix < 0){ ix = 0; }
                    } else if (event.key === 'ArrowUp') {
                        ix = ix + 1;
                        if (ix >= im.length){ ix = im.length - 1; }
                    }

                    // update hash
                    if (im[ix] !== cim){
                        hashData.names[i] = im[ix];
                        setHashData(hashData);
                    }
                }

                // navigate to previous or next hole
                if (event.key === 'ArrowLeft') { // previous hole
                    let ix = data.holes.indexOf(hole_id) - 1;
                    if (ix >= 0){
                        window.location.hash = "#/MosaicView/" + data.holes[ix] + "/" + mosaic_type + "/" + hash
                    } }
                else if (event.key === 'ArrowRight') { // next hole
                    let ix = data.holes.indexOf(hole_id) + 1;
                    if (ix < data.holes.length){
                        window.location.hash = "#/MosaicView/" + data.holes[ix] + "/" + mosaic_type + "/" + hash
                    } }
            }
        }
        window.addEventListener('keydown', keyEvent );
        return () => { // component dismounted; cleanup our event
            window.removeEventListener('keydown', keyEvent);
        }
    });

    if (hole_id in data) {

        // create sensor and mosaic arrays with updated dims
        const sensors = structuredClone(data[ hole_id ][ data[ hole_id ].boxes[0] ].sensors);
        const results = data[ hole_id ][ data[ hole_id ].boxes[0] ].results;
        Object.keys(sensors).map( (k,i) => {sensors[k].dims = data[hole_id][mosaic_type].dims; return(0); } );
        Object.keys(results).map( (k,i) => {results[k].dims = data[hole_id][mosaic_type].dims; return(0); } );
        
        // render
        let title = hole_id +" ("+depths[0]+" - "+(depths[0]+data[hole_id].length).toFixed(2)+" m)"
        return (
        <Container
            title={title}
            subtitle=''
            menu1 = 'Index' href1={"#/"+hash}
            menu2 = 'Hole' href2={"#/IndexView/" + hole_id + "/" + hash} 
            menu3 = {mName} href3={"#/MosaicView/" + hole_id + "/" + mURL + "/" + hash}>
            <DataGroup data={data} newAnnotations={props.newAnnotations} setAnnotations={props.setAnnotations}
                hole_id={hole_id}
                root={"img/"+hole_id+"/"+mosaic_type+"/"}
                lRoot={"img/"+hole_id+"/"+hole.boxes[0]+"/"}
                sensors = { sensors }
                results = { results }
                grid={true}
                depths={depths}
                title={title}
                rotate = {mosaic_type === 'fence' ? ( false ) : ( true ) }/>
        </Container>
        );
    } else{
        return (<p>Error: hole {hole_id} could not be found.</p>);
    }
}

export default MosaicIndex;