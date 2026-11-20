// Run from patient-app: node --test scripts/tests/medicare-expiry.test.cjs
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const axios = require('axios');
const root = path.resolve(__dirname, '../..');
const requests = [];
// Exercise the actual API wrapper and Axios JSON serialization without making
// any network requests or changing patient records.
const apiClient = axios.create({
    adapter: async config => {
        requests.push({ url: config.url, body: JSON.parse(config.data) });
        return { data: { success: true, data: null }, status: 200, statusText: 'OK', headers: {}, config };
    },
});
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function (request, parent, ...rest) {
    if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
    return resolve.call(this, request, parent, ...rest);
};
Module._load = function (request, parent, ...rest) {
    if (request === '@/lib/api/client') return { apiClient };
    return load.call(this, request, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) {
    require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
}
const { updateCustomerProfile } = require(path.join(root, 'src/features/customer/api/customer.api.ts'));
const { validateMedicareExpiry } = require(path.join(root, 'src/features/questionnaire/utils/validators.ts'));

test('month/year expiry is serialized to a real ISO date without changing other profile fields', async () => {
    const input = Object.freeze({ firstName: 'Sample', lastName: 'Patient', gender: 'Female', medicareExpiry: '09/2030' });
    await updateCustomerProfile(input);
    assert.deepEqual(requests.at(-1), {
        url: '/patient/v1/customers/me/profile',
        body: { firstName: 'Sample', lastName: 'Patient', gender: 'Female', medicareExpiry: '2030-09-30' },
    });
    assert.equal(input.medicareExpiry, '09/2030');
});

test('month-end conversion handles short months, leap years and year boundaries', async () => {
    for (const [input, expected] of [
        ['02/2028', '2028-02-29'], ['02/2029', '2029-02-28'],
        ['02/2100', '2100-02-28'], ['02/2000', '2000-02-29'],
        ['04/2030', '2030-04-30'], ['12/2030', '2030-12-31'],
        [' 01/2031 ', '2031-01-31'],
    ]) {
        await updateCustomerProfile({ medicareExpiry: input });
        assert.equal(requests.at(-1).body.medicareExpiry, expected);
    }
});

test('existing ISO dates and timestamps retain their exact day and timezone', async () => {
    for (const value of ['2030-09-15', '2030-09-15T00:00:00.000Z', '2030-09-01T00:00:00+10:00', '2030-09']) {
        assert.equal(validateMedicareExpiry(value), true, 'Existing server values must be accepted by the form');
        await updateCustomerProfile({ medicareExpiry: value });
        assert.equal(requests.at(-1).body.medicareExpiry, value);
    }
});

test('omitted and cleared expiry retain their distinct request meanings', async () => {
    await updateCustomerProfile({ firstName: 'Sample' });
    assert.deepEqual(requests.at(-1).body, { firstName: 'Sample' });
    await updateCustomerProfile({ medicareExpiry: undefined });
    assert.equal(Object.hasOwn(requests.at(-1).body, 'medicareExpiry'), false);
    for (const value of [null, '', '   ']) {
        await updateCustomerProfile({ medicareExpiry: value });
        assert.equal(requests.at(-1).body.medicareExpiry, null);
    }
});

test('invalid expiry cannot make a profile update request', async () => {
    for (const value of ['00/2030', '13/2030', '9/2030', '09/30', '2030-02-30', '2030-13-01', 'not a date']) {
        assert.equal(validateMedicareExpiry(value), false);
        const before = requests.length;
        await assert.rejects(updateCustomerProfile({ medicareExpiry: value }), /Medicare expiry/);
        assert.equal(requests.length, before);
    }
});
