const PropTypes = require('prop-types');
const React = require('react');

const OndernemerStatus = ({ status }) => {
    return (
        <span className={`OndernemerStatus OndernemerStatus--${status}`}>
            {status}
        </span>
    );
};

OndernemerStatus.propTypes = {
    status: PropTypes.string.isRequired,
};

module.exports = OndernemerStatus;
