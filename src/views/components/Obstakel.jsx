const PropTypes = require('prop-types');
const React = require('react');

const icons = ['loopjediedichtmag', 'lantaarnpaal', 'bankje', 'boom', 'electra'];

const Obstakel = ({ obstakel }) => {
    return (
        <span className={
            'Obstakel ' + (icons.includes(obstakel) ? 'Obstakel__icon icon-' + obstakel : ' Obstakel__street')
        }> </span>
    );
};

Obstakel.propTypes = {
    obstakel: PropTypes.string,
};

module.exports = Obstakel;
