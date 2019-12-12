// const PropTypes = require('prop-types');
const React = require('react');

const PrintButton = () => {
    /* eslint-disable no-script-url */
    return (
        <div className="PrintButton">
            <a href="javascript:print()" role="button" className="PrintButton__btn">
                Print
            </a>
        </div>
    );
};

PrintButton.propTypes = {
};

module.exports = PrintButton;
