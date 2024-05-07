// define our main container that wraps around our content.
// this contains (1) a header box containing titles, metadata and the 3-link bar
//          and  (2) a body box containing the body components and optional scroll bar.
import './container.css';

function Container( props ) {
    return (
    <div className="Container">
        <div className="TitleBox">
            <div className="Menu">
                <span className="MenuItem"><a href={props.href1}>{props.menu1}</a></span>
                <span className="MenuItem"><a href={props.href2}>{props.menu2}</a></span>
                <span className="MenuItem"><a href={props.href3}>{props.menu3}</a></span>
            </div>
            <h1 id="titletext">{props.title}</h1>
            <i><h2>{props.subtitle}</h2></i>
        </div>

        <div className="ScrollBox">
            {props.children}
        </div>
    </div>
    );
}

export default Container;

