// define the panel that contains all actual content.
import './annotPanel.css';
import {getHashData, setHashData} from './hashData.js';
import {useRef, useState} from 'react'

function readJsonFile(props) {

    // Show save picker and write file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
        const blob = await file.text();
        const jsonData = JSON.parse(blob);
        
        // combine it with our data
        for (let h in jsonData){
            if (props.newAnnotations.hasOwnProperty(h)){ // we need to do a deeper merge
                for (let g in jsonData[h].annotations){
                    if (props.newAnnotations[h].annotations.hasOwnProperty(g)){
                        for (let a in jsonData[h].annotations[g]){
                            props.newAnnotations[h].annotations[g][a] = jsonData[h].annotations[g][a]; // copy individual annotations
                        }
                    } else {
                        props.newAnnotations[h].annotations[g] = jsonData[h].annotations[g]; // quite easy; copy whole annotation group
                    }
                }
            } else {
                props.newAnnotations[h] = jsonData[h]; // very easy; copy all the things
            }
        }

        // and update
        props.setAnnotations( structuredClone( props.newAnnotations ) );

    }
    });
    input.click();
}

function AnnotPanel( props ) {
    
    // get hash data (this includes the probe location)
    const hashData = getHashData();

    // setup refs for input text
    const from = useRef(null);
    const to = useRef(null);
    const group = useRef(null);
    const shortT = useRef(null);
    const longT = useRef(null);
    const [lockFrom, setLockFrom] = useState(false);
    const [lockTo, setLockTo] = useState(false);

    // setup events
    const submit = (evt) => {

        // create hole and annotations objects if needed
        if (!props.newAnnotations.hasOwnProperty(props.hole_id)){
            props.newAnnotations[props.hole_id] = {annotations:{}}
        }

        // create group if needed
        const groupN = group.current.value.trim();
        if (groupN === ''){
            alert("Please specify a group name");
            return;
        }
        if (!props.newAnnotations[props.hole_id].annotations.hasOwnProperty(groupN)){
            props.newAnnotations[props.hole_id].annotations[groupN] = {}
        }

        // store annotation
        var key = shortT.current.value.trim();
        var value = longT.current.value.trim();
        if (key === '') {
            alert("Please specify a short description.");
            return;
        }
        if (value === '') {
            value = key;
        }
        const a = { 
            name: key,
            value: value,
            type: "note",
            start: Math.min( parseFloat(from.current.textContent || from.current.innerText),parseFloat(to.current.textContent || to.current.innerText)),
            end:  Math.max( parseFloat(from.current.textContent || from.current.innerText),parseFloat(to.current.textContent || to.current.innerText)),
            }
        if (isNaN(a.start)){
            alert("Please specify a valid start depth.");
            return;
        } else if (isNaN(a.end)){
            a.end = a.start; // fixable.
        }
        if (a.value.startsWith('http') || a.value.startsWith('www') || a.value.startsWith('/') ) {
            a.type = "link"
        }

        const id = `${a.type}_${groupN}_${parseInt(a.start*100)}_${parseInt(a.end*100)}`;
        props.newAnnotations[props.hole_id].annotations[groupN][id] = a;
        props.setAnnotations( structuredClone( props.newAnnotations ) );

        // unset locks
        setLockFrom(false);
        setLockTo(false);
    }
    const delA = (evt) => {
        if (props.newAnnotations.hasOwnProperty(props.hole_id))
        {
            const start = parseFloat(from.current.textContent || from.current.innerText);
            const end = parseFloat(to.current.textContent || to.current.innerText);
            const groupN = group.current.value.trim();
            if (groupN === ''){
                alert("Please specify a group name");
                return;
            }
            if (props.newAnnotations[props.hole_id].annotations.hasOwnProperty(groupN)){
                let ann = props.newAnnotations[props.hole_id].annotations[groupN]; // shorthand
                if (start === end){ // find closest annotation in this group and remove it
                    var closest = false;
                    var closestDist = 999999;
                    for (let k in ann){
                        let d = Math.abs( start - 0.5*(ann[k].start + ann[k].end) ); // distance to mid-point
                        if (d < closestDist) {
                            closestDist=d;
                            closest=k;
                        }
                    }
                   if (closest){
                        delete props.newAnnotations[props.hole_id].annotations[groupN][closest]
                   } 
                } else { // find annotations between start and end depths and remove them
                    const toDel = []
                    for (let k in ann){
                        if ((start <= ann[k].start) && (end >= ann[k].end)) {
                            toDel.push(k); // don't delete keys while iterating!
                        }
                    }
                    
                    // do deletion
                    for (let k of toDel){
                        delete props.newAnnotations[props.hole_id].annotations[groupN][k]
                    }
                }

                // also remove group if it is now empty
                if ( Object.keys(props.newAnnotations[props.hole_id].annotations[groupN]).length === 0){
                    delete props.newAnnotations[props.hole_id].annotations[groupN]
                }

                // update
                props.setAnnotations( structuredClone( props.newAnnotations ) );

                // unset locks
                setLockFrom(false);
                setLockTo(false);
            }
        }
    }
    const cfrom = (evt) => {
        setLockFrom( lockFrom ?  (false) : (props.cz) );// toggle lock from
    }
    const setz = (evt) => {
        const v = parseFloat( prompt("Input start") );
        if (!isNaN(v)){
            hashData.viewBox[1] = v.toFixed(2);
            setHashData(hashData);
        }
    }
    const cto = (evt) => {
        setLockTo( lockTo ? (false) : (props.cz)  ); // toggle lock to
    } 
    const save = (evt) => {
        // build JSON file and download it
        var dataStr = JSON.stringify( props.newAnnotations );
        const options = {
            suggestedName:`${props.data['name']}_annotations.json`,
            types: [
              {
                description: 'JSON Files',
                accept: {
                  'text/json' : ['.json']
                },
              },
            ],
          };

        if ('showSaveFilePicker' in window) {
            // save using modern / sensible way (on Chrome etc.)
            window.showSaveFilePicker(options).then( (f) => {
                f.createWritable().then( (s) => {
                    s.write(dataStr);
                    s.close();
                }).catch( ()=>{console.log("Warning: could not write file.")} );
            }).catch( ()=>{  } ); 
        } else {
            // save using shitty download way
            const blob = new Blob([dataStr], { type: 'application/json' });

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${props.data['name']}_annotations.json`;
            
            // Trigger the download
            document.body.appendChild(a);
            a.click();

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        }
    }

    const load = (evt) => {
        readJsonFile(props);
    }

    const importF = (evt) => {
        
    }

    // return plot (if data was found)
    return( 
        <div className="annotPanel">
        
            <label htmlFor="from">Add annotation from </label>
            <button className="SButton" id="from" name="from" ref={from} onClick={cfrom} onDoubleClick={setz} style={{background: lockFrom ? ('orange'):('cyan')}}>
                    {lockFrom ?  (lockFrom.toFixed(2)) : (props.cz.toFixed(2)) }
            </button>
            <label htmlFor="to"> to </label>
            <button className="SButton" id="to" name="to" ref={to} onClick={cto} onDoubleClick={setz} style={{background: lockTo ? ('orange'):('cyan')}}>
                {lockTo ?  (lockTo.toFixed(2)) : (props.cz.toFixed(2)) }
            </button>

            <form className="form"> {/* Put these in a form to trigger refresh warnings */}
                <label htmlFor="label"> m and group </label>
                <input className="SInput" type="text" id="label" name="label" ref={group}
                    defaultValue="Notes"/>
                <br/>
                <input className="MInput" type="text" id="key" ref={shortT}
                    name="key" placeholder="Short text"/>
                <input className="LInput" type="text" id="value" ref={longT}
                    name="value" placeholder="Longer description and cool facts"/>
            </form>
            <button className="SButton" type="button" onClick={submit}>Add</button>
            <button className="SButton" type="button" onClick={delA}>Delete</button>
            <hr className="HR"/>
            <button className="LButton" type="file" onClick={save}>Save annotations</button>
            <button className="LButton" type="file" onClick={load}>Load annotations</button>
            <button className="LButton" type="button" onClick={importF} disabled>Import data</button> {/*TODO: implement this later to allow line-data to be loaded*/}

        </div>
    )
}
export default AnnotPanel;