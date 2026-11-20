/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { Buffer } = require('node:buffer');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../../src/features/support/api/support.api.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const token = 'header.' + Buffer.from(JSON.stringify({ sub: 'sample-patient', name: 'Sample Patient' })).toString('base64url') + '.signature';

function loadContext(accessToken, capabilities) {
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, ...capabilities,
        require: name => {
            if (name === 'react-native') return { Platform: { OS: 'ios' } };
            if (name === '@/features/auth/auth.service') return { getAccessToken: () => accessToken };
            if (name === '@/lib/api/client' || name === '@/lib/api/api-error') return {};
            throw new Error('Unexpected dependency: ' + name);
        },
    });
    return exports;
}

test('support context works in the mobile atob runtime without a Buffer global', () => {
    const api = loadContext(token, { atob });
    assert.equal(api.getFallbackContextToken(), 'sample-patient:patient:sample-patient');
});

test('support context retains the optional Buffer-only runtime fallback', () => {
    const api = loadContext(token, { Buffer });
    assert.equal(api.getFallbackContextToken(), 'sample-patient:patient:sample-patient');
});

test('missing decoding support and malformed tokens fail without throwing', () => {
    assert.equal(loadContext(token, {}).getFallbackContextToken(), null);
    assert.equal(loadContext('invalid', { atob }).getFallbackContextToken(), null);
    assert.equal(loadContext(null, { atob }).getFallbackContextToken(), null);
});
