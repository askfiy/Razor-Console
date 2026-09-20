const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('src/razor_console/static/console.js', 'utf8');
const lifecycleSource = source.slice(source.indexOf('let runtimeStatusRevision ='), source.indexOf('async function pollLogs()'));
const previewSource = source.slice(source.indexOf('let lastPreviewFrameAt ='), source.indexOf("$('#frame').onload ="));
function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return {promise, resolve};
}
function setup() {
    const elements = new Map();
    const revoked = [];
    let urlSequence = 0;
    const state = {running: false, runtimePending: null, bound: true, busy: false, live: false, frameUrl: null,
        boot: {savedSections: [{name: 'bridge', enabled: true, data: {open_preview: true}}]}};
    const $ = selector => {
        if (!elements.has(selector)) elements.set(selector, {
            hidden: false, disabled: false, textContent: '', value: '60', open: false,
            classList: {toggle() {}},
            removeAttribute(name) { delete this[name]; },
            close() { this.open = false; }
        });
        return elements.get(selector);
    };
    const context = vm.createContext({
        state, $, document: {body: {classList: {toggle() {}}}},
        setTimeout() {}, performance: {now: () => 100}, AbortController, AbortSignal,
        URL: {createObjectURL: () => `blob:${++urlSequence}`, revokeObjectURL: url => revoked.push(url)},
        Image: class { async decode() {} },
        fetch: async () => { throw Error('Unexpected frame request'); },
        api: async () => { throw Error('Unexpected API request'); },
        task: fn => fn(), anyDirty: () => false, notify() {}, eventLog() {},
        syncSwitch: async (scope, changes) => { state.boot.savedSections = changes; }
    });
    vm.runInContext(lifecycleSource + '\n' + previewSource, context);
    return {context, state, $, revoked};
}
const frameResponse = () => ({ok: true, status: 200,
    headers: {get: name => name === 'content-type' ? 'image/jpeg' : 'true'},
    blob: async () => ({})});
const emptyResponse = running => ({ok: true, status: 204,
    headers: {get: name => name === 'x-runtime-running' ? String(running) : null}});

test('enabled preview waits for startup without requesting frames, then waits for Runtime frames', async () => {
    const {context, $, state} = setup();
    await context.pollFrame();
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 启动');
    assert.equal($('#toggle-preview').textContent, '关闭预览');
    assert.equal($('#expanded-toggle-preview').textContent, '关闭预览');
    assert.equal($('#preview-settings').hidden, true);
    context.applyRuntimeStatus({running: true});
    context.fetch = async () => emptyResponse(true);
    await context.pollFrame();
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 画面');
    assert.equal(state.live, false);
});

test('stop clears both previews before the stop request completes and preserves output setting', async () => {
    const {context, $, state, revoked} = setup();
    context.applyRuntimeStatus({running: true});
    context.fetch = async () => frameResponse();
    await context.pollFrame();
    assert.equal(state.live, true);
    $('#preview-dialog').open = true;
    $('#frame-meta').textContent = '416 × 416';
    const stop = deferred();
    context.api = url => { assert.equal(url, '/api/runtime/stop'); return stop.promise; };
    const stopping = $('#run').onclick();
    assert.equal(state.live, false);
    assert.equal($('#frame').hidden, true);
    assert.equal($('#large-frame').hidden, true);
    assert.equal($('#frame').src, undefined);
    assert.equal($('#large-frame').src, undefined);
    assert.equal($('#preview-dialog').open, false);
    assert.equal($('#frame-meta').textContent, '无画面');
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 启动');
    assert.deepEqual(revoked, ['blob:1']);
    stop.resolve({running: false});
    await stopping;
    assert.equal(state.boot.savedSections[0].data.open_preview, true);
    context.applyRuntimeStatus({running: true});
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 画面');
    await context.pollFrame();
    assert.equal(state.live, true);
    assert.equal($('#frame').src, 'blob:2');
});

test('a frame still decoding when Runtime stops cannot reappear after a restart', async () => {
    const {context, $, state, revoked} = setup();
    const decode = deferred();
    const decoding = deferred();
    context.Image = class { decode() { decoding.resolve(); return decode.promise; } };
    context.applyRuntimeStatus({running: true});
    context.fetch = async () => frameResponse();
    const frame = context.pollFrame();
    await decoding.promise;
    context.applyRuntimeStatus({running: false});
    context.applyRuntimeStatus({running: true});
    decode.resolve();
    await frame;
    assert.equal(state.live, false);
    assert.equal(state.frameUrl, null);
    assert.equal($('#frame').src, undefined);
    assert.deepEqual(revoked, ['blob:1']);
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 画面');
});

test('an outdated status response cannot undo a stop', async () => {
    const {context, $, state} = setup();
    context.applyRuntimeStatus({running: true});
    const oldStatus = deferred();
    context.api = url => url === '/api/runtime' ? oldStatus.promise : Promise.resolve({running: false});
    const poll = context.pollStatus();
    await $('#run').onclick();
    oldStatus.resolve({running: true, bound: true});
    await poll;
    assert.equal(state.running, false);
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 启动');
});

test('frame endpoint reports an unexpected Runtime exit without keeping the last frame', async () => {
    const {context, $, state} = setup();
    context.applyRuntimeStatus({running: true});
    context.fetch = async () => frameResponse();
    await context.pollFrame();
    context.fetch = async () => emptyResponse(false);
    await context.pollFrame();
    assert.equal(state.running, false);
    assert.equal(state.live, false);
    assert.equal(state.frameUrl, null);
    assert.equal($('#frame-empty strong').textContent, '等待 Runtime 启动');
});

test('closing preview clears images and distinguishes disabled output from waiting', async () => {
    const {context, $, state} = setup();
    context.applyRuntimeStatus({running: true});
    context.fetch = async () => frameResponse();
    await context.pollFrame();
    await $('#toggle-preview').onclick();
    assert.equal(state.live, false);
    assert.equal(state.frameUrl, null);
    assert.equal($('#toggle-preview').textContent, '开启预览');
    assert.equal($('#frame-empty strong').textContent, '画面输出未开启');
    assert.equal($('#expanded-preview-status').textContent, '预览已关闭');
    assert.equal($('#preview-settings').hidden, false);
});
