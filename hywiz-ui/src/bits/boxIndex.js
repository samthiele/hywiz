// define the shed index page
import './boxIndex.css';
import Container from './container.js';
import DataGroup from './dataGroup.js';
import {useParams} from 'react-router-dom';
import {setHashData, getHashData, formatHashData} from './hashData.js';
import { useEffect } from 'react';

function BoxIndex( props ) {
    // get data array
    let data = props.data;

    // get data from route
    const params = useParams();
    const hole_id = params.hole_id;
    const box_id = params.box_id;
    const box = data[hole_id][box_id];


    // add keypress events
    useEffect( () => {
        // component mounted; add key event
        function keyEvent( event ) {
            let hashData = getHashData();
            let hash = formatHashData(hashData);
            if (event.altKey){ // adjust aspect ratio
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
                        hashData.names[hashData.names.length-1] = im[ix];
                        setHashData(hashData);
                    }
                }

                // navigate to previous or next hole
                if (event.key === 'ArrowLeft') { // previous hole
                    let ix = data[hole_id].boxes.indexOf(box_id) - 1;
                    if (ix >= 0){
                        window.location.hash = '/IndexView/'+hole_id+'/'+data[hole_id].boxes[ix]+'/'+hash;
                    } }
                else if (event.key === 'ArrowRight') { // next hole
                    let ix = data[hole_id].boxes.indexOf(box_id) + 1;
                    if (ix < data[hole_id].boxes.length){
                        window.location.hash = '/IndexView/'+hole_id+'/'+data[hole_id].boxes[ix]+'/'+hash;
                    } }
            }
        }

        window.addEventListener('keydown', keyEvent );

        // component dismounted; cleanup our event
        return () => {
            window.removeEventListener('keydown', keyEvent);
        }
    });

    if (hole_id in data) {

        // get hash data (will be '' if no hash is set).
        // let hash = getHashString(true, true);
        const default_sensors = Object.keys( data[ hole_id ][ data[ hole_id ].boxes[0] ].sensors );
        let hashData = getHashData(default_sensors);

        // update y-offset to match box position when we go to mosaic mode
        hashData.viewBox[1] = (box.start + 0.5*(box.end - box.start)).toFixed(1);
        let hash = formatHashData(hashData);

        // render
        let title = hole_id + " / " + box_id +" ("+box.start.toFixed(2)+" - "+box.end.toFixed(2)+" m)"
        return (
        <Container
            title={title}
            subtitle=""
            menu1 = 'Index' href1={"#/"+hash}
            menu2 = 'Hole' href2={"#/IndexView/" + hole_id + "/" + hash} 
            menu3 = 'Mosaic' href3={"#/MosaicView/" + hole_id + "/fence/" + hash} >
            <DataGroup data={data} newAnnotations={props.newAnnotations} setAnnotations={props.setAnnotations}
                hole_id={hole_id}
                box_id={box_id}
                root={"img/"+hole_id+"/"+box_id+"/"}
                lRoot={"img/"+hole_id+"/"+box_id+"/"}
                sensors = {box.sensors}
                results = {box.results}
                grid = {false}
                rotate = {true}
                title={title}/>
        </Container>
        );
    } else{
        return (<p>Error: hole {hole_id} box {box_id} could not be found.</p>);
    }
}

export default BoxIndex;