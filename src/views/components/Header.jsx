const LoginButton = require('./LoginButton');
const PropTypes = require('prop-types');
const React = require('react');

const Header = ({ user, children, hideLogout, breadcrumbs, role }) => {
    if (!breadcrumbs) {
        breadcrumbs = [
            {
                "title":"Markten",
                "url":"/markt",
            }
        ];
    }

    let logoUrl = '/';
    role ?
        logoUrl = role === 'marktmeester' ?
            '/markt/' : '/dashboard/'
        : null;

    return (
        <header className="Header">
            <div className="Header__top">
                <div className="container">
                    <div className="container__content">
                        <div className="Header__top-container">
                            <a className="Header__logo-link" href={logoUrl}>
                                <picture className="Header__logo">
                                    <source srcSet="/images/logo-desktop.svg" media="(min-width: 540px)" />
                                    <source srcSet="/images/logo-mobile.svg" media="(min-width: 0)" />
                                    <img srcSet="/images/logo-desktop.svg" alt="…" />
                                </picture>
                            </a>
                            <h1 className="Header__heading">Kies je kraam</h1>
                            <div>{!hideLogout ? <LoginButton user={user} /> : null}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="Header__bottom">
                <div className="container">
                    <div className="container__content">
                        <div className="Header__bottom-container">
                            <div className="Breadcrumbs">
                                { breadcrumbs ? breadcrumbs.map((link, i) => (
                                    <a className="Breadcrumb" href={link.url} key={i}>
                                        {link.title}
                                        <img className="Breadcrumb__icon" src="/images/chevron-right.svg" alt="Chevron-right"/>
                                    </a>
                                )) : null }
                            </div>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

Header.propTypes = {
    breadcrumbs: PropTypes.arrayOf(PropTypes.object),
    user: PropTypes.object,
    logoUrl: PropTypes.string,
    role: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
    hideLogout: PropTypes.bool,
};

module.exports = Header;
