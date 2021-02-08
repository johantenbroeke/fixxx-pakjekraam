const PropTypes = require('prop-types');
const React = require('react');
const Button = require('./Button');

const HeaderTitleButton = ({ title, url, label, buttonDisabled }) => {
    return (
        <div className="HeaderTitleButton">
            <h3 className="HeaderTitleButton__title">{title}</h3>
            { !buttonDisabled ?
                <Button label={label || 'Wijzig'} href={url} type={`secondary`} />
            : null }
        </div>
    );
};

HeaderTitleButton.propTypes = {
    title: PropTypes.string.isRequired,
    buttonDisabled: PropTypes.bool,
    url: PropTypes.string,
    label: PropTypes.string,
};

module.exports = HeaderTitleButton;
