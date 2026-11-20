// Run from patient-app with jsdom available on NODE_PATH. Keep optional DOM test
// dependencies outside the mobile bundle:
// npm install --prefix /tmp/cannaquest-component-tests --ignore-scripts --no-audit --no-fund jsdom@27.4.0
// NODE_PATH=/tmp/cannaquest-component-tests/node_modules node scripts/tests/signature-display.test.cjs
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

// Only the native rendering / network boundary is replaced. React executes the
// real component and its hooks across committed renders, including effects.
let imageProps;
const view = ({ children }) => React.createElement('div', null, children);
const native = {
    View: view,
    Text: ({ children, onPress }) => React.createElement('span', { onClick: onPress }, children),
    Pressable: ({ children, onPress, disabled }) => React.createElement('button', { onClick: onPress, disabled }, children),
    Modal: ({ children, visible }) => visible ? view({ children }) : null,
    ActivityIndicator: () => React.createElement('div', { role: 'progressbar' }),
    Image: props => { imageProps = props; return React.createElement('img', { alt: 'Signature' }); },
    StyleSheet: { create: value => value, absoluteFill: {} },
    Platform: { OS: 'ios' },
    Linking: { openURL: async () => {} },
};
const load = Module._load;
Module._load = function (request, parent, ...rest) {
    if (request === 'react-native') return native;
    if (request === 'expo-image') return { Image: native.Image };
    if (request === '@/lib/theme/tokens') return { colors: {}, radii: {} };
    // Loading production S3 configuration would allow patient-storage access.
    // Missing configuration must never attempt client-side URL signing.
    if (request === '../api/s3ComplianceService') return {
        AWS_CONFIG: { accessKeyId: '', secretAccessKey: '', region: '', bucket: '', host: '.s3..amazonaws.com' },
        S3_BASE_URL: 'https://.s3..amazonaws.com',
        getS3PresignedUrl: () => { throw new Error('Cannot sign without storage configuration'); },
    };
    return load.call(this, request, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) {
    require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
}
const { SignatureDisplay } = require(path.resolve(__dirname, '../../src/features/customer/components/SignatureDisplay.tsx'));
const drawn = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg><path d="M 10 10 L 30 30 L 60 10" /></svg>');
const typed = 'data:text/plain;charset=utf-8,Sample%20Signature';
const remote = 'https://example.invalid/signature.png';

async function withComponent(run) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const errors = [];
    const root = createRoot(host, { onUncaughtError: error => errors.push(error) });
    const render = signature => { act(() => root.render(React.createElement(SignatureDisplay, { signature }))); };
    try { await run({ host, render, errors }); }
    finally { act(() => root.unmount()); host.remove(); }
}

test('saving a drawn or typed signature after a remote image does not crash or lose the preview', async () => {
    await withComponent(async ({ host, render, errors }) => {
        for (const signature of [remote, drawn, remote, typed, remote, null, drawn]) {
            await render(signature);
            assert.deepEqual(errors.map(error => error.message), []);
            assert.ok(host.childElementCount > 0, 'The signature area must stay mounted');
            if (signature === typed) assert.match(host.textContent, /Sample Signature/);
            if (signature === null) assert.match(host.textContent, /No signature/);
        }
    });
});

test('server-provided storage URLs are preserved when local signing configuration is absent', async () => {
    await withComponent(async ({ render, errors }) => {
        const source = 'https://cannaquest-storage.s3.example.invalid/signature.svg?X-Amz-Signature=example';
        await render(source);
        assert.deepEqual(errors.map(error => error.message), []);
        assert.equal(imageProps.source.uri, source);
    });
});

test('an image failure offers Retry, a retry can succeed, and a replacement starts fresh', async () => {
    await withComponent(async ({ host, render }) => {
        await render(remote);
        act(() => imageProps.onError({ error: 'offline', nativeEvent: { error: 'offline' } }));
        assert.equal(host.querySelector('[role="progressbar"]'), null);
        const retry = [...host.querySelectorAll('button')].find(button => /retry/i.test(button.textContent));
        assert.ok(retry, 'A failed signature must offer recovery');
        act(() => retry.click());
        assert.ok(host.querySelector('[role="progressbar"]'));
        act(() => imageProps.onLoad());
        assert.equal(host.querySelector('[role="progressbar"]'), null);
        assert.match(host.textContent, /Tap to view/);
        await render('https://example.invalid/replacement.png');
        assert.ok(host.querySelector('[role="progressbar"]'), 'New signatures must not reuse old load state');
    });
});

test('a request that never settles stops spinning and offers Retry', async t => {
    const pending = new Map();
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;
    t.mock.method(global, 'setTimeout', (callback, delay, ...args) => {
        if (delay < 1000) return realSetTimeout(callback, delay, ...args);
        assert.ok(delay <= 30_000, 'Loading must have a finite, usable deadline');
        const timer = {};
        pending.set(timer, () => callback(...args));
        return timer;
    });
    t.mock.method(global, 'clearTimeout', timer => {
        if (!pending.delete(timer)) realClearTimeout(timer);
    });
    await withComponent(async ({ host, render }) => {
        await render(remote);
        if (imageProps.onLoadStart) act(() => imageProps.onLoadStart());
        assert.ok(pending.size > 0, 'Image loading must have a deadline');
        act(() => { for (const callback of [...pending.values()]) callback(); });
        assert.equal(host.querySelector('[role="progressbar"]'), null);
        assert.match(host.textContent, /retry/i);
    });
});
