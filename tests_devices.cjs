const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync('src/razor_console/static/console.js', 'utf8');
const state = {boot: {sections: []}, modal: null};
const elements = {};
function node(tag) {
    return {tag, children: [], append(...children) {this.children.push(...children);},
        replaceChildren() {this.children = [];}, value: ''};
}
const context = vm.createContext({state, node, Option: function(label, value) {this.label = label; this.value = value;},
    $: id => elements[id], attachHelp() {}, stopWatch() {}, drawEntry() {},
    section: (scope, name) => state.boot.sections.find(s => s.name === name),
    clone: x => JSON.parse(JSON.stringify(x)), plugins: {}, coreDefaults: {}});
for (const [start, end] of [
    ['function availableExtensionKeys()', 'function keysControl('],
    ['function isHardwareDevice(', 'function parseRecoilGroups('],
    ['function modalSection(', 'function openDrawer('],
]) {
    const a = source.indexOf(start), b = source.indexOf(end, a);
    assert.ok(a >= 0 && b > a);
    vm.runInContext(source.slice(a, b), context);
}
const cpbox = () => ({name: 'device.CloudPierce', enabled: true});
const extensions = () => ({name: 'device.ExtendOptions', enabled: true,
    data: {'<mouse-meta>': {dn: '1234'}}});
test('extension keys use the selected modal hardware, not stale saved hardware', () => {
    state.boot.sections = [cpbox(), {name: 'device.KmBoxNet', enabled: true}, extensions()];
    state.modal = null;
    assert.equal(context.availableExtensionKeys().length, 0);
    state.modal = {scope: 'boot', sections: [cpbox(), extensions(),
        {name: 'device.KmBoxNet', enabled: false}]};
    assert.deepEqual(Array.from(context.availableExtensionKeys()), ['<mouse-meta>']);
});
test('DhzBox has integer RANDOM and selectable defaults', () => {
    const entry = context.modalSection('boot', 'device.DhzBox');
    assert.equal(entry.enabled, false);
    assert.equal(entry.data.random_key, 81);
    assert.equal(entry.data.port, 8187);
    assert.equal(entry.data.monitor_port, 10086);
    assert.equal(context.isHardwareDevice('device.ExtendOptions.meta'), false);
});
test('selecting DhzBox disables extensions and preserves their definitions', () => {
    const devices = [cpbox(), {name: 'device.DhzBox', enabled: false}];
    const extra = extensions();
    state.modal = {scope: 'boot', sections: [...devices, extra]};
    elements['#drawer-content'] = node('div');
    context.drawHardwarePicker(devices);
    const picker = elements['#drawer-content'].children[1].children[1];
    picker.value = 'device.DhzBox';
    picker.onchange();
    assert.equal(extra.enabled, false);
    assert.equal(extra.changed, true);
    assert.equal(extra.data['<mouse-meta>'].dn, '1234');
    assert.equal(devices[0].enabled, false);
    assert.equal(devices[1].enabled, true);
});
