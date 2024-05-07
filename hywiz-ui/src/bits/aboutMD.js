// define the shed index page
import './aboutMD.css';
import Container from './container.js';
import {getHashString} from './hashData.js';
import ReactMarkdown from 'react-markdown';

function AboutMD( props ) {
    let data = props.data;

    // get hash data (will be '' if no hash is set).
    let hash = getHashString(true, true);

    // get md source text
    const md = data.about;

    return (
        <Container
            title="About"
            subtitle=""
            menu1 = 'Map' href1={"#/MapView/"+hash}
            menu2 = 'Help' href2={"#/HelpView/"+hash}
            menu3 = 'Index' href3={"#/"+hash}>

            <ReactMarkdown children={md} className="markdown" />
        </Container>
    );
}

export default AboutMD;