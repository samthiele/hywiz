// define the shed index page
import './help.css';
import Container from './container.js';
import {getHashString} from './hashData.js';

function Help( props ) {
    let data = props.data;

    // get hash data (will be '' if no hash is set).
    let hash = getHashString(true, true);

    // get md source text
    const md = data.about;

    return (
        <Container
            title="Help"
            subtitle=""
            menu1 = 'Map' href1={"#/MapView/"+hash}
            menu2 = 'Index' href2={"#/"+hash}
            menu3 = 'About' href3={"#/AboutView/"+hash}>
            
            <div className="content">
                <h1><u>Overview</u></h1>
                <p>HyWiz is a web-based visualisation tool for large 
                hyperspectral drillcore databases. It aims to allow easy and 
                interactive visualisation of disparate imagery and analysis 
                results, to facilitate integrated geological interpretation.</p>
                
                <p>The viewer is arranged into several different pages: an
                   index page that lists the available boreholes, a core index
                   page that lists the boxes within each core, an image viewer 
                   that allows viewing of imagery associated with each box, and 
                   a mosaic viewer that shows composite (whole borehole) mosaics.
                </p>
                <h1><u>Quick start</u></h1>
                <p>
                    A detailed description of the Box and Mosaic viewers are provided in 
                    the following sections. However, for clarity the main keyboard shortcuts 
                    are summarised here:
                    <ul>
                    <li><a>Scroll</a>: Move up/down in the hole or box.</li>
                    <li><a>Up/Down Keys</a>: Cycle through the available sensors or results.</li>
                    <li><a>Left/Right Keys</a>: Move between adjacent trays (Box view) 
                            or holes (Mosaic view).</li>
                    <li><a>Shift+Up/Down</a>: Zoom in / out (if the window is large enough to allow this).</li>
                    <li><a>Alt+Up/Down/Left/Right</a>: Adjust aspect ratio of the images (scale in the x- and y- directions separately).</li>
                    <li><a>Alt/Option+Left Click</a>: Open image in a new tab.</li>
                    <li><a>Shift+Left Click</a>: Open image in a new window.</li>
                    <li><a>Double Click</a>: Remove clicked panel from the viewer.</li>
                    </ul>
                </p>
                <h1><u>Box viewer</u></h1>
                <p>
                This view presents imagery from each tray in the drillcore database 
                individually. Use the dropdowns along the top of the window to add 
                data from any of the listed sensors (e.g. different hyperspectral
                ranges) or analysis results.</p>
                <p> On adding a sensor, a new panel should appear in the viewer. To 
                    remove a panel, double-click it.</p>
                <p> <b>Left-clicking</b> an image in Box mode will place the pixel probe at 
                    this location. This can be used to view a compressed preview of the 
                    spectra at this location by clicking <a>View spectra</a> in the top 
                    left of the view window. Note that spectral information is not available 
                    for masked areas, and that the preview spectra is necessarily compressed 
                    in a lossy way (i.e. small features may not be preserved).
                </p> 
                <p><b>Left click and drag</b> the spectral plot to zoom in, and use <b>
                    shift+left click</b> to pan. 
                    The view can be reset by <b>double clicking</b>.
                </p>
                <h1><u>Mosaic viewer</u></h1>
                <p>To view mosaiced imagery for a hole drillcore, click the <a>Mosaic </a>
                   button in the index view, or the <a>pole </a> button in box view. Data
                   and results can be added to this view using the drop down menus, just like
                   in Box view. Additionally, annotation data (e.g. logging notes, 
                   lithology codes or assay data) can be plotted (if available) using the 
                   Annotation dropdown. The "cursor" in the center of each display shows the 
                   depth and corresponding box at this location. This can be clicked to transition 
                   seamlessly into Box View mode. 
                   </p><p>
                   To create new annotations, or edit existing ones, click the <a>Annotate</a> link 
                   in the top left of the mosaic view window. This will open a toolbox (at the 
                   bottom of the page). Use the <a>Load annotations</a> and <a>Save annotations</a>
                   buttons to load/save .json files containing annotation information. These can be 
                   created using python when building a HyWiz website (the default annotations), 
                   or created locally. 
                   </p><p>
                   Custom local annotations can be created by scrolling to the depth you wish
                   to annotate (or <b>double clicking</b> the <a>from</a> and <a>to</a> fields), 
                   typing a group name (value displayed in the annotation dropdown) in the <a>group</a> field,
                   a short description or value in the <a> Short text </a> field and a more detailed 
                   description (to be displayed when the mouse is hovered over an annotation) 
                   optionally in the <a> Longer description </a> field. The <a>from</a> and <a>to</a> fields 
                   can be locked and unlocked (during scrolling) by <b>left-clicking</b> them.
                   </p>
            </div>
        </Container>
    );
}

export default Help;