// get hash string based on last occuring hash
// (avoids conflicts with hash router being used
//  to allow functionality as static site )
export function getHashString(resetView=false, resetScale=false, default_sensors=[] ){
    // get (or set default) hash data
    let hashData = window.location.hash.split('#');
    if (hashData.length > 2) // has hash data has been set
    {
        if (resetView || resetScale){ // we have been asked to return modified hash data
            hashData = getHashData();
            if (resetView) {
                hashData.viewBox[0] = 0;
                hashData.viewBox[1] = 0;
            }
            if (resetScale) {
                hashData.viewBox[2] = 100;
                hashData.viewBox[3] = 100;
            }
            return formatHashData( hashData );
        } else { // return un-modified hash data
            return '#'+hashData[hashData.length-1];
        }
    } else // no hash data has been set
    {
        if (default_sensors.length > 0) { // but a default has been provided - use it!
            // custom has data is not set; define it now
            setHashData( {'viewBox':[0,0,100,100],
                           'names':default_sensors});
            return getHashString(); // now we've set something we can get it!
        } else { // no default... return nothing.
            return '';
        }
    }
}


// get SVG viewbox and display list from hash
export function getHashData(default_sensors=[]) {
    // get (or set default) hash data
    let hashData = getHashString(false, false, default_sensors).split('#');
    if (hashData.length > 0){
        let splt = hashData[1].split(':');
        return { "viewBox" : splt[0].split('&'),
                 "names" : splt[1].split('&'),
                 "xy" : (splt.length > 2) ? (splt[2].split('&')):(false)  };
    } else{
        return {};
    }
}

export function formatHashData( hashData ) {
    if (hashData.xy) {
        return '#'+hashData.viewBox.join('&')+':'
                  +hashData.names.join('&')+':'
                  +hashData.xy.join('&');
    } else {
        return '#'+hashData.viewBox.join('&')+':'+hashData.names.join('&');
    }
}

// update SVG viewbox in the hash
export function setHashData( hashData ) {
    let oldHash = window.location.hash.split('#');
    if (oldHash.length > 2)
    {
        oldHash.pop(); // drop last bit
    }

    // better; does the same, but without adding entry to history.
    window.location.replace('#'+oldHash.join('')+formatHashData(hashData));
}

export function getDepthIndex( z, depths ) {
    // get the index i of z in the depths array
    // such that depths[i-1] < z < depths[i]
    return depths.findIndex( (number)=>{return number > z } );
}