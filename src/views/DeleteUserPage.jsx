const React = require('react');
const Page = require('./components/Page.jsx');
const Content = require('./components/Content.jsx');
const Header = require('./components/Header.jsx');
const Form = require('./components/Form.jsx');
const PropTypes = require('prop-types');
const Alert = require('./components/Alert.jsx');

class DeleteUserPage extends React.Component {
    propTypes = {
        result: PropTypes.string,
        csrfToken: PropTypes.string,
        role: PropTypes.string,
    };

    render() {
        const { result, csrfToken, role } = this.props;
        return (
            <Page>
                <Header role={role} />
                <Content>
                    <Form csrfToken={csrfToken}>
                        <h1>Verwijder ondernemerdata</h1>
                        <div className="Fieldset">
                            {/* <h2 className="Fieldset__header">Als er ruimte is, hoeveel plaatsen zou je graag in totaal willen?</h2> */}
                            <p className="InputField InputField--number">
                                <label htmlFor="erkenningsNummer" className="Label">Registratienummer:</label>
                                <input
                                    name="erkenningsNummer"
                                    id="erkenningsNummer"
                                    className="Input"
                                />
                            </p>
                        </div>
                        <button
                            className="Button Button--secondary"
                            type="submit"
                            name="Verwijder"
                        >Verwijder ondernemerdata</button>
                    </Form>
                    { result ? (
                        <Alert type="success" inline={true}>
                            { result }
                        </Alert>
                        ) : null}
                </Content>
            </Page>
        );
    }
}

module.exports = DeleteUserPage;
