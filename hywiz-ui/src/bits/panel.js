// define the panel that contains all actual content.
import './panel.css';

function Panel( props ) {

    // todo: add link in Panel div to props.href (but not as hyperlink; rather by overriding click event)

    const handleClick = (e) => {
        if (e.target instanceof HTMLAnchorElement) {
            return; // let link handle this click
        } else
        {
            if (props.href !== '') {
                window.location.href = props.href;
            }
        }
      }

    return (
        <div className="Panel" onClick={handleClick}>
            {props.children}
        </div>
    );
}
export default Panel;