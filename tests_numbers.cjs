const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('src/razor_console/static/console.js', 'utf8');
const context = vm.createContext({Event});
vm.runInContext(source.slice(source.indexOf('function numberBounds('), source.indexOf('const explanations =')), context);

class Input extends EventTarget {
    constructor(value) {
        super();
        this.value = String(value);
        this.dataset = {};
        this.min = this.max = '';
        this.step = 'any';
    }
    get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); }
}

test('controller gains accept off-grid decimals while retaining their original increments', () => {
    const steps = {kp: .01, ki: .001, kd: .0005, kf: .1};
    for (const gain of ['kp', 'ki', 'kd', 'kf']) for (const axis of ['x', 'y']) {
        const key = `${gain}_${axis}`;
        const bounds = context.numberBounds(key, .075);
        assert.equal(bounds.step, steps[gain], key);
        assert.equal(bounds.freePrecision, true, key);
        assert.equal(bounds.precision, undefined, key);
        const input = new Input(.075);
        input.min = String(bounds.min);
        input.max = String(bounds.max);
        input.dataset.numericStep = String(bounds.step);
        let saved;
        input.addEventListener('input', () => { saved = input.valueAsNumber; });
        input.dispatchEvent(new Event('input'));
        assert.equal(input.value, '0.075', key);
        assert.equal(saved, .075, key);
        context.stepNumberInput(input, 1);
        assert.equal(input.valueAsNumber, Number((.075 + steps[gain]).toFixed(4)), key);
        context.stepNumberInput(input, -1);
        assert.equal(input.value, '0.075', key);
        assert.equal(saved, .075, key);
    }
});

test('0.05 arrows round-trip without binary tails, including negative recoil and off-grid values', () => {
    const input = new Input(.2);
    context.configureDecimalInput(input, .05);
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.25');
    context.stepNumberInput(input, -1);
    assert.equal(input.value, '0.20');
    for (let i = 0; i < 100; i++) context.stepNumberInput(input, 1);
    assert.equal(input.value, '5.20');
    for (let i = 0; i < 100; i++) context.stepNumberInput(input, -1);
    assert.equal(input.value, '0.20');
    input.value = '-0.05';
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.00');
    context.stepNumberInput(input, -1);
    assert.equal(input.value, '-0.05');
    input.value = '0.23';
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.28');
});

test('manual decimals are normalized on commit and the saved value matches the display', () => {
    const input = new Input(.21000000000000002);
    context.configureDecimalInput(input, .05);
    assert.equal(input.value, '0.21');
    let saved;
    input.addEventListener('input', () => { saved = input.valueAsNumber; });
    input.value = '0.236';
    input.dispatchEvent(new Event('change'));
    assert.equal(input.value, '0.24');
    assert.equal(saved, .24);
    input.value = '';
    input.dispatchEvent(new Event('change'));
    assert.equal(input.value, '');
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.05');
    assert.equal(saved, .05);
});

test('collector intervals and minimum size use 0.05; confidence uses 0.1 without changing existing limits', () => {
    for (const key of ['lost_save_interval', 'active_save_interval', 'inactive_save_interval', 'scale_lt_filter',
        'active_confidence_threshold', 'inactive_confidence_threshold']) {
        const bounds = context.numberBounds(key, .2);
        const confidence = key.includes('confidence');
        assert.equal(bounds.step, confidence ? .1 : .05, key);
        assert.equal(bounds.precision, 2, key);
        const input = new Input(.2);
        context.configureDecimalInput(input, bounds.step, bounds.precision);
        context.stepNumberInput(input, 1);
        assert.equal(input.value, confidence ? '0.30' : '0.25', key);
        if (confidence) {
            assert.equal(bounds.fixed, undefined);
            assert.equal(context.numberBounds(key, 2.5).max, 2.5);
            input.value = '2.5';
            context.stepNumberInput(input, 1);
            assert.equal(input.value, '2.60', key);
        }
    }
});

test('decimal arrows respect explicit field bounds', () => {
    const input = new Input(.95);
    input.min = '0';
    input.max = '1';
    context.configureDecimalInput(input, .1);
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '1.00');
    input.value = '0';
    context.stepNumberInput(input, -1);
    assert.equal(input.value, '0.00');
});

test('fallback decimals avoid floating-point tails without reducing fine precision', () => {
    const input = new Input(.2);
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.21');
    input.value = '0.0005';
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.0105');
    input.readOnly = true;
    context.stepNumberInput(input, 1);
    assert.equal(input.value, '0.0105');
});
