const Alert = require('./Alert');
const PropTypes = require('prop-types');
const React = require('react');

class Page extends React.Component {
    propTypes = {
        children: PropTypes.optionalNode,
        decorator: PropTypes.string,
        csrfToken: PropTypes.string,
        dataAttributes: PropTypes.array,
    };

    render() {
        const { csrfToken, decorator, dataAttributes } = this.props;
        // let dataproperties = [
        //     { 'decorator': decorator },
        //     { 'vasteplaats-count': 3 },
        // ]
        console.log(dataAttributes);

        return (
            <form
                className="Form"
                method="POST"
                action="./"
                encType="application/x-www-form-urlencoded"
                data-decorator={decorator}
            >
                <input type="hidden" name="_csrf" value={csrfToken} />
                {this.props.children}
            </form>
        );
    }
}

module.exports = Page;
