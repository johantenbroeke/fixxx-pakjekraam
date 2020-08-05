const PropTypes = require('prop-types');
const React = require('react');

const Alert = ({ type, message, title, inline, children }) => {
    return (
        <div className={`Alert ${type} ${inline ? 'inline' : ''}`}>
            <span className="icon" />
            {title && <h4>{title}</h4>}
            <span className="message">{message ? message : children}</span>
        </div>
    );
};

Alert.propTypes = {
    type: PropTypes.string,
    children: PropTypes.optionalNode,
    message: PropTypes.string,
    title: PropTypes.string,
    inline: PropTypes.bool,
};

module.exports = Alert;
