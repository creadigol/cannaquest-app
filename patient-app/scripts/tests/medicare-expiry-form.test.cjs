// Uses the same optional jsdom dependency as signature-display.test.cjs.
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, after } = require('node:test');
const { JSDOM } = require('jsdom');
const React = require('react');
const ts = require('typescript');
const { act } = React;
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
after(() => dom.window.close());
const inputs = new Map();
const view = ({ children }) => React.createElement('div', null, children);
const native = {
    View: view, ScrollView: view, Text: view,
    Pressable: ({ children, onPress, disabled }) => React.createElement('button', { onClick: onPress, disabled }, children),
    Modal: ({ children, visible }) => visible ? view({ children }) : null,
    TextInput: props => {
        inputs.set(props.placeholder, props);
        return React.createElement('input', { placeholder: props.placeholder, value: props.value, readOnly: true });
    },
    ActivityIndicator: () => null,
    StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
    Alert: { alert() { throw new Error('Unexpected native alert'); } },
    Linking: { openURL: async () => {} },
};
const rootPath = path.resolve(__dirname, '../..');
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function (request, parent, ...rest) {
    if (request.startsWith('@/')) request = path.join(rootPath, 'src', request.slice(2));
    return resolve.call(this, request, parent, ...rest);
};
Module._load = function (request, parent, ...rest) {
    if (request === 'react-native') return native;
    if (request === '@/lib/theme/tokens') return { colors: {}, radii: {}, shadows: {} };
    return load.call(this, request, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) {
    require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
}
const { EditProfileModal } = require(path.join(rootPath, 'src/features/customer/components/EditProfileModal.tsx'));
const { CustomerInfoForm } = require(path.join(rootPath, 'src/features/questionnaire/components/CustomerInfoForm.tsx'));
const customer = {
    firstName: 'Sample', lastName: 'Patient', phone: '0412345678', dateOfBirth: '1990-06-15', gender: 'Female',
    medicareNumber: '2123456701', medicareIrn: '1', medicareExpiry: '2030-09-15T00:00:00.000Z',
};
async function withComponent(Component, props, run) {
    inputs.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(React.createElement(Component, props)));
    const press = async text => {
        const button = [...host.querySelectorAll('button')].find(element => element.textContent.includes(text));
        assert.ok(button, 'Expected form action');
        await act(async () => { button.click(); });
    };
    try { await run({ host, press }); }
    finally { act(() => root.unmount()); host.remove(); }
}

test('editing an unrelated profile field preserves the exact existing expiry while showing month/year', async () => {
    let saved;
    await withComponent(EditProfileModal, { visible: true, customer, onClose() {}, onSave: async data => { saved = data; } }, async ({ press }) => {
        assert.equal(inputs.get('01/2028').value, '09/2030');
        act(() => inputs.get('First name').onChangeText('Updated'));
        await press('Save');
        assert.equal(saved.firstName, 'Updated');
        assert.equal(saved.medicareExpiry, customer.medicareExpiry);
    });
});

test('profile editing rejects malformed expiry before saving', async () => {
    let saves = 0;
    await withComponent(EditProfileModal, { visible: true, customer, onClose() {}, onSave: async () => { saves++; } }, async ({ host, press }) => {
        act(() => inputs.get('01/2028').onChangeText('13/2030'));
        await press('Save');
        assert.equal(saves, 0);
        assert.match(host.textContent, /Medicare expiry/);
    });
});

test('an expiry rejection is identified as expiry rather than incorrectly blaming date of birth', async () => {
    await withComponent(EditProfileModal, {
        visible: true, customer, onClose() {},
        onSave: async () => { throw new Error('medicareExpiry must be a valid ISO 8601 date string'); },
    }, async ({ host, press }) => {
        await press('Save');
        assert.match(host.textContent, /Medicare expiry/);
        assert.doesNotMatch(host.textContent, /Please enter a valid date of birth/);
    });
});

test('a questionnaire prefilled with an ISO expiry can continue without changing the stored date', async () => {
    const initialInfo = {
        first_name: 'Sample', last_name: 'Patient', email: 'patient@example.invalid', phone: '0412345678',
        date_of_birth: '1990-06-15', gender: 'Female', has_medicare: true, medicare_number: '2123456701',
        medicare_irn: '1', medicare_expiry: '2030-09-15', delivery_line1: '1 Example Street', delivery_line2: '',
        delivery_suburb: 'Melbourne', delivery_state: 'VIC', delivery_postcode: '3000',
    };
    let saved;
    await withComponent(CustomerInfoForm, { initialInfo, onSaveAndContinue: async data => { saved = data; } }, async ({ press }) => {
        assert.equal(inputs.get('MM/YYYY').value, '09/2030');
        await press('Continue to Questions');
        assert.equal(saved.medicare_expiry, '2030-09-15');
        act(() => inputs.get('MM/YYYY').onChangeText('10/2030'));
        await press('Continue to Questions');
        assert.equal(saved.medicare_expiry, '10/2030', 'An intentional expiry edit must reach the API boundary');
    });
});
