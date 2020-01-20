const PropTypes = require('prop-types');
const React = require('react');
const { EXP_ZONE } = require('../../util.ts');

const OndernemerStatus = ({ status }) => {
    const statusClass = `OndernemerStatus--${status}`;
    return (
        <span className={`OndernemerStatus ${status === EXP_ZONE ? 'OndernemerStatus--exp' : statusClass}`}>
            { status === EXP_ZONE ? 'exp' : status }
        </span>
    );
};

OndernemerStatus.propTypes = {
    status: PropTypes.string.isRequired,
};

module.exports = OndernemerStatus;
