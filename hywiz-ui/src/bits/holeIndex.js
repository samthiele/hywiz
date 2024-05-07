// define the shed index page
import './holeIndex.css';
import TextPanel from './textpanel.js';
import Container from './container.js';
import {getHashString} from './hashData.js';

import {useParams} from 'react-router-dom';
import { useEffect } from 'react';

function HoleIndex( props ) {
    // get data array
    let data = props.data;

    // get data from route
    const params = useParams();
    const hole_id = params.hole_id;

    // get hash data (will be '' if no hash is set).
    let hash = getHashString(true, true);

    // add keypress events
    useEffect( () => {
        // component mounted; add key event
        function keyEvent( event ) {
            if (event.key === 'ArrowDown') { }
            else if (event.key === 'ArrowUp') { } // in this case, we do nothing.
            else if (event.key === 'ArrowLeft') { // previous hole
                let ix = data.holes.indexOf(hole_id) - 1;
                if (ix >= 0){
                    window.location.hash = '/IndexView/'+data.holes[ix]+'/'+hash;
                } }
            else if (event.key === 'ArrowRight') { // next hole
                let ix = data.holes.indexOf(hole_id) + 1;
                if (ix < data.holes.length){
                    window.location.hash = '/IndexView/'+data.holes[ix]+'/'+hash;
                } }
        }
        window.addEventListener('keydown', keyEvent );

        // component dismounted; cleanup our event
        return () => {
            window.removeEventListener('keydown', keyEvent);
        }
    });

    if (hole_id in data) {
        // render properly
        return (
        <Container
            title={"Hole "+ hole_id }
            subtitle={data[hole_id].boxes.length + " boxes (" + data[hole_id].length.toFixed(2) + " m)"}
            menu1 = 'Index' href1={"#/"+hash}
            menu2 = 'Help' href2={"#/HelpView/"+hash}
            menu3 = 'Mosaic' href3={"#/MosaicView/" + hole_id + '/fence/'+hash}>

            {data[hole_id].boxes.map((b,i)=>{

                // check for gaps
                let gap = <></>;
                if ( (i>0) && (data[hole_id][ data[hole_id].boxes[i-1] ].end !== data[hole_id][b].start))
                {
                    let g = (data[hole_id][b].start - data[hole_id][ data[hole_id].boxes[i-1] ].end).toFixed(2);
                    gap = <p style={{width: 100 + '%',
                                    textAlign: 'center'}}>{g} m gap</p>
                }

                // render element
                return (<div key={b}>
                    {gap}
                    <TextPanel
                        title={b}
                        thumb={'img/'+hole_id+'/'+b+'/thumb.png'}
                        text1={data[hole_id][b].start.toFixed(2)+" - "+data[hole_id][b].end.toFixed(2)+" ("+(data[hole_id][b].end-data[hole_id][b].start).toFixed(2)+") meters"}
                        href = {"#/IndexView/" + hole_id + "/" + b + hash}
                        menu1 = 'Open' href1={"#/IndexView/" + hole_id + "/" + b + hash}
                    />
                    </div>)
                })}
        </Container>
        );
    } else{
        return (<p>Error: hole {hole_id} could not be found.</p>);
    }
}

export default HoleIndex;