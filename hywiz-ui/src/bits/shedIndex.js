// define the shed index page
import './shedIndex.css';
import TextPanel from './textpanel.js';
import Container from './container.js';
import {getHashString} from './hashData.js';

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

function ShedIndex( props ) {
    let data = props.data;

    // get hash data (will be '' if no hash is set).
    let hash = getHashString(true, true);

    // compute combined length
    const lengths = data.holes.map( (h,i) => data[h].length );
    const total_length = lengths.reduce((a,b)=>a+b, 0);
    const hole_order = sortArrays([lengths,data.holes])[1].reverse();
    return (
        <Container
            title={"Welcome to "+data.name[0].toUpperCase() + data.name.slice(1)}
            subtitle={data.holes.length+ " holes totalling " + total_length + " m."}
            menu1 = 'Map' href1={"#/MapView/"+hash}
            menu2 = 'Help' href2={"#/HelpView/"+hash}
            menu3 = 'About' href3={"#/AboutView/"+hash}>

            {hole_order.map((h,i)=>{
                let nannot = Object.keys( data[ h ].annotations ).length; // count annotations
                return <TextPanel
                    key={h}
                    title={h}
                    thumb={"img/"+h+"/thumb.png"}
                    text1={data[h]['boxes'].length.toFixed(2) + ((data[h]['boxes'].length > 1) ? " Boxes" : " Box")}
                    text2={(nannot > 0) ?
                         (data[h].length.toFixed(1) + " meters (" + nannot + " annotations)") :
                         (data[h].length.toFixed(1) + " meters") }
                    href = {"#/IndexView/" + h + "/" + hash}
                    menu1 = 'Index' href1={"#/IndexView/" + h + "/" + hash}
                    menu2 = 'Fence' href2={"#/MosaicView/" + h + "/fence/" + hash}
                    menu3 = 'Pole' href3={"#/MosaicView/" + h + "/pole/" + hash}
                />;
            })}
        </Container>
    );
}

export default ShedIndex;