const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync('src/razor_console/static/console.js', 'utf8');
const context = vm.createContext({clone: structuredClone});
vm.runInContext(source.slice(source.indexOf('function parseRecoilGroups('), source.indexOf('function recoilEditor(')), context);
const raw = `[component.RecoilComponent]
activation_keys = []
pattern = [
  # default
  [0.1, 0, 8],
  # k416
  # [0.1, 0, 8],
  # TL 模式
  # [0.1, -4, 6],
  # [0.2, -5, 7],
  # QBZ
  # [0.1, 3, 5],
]
`;
const plain = value => JSON.parse(JSON.stringify(value));
const parsed = plain(context.parseRecoilGroups(raw));
assert.equal(parsed.active, 'default');
assert.deepEqual(parsed.profiles.map(p => p.name), ['default', 'k416', 'TL 模式', 'QBZ']);
assert.deepEqual(parsed.profiles[2].pattern, [[0.1, -4, 6], [0.2, -5, 7]]);
const switched = context.serializeRecoilGroups(parsed.profiles, 'TL 模式');
assert.deepEqual(plain(context.parseRecoilGroups(switched)), {...parsed, active: 'TL 模式'});
assert.equal(context.parseRecoilGroups(context.serializeRecoilGroups(parsed.profiles, '')).active, '');
assert.deepEqual(plain(context.parseRecoilGroups('pattern = [[0, 1, 2]]', [[0, 1, 2]])).profiles[0].pattern, [[0, 1, 2]]);
console.log('Recoil comment groups parse, switch, disable and legacy fallback passed');
