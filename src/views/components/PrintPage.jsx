const PrintPageHeader = require('./PrintPageHeader');
const PropTypes = require('prop-types');
const React = require('react');

const PrintPage = ({ children, index, title, label }) => {
    return (
        <div className="PrintPage">
            <div className="PrintPage__ratio" data-ratio="210:297">
                <div className="PrintPage__wrapper">
                    <PrintPageHeader>
                        <h3 className="PrintPage__heading">
                            {title}
                            {label ? (
                                <span className="PrintPage__label">{label}</span>
                            ) : (
                                <span className="PrintPage__index">{index + 1}</span>
                            )}
                        </h3>
                    </PrintPageHeader>
                    <div className="PrintPage__list-wrapper">{children}</div>
                </div>
            </div>
        </div>
    );
};

PrintPage.propTypes = {
    children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
    index: PropTypes.number,
    title: PropTypes.string,
    label: PropTypes.string,
};

module.exports = PrintPage;
