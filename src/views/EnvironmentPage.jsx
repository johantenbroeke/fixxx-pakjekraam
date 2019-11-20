const Content = require('./components/Content');
const React = require('react');
const Page = require('./components/Page.jsx');
const PropTypes = require('prop-types');
const AanmeldForm = require('./components/AanmeldForm.jsx');
const Header = require('./components/Header');

class AanmeldPage extends React.Component {
    propTypes = {
        aanmeldingen: PropTypes.array,
        date: PropTypes.string.isRequired,
        ondernemer: PropTypes.object.isRequired,
        markt: PropTypes.object,
    };

    render() {
        return (
            <Page>
                <Header />
                <Content>
                    <p>API_MMAPPKEY: {process.env.API_MMAPPKEY}</p>
                    <p>API_URL: {process.env.API_URL}</p>
                    <p>API_READONLY_USER: {process.env.API_READONLY_USER}</p>
                    <p>API_READONLY_PASS: {process.env.API_READONLY_PASS}</p>
                    <p>APP_SECRET: {process.env.APP_SECRET}</p>
                    <p>DATABASE_URL: {process.env.DATABASE_URL}</p>
                    <p>IAM_ADMIN_PASS: {process.env.IAM_ADMIN_PASS}</p>
                    <p>IAM_ADMIN_USER: {process.env.IAM_ADMIN_USER}</p>
                    <p>IAM_CLIENT_ID: {process.env.IAM_CLIENT_ID}</p>
                    <p>IAM_CLIENT_SECRET: {process.env.IAM_CLIENT_SECRET}</p>
                    <p>IAM_REALM: {process.env.IAM_REALM}</p>
                    <p>IAM_CLIENT_SECRET: {process.env.IAM_CLIENT_SECRET}</p>
                    <p>IAM_URL: {process.env.IAM_URL}</p>
                    <p>MAILER_FROM: {process.env.MAILER_FROM}</p>
                    <p>MAILER_URL: {process.env.MAILER_URL}</p>
                    <p>NODE_ENV: {process.env.NODE_ENV}</p>
                    <p>APP_ENV: {process.env.APP_ENV}</p>
                    <p>POSTGRES_DB: {process.env.POSTGRES_DB}</p>
                    <p>POSTGRES_PASSWORD: {process.env.POSTGRES_PASSWORD}</p>
                    <p>POSTGRES_USER: {process.env.POSTGRES_USER}</p>
                    <p>POSTGRES_HOST: {process.env.POSTGRES_HOST}</p>
                    <p>POSTGRES_PORT: {process.env.POSTGRES_PORT}</p>
                </Content>
            </Page>
        );
    }
}

module.exports = AanmeldPage;
