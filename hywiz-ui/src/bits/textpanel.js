// define the panel that contains all actual content.
import './textpanel.css';

import Panel from './panel.js';

function TextPanel( props ) {

    // todo: float menu panel right somehow?

    return (
        <Panel href={props.href}>
            <img className="Thumb" src={props.thumb} alt='' onError={(e)=>{e.target.style.display='none';}}/>
            <div className="TextBox">
                <h1>{props.title}</h1>
                <h2>{props.text1}</h2>
                <i><h2>{props.text2}</h2></i>
                <i><h2>{props.text3}</h2></i>
            </div>
            <div className="MenuOuter">
                <div className="MenuInner">
                    <span className="MenuItem"><a href={props.href1}>{props.menu1}</a></span>
                    <span className="MenuItem"><a href={props.href2}>{props.menu2}</a></span>
                    <span className="MenuItem"><a href={props.href3}>{props.menu3}</a></span>
                </div>
            </div>
        </Panel>
    );
}

export default TextPanel;