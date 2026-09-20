const $ = s => document.querySelector(s);
const state = {
    boot: null,
    game: null,
    name: '',
    games: [],
    running: false,
    runtimePending: null,
    bound: false,
    busy: false,
    modal: null,
    capture: null,
    logs: [],
    sequence: 0,
    generation: null,
    frameUrl: null,
    live: false
};
const labels = {
    render: '渲染',
    selector: '选择',
    controller: '控制',
    inferencer: '引擎',
    kalman: '滤波',
    player: '输入绑定',
    system: '启动配置',
    bridge: 'Console 输出',
    device: '硬件设备',
    follow_mode: '跟随模式',
    aiming_button: '开镜按键',
    firing_button: '开火按键',
    paused_button: '暂停运行',
    switch_button: '自动模式',
    axis_mask_x: '屏蔽手动 X 轴',
    axis_mask_y: '屏蔽手动 Y 轴',
    engine: '推理引擎',
    model_path: '模型路径',
    nms_threshold: 'NMS 阈值',
    nms_topk: '每类候选上限',
    conf_thresholds: '分类置信度',
    class_id: '类别 ID',
    threshold: '置信度阈值',
    dynamic_threshold: '动态置信度阈值',
    class_priority: '类别优先级',
    priority: '优先级',
    include: '包含类别',
    min_hold_frames: '最小保持帧数',
    max_lost_frames: '最大丢失帧数',
    weight_position: '位置权重',
    weight_velocity: '速度权重',
    kp_x: '比例 · X',
    kp_y: '比例 · Y',
    ki_x: '积分 · X',
    ki_y: '积分 · Y',
    kd_x: '微分 · X',
    kd_y: '微分 · Y',
    kf_x: '前馈 · X',
    kf_y: '前馈 · Y',
    url: '采集源地址',
    is_show: '本地预览窗口',
    title: '窗口标题',
    imgsz: '渲染尺寸',
    transport: '传输方式',
    open_preview: '向 Console 输出画面',
    loader: '启动时加载的游戏',
    com_port: '串口',
    host: '主机地址',
    port: '端口',
    monitor_port: '监听端口',
    key: '设备密钥',
    activation_keys: '激活按键',
    skip_rand_keys: '跳过随机偏移按键',
    skip_delay_keys: '跳过延迟按键',
    active_percent: '激活范围比例',
    default_percent: '默认范围比例',
    smoothing: '平滑系数',
    curvature: '轨迹曲率',
    offset: '类别偏移',
    class: '类别 ID',
    norm: '标准偏移',
    rand: '随机偏移',
    focus_child: '优先子目标',
    aiming_delay: '开镜延迟（秒）',
    firing_delay: '首次开火延迟（秒）',
    firing_interval: '开火间隔（秒）',
    zone_filter: '触发区域比例',
    sticky_trigger: '持续触发',
    filter_classes: '过滤类别',
    scale_gt_filter: '尺寸过滤阈值',
    search_ratio: '搜索区域比例',
    x_scale: 'X 轴倍率',
    y_scale: 'Y 轴倍率',
    activation_delay: '激活延迟（秒）',
    color_ranges: 'HSV 颜色范围',
    only_lost_mode: '仅收集丢帧',
    lost_save_interval: '丢帧保存间隔（秒）',
    active_confidence_threshold: '活跃置信度阈值',
    inactive_confidence_threshold: '非活跃置信度阈值',
    active_save_interval: '活跃保存间隔（秒）',
    inactive_save_interval: '非活跃保存间隔（秒）',
    output_dir: '输出目录',
    class_filter: '仅保存类别',
    scale_lt_filter: '最小尺寸阈值',
    report_interval: '报告间隔（秒）',
    labels_button: '标签组按键',
    'player.labels_button': '标签组按键',
    default: '选择全部标签组',
    options: '选项',
    label: '标签组',
    alias: '显示别名',
    button: '按键',
    dn: '按下报告',
    up: '释放报告',
    mapping: '映射'
};
const plugins = {
    FovComponent: ['FOV', '动态视野范围', {
        active_percent: .5,
        default_percent: 1,
        smoothing: .05
    }],
    AimPartComponent: ['Aim Part', '类别位置与随机偏移', {
        offset: [],
        skip_rand_keys: []
    }],
    GhostTrackerComponent: ['Ghost Tracker', '轨迹曲率控制', {
        curvature: .3
    }],
    TriggerComponent: ['Trigger', '触发区域与开火时序', {
        aiming_delay: 0,
        firing_delay: 0,
        firing_interval: 0,
        zone_filter: .8,
        sticky_trigger: false,
        skip_delay_keys: []
    }],
    RecoilComponent: ['Recoil', '线性序列压枪', {
        activation_keys: [],
        pattern: []
    }],
    SequenceActionComponent: ['Sequence Action', '原始 TOML 动作规则', {
        rule: ''
    }],
    PoseFilterComponent: ['Pose Filter', '类别与尺寸过滤', {
        filter_classes: [],
        scale_gt_filter: .25
    }],
    VisualRecoilComponent: ['Visual Recoil', '颜色范围与视觉补偿', {
        activation_keys: [],
        color_ranges: [],
        search_ratio: .05,
        x_scale: 1,
        y_scale: 1,
        activation_delay: 0
    }],
    SoundAlertComponent: ['Sound Alert', '运行状态声音提示', {}],
    DataCollectorComponent: ['Data Collector', '采样与数据保存', {
        output_dir: 'dataset',
        only_lost_mode: false,
        lost_save_interval: .5,
        active_confidence_threshold: .3,
        inactive_confidence_threshold: .8,
        active_save_interval: .2,
        inactive_save_interval: 5,
        class_filter: [],
        scale_lt_filter: 1
    }],
    PerformanceMonitorComponent: ['Performance Monitor', '运行性能日志', {
        report_interval: 3
    }]
};
const coreDefaults = {
    render: {
        url: 'mem://razor-aim',
        is_show: true,
        imgsz: 0,
        title: 'Razor'
    },
    selector: {
        class_priority: [],
        min_hold_frames: 0,
        max_lost_frames: 8
    },
    controller: {
        kp_x: .18,
        kp_y: .18,
        ki_x: 0,
        ki_y: 0,
        kd_x: .003,
        kd_y: .003,
        kf_x: 1,
        kf_y: 1
    },
    inferencer: {
        engine: 'OnnxRuntime',
        model_path: '',
        conf_thresholds: [],
        nms_threshold: .45
    },
    'kalman.filter': {
        weight_position: 1,
        weight_velocity: 8
    },
    'kalman.predict': {
        weight_position: 1,
        weight_velocity: 8
    },
    player: {
        follow_mode: 'all',
        aiming_button: [],
        firing_button: [],
        paused_button: [],
        switch_button: [],
        axis_mask_x: false,
        axis_mask_y: false
    },
    'player.labels_button': {
        default: '',
        options: []
    },
    bridge: {
        transport: 'shared_memory',
        open_preview: false
    }
};
const enums = {
    follow_mode: [
        ['all', '始终跟随'],
        ['firing', '开火时'],
        ['aiming', '开镜时'],
        ['none', '不跟随']
    ],
    engine: [
        ['OnnxRuntime', 'ONNX Runtime'],
        ['Tensorrt-Yolo', 'TensorRT YOLO']
    ],
    transport: [
        ['shared_memory', '共享内存']
    ]
};
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
} [c]));
const clone = x => structuredClone(x);
const section = (scope, name) => state[scope]?.sections.find(s => s.name === name);
const data = (scope, name) => section(scope, name)?.data || {};
const dirty = scope => state[scope] && state[scope].content !== state[scope].original;
const aliasesDirty = () => changedValues(state.savedAliases || {}, state.aliases || {}) > 0;
const anyDirty = () => dirty('boot') || dirty('game') || aliasesDirty();

function notify(message) {
    const host = document.querySelector('dialog[open]') || document.body;
    host.append($('#toast'));
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => $('#toast').classList.remove('visible'), 5000)
}

function ask(message) {
    return new Promise(resolve => {
        const dialog = $('#confirm-dialog');
        $('#confirm-message').textContent = message;
        const finish = accepted => {
            dialog.close();
            resolve(accepted);
        };
        $('#confirm-accept').onclick = () => finish(true);
        $('#confirm-cancel').onclick = () => finish(false);
        dialog.oncancel = event => {
            event.preventDefault();
            finish(false);
        };
        dialog.showModal();
    });
}

async function api(url, options = {}) {
    const r = await fetch(url, {
        ...options,
        headers: options.body ? {
            'Content-Type': 'application/json'
        } : undefined
    });
    if (!r.ok) {
        let msg = r.statusText;
        try {
            msg = (await r.json()).detail || msg
        } catch {}
        throw Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
    return r.status === 204 ? null : r.json()
}
async function task(fn) {
    if (state.busy) return;
    state.busy = true;
    document.body.classList.add('busy');
    try {
        return await fn()
    } catch (e) {
        notify(e.message);
        eventLog(e.message, 'error')
    } finally {
        state.busy = false;
        document.body.classList.remove('busy');
        renderSave()
    }
}
async function parse(content) {
    return api('/api/forms/draft', {
        method: 'POST',
        body: JSON.stringify({
            content
        })
    })
}
async function patch(scope, changes, redraw = true) {
    const original = state[scope].original;
    const next = await api('/api/forms/draft', {
        method: 'POST',
        body: JSON.stringify({
            content: state[scope].content,
            changes
        })
    });
    state[scope] = {
        ...next,
        original,
        savedSections: state[scope].savedSections
    };
    if (redraw) render();
    else renderSave();
}
async function readScope(scope, name) {
    const result = await api(scope === 'boot' ? '/api/config/boot' : `/api/config/game/${encodeURIComponent(name)}`);
    state[scope] = {
        ...await parse(result.content),
        original: result.content
    };
    state[scope].savedSections = clone(state[scope].sections);
    if (scope === 'game') {
        const result = await api(`/api/aliases/${encodeURIComponent(name)}`);
        state.savedAliases = clone(result.aliases);
        state.aliases = clone(result.aliases);
        if (!Object.keys(result.aliases).length) {
            try {
                const legacy = JSON.parse(localStorage.getItem(`razor-console.aliases.${name}`) || '{}');
                if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) state.aliases = legacy;
            } catch {}
        }
    }
}
async function syncSwitch(scope, changes) {
    const current = state[scope];
    const savedChanges = changes.map(change => {
        if (!current.savedSections.some(section => section.name === change.name) && change.name.startsWith('component.')) {
            return {...change, data: clone(plugins[change.name.slice(10)]?.[2] || {})};
        }
        return change;
    });
    const transformDraft = (content, edits) => api('/api/forms/draft', {method: 'POST', body: JSON.stringify({content, changes: edits})});
    const saved = await transformDraft(current.original, savedChanges);
    const draft = await transformDraft(current.content, changes);
    await api(scope === 'boot' ? '/api/config/boot' : `/api/config/game/${encodeURIComponent(state.name)}`, {
        method: 'PUT', body: JSON.stringify({content: saved.content, expected: current.original})
    });
    state[scope] = {...draft, original: saved.content, savedSections: clone(saved.sections)};
    renderSave();
}

function changedValues(before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return 0;
    if (before === undefined || after === undefined) return 1;
    if (Array.isArray(before) && Array.isArray(after)) {
        if (![...before, ...after].some(value => value && typeof value === 'object')) return 1;
        return Array.from({length: Math.max(before.length, after.length)}, (_, index) => changedValues(before[index], after[index])).reduce((a, b) => a + b, 0);
    }
    if (before && after && typeof before === 'object' && typeof after === 'object') {
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].reduce((total, key) => total + changedValues(before[key], after[key]), 0);
    }
    return 1;
}
function unsavedChanges() {
    return ['boot', 'game'].reduce((total, scope) => {
        if (!dirty(scope)) return total;
        const current = new Map(state[scope].sections.map(section => [section.name, section]));
        const saved = new Map(state[scope].savedSections.map(section => [section.name, section]));
        let count = 0;
        for (const name of new Set([...current.keys(), ...saved.keys()])) {
            const a = saved.get(name), b = current.get(name);
            if (!a || !b) { count++; continue; }
            const changes = Number(a.enabled !== b.enabled) + changedValues(a.data, b.data);
            count += changes || Number(a.raw !== b.raw);
        }
        return total + Math.max(1, count);
    }, 0);
}
function syncSavebarSpace() {
    const bar = $('.savebar');
    $('#drawer').style.setProperty('--savebar-space', `${bar.hidden ? 0 : Math.ceil(bar.getBoundingClientRect().height)}px`);
}
new ResizeObserver(syncSavebarSpace).observe($('.savebar'));

function renderSave() {
    const pending = state.modal?.changed ? state.modal.sections.reduce((total, entry) => total + (entry.changed || entry.rawChanged ? Math.max(1, changedValues(entry.original?.data, entry.data)) : 0), 0) + Number(state.modal.aliasesChanged) : 0;
    const count = unsavedChanges() + changedValues(state.savedAliases || {}, state.aliases || {}) + pending;
    const bar = $('.savebar');
    bar.hidden = !count;
    if (count && $('#drawer').open && !bar.matches(':popover-open')) bar.showPopover();
    if (!count && bar.matches(':popover-open')) bar.hidePopover();
    $('#save-state').textContent = count ? `${count} 处未保存修改` : '所有更改已保存';
    $('#save-detail').textContent = dirty('boot') ? '保存后重启 Runtime' : '';
    $('#dirty-dot').classList.toggle('dirty', !!count);
    $('#save').disabled = !count || state.busy;
    $('#discard').disabled = !count || state.busy;
    syncSavebarSpace();
}

function render() {
    if (!state.boot || !state.game) return;
    $('#profile').innerHTML = state.games.map(n => `<option ${n===state.name?'selected':''}>${esc(n)}</option>`).join('');
    $('#loader-text').textContent = `启动配置 · ${data('boot','system').loader||'未设置'}`;
    $('#use-profile').disabled = data('boot', 'system').loader === state.name;
    $('#delete-profile').disabled = data('boot', 'system').loader === state.name;
    renderCore();
    renderPlayer();
    renderPlugins();
    renderSave()
}

function renderCore() {
    const cards = [
        ['render', '◫', 'boot', data('boot', 'render').url || '配置采集源'],

        ['inferencer', '◇', 'game', data('game', 'inferencer').engine || '选择模型与引擎'],
        ['selector', '⌖', 'game', `${(data('game','selector').class_priority||[]).length} 类目标`],
        ['kalman', '≋', 'game', 'kalman filter/predict'],
        ['controller', '⌁', 'game', `X ${data('game','controller').kp_x??'—'} / Y ${data('game','controller').kp_y??'—'}`]
    ];
    $('#core-grid').innerHTML = cards.map(([key, icon, scope, summary]) => `<button class="core-card" data-core="${key}" data-scope="${scope}"><div class="core-top"><span class="module-icon">${icon}</span></div><strong>${labels[key]}</strong><small title="${esc(summary)}">${esc(summary)}</small></button>`).join('')
}

function renderPlugins() {
    const names = [...new Set([...Object.keys(plugins), ...state.game.sections.filter(s => s.name.startsWith('component.')).map(s => s.name.slice(10))])];
    let enabled = 0;
    $('#plugin-grid').innerHTML = names.map(name => {
        const entry = section('game', `component.${name}`),
            on = entry?.enabled || false;
        enabled += +on;
        const [title, description] = plugins[name] || [name, '自定义功能组件'];
        return `<article class="plugin-card ${on?'':'off'}"><div class="plugin-top"><h3>${esc(title)}</h3><input class="switch" type="checkbox" aria-label="${esc(title)} 启用" data-toggle="${esc(name)}" ${on?'checked':''}></div><p class="muted">${esc(description)}</p><div class="plugin-bottom"><span>${on?'● 已启用':'○ 已停用'}</span><button class="quiet" data-plugin="${esc(name)}">设置</button></div></article>`
    }).join('');
    $('#component-count').textContent = `${enabled} / ${names.length} 已启用`
}

function renderPlayer() {
    const obj = {
        ...coreDefaults.player,
        ...data('game', 'player')
    };
    $('#player-fields').replaceChildren();
    for (const key of ['follow_mode', 'aiming_button', 'firing_button', 'switch_button', 'paused_button']) $('#player-fields').append(field(key, obj[key], value => task(() => patch('game', [{
        name: 'player',
        data: {
            [key]: value
        }
    }])), {
        compact: true
    }));
    renderLabelBindings();
}

function labelBindingSections() {
    const names = ['player', ...state.game.sections.filter(s => s.name.startsWith('player.')).map(s => s.name)];
    if (!names.includes('player.labels_button') && !data('game', 'player').labels_button) names.push('player.labels_button');
    return names;
}

function renderLabelBindings() {
    const standalone = section('game', 'player.labels_button');
    const inline = data('game', 'player').labels_button;
    const group = node('section', 'label-bindings');
    const heading = node('div', 'array-head');
    heading.append(node('h3', '', '标签组按键'));
    const edit = node('button', 'quiet', '设置');
    edit.type = 'button';
    edit.onclick = () => openDrawer('game', inline && !standalone ? ['player'] : ['player.labels_button'], '标签组按键');
    heading.append(edit);
    group.append(heading);
    $('#player-fields').append(group);
}

function node(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e
}

function isKeys(key, value) {
    return Array.isArray(value) && (/button$|_keys$/.test(key))
}

function keyName(key) {
    return ({
        '<mouse-left>': '鼠标左键',
        '<mouse-right>': '鼠标右键',
        '<mouse-middle>': '鼠标中键',
        '<mouse-x1>': '鼠标侧键 1',
        '<mouse-x2>': '鼠标侧键 2',
        '<mouse-wheel-up>': '滚轮上',
        '<mouse-wheel-dn>': '滚轮下',
        '<mouse-meta>': '扩展键'
    })[key] || key
}

function availableExtensionKeys() {
    const sections = state.modal?.scope === 'boot' ? state.modal.sections : [];
    const get = name => sections.find(entry => entry.name === name) || section('boot', name);
    const extensions = get('device.ExtendOptions');
    if (!get('device.CloudPierce')?.enabled || get('device.KmBoxNet')?.enabled || !extensions?.enabled) return [];
    return Object.keys(extensions.data || {}).filter(key => /^<.+>$/.test(key));
}
function keysControl(value, onChange, single = false) {
    let keys = [...value];
    const box = node('div', 'keys');

    function refresh() {
        box.replaceChildren();
        for (const [i, key] of keys.entries()) {
            const chip = node('span', 'key');
            chip.title = key;
            chip.append(node('span', '', keyName(key)));
            const del = node('button', '', '×');
            del.type = 'button';
            del.setAttribute('aria-label', `删除 ${keyName(key)}`);
            del.onclick = () => {
                keys.splice(i, 1);
                onChange([...keys]);
                refresh()
            };
            chip.append(del);
            box.append(chip)
        }
        const add = node('button', '', 'Add');
        add.type = 'button';
        add.onclick = () => startWatch(accept);
        const actions = node('span', 'key-add-actions');
        actions.append(add);
        const extensionKeys = availableExtensionKeys();
        if (extensionKeys.length) {
            actions.classList.add('has-special');
            const special = node('button', 'key-special-button');
            special.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            special.type = 'button';
            special.setAttribute('aria-label', '添加扩展键');
            special.setAttribute('aria-expanded', 'false');
            const menu = node('div', 'key-special-menu');
            menu.setAttribute('popover', 'auto');
            for (const token of extensionKeys) {
                const option = node('button', 'key-special-option');
                option.type = 'button';
                option.append(node('span', '', keyName(token)), node('small', '', token));
                option.onclick = () => {
                    menu.hidePopover();
                    stopWatch();
                    accept(token);
                };
                menu.append(option);
            }
            menu.addEventListener('toggle', event => special.setAttribute('aria-expanded', String(event.newState === 'open')));
            special.onclick = () => {
                if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
                const rect = special.getBoundingClientRect();
                const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
                const inset = 0.5 * rem, gap = 0.375 * rem;
                menu.style.setProperty('--key-menu-row-height', `${rect.height}px`);
                menu.showPopover();
                const {width, height} = menu.getBoundingClientRect();
                menu.style.left = `${Math.max(inset, Math.min(rect.right - width, innerWidth - width - inset))}px`;
                const top = rect.bottom + gap + height <= innerHeight - inset
                    ? rect.bottom + gap : rect.top - height - gap;
                menu.style.top = `${Math.max(inset, Math.min(top, innerHeight - height - inset))}px`;
            };
            actions.append(special, menu);
        }
        box.append(actions)
    }

    function accept(token) {
        if (!keys.includes(token)) {
            if (single) keys = [token];
            else keys.push(token);
            onChange([...keys])
        }
        refresh()
    }
    refresh();
    return box
}

function numberBounds(key, value) {
    const fixed = {
        kp_x: [1, .01], kp_y: [1, .01],
        ki_x: [1, .001], ki_y: [1, .001],
        kd_x: [1, .0005], kd_y: [1, .0005],
        kf_x: [2, .1], kf_y: [2, .1],
        threshold: [1, .05], dynamic_threshold: [1, .05], nms_threshold: [1, .05],
        priority: [10, 1], smoothing: [1, .05], curvature: [1, .05],
        active_percent: [1, .05], default_percent: [1, .05], zone_filter: [1, .05],
        aiming_delay: [1, .01], firing_delay: [1, .01], firing_interval: [1, .01]
    }[key];
    if (fixed) return {min: 0, max: fixed[0], step: fixed[1], fixed: true};
    const integer = /^(class|class_id|priority|.*frames|nms_topk|port|monitor_port|imgsz)$/.test(key);
    let min = 0,
        max = 1,
        step = integer ? 1 : .01;
    if (integer) max = key.includes('port') ? 65535 : key === 'imgsz' ? 2048 : 60;
    else if (/^k[pidf]_/.test(key)) {
        max = key.startsWith('kf') ? 5 : 1;
        step = .001;
        min = 0
    } else if (key.startsWith('weight_')) {
        min = 1;
        max = 32;
        step = .1
    } else if (/delay|interval/.test(key)) {
        max = 10;
        step = .01
    } else if (/scale|curvature/.test(key)) {
        min = key === 'x_scale' || key === 'y_scale' ? -10 : 0;
        max = 10;
        step = .01
    } else if (!/threshold|percent|ratio|smoothing|zone/.test(key)) {
        min = Math.min(0, value);
        max = Math.max(10, value * 2);
        step = Number.isInteger(value) ? 1 : .01
    }
    return {
        min: Math.min(min, value),
        max: Math.max(max, value),
        step
    }
}

const explanations = {
    nms_topk: 'NMS 前每个类别保留的候选框数量上限。', imgsz: '采集图像的正方形裁剪尺寸，单位为像素；0 表示自动跟随模型输入尺寸。',
    scale_gt_filter: '过滤超过指定尺寸比例的目标。', scale_lt_filter: '过滤小于指定尺寸比例的目标。',
    active_confidence_threshold: '活跃状态下采集数据使用的置信度阈值。', inactive_confidence_threshold: '非活跃状态下采集数据使用的置信度阈值。',
    dn: '按键按下时发送的设备报告。', up: '按键释放时发送的设备报告。', mapping: '输入与输出的对应关系。',
    '设备类型': '选择连接的硬件设备，仅启用选中的设备配置。',
    class_id: '模型输出的数字类别编号，从 0 开始。', class: '选择此规则对应的模型类别。',
    alias: '类别的显示名称；留空时显示类别编号。别名保存在 Console 本地配置中，所有浏览器共用，不修改模型类别。',
    threshold: '检测结果的最低置信度，低于该值的结果会被过滤。',
    dynamic_threshold: '开火时使用的置信度阈值。', nms_threshold: 'NMS 重叠过滤阈值，用于去除重复检测框。',
    engine: '选择加载模型所使用的推理引擎。', model_path: '选择 Console 所在电脑上的 ONNX 或 TensorRT 模型文件。',
    conf_thresholds: '为各模型类别分别设置检测阈值和显示别名。添加时自动递增类别编号。',
    class_priority: '配置目标类别、优先级及其包含的子类别。', priority: '目标选择时使用的类别优先级。',
    include: '该类别包含的子类别编号。点击数字块删除；添加会选取尚未包含且不是自身的编号。',
    label: '多个类别可使用相同标签组，通过标签组按键一起选择。',
    min_hold_frames: '目标至少保持的帧数，减少频繁切换。', max_lost_frames: '目标丢失后允许保留的最大帧数。',
    offset_mode: '标准偏移使用固定 X/Y；随机偏移分别在 X/Y 范围内采样。',
    norm: '目标框内的相对坐标：0 为左侧或顶部，0.5 为中心，1 为右侧或底部。',
    rand: '目标框内相对坐标的随机区间，分别设置 X/Y 最小值和最大值。',
    offset: '按类别设置固定或随机偏移。', focus_child: '有子目标时优先采用子目标；随机偏移启用时优先使用随机偏移。',
    skip_rand_keys: '按住这些按键时跳过随机偏移，使用标准偏移或子目标。',
    paused_button: '按键切换暂停运行状态，再次触发可恢复。', switch_button: '切换自动模式的按键。',
    aiming_button: '用于识别开镜状态的按键。', firing_button: '用于识别开火状态的按键。', follow_mode: '选择始终跟随、开火时跟随、开镜时跟随或不跟随。',
    button: '点击 Add 后按下要绑定的按键；点击已有按键可移除。',
    labels_button: '按下标签组的绑定键后，该组内所有类别都可参与跟踪；选择全部标签组的按键用于恢复全部已绑定标签组。', default: '按下此键后，选择全部已绑定标签组，让这些组内的所有类别都可参与跟踪。',
    options: '可添加多条独立规则。',
    url: '采集源地址；不同采集源使用不同的设备名、共享内存名或网络地址。',
    '采集源类型': '选择采集卡、共享内存、UDP、OBS 或自定义地址。',
    '采集地址 / 设备名称': '输入所选采集源的地址或名称，灰色文字仅为示例。',
    color_ranges: 'HSV 颜色匹配范围，H 为色相、S 为饱和度、V 为明度；分别设置上下限。',
    is_show: '显示本机预览窗口。', open_preview: '向 Console 发送渲染画面。', loader: 'Runtime 启动时加载的游戏配置。',
    transport: 'Console 与 Runtime 之间的通信方式。', title: '本机预览窗口标题。',
    activation_keys: '触发该组件的按键集合。', skip_delay_keys: '按住这些按键时跳过触发延迟。',
    smoothing: '控制变化的平滑程度。', curvature: '控制移动轨迹的曲率。',
    active_percent: '激活状态下的视野范围比例。', default_percent: '默认状态下的视野范围比例。',
    zone_filter: '用于判断触发区域的目标框比例。', sticky_trigger: '控制是否保持持续触发。',
    axis_mask_x: '屏蔽手动输入的 X 轴移动。', axis_mask_y: '屏蔽手动输入的 Y 轴移动。',
    weight_position: '滤波或预测中的位置权重。', weight_velocity: '滤波或预测中的速度权重。',
    x_scale: 'X 轴输出的缩放倍数。', y_scale: 'Y 轴输出的缩放倍数。', search_ratio: '搜索区域相对画面的比例。',
    filter_classes: '需要过滤的模型类别编号。', class_filter: '普通模式仅保存所选类别。Lost 模式下，丢失前最后一个未丢失的 best 类别在列表内才保存；空列表保持仅采集无原始检测目标帧的行为。全部类别会添加当前配置中的所有类别。',
    output_dir: '采集数据的输出目录。', only_lost_mode: '仅在目标丢失时采集数据。',
    host: '目标设备的主机名或 IP 地址。', port: '连接设备使用的端口。', monitor_port: '接收设备状态的监听端口。', com_port: '连接设备使用的串口名称。', key: '连接设备所需的密钥。'
};
function attachHelp(target, key) {
    let text = explanations[key];
    if (!text && /delay|interval/.test(key)) text = `${labels[key] || key}，单位为秒。`;
    if (!text && /^k[pidf]_[xy]$/.test(key)) text = `${{p:'比例响应', i:'累计误差补偿', d:'误差变化抑制', f:'前馈补偿'}[key[1]]}系数，作用于 ${key.at(-1).toUpperCase()} 轴。`;
    target.title = text || `${labels[key] || key}：设置此项的值，修改将加入当前配置草稿。`;
    target.setAttribute('aria-description', target.title);
}

function field(key, value, onChange, opts = {}) {
    if (key === 'model_path') return modelField(value, onChange);
    if (key === 'output_dir') return modelField(value, onChange, true);
    if (key === 'color_ranges') return hsvField(value, onChange);
    if (key === 'url' && typeof value === 'string') return sourceField(value, onChange);
    if (Array.isArray(value) && !isKeys(key, value)) return arrayField(key, value, onChange, opts);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const group = node('section');
        group.append(node('h3', 'group-title', labels[key] || key));
        for (const [k, v] of Object.entries(value)) group.append(field(k, v, x => {
            value[k] = x;
            onChange(value)
        }, opts));
        return group
    }
    const row = node('div', 'field');
    const label = node('label', 'field-label', labels[key] || key);
    attachHelp(label, key);
    if (!opts.compact) label.append(node('small', '', key === 'label' ? 'label-group' : key));
    const control = node('div', 'field-control');
    row.append(label, control);
    const id = `field-${++field.counter}`;
    label.htmlFor = id;
    if (typeof value === 'string' && (key === 'button' || (key === 'default' && (!value || value.startsWith('<'))))) {
        control.append(keysControl(value ? [value] : [], keys => onChange(keys[0] || ''), true));
        return row;
    }
    if (isKeys(key, value)) {
        control.append(keysControl(value, onChange));
        return row
    }
    let input;
    if (key === 'label' && opts.labelBinding) {
        input = node('select');
        const groups = [...new Set((data('game', 'selector').class_priority || []).map(item => item.label?.trim()).filter(Boolean))];
        const placeholder = new Option(groups.length ? '请选择标签组' : '暂无标签组', '');
        placeholder.disabled = true;
        input.append(placeholder, ...groups.map(name => new Option(name, name)));
        if (value && !groups.includes(value)) {
            const missing = new Option(`${value}（标签组已不存在）`, value);
            missing.disabled = true;
            input.append(missing);
        }
        input.value = value || '';
        input.required = true;
        input.onchange = () => onChange(input.value);
    } else if (typeof value === 'boolean') {
        input = node('input', 'switch');
        input.type = 'checkbox';
        input.checked = value;
        input.onchange = () => onChange(input.checked)
    } else if (typeof value === 'number' && /^(class|class_id|include|filter_classes|class_filter)$/.test(key) && !opts.defineClass) {
        input = classPicker(value, onChange, opts);
    } else if (typeof value === 'number') {
        const box = node('div', 'numeric'),
            range = node('input'),
            number = node('input');
        const bounds = numberBounds(key, value);
        range.type = 'range';
        number.type = 'number';
        number.step = /^(class|class_id|priority|.*frames|nms_topk|port|monitor_port|imgsz)$/.test(key) ? 1 : 'any';
        number.required = true;
        if (bounds.fixed) {
            number.min = bounds.min;
            number.max = bounds.max;
            number.step = bounds.step;
        }
        if (key.startsWith('weight_')) number.min = 1;
        range.min = bounds.min;
        range.max = bounds.max;
        range.step = bounds.step;
        range.value = number.value = value;
        if (key === 'imgsz') {
            number.classList.add('render-size-input');
            number.placeholder = '自动';
            number.required = false;
            number.min = 0;
            if (value === 0) number.value = '';
        }
        number.id = id;
        range.setAttribute('aria-label', `${labels[key]||key} 滑块`);
        range.oninput = () => {
            number.value = range.value;
            onChange(Number(range.value))
        };
        number.oninput = () => {
            if (key === 'imgsz' && number.value === '' && !number.validity.badInput) {
                onChange(0);
                return;
            }
            if (number.value === '' || !Number.isFinite(number.valueAsNumber)) return;
            if (!bounds.fixed) {
                range.min = Math.min(Number(range.min), number.valueAsNumber);
                range.max = Math.max(Number(range.max), number.valueAsNumber);
            }
            range.value = number.value;
            onChange(number.valueAsNumber)
        };
        if (key === 'imgsz') number.onblur = () => {
            if (number.valueAsNumber === 0) number.value = '';
        };
        if (opts.defineClass) {
            number.onchange = number.oninput;
            number.oninput = null;
        }
        if (!opts.numberOnly && !opts.defineClass) box.append(range);
        box.append(number);
        control.append(box);
        return row
    } else if (enums[key] || key === 'loader') {
        input = node('select');
        const choices = key === 'loader' ? state.games.map(n => [n, n]) : [...enums[key]];
        if (key === 'engine') {
            const normalized = String(value).toLowerCase().replaceAll('_', '-');
            value = normalized === 'onnxruntime' ? 'OnnxRuntime' : normalized === 'tensorrt-yolo' ? 'Tensorrt-Yolo' : '';
        } else if (!choices.some(([v]) => v === value)) choices.push([value, value]);
        input.replaceChildren(...choices.map(([v, l]) => new Option(l, v)));
        input.value = value;
        input.onchange = () => onChange(input.value)
    } else {
        input = node('input');
        input.type = key === 'key' ? 'password' : 'text';
        input.placeholder = opts.placeholder || '';
        input.value = value ?? '';
        input.oninput = () => onChange(input.value)
    }
    input.id = id;
    control.append(input);
    return row
}
field.counter = 0;

function modelField(value, onChange, directory = false) {
    const row = node('div', 'field');
    row.append(node('span', 'field-label', directory ? '输出目录' : '模型文件'));
    attachHelp(row.firstChild, directory ? 'output_dir' : 'model_path');
    const box = node('div', 'model-picker');
    const path = node('span', 'model-name', String(value).split(/[\\/]/).pop() || '尚未选择模型');
    path.title = value;
    if (directory) path.textContent = value || '尚未选择文件夹';
    const caption = directory ? '选择文件夹…' : '选择模型…';
    const button = node('button', '', caption);
    button.type = 'button';
    button.onclick = () => task(async () => {
        button.textContent = '等待选择…';
        try {
            const result = await api(directory ? '/api/directories/pick' : '/api/models/pick', {
                method: 'POST'
            });
            if (result.path) {
                path.textContent = result.path.split(/[\\/]/).pop();
                path.title = result.path;
                if (directory) path.textContent = result.path;
                onChange(result.path);
            }
        } finally {
            button.textContent = caption;
        }
    });
    box.append(path, button);
    row.append(box);
    return row;
}

function sourceField(value, onChange) {
    const group = node('section');
    const match = value.match(/^([^:]+):\/\/(.*)$/);
    let scheme = match?.[1] || 'custom',
        address = match?.[2] || value;
    const row = node('div', 'field'),
        label = node('label', 'field-label', '采集源类型'),
        select = node('select');
    select.setAttribute('aria-label', '采集源类型');
    attachHelp(label, '采集源类型');
    select.replaceChildren(...[
        ['capture', '采集卡'],
        ['mem', '共享内存'],
        ['udp', 'UDP'],
        ['obs', 'OBS'],
        ['custom', '自定义地址']
    ].map(([v, t]) => new Option(t, v)));
    select.value = ['capture', 'mem', 'udp', 'obs'].includes(scheme) ? scheme : 'custom';
    scheme = select.value;
    if (scheme === 'custom') address = value;
    const addresses = {[select.value]: address};
    const examples = {capture: 'AVerMedia HD Capture GC573 1?framerate=240', mem: 'razor-aim', udp: '127.0.0.1:9000', obs: '127.0.0.1:9000', custom: 'capture://设备名称?framerate=240'};
    select.onchange = () => {
        addresses[scheme] = address;
        scheme = select.value;
        address = addresses[scheme] || '';
        addressInput.value = address;
        addressInput.placeholder = examples[scheme];
        onChange(scheme === 'custom' ? address : `${scheme}://${address}`)
    };
    row.append(label, select);
    group.append(row);
    const addressField = field('采集地址 / 设备名称', address, v => {
        address = v;
        onChange(scheme === 'custom' ? address : `${scheme}://${address}`)
    }, {compact: true});
    const addressInput = addressField.querySelector('input');
    addressInput.placeholder = examples[select.value];
    addressInput.required = true;
    group.append(addressField);
    return group;
}

const rowDefaults = {
    conf_thresholds: {
        class_id: 0,
        threshold: .45,
        dynamic_threshold: .35
    },
    class_priority: {
        class_id: 0,
        priority: 1,
        include: []
    },
    offset: {
        class: 0,
        norm: [.5, .5],
        rand: [],
        focus_child: false
    },
    color_ranges: [
        [0, 0, 0],
        [180, 255, 255]
    ],
    options: {
        label: '',
        button: ''
    },
    norm: 0,
    rand: [.4, .6],
    include: 0,
    filter_classes: 0,
    class_filter: 0
};

function readAliases() {
    return clone(state.aliases || {});
}

function classLabels() {
    return new Map(Object.entries(state.modal?.aliases || readAliases()).filter(([, name]) => typeof name === 'string' && name.trim()).map(([id, name]) => [Number(id), name.trim()]));
}

function className(id) {
    return classLabels().get(Number(id)) || `类别 ${id}`;
}

function classPicker(value, onChange, opts = {}) {
    const ids = new Set([Number(value)]);
    for (const id of classLabels().keys()) ids.add(id);
    for (const row of data('game', 'inferencer').conf_thresholds || []) ids.add(Number(row.class_id));
    for (const row of data('game', 'selector').class_priority || []) {
        ids.add(Number(row.class_id));
        for (const id of row.include || []) ids.add(Number(id));
    }
    const select = node('select');
    select.replaceChildren(...[...ids].filter(id => Number.isFinite(id) && id !== opts.excludeClass).sort((a, b) => a - b).map(id => {
        const option = new Option(className(id), String(id));
        option.title = `class_id = ${id}`;
        return option;
    }));
    if (opts.excludeClass !== undefined && value === opts.excludeClass) {
        const placeholder = new Option('请选择其他类别', '');
        placeholder.disabled = true;
        select.prepend(placeholder);
        select.value = '';
        select.required = true;
    } else select.value = String(value);
    select.onchange = () => onChange(Number(select.value));
    return select;
}

function arrayTitle(key, item, index) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
        const id = item.class_id ?? item.class;
        if (id !== undefined) return className(id);
    }
    return String(index + 1).padStart(2, '0');
}

function focusAddedItem(item) {
    if (!item) return;
    requestAnimationFrame(() => {
        if (!item.isConnected) return;
        const control = item.matches('button') ? item : item.querySelector('select, input:not([type="range"]), textarea') || item.querySelector('.key-add-actions button, button');
        const target = control || item;
        if (!control) target.tabIndex = -1;
        target.focus({preventScroll: true});
        item.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});
    });
}

function hsvField(value, onChange) {
    const values = clone(value),
        wrap = node('section', 'array-field hsv-field');

    function paint() {
        wrap.replaceChildren();
        const head = node('div', 'array-head');
        head.append(node('span', 'field-label', 'HSV 颜色范围'));
        attachHelp(head.firstChild, 'color_ranges');
        const add = node('button', '', '＋ 添加颜色范围');
        add.type = 'button';
        add.onclick = () => {
            values.push([
                [0, 0, 0],
                [180, 255, 255]
            ]);
            onChange(clone(values));
            paint();
            focusAddedItem(wrap.querySelector(':scope > .array-row:last-child'));
        };
        head.append(add);
        wrap.append(head);
        if (!values.length) wrap.append(node('p', 'muted', '暂无颜色范围'));
        values.forEach((range, index) => {
            const card = node('div', 'array-row'),
                bar = node('div', 'array-row-head');
            bar.append(node('span', '', `颜色范围 ${index+1}`));
            const remove = node('button', 'quiet', '×');
            remove.type = 'button';
            remove.setAttribute('aria-label', `删除颜色范围 ${index+1}`);
            remove.onclick = () => {
                values.splice(index, 1);
                onChange(clone(values));
                paint();
            };
            bar.append(remove);
            card.append(bar);
            const grid = node('div', 'hsv-grid');
            grid.append(node('span'));
            for (const axis of ['H · 色相', 'S · 饱和度', 'V · 明度']) grid.append(node('span', 'muted', axis));
            for (const [bound, label] of [
                    [0, '下限'],
                    [1, '上限']
                ]) {
                grid.append(node('span', 'muted', label));
                for (const [axis, name] of ['H', 'S', 'V'].entries()) {
                    const input = node('input');
                    input.type = 'number';
                    input.min = 0;
                    input.max = axis === 0 ? 180 : 255;
                    input.step = 1;
                    input.required = true;
                    input.value = range[bound][axis];
                    input.setAttribute('aria-label', `颜色范围 ${index+1} ${label} ${name}`);
                    input.oninput = () => {
                        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
                        values[index][bound][axis] = input.valueAsNumber;
                        onChange(clone(values));
                    };
                    grid.append(input);
                }
            }
            card.append(grid);
            wrap.append(card);
        });
    }
    paint();
    return wrap;
}

function arrayField(key, value, onChange, opts = {}) {
    let items = clone(value);
    const wrap = node('section', `array-field collection-${key}`);

    function updateGroupSummaries() {
        for (const el of wrap.querySelectorAll('.group-summary')) {
            const item = items[Number(el.dataset.index)],
                name = item?.label?.trim();
            const members = items.filter(r => name && r.label?.trim() === name).flatMap(r => [r.class_id, ...r.include || []]);
            el.textContent = name ? `标签组 ${name} · ${[...new Set(members)].map(className).join('、')}` : '';
        }
    }

    function paint() {
        wrap.replaceChildren();
        const head = node('div', 'array-head');
        head.append(node('span', 'field-label', labels[key] || key));
        attachHelp(head.firstChild, key);
        const add = node('button', '', '＋ 添加');
        add.type = 'button';
        add.onclick = () => {
            if (key === 'include' || key === 'class_filter') {
                const available = [...classPicker(undefined, () => {}, opts).options]
                    .filter(option => !items.includes(Number(option.value)));
                const menu = node('div', 'include-menu');
                menu.setAttribute('popover', 'auto');
                menu.setAttribute('role', 'menu');
                menu.setAttribute('aria-label', key === 'class_filter' ? '选择仅保存类别' : '选择包含类别');
                add.setAttribute('aria-haspopup', 'menu');
                add.setAttribute('aria-expanded', 'true');
                const choices = available.map(option => {
                    const choice = node('button', 'include-option', option.textContent);
                    choice.type = 'button';
                    choice.setAttribute('role', 'menuitem');
                    choice.title = `ID ${option.value}`;
                    choice.onclick = () => {
                        menu.hidePopover();
                        items.push(Number(option.value));
                        onChange(clone(items));
                        paint();
                        focusAddedItem(wrap.querySelector('.include-chip:last-child'));
                    };
                    menu.append(choice);
                    return choice;
                });
                if (key === 'class_filter') {
                    const all = node('button', 'include-option', '全部类别');
                    all.type = 'button';
                    all.setAttribute('role', 'menuitem');
                    all.disabled = !available.length;
                    all.onclick = () => {
                        menu.hidePopover();
                        const firstAdded = items.length;
                        items.push(...available.map(option => Number(option.value)));
                        onChange(clone(items));
                        paint();
                        focusAddedItem(wrap.querySelectorAll('.include-chip')[firstAdded]);
                    };
                    menu.prepend(all);
                    choices.unshift(all);
                }
                if (!choices.length) menu.append(node('p', 'muted', '无可添加类别'));
                menu.onkeydown = event => {
                    const index = choices.indexOf(document.activeElement);
                    let next;
                    if (event.key === 'ArrowDown') next = (index + 1) % choices.length;
                    if (event.key === 'ArrowUp') next = (index - 1 + choices.length) % choices.length;
                    if (event.key === 'Home') next = 0;
                    if (event.key === 'End') next = choices.length - 1;
                    if (next !== undefined && choices.length) {
                        event.preventDefault();
                        choices[next].focus({preventScroll: true});
                        choices[next].scrollIntoView({block: 'nearest'});
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        menu.hidePopover();
                        add.focus({preventScroll: true});
                    }
                };
                menu.addEventListener('toggle', event => {
                    if (event.newState === 'closed') {
                        add.setAttribute('aria-expanded', 'false');
                        menu.remove();
                    }
                });
                head.append(menu);
                menu.showPopover();
                const rect = add.getBoundingClientRect();
                const width = Math.min(200, innerWidth - 16);
                menu.style.width = `${width}px`;
                menu.style.left = `${Math.max(8, Math.min(rect.right - width, innerWidth - width - 8))}px`;
                const below = innerHeight - rect.bottom - 12;
                const above = rect.top - 12;
                const height = Math.min(260, Math.max(below, above));
                menu.style.maxHeight = `${height}px`;
                menu.style.top = `${below >= Math.min(260, menu.scrollHeight) ? rect.bottom + 4 : Math.max(8, rect.top - Math.min(height, menu.scrollHeight) - 4)}px`;
                choices[0]?.focus({preventScroll: true});
                return;
            } else if (key === 'conf_thresholds') {
                const classId = items.length ? Math.max(...items.map(item => item.class_id)) + 1 : 0;
                items.push({...clone(rowDefaults[key]), class_id: classId});
            } else items.push(clone(rowDefaults[key] ?? (items.length ? items[items.length - 1] : 0)));
            onChange(clone(items));
            paint();
            focusAddedItem(wrap.querySelector(':scope > .array-row:last-child'));
        };
        head.append(add);
        wrap.append(head);
        const includeChips = key === 'include' || key === 'class_filter' ? node('div', 'include-chips') : null;
        if (includeChips) wrap.append(includeChips);
        if (!items.length) wrap.append(node('p', 'muted', key === 'class_filter' ? '未选择保存类别' : '暂无条目'));
        items.forEach((item, index) => {
            if (key === 'include' || key === 'class_filter') {
                const alias = classLabels().get(Number(item));
                const chip = node('button', 'include-chip', alias || `[${item}]`);
                chip.type = 'button';
                chip.title = `删除 ${className(item)} · ID ${item}`;
                chip.setAttribute('aria-label', `删除${key === 'class_filter' ? '保存' : '包含'}类别 ${className(item)}，ID ${item}`);
                chip.onclick = () => {
                    items.splice(index, 1);
                    onChange(clone(items));
                    paint();
                };
                includeChips.append(chip);
                return;
            }
            const row = node('div', 'array-row'),
                bar = node('div', 'array-row-head');
            const rowTitle = node('span', '', arrayTitle(key, item, index));
            bar.append(rowTitle);
            const del = node('button', 'quiet', '×');
            del.type = 'button';
            del.setAttribute('aria-label', `删除第 ${index+1} 行`);
            del.onclick = () => {
                items.splice(index, 1);
                onChange(clone(items));
                paint()
            };
            bar.append(del);
            row.append(bar);
            if (key === 'offset' && opts.aimPart) {
                row.classList.add('aim-part-rule');
                row.append(field('class', item.class, x => {
                    item.class = x;
                    rowTitle.textContent = className(x);
                    onChange(clone(items));
                }, {compact: true}));
                const modeRow = node('div', 'field');
                const modeLabel = node('label', 'field-label', '偏移');
                attachHelp(modeLabel, 'offset_mode');
                const mode = node('select');
                mode.id = `field-${++field.counter}`;
                modeLabel.htmlFor = mode.id;
                mode.append(new Option('标准偏移', 'norm'), new Option('随机偏移', 'rand'));
                mode.value = item.rand?.length ? 'rand' : 'norm';
                modeRow.append(modeLabel, mode);
                row.append(modeRow);
                const axes = node('div', 'aim-part-axes');
                const drawAxes = () => {
                    axes.replaceChildren();
                    const random = mode.value === 'rand';
                    axes.classList.toggle('random-offset', random);
                    for (const [axis, name] of ['X', 'Y'].entries()) {
                        const axisRow = node('div', 'aim-part-axis');
                        axisRow.append(node('span', 'field-label', name));
                        const values = random ? item.rand[axis] : [(item.norm || [.5, .5])[axis]];
                        values.forEach((value, bound) => {
                            const cell = node('label', 'aim-part-value');
                            const caption = node('span', 'muted', random ? (bound ? '最大值' : '最小值') : '偏移');
                            attachHelp(caption, random ? 'rand' : 'norm');
                            if (random) cell.append(caption);
                            else attachHelp(cell, 'norm');
                            const input = node('input');
                            input.type = 'number';
                            input.step = 'any';
                            input.required = true;
                            input.value = value;
                            input.setAttribute('aria-label', `${name} ${random ? (bound ? '最大值' : '最小值') : '偏移'}`);
                            input.oninput = () => {
                                if (!Number.isFinite(input.valueAsNumber)) return;
                                if (random) item.rand[axis][bound] = input.valueAsNumber;
                                else {
                                    item.norm ||= [.5, .5];
                                    item.norm[axis] = input.valueAsNumber;
                                }
                                const inputs = [...axisRow.querySelectorAll('input')];
                                const invalid = random && item.rand[axis][0] > item.rand[axis][1];
                                inputs.forEach(el => el.setCustomValidity(invalid ? '最小值不能大于最大值' : ''));
                                onChange(clone(items));
                            };
                            cell.append(input);
                            axisRow.append(cell);
                        });
                        axes.append(axisRow);
                    }
                };
                let savedRandom = item.rand?.length ? clone(item.rand) : [[.4, .6], [.4, .6]];
                mode.onchange = () => {
                    if (mode.value === 'rand') item.rand = clone(savedRandom);
                    else {
                        savedRandom = clone(item.rand);
                        item.rand = [];
                    }
                    onChange(clone(items));
                    drawAxes();
                };
                drawAxes();
                row.append(axes);
                const focusField = field('focus_child', item.focus_child || false, x => {
                    item.focus_child = x;
                    onChange(clone(items));
                }, {compact: true});
                focusField.classList.add('aim-part-focus');
                row.append(focusField);
            } else if (item && typeof item === 'object' && !Array.isArray(item)) {
                row.classList.add('record-row');
                const fields = key === 'class_priority' ? {
                    ...item,
                    label: item.label || ''
                } : key === 'conf_thresholds' ? {
                    class_id: item.class_id,
                    threshold: item.threshold,
                    dynamic_threshold: item.dynamic_threshold ?? item.threshold,
                    ...item
                } : item;
                for (const [k, v] of Object.entries(fields)) row.append(field(k, v, x => {
                    if (key === 'class_priority' && k === 'label' && !x.trim()) delete items[index].label;
                    else items[index][k] = key === 'class_priority' && k === 'label' ? x.trim() : x;
                    rowTitle.textContent = arrayTitle(key, items[index], index);
                    onChange(clone(items));
                    if (key === 'conf_thresholds' && k === 'class_id') paint();
                    updateGroupSummaries();
                    if (key === 'class_priority' && k === 'class_id') {
                        items[index].include = (items[index].include || []).filter(id => id !== x);
                        onChange(clone(items));
                        paint();
                    }
                }, {
                    ...opts,
                    compact: true,
                    defineClass: key === 'conf_thresholds' && k === 'class_id',
                    excludeClass: key === 'class_priority' && k === 'include' ? item.class_id : undefined
                }));
                if (key === 'conf_thresholds') {
                    const dynamic = [...row.querySelectorAll(':scope > .field')][2];
                    const toggle = node('input', 'switch');
                    toggle.type = 'checkbox';
                    toggle.checked = Object.hasOwn(item, 'dynamic_threshold');
                    toggle.setAttribute('aria-label', `类别 ${item.class_id} 动态置信度阈值开关`);
                    let remembered = item.dynamic_threshold ?? item.threshold;
                    const sync = () => {
                        dynamic.querySelectorAll('.field-control input').forEach(input => input.disabled = !toggle.checked);
                    };
                    toggle.onchange = () => {
                        if (toggle.checked) items[index].dynamic_threshold = remembered;
                        else {
                            remembered = items[index].dynamic_threshold;
                            delete items[index].dynamic_threshold;
                        }
                        sync();
                        onChange(clone(items));
                    };
                    dynamic.querySelector('.field-label').append(toggle);
                    sync();
                }
                if (key === 'conf_thresholds') row.append(field('alias', state.modal.aliases[item.class_id] || '', text => {
                    const id = items[index].class_id;
                    if (text.trim()) state.modal.aliases[id] = text.trim();
                    else delete state.modal.aliases[id];
                    state.modal.aliasesChanged = true;
                    state.modal.changed = true;
                    rowTitle.textContent = className(id);
                }, {compact: true, placeholder: `类别 ${item.class_id}`}));
                if (key === 'class_priority') {
                    const info = node('p', 'muted group-summary');
                    info.dataset.index = index;
                    const name = item.label?.trim();
                    const members = items.filter(r => name && r.label?.trim() === name).flatMap(r => [r.class_id, ...r.include || []]);
                    info.textContent = name ? `标签组 ${name} · ${[...new Set(members)].map(className).join('、')}` : '';
                    row.append(info);
                }
            } else row.append(field(Array.isArray(item) ? `${key} 范围` : key, item, x => {
                items[index] = x;
                onChange(clone(items))
            }, opts));
            wrap.append(row)
        })
    }
    paint();
    return wrap
}

function startWatch(accept) {
    stopWatch();
    state.capture = accept;
    $('#watch-banner').hidden = false;
    const host = $('#drawer').open ? $('#drawer') : document.body;
    host.append($('#watch-banner'))
}

function stopWatch() {
    state.capture = null;
    $('#watch-banner').hidden = true
}

function capture(token, event) {
    if (!state.capture || !token) return;
    event.preventDefault();
    event.stopPropagation();
    const accept = state.capture;
    state.suppressPointer = Date.now() + 350;
    stopWatch();
    accept(token)
}
document.addEventListener('keydown', e => {
    if (state.capture) {
        if (e.key === 'Escape') {
            e.preventDefault();
            stopWatch();
            return
        }
        if (e.repeat) return;
        const aliases = {
            Control: 'ctrl',
            Shift: 'shift',
            Alt: 'alt',
            Meta: 'win',
            Enter: 'enter',
            Tab: 'tab',
            Backspace: 'backspace',
            Delete: 'delete',
            ' ': 'space',
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
            CapsLock: 'capslock'
        };
        const k = aliases[e.key] || e.key.toLowerCase();
        capture(`<${k}>`, e);
        return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!$('#drawer').open) saveAll()
    }
}, true);
document.addEventListener('mousedown', e => {
    if (e.target.closest('#cancel-watch')) return;
    capture(['<mouse-left>', '<mouse-middle>', '<mouse-right>', '<mouse-x1>', '<mouse-x2>'][e.button], e)
}, true);
document.addEventListener('wheel', e => capture(e.deltaY < 0 ? '<mouse-wheel-up>' : '<mouse-wheel-dn>', e), {
    capture: true,
    passive: false
});
document.addEventListener('contextmenu', e => {
    if (state.capture || Date.now() < state.suppressPointer) e.preventDefault()
});
document.addEventListener('click', e => {
    if (Date.now() < state.suppressPointer) {
        e.preventDefault();
        e.stopPropagation()
    }
}, true);
$('#cancel-watch').onclick = stopWatch;

function modalSection(scope, name) {
    const current = section(scope, name);
    return {
        name,
        enabled: current?.enabled ?? (!name.startsWith('component.') && !name.startsWith('device.') && name !== 'bridge'),
        data: clone({
            ...(plugins[name.slice(10)]?.[2] || coreDefaults[name] || (name === 'device.CloudPierce' ? {
                com_port: 'COM4'
            } : name === 'device.KmBoxNet' ? {
                host: '',
                port: 9579,
                monitor_port: 9012,
                key: ''
            } : {})),
            ...(current?.data || {})
        }),
        edits: {},
        raw: current?.raw || (name === 'component.SequenceActionComponent' ? `[${name}]\nrule = \"\"\"\n\n\"\"\"\n` : `[${name}]\n`),
        error: current?.error,
        original: current
    }
}

function openDrawer(scope, names, title) {
    if (!state[scope]) return;
    stopWatch();
    state.modal = {
        scope,
        sections: names.map(n => modalSection(scope, n)),
        changed: false,
        aliases: readAliases(),
        aliasesChanged: false
    };
    let modalChanged = false;
    Object.defineProperty(state.modal, 'changed', {
        get: () => modalChanged,
        set: value => { modalChanged = value; queueMicrotask(renderSave); }
    });
    $('#drawer-title').textContent = title;
    $('#drawer-eyebrow').textContent = scope === 'boot' ? 'BOOT.TOML / 启动配置' : `${state.name}.toml / 游戏配置`;
    $('#drawer').classList.toggle('wide', names.some(n => /inferencer|selector|AimPart|SequenceAction/.test(n)));
    drawModalContents();
    $('#drawer-content').scrollTop = 0;
    $('.savebar').setAttribute('popover', 'manual');
    $('#drawer').append($('.savebar'));
    $('#drawer').showModal();
    $('#drawer-title').focus({preventScroll: true});
    renderSave();
}

function drawModalContents() {
    $('#drawer-content').replaceChildren();
    const devices = state.modal.sections.filter(entry => isHardwareDevice(entry.name));
    if (state.modal.scope === 'boot' && devices.length) {
        for (const entry of state.modal.sections.filter(entry => !entry.name.startsWith('device.'))) drawEntry(entry);
        drawHardwarePicker(devices);
    } else {
        for (const entry of state.modal.sections) drawEntry(entry);
    }
}

function isHardwareDevice(name) {
    return name.startsWith('device.') && name !== 'device.ExtendOptions';
}

function drawHardwarePicker(devices) {
    const root = $('#drawer-content');
    root.append(node('h3', 'group-title', '硬件设备'));
    const row = node('div', 'field');
    const label = node('label', 'field-label', '设备类型');
    attachHelp(label, '设备类型');
    const select = node('select');
    select.id = 'hardware-device';
    label.htmlFor = select.id;
    const active = devices.filter(entry => entry.enabled);
    const placeholder = new Option('请选择一个设备', '');
    placeholder.disabled = true;
    select.append(placeholder);
    for (const entry of devices) select.append(new Option(
        entry.name === 'device.CloudPierce' ? 'CPBox / CloudPierce' : entry.name === 'device.KmBoxNet' ? 'KmBoxNet' : entry.name.slice(7),
        entry.name
    ));
    select.value = active.length === 1 ? active[0].name : '';
    row.append(label, select);
    const details = node('div', 'hardware-details');
    root.append(row, details);
    const renderSelected = () => {
        stopWatch();
        details.replaceChildren();
        const selected = devices.find(entry => entry.name === select.value);
        if (!selected) {
            details.append(node('p', 'empty-note', '请选择要使用的设备。'));
            return;
        }
        drawEntry(selected, details, true);
        const extensions = state.modal.sections.find(entry => entry.name === 'device.ExtendOptions');
        if (selected.name === 'device.CloudPierce' && extensions) drawEntry(extensions, details);
    };
    select.onchange = () => {
        for (const entry of devices) {
            const enabled = entry.name === select.value;
            if (entry.enabled !== enabled) {
                entry.enabled = enabled;
                entry.changed = true;
            }
        }
        state.modal.changed = true;
        renderSelected();
    };
    renderSelected();
}

function parseRecoilGroups(raw, fallback = []) {
    const body = raw.match(/^\s*pattern\s*=\s*\[([^]*?)^\s*\]\s*(?:#.*)?$/m)?.[1];
    if (body === undefined) return {profiles: fallback.length ? [{name: '默认配置', pattern: clone(fallback)}] : [], active: fallback.length ? '默认配置' : ''};
    const profiles = [];
    let current = null;
    const activeNames = new Set();
    for (const line of body.split('\n')) {
        const row = line.match(/^\s*(#\s*)?\[([^\[\]]+)\]\s*,?\s*(?:#.*)?$/);
        if (row) {
            const point = row[2].split(',').filter(x => x.trim()).map(x => Number(x.trim().replaceAll('_', '')));
            if (point.length !== 3 || !point.every(Number.isFinite)) continue;
            if (!current) { current = {name: '默认配置', pattern: []}; profiles.push(current); }
            current.pattern.push(point);
            if (!row[1]) activeNames.add(current.name);
        } else {
            const name = line.match(/^\s*#\s*([^\[\]\n].*?)\s*$/)?.[1];
            if (name) { current = {name, pattern: []}; profiles.push(current); }
        }
    }
    return {profiles, active: [...activeNames][0] || ''};
}

function serializeRecoilGroups(profiles, active) {
    const lines = ['pattern = ['];
    for (const profile of profiles) {
        lines.push(`  # ${profile.name.replace(/[\r\n]/g, ' ')}`);
        for (const point of profile.pattern) lines.push(`  ${profile.name === active ? '' : '# '}[${point.join(', ')}],`);
    }
    lines.push(']');
    return lines.join('\n');
}

function recoilEditor(entry) {
    const parsed = parseRecoilGroups(entry.pattern ?? entry.raw, entry.data.pattern || []);
    const profiles = parsed.profiles;
    let active = parsed.active;
    let selected = Math.max(0, profiles.findIndex(profile => profile.name === active));
    let editingName = false;
    const wrap = node('section', 'recoil-editor');
    function changed() {
        entry.pattern = serializeRecoilGroups(profiles, active);
        entry.data.pattern = clone(profiles.find(p => p.name === active)?.pattern || []);
        entry.changed = true;
        state.modal.changed = true;
    }
    function validateNames() {
        wrap.querySelectorAll('.recoil-name').forEach(input => {
            const index = Number(input.dataset.index);
            const name = profiles[index].name;
            input.setCustomValidity(!name.trim() ? '请输入配置名称' : profiles.some((p, i) => i !== index && p.name === name) ? '配置名称不能重复' : '');
        });
    }
    function paint() {
        wrap.replaceChildren();
        const head = node('div', 'recoil-picker field');
        const picker = node('select');
        picker.setAttribute('aria-label', '选择编辑的压枪组');
        const updatePicker = () => {
            picker.replaceChildren(...profiles.map((profile, index) => {
                const option = new Option(profile.name, String(index));
                if (profile.name === active) option.dataset.status = '生效';
                return option;
            }));
            if (!profiles.length) picker.append(new Option('暂无压枪组', ''));
            picker.disabled = !profiles.length;
            picker.value = profiles.length ? String(selected) : '';
        };
        updatePicker();
        picker.onchange = () => {
            if (!$('#drawer-form').reportValidity()) { picker.value = String(selected); return; }
            selected = Number(picker.value);
            editingName = false;
            paint();
            wrap.querySelector('.recoil-picker select')?.focus({preventScroll: true});
        };
        const pickerSlot = node('div', 'recoil-picker-slot');
        const pickerActions = node('div', 'recoil-picker-actions');
        const pickerControl = node('div', 'recoil-picker-control');
        pickerSlot.append(picker);
        pickerControl.append(pickerSlot, pickerActions);
        head.append(node('span', 'field-label', '压枪组'), pickerControl);
        const addGroup = node('button', 'quiet recoil-new', '新建');
        addGroup.type = 'button';
        addGroup.onclick = () => {
            if (!$('#drawer-form').reportValidity()) return;
            let n = 1;
            while (profiles.some(p => p.name === `配置 ${n}`)) n++;
            profiles.push({name: `配置 ${n}`, pattern: []});
            selected = profiles.length - 1;
            editingName = true;
            changed(); paint();
            wrap.querySelector('.recoil-name')?.focus();
        };
        pickerActions.append(addGroup);
        wrap.append(head);
        if (!profiles.length) wrap.append(node('p', 'muted', '暂无配置组，添加后选择要生效的组。'));
        profiles.forEach((profile, index) => {
            if (index !== selected) return;
            const card = node('section', 'recoil-group');
            const bar = node('div', 'recoil-group-head');
            const name = node('input', 'recoil-name');
            name.dataset.index = String(index);
            name.value = profile.name;
            name.placeholder = '配置名称';
            name.required = true;
            name.hidden = !editingName;
            picker.hidden = editingName;
            name.setAttribute('aria-label', `配置组 ${index + 1} 名称`);
            name.oninput = () => {
                if (active === profile.name) active = name.value;
                profile.name = name.value;
                validateNames(); changed(); updatePicker();
            };
            const beginRename = () => {
                const menu = selectMenus.get(picker);
                if (menu?.matches(':popover-open')) menu.hidePopover();
                editingName = true;
                name.hidden = false;
                picker.hidden = true;
                name.focus(); name.select();
            };
            const finishRename = () => {
                if (!name.checkValidity()) return false;
                editingName = false;
                name.hidden = true;
                picker.hidden = false;
                return true;
            };
            picker.title = '双击重命名';
            picker.ondblclick = event => { event.preventDefault(); beginRename(); };
            picker.addEventListener('keydown', event => {
                if (event.key === 'F2') { event.preventDefault(); beginRename(); }
            });
            name.onblur = finishRename;
            name.onkeydown = event => {
                if (event.key === 'Enter') { event.preventDefault(); if (finishRename()) picker.focus({preventScroll: true}); }
            };
            const use = node('button', 'quiet recoil-activate', '生效');
            use.type = 'button';
            use.setAttribute('aria-pressed', String(active === profile.name));
            use.title = '每次仅一组生效；再次点击当前组可停用';
            use.onclick = () => {
                if (!$('#drawer-form').reportValidity()) return;
                active = active === profile.name ? '' : profile.name;
                changed(); paint();
            };
            const remove = node('button', 'quiet danger recoil-delete', '删除');
            remove.type = 'button';
            remove.setAttribute('aria-label', `删除配置组 ${index + 1}`);
            remove.onclick = () => {
                if (active === profile.name) active = '';
                profiles.splice(index, 1);
                selected = Math.max(0, Math.min(index, profiles.length - 1));
                editingName = false;
                changed(); paint();
            };
            const heading = node('span', 'field-label recoil-content-title', '补偿序列');
            bar.append(heading);
            pickerSlot.append(name);
            pickerActions.replaceChildren(use, remove, addGroup);
            card.append(bar);
            const columns = node('div', 'recoil-columns');
            for (const caption of ['时间（秒）', 'X 轴', 'Y 轴', '']) columns.append(node('span', 'muted', caption));
            card.append(columns);
            const rows = node('div', 'recoil-rows');
            const paintRows = () => {
                rows.replaceChildren();
                profile.pattern.forEach((point, rowIndex) => {
                    const row = node('div', 'recoil-point');
                    point.forEach((value, axis) => {
                        const input = node('input');
                        input.type = 'number'; input.step = 'any'; input.required = true;
                        if (!axis) input.min = 0;
                        input.value = value;
                        input.setAttribute('aria-label', `配置组 ${index + 1} 第 ${rowIndex + 1} 行 ${['时间（秒）', 'X 轴', 'Y 轴'][axis]}`);
                        input.oninput = () => {
                            if (!Number.isFinite(input.valueAsNumber)) return;
                            point[axis] = input.valueAsNumber; changed();
                        };
                        row.append(input);
                    });
                    const del = node('button', 'quiet', '×');
                    del.type = 'button'; del.setAttribute('aria-label', `删除配置组 ${index + 1} 第 ${rowIndex + 1} 行`);
                    del.onclick = () => { profile.pattern.splice(rowIndex, 1); changed(); paintRows(); };
                    row.append(del); rows.append(row);
                });
            };
            paintRows(); card.append(rows);
            const add = node('button', '', '＋ 添加行');
            add.type = 'button';
            add.onclick = () => {
                const last = profile.pattern.at(-1);
                const nextTime = !last ? 0.1 : last[0] === 0.1 ? 0.5 : Number((last[0] + 0.5).toFixed(6));
                profile.pattern.push([nextTime, last?.[1] ?? 0, last?.[2] ?? 0]);
                changed(); paintRows(); focusAddedItem(rows.lastElementChild);
            };
            card.append(add); wrap.append(card);
        });
        if (profiles.length) wrap.append(node('p', 'muted recoil-help', '时间为开火后的秒数；X / Y 为累计补偿量。同时仅一组生效。'));
        validateNames();
    }
    paint(); return wrap;
}

function drawEntry(entry, root = $('#drawer-content'), hideEnable = false) {
    root.append(node('h3', 'group-title', labels[entry.name] || ({
        'kalman.filter': '滤波 · Filter',
        'kalman.predict': '预测 · Predict'
    })[entry.name] || entry.name));
    const contents = node('div', 'section-contents');
    contents.classList.toggle('section-muted', !entry.enabled);
    if (!hideEnable && (entry.name === 'bridge' || entry.name.startsWith('device.'))) {
        root.append(field('启用此配置段', entry.enabled, v => {
            entry.enabled = v;
            entry.changed = true;
            state.modal.changed = true;
            contents.classList.toggle('section-muted', !v);
        }));
    }
    root.append(contents);
    root = contents;
    if (entry.error) root.append(node('p', 'inline-error', `该注释段无法解析，请在原始区修正：${entry.error}`));
    if (entry.name === 'component.SequenceActionComponent' || entry.error) {
        root.append(RazorToml.create(entry.raw, `${entry.name} 原始 TOML`, value => {
            entry.raw = value;
            entry.rawChanged = true;
            state.modal.changed = true;
        }));
        return
    }
    const fields = entry.name === 'controller' ? ['kp_x', 'kp_y', 'ki_x', 'ki_y', 'kd_x', 'kd_y', 'kf_x', 'kf_y', ...Object.keys(entry.data).filter(k => !/^k[pidf]_[xy]$/.test(k))].filter(k => k in entry.data).map(k => [k, entry.data[k]]) : Object.entries(entry.data);
    if (entry.name === 'player') {
        const automatic = fields.findIndex(([key]) => key === 'switch_button');
        const paused = fields.findIndex(([key]) => key === 'paused_button');
        if (automatic >= 0 && paused >= 0 && automatic > paused) fields.splice(paused, 0, fields.splice(automatic, 1)[0]);
    }
    const expandable = ([key, value]) => Array.isArray(value) ? !isKeys(key, value) : value && typeof value === 'object';
    fields.sort((a, b) => Number(!!expandable(a)) - Number(!!expandable(b)));
    const fieldHost = entry.name === 'controller' ? node('div', 'controller-grid') : root;
    if (fieldHost !== root) root.append(fieldHost);
    for (const [key, value] of fields) {
        if (entry.name === 'component.RecoilComponent' && ['pattern', 'profiles', 'active_profile'].includes(key)) continue;
        fieldHost.append(field(key, value, v => {
            entry.data[key] = v;
            entry.edits[key] = v;
            entry.changed = true;
            state.modal.changed = true
        }, {
            numberOnly: entry.name === 'component.VisualRecoilComponent' || key === 'imgsz',
            aimPart: entry.name === 'component.AimPartComponent',
            labelBinding: entry.name === 'player.labels_button' || (entry.name === 'player' && key === 'labels_button')
        }))
    }
    if (entry.name === 'component.RecoilComponent') root.append(recoilEditor(entry));
    if (!Object.keys(entry.data).length) root.append(node('p', 'empty-note', '此组件使用默认行为，无需额外参数。通过主页开关启用或停用。'))
}

function finishCloseDrawer() {
    stopWatch();
    const bar = $('.savebar');
    if (bar.matches(':popover-open')) bar.hidePopover();
    bar.removeAttribute('popover');
    document.body.append(bar);
    $('#drawer').close();
    state.modal = null;
    render();
}
$('#drawer-close').onclick = () => closeDrawer();
let drawerBackdropPressed = false;
function isDrawerBackdrop(event) {
    const drawer = $('#drawer');
    if (event.target !== drawer || !drawer.open) return false;
    const rect = drawer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX >= rect.right ||
        event.clientY < rect.top || event.clientY >= rect.bottom;
}
$('#drawer').addEventListener('pointerdown', event => {
    drawerBackdropPressed = event.button === 0 && isDrawerBackdrop(event);
});
$('#drawer').addEventListener('pointercancel', () => { drawerBackdropPressed = false; });
$('#drawer').addEventListener('click', event => {
    const shouldClose = drawerBackdropPressed && isDrawerBackdrop(event);
    drawerBackdropPressed = false;
    if (shouldClose) closeDrawer();
});
$('#drawer').addEventListener('cancel', e => {
    e.preventDefault();
    if (state.capture) stopWatch();
    else closeDrawer()
});
$('#drawer-form').onsubmit = e => {
    e.preventDefault();
};
async function closeDrawer(close = true) {
    if (!state.modal || state.busy) return false;
    if (!state.modal.changed) { if (close) finishCloseDrawer(); return true; }
    if (!$('#drawer-form').reportValidity()) return false;
    return await task(async () => {
        const {
            scope,
            sections
        } = state.modal;
        const changes = sections.filter(s => s.changed || s.rawChanged).map(s => {
            const result = {
                name: s.name,
                enabled: s.enabled
            };
            if (s.rawChanged) result.raw = s.raw;
            else {
                result.data = {
                    ...(s.original ? s.edits : s.data)
                };
                if (s.pattern !== undefined) result.pattern = s.pattern
            }
            return result
        });
        for (const entry of sections) {
            if (entry.name === 'selector')
                for (const row of entry.data.class_priority || [])
                    if ((row.include || []).includes(row.class_id)) throw Error('包含类别不能选择自身');
        }
        const devices = sections.filter(s => isHardwareDevice(s.name));
        if (scope === 'boot' && devices.length && devices.filter(s => s.enabled).length !== 1) throw Error('请选择一个硬件设备。');
        if (changes.length) await patch(scope, changes, close);
        if (state.modal.aliasesChanged) state.aliases = clone(state.modal.aliases);
        for (const entry of sections) {
            entry.original = section(scope, entry.name);
            entry.edits = {};
            entry.changed = false;
            entry.rawChanged = false;
            delete entry.pattern;
        }
        state.modal.changed = false;
        state.modal.aliasesChanged = false;
        if (close) finishCloseDrawer();
        return true;
    })
}
$('#core-grid').onclick = e => {
    const card = e.target.closest('[data-core]');
    if (card) openDrawer(card.dataset.scope, card.dataset.core === 'kalman' ? ['kalman.filter', 'kalman.predict'] : card.dataset.core === 'render' ? ['render', 'bridge'] : [card.dataset.core], labels[card.dataset.core])
};
$('#plugin-grid').onclick = e => {
    if (state.busy || e.target.closest('input, label')) return;
    const b = e.target.closest('.plugin-card')?.querySelector('[data-plugin]');
    if (b) openDrawer('game', [`component.${b.dataset.plugin}`], plugins[b.dataset.plugin]?.[0] || b.dataset.plugin)
};
$('#plugin-grid').onchange = e => {
    const name = e.target.dataset.toggle;
    if (!name) return;
    const enabled = e.target.checked;
    task(async () => {
        const entry = section('game', `component.${name}`);
        try {
            await syncSwitch('game', [{
                name: `component.${name}`,
                enabled,
                ...(entry ? {} : {
                    data: plugins[name]?.[2] || {}
                })
            }])
        } finally {
            const on = !!section('game', `component.${name}`)?.enabled;
            e.target.checked = on;
            const card = e.target.closest('.plugin-card');
            card.classList.toggle('off', !on);
            card.querySelector('.plugin-bottom span').textContent = on ? '● 已启用' : '○ 已停用';
            const toggles = [...document.querySelectorAll('#plugin-grid [data-toggle]')];
            $('#component-count').textContent = `${toggles.filter(toggle => toggle.checked).length} / ${toggles.length} 已启用`;
        }
    })
};

function bootSettings() {
    const names = state.boot.sections.filter(s => s.name === 'system' || s.name.startsWith('device.')).map(s => s.name);
    for (const n of ['device.CloudPierce', 'device.KmBoxNet'])
        if (!names.includes(n)) names.push(n);
    openDrawer('boot', names, '启动设置')
}
$('#boot-settings').onclick = bootSettings;
$('#preview-settings').onclick = () => openDrawer('boot', ['render', 'bridge'], '渲染');
$('#player-settings').onclick = () => openDrawer('game', labelBindingSections(), '输入绑定');
$('#use-profile').onclick = () => task(() => patch('boot', [{
    name: 'system',
    data: {
        loader: state.name
    }
}]));
async function switchProfile(name, force = false) {
    if (!force && (dirty('game') || aliasesDirty()) && !(await ask('放弃当前游戏配置的未保存修改？'))) {
        $('#profile').value = state.name;
        return
    }
    await readScope('game', name);
    state.name = name;
    render();
    eventLog(`已打开 ${name}.toml`)
}
$('#profile').onchange = e => {
    const name = e.target.value;
    task(() => switchProfile(name))
};

function createProfile(copy) {
    $('#profile-title').textContent = copy ? '复制游戏配置' : '新建游戏配置';
    $('#profile-name').value = copy ? `${state.name}_copy` : '';
    $('#profile-source').replaceChildren(...state.games.map(n => new Option(n, n)));
    $('#profile-source').value = state.name;
    $('#profile-dialog').showModal()
}
$('#new-profile').onclick = () => createProfile(false);
$('#copy-profile').onclick = () => createProfile(true);
$('#profile-cancel').onclick = () => $('#profile-dialog').close();
$('#profile-form').onsubmit = e => {
    e.preventDefault();
    task(async () => {
        if (dirty('game') && !(await ask('新配置基于已保存的文件创建，并放弃当前游戏草稿，继续？'))) return;
        const result = await api('/api/config/game', {
            method: 'POST',
            body: JSON.stringify({
                name: $('#profile-name').value,
                source: $('#profile-source').value
            })
        });
        state.games = (await api('/api/configs')).games;
        await switchProfile(result.name, true);
        $('#profile-dialog').close();
        notify('配置已创建')
    })
};
$('#delete-profile').onclick = () => task(async () => {
    if (!(await ask(`将 ${state.name}.toml 移到回收目录？当前游戏草稿会被放弃。`))) return;
    await api(`/api/config/game/${encodeURIComponent(state.name)}`, {
        method: 'DELETE'
    });
    const summary = await api('/api/configs');
    state.games = summary.games;
    await switchProfile(summary.active_loader || state.games[0], true);
    notify('已移入 .razor-trash')
});
async function saveAll() {
    if (state.modal) {
        if (!(await closeDrawer(false))) return;
    }
    return task(async () => {
        if (!anyDirty()) return;
        const restarting = dirty('boot') || (dirty('game') && state.game.original.includes('[inferencer]') && JSON.stringify((await parse(state.game.original)).sections.find(s => s.name === 'inferencer')?.data) !== JSON.stringify(data('game', 'inferencer')));
        if (state.running && restarting && !(await ask('这些更改会触发 Runtime 重启，保存并继续？'))) return;
        for (const scope of ['game', 'boot']) {
            if (!dirty(scope)) continue;
            await api(scope === 'boot' ? '/api/config/boot' : `/api/config/game/${encodeURIComponent(state.name)}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: state[scope].content,
                    expected: state[scope].original
                })
            });
            state[scope].original = state[scope].content;
            state[scope].savedSections = clone(state[scope].sections);
            eventLog(`已保存 ${scope==='boot'?'boot.toml':state.name+'.toml'}`)
        }
        if (aliasesDirty()) {
            const result = await api(`/api/aliases/${encodeURIComponent(state.name)}`, {
                method: 'PUT', body: JSON.stringify({aliases: state.aliases, expected: state.savedAliases})
            });
            state.aliases = clone(result.aliases);
            state.savedAliases = clone(result.aliases);
            try { localStorage.removeItem(`razor-console.aliases.${state.name}`); } catch {}
        }
        renderSave();
        notify('配置已保存')
    })
}
$('#save').onclick = event => { event.preventDefault(); saveAll(); };
$('#discard').onclick = () => task(async () => {
    stopWatch();
    state.aliases = clone(state.savedAliases || {});
    for (const scope of ['boot', 'game']) {
        if (!state[scope]) continue;
        state[scope].content = state[scope].original;
        state[scope].sections = clone(state[scope].savedSections);
    }
    if (state.modal) {
        const content = $('#drawer-content');
        const scrollTop = content.scrollTop;
        const scrollLeft = content.scrollLeft;
        state.modal.sections = state.modal.sections.map(entry => modalSection(state.modal.scope, entry.name));
        state.modal.aliases = readAliases();
        state.modal.aliasesChanged = false;
        state.modal.changed = false;
        drawModalContents();
        renderSave();
        content.scrollTop = scrollTop;
        content.scrollLeft = scrollLeft;
    } else render();
});
window.addEventListener('beforeunload', e => {
    if (anyDirty() || state.modal?.changed) {
        e.preventDefault();
        e.returnValue = ''
    }
});

function eventLog(text, kind = 'console') {
    state.logs.push({
        text,
        time: new Date().toLocaleTimeString(),
        kind
    });
    state.logs = state.logs.slice(-500);
    renderLogs()
}

let followLogs = true;
function renderLogs() {
    const filter = $('#log-filter').value,
        list = $('#log-list'),
        previousTop = list.scrollTop;
    list.replaceChildren(...state.logs.filter(r => filter === 'all' || r.kind === filter).map(r => {
        const level = r.kind === 'console' ? 'console' : r.level >= 50 ? 'critical' : r.level >= 40 ? 'error' : r.level >= 30 ? 'warning' : r.level >= 20 ? 'info' : 'debug';
        const line = node('div', `log-line log-level-${level}`);
        const text = r.text.replace(/\x1b\[[0-9;]*m/g, '');
        const formatted = /^((?:DEBUG|INFO|WARNING|ERROR|CRITICAL):)(\s*)(\[[^\]]+\])(\s*)(\[[^\]]+\])(\s*-\s*)(\[[^\]]+\])(\s*-\s*)([\s\S]*)$/.exec(text);
        const message = node('span', 'log-message');
        if (formatted) {
            const colors = ['log-token-level', '', 'log-token-time', '', 'log-token-module', '', 'log-token-location', '', 'log-token-body'];
            formatted.slice(1).forEach((part, index) => message.append(node('span', colors[index], part)));
        } else message.textContent = text;
        line.append(node('span', 'log-time', r.time), node('span', 'log-level', level.toUpperCase()), message);
        return line;
    }));
    $('#log-count').textContent = `${state.logs.length} 条`;
    list.scrollTop = followLogs ? list.scrollHeight : previousTop;
}
function setLogFollow(enabled) {
    followLogs = enabled;
    $('#follow-logs').setAttribute('aria-pressed', String(followLogs));
    $('#follow-logs').textContent = followLogs ? '跟随：开' : '跟随：关';
    if (followLogs) $('#log-list').scrollTop = $('#log-list').scrollHeight;
}
$('#follow-logs').onclick = () => setLogFollow(!followLogs);
for (const eventName of ['wheel', 'touchmove']) {
    $('#log-list').addEventListener(eventName, () => {
        if (followLogs) setLogFollow(false);
    }, {passive: true});
}
function selectOutput(name) {
    for (const view of ['preview', 'logs']) {
        const selected = view === name;
        $(`#output-${view}`).hidden = !selected;
        $(`#tab-${view}`).setAttribute('aria-selected', String(selected));
        $(`#tab-${view}`).tabIndex = selected ? 0 : -1;
    }
    if (name === 'logs') renderLogs();
}
for (const name of ['preview', 'logs']) {
    $(`#tab-${name}`).onclick = () => selectOutput(name);
    $(`#tab-${name}`).onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'logs' : event.key === 'End' ? 'preview' : name === 'preview' ? 'logs' : 'preview';
        selectOutput(next);
        $(`#tab-${next}`).focus();
    };
}
$('#log-filter').onchange = renderLogs;
$('#copy-logs').onclick = () => task(async () => {
    await navigator.clipboard.writeText($('#log-list').innerText);
    notify('日志已复制')
});
$('#clear-logs').onclick = () => task(async () => {
    const result = await api('/api/runtime/logs/clear', {
        method: 'POST'
    });
    state.sequence = result.sequence;
    state.generation = result.generation;
    state.logs = [];
    renderLogs()
});
let runtimeStatusRevision = 0;
function applyRuntimeStatus(result) {
    const running = !!result.running;
    if (state.running !== running) {
        runtimeStatusRevision++;
        clearPreviewFrame();
    }
    state.running = running;
    if ('bound' in result) state.bound = !!result.bound;
    $('#runtime-state').textContent = !state.bound ? '未绑定' : state.running ? 'Runtime 运行中' : '未启动';
    $('#bind-runtime').hidden = state.bound;
    $('#run').hidden = !state.bound;
    $('#unbind-runtime').hidden = !state.bound;
    $('#unbind-runtime').disabled = state.running || state.busy;
    document.body.classList.toggle('runtime-unbound', !state.bound);
    $('#runtime-state').classList.toggle('on', state.running);
    $('#run').textContent = state.running ? '停止 Runtime' : '启动 Runtime';
    $('#run').disabled = !!state.runtimePending;
    renderPreview();
}
async function pollStatus() {
    const revision = runtimeStatusRevision;
    try {
        const result = await api('/api/runtime');
        if (revision === runtimeStatusRevision && !state.runtimePending) applyRuntimeStatus(result);
    } catch {
        if (revision === runtimeStatusRevision && !state.runtimePending) {
            $('#runtime-state').textContent = 'Console 连接中断';
            $('#run').disabled = true;
        }
    }
    setTimeout(pollStatus, 1500)
}
$('#run').onclick = () => task(async () => {
    if (!state.running && anyDirty()) {
        notify('请先保存或撤销修改，再启动 Runtime');
        return
    }
    state.runtimePending = state.running ? 'stop' : 'start';
    runtimeStatusRevision++;
    clearPreviewFrame();
    renderPreview();
    $('#run').disabled = true;
    try {
        const result = await api(`/api/runtime/${state.runtimePending}`, {method: 'POST'});
        applyRuntimeStatus(result);
        eventLog(state.running ? 'Runtime 已启动' : 'Runtime 已停止');
    } finally {
        state.runtimePending = null;
        runtimeStatusRevision++;
        $('#run').disabled = false;
        renderPreview();
    }
});
async function pollLogs() {
    if (!state.bound) { setTimeout(pollLogs, 1500); return; }
    try {
        const payload = await api(`/api/runtime/logs?after=${state.sequence}`);
        if (state.generation !== payload.generation) {
            state.generation = payload.generation;
            state.sequence = 0;
            state.logs = [];
            renderLogs();
        } else {
            for (const r of payload.logs || []) {
                if (r.text.includes('[src.reload]') && r.text.endsWith('Configuration file change detected, reloading...')) state.logs = [];
                state.sequence = Number(r.sequence);
                state.logs.push({
                    time: new Date(Number(r.published_at_ms)).toLocaleTimeString(),
                    text: r.text,
                    level: Number(r.level),
                    kind: Number(r.level) >= 30 ? 'error' : 'runtime'
                })
            }
            state.logs = state.logs.slice(-500);
            renderLogs()
        }
    } catch {}
    setTimeout(pollLogs, 500)
}
async function pollSounds() {
    if (!state.bound) { setTimeout(pollSounds, 1500); return; }
    try {
        const payload = await api('/api/bridge/events');
        for (const event of payload.events || []) eventLog(`Runtime 事件：${event.name}`);
    } catch {}
    setTimeout(pollSounds, 300)
}
let lastPreviewFrameAt = null;
let previewRevision = 0;
let previewRequest = null;
function canReceivePreview() {
    return state.bound && state.running && state.runtimePending !== 'stop' && awaitSavedBridge();
}
function clearPreviewFrame() {
    previewRevision++;
    previewRequest?.abort();
    lastPreviewFrameAt = null;
    state.live = false;
    if (state.frameUrl) URL.revokeObjectURL(state.frameUrl);
    state.frameUrl = null;
    for (const selector of ['#frame', '#large-frame']) {
        $(selector).hidden = true;
        $(selector).removeAttribute('src');
    }
    $('#frame-meta').textContent = '无画面';
    $('#original-frame-meta').textContent = '1:1';
    if ($('#preview-dialog').open) $('#preview-dialog').close();
}
function renderPreview() {
    const enabled = awaitSavedBridge();
    const running = state.running && state.runtimePending !== 'stop';
    state.live = canReceivePreview() && lastPreviewFrameAt !== null && performance.now() - lastPreviewFrameAt < 2000;
    $('#frame').hidden = $('#large-frame').hidden = !state.live;
    $('#frame-empty').hidden = state.live;
    const waiting = running ? '等待 Runtime 画面' : '等待 Runtime 启动';
    $('#preview-status').textContent = state.live ? 'LIVE' : enabled ? waiting : '输出关闭';
    $('#expand-preview').disabled = !state.live;
    for (const selector of ['#toggle-preview', '#expanded-toggle-preview']) {
        $(selector).textContent = enabled ? '关闭预览' : '开启预览';
        $(selector).disabled = state.busy || !state.bound;
    }
    $('#expanded-preview-status').textContent = state.live ? 'LIVE' : enabled ? waiting : '预览已关闭';
    $('#frame-empty strong').textContent = enabled ? waiting : '画面输出未开启';
    $('#frame-empty p').textContent = !enabled ? '在渲染设置中启用 Console 画面输出' : running ? '收到画面后将自动显示' : 'Runtime 启动后将自动接收画面';
    $('#preview-settings').hidden = enabled;
}
async function pollFrame() {
    const fps = Number($('#preview-fps').value) || 60;
    const revision = previewRevision;
    try {
        if (canReceivePreview()) {
            previewRequest = new AbortController();
            const r = await fetch('/api/frame', {
                cache: 'no-store', signal: AbortSignal.any([previewRequest.signal, AbortSignal.timeout(3000)])
            });
            if (revision !== previewRevision || !canReceivePreview()) return;
            if (r.headers.get('x-runtime-running') === 'false') {
                applyRuntimeStatus({running: false});
                return;
            }
            if (r.ok && r.status !== 204 && r.headers.get('content-type')?.startsWith('image/')) {
                const blob = await r.blob();
                if (revision !== previewRevision || !canReceivePreview()) return;
                const nextUrl = URL.createObjectURL(blob);
                const decoded = new Image();
                decoded.src = nextUrl;
                try { await decoded.decode(); } catch (error) { URL.revokeObjectURL(nextUrl); throw error; }
                if (revision !== previewRevision || !canReceivePreview()) {
                    URL.revokeObjectURL(nextUrl);
                    return;
                }
                const old = state.frameUrl;
                state.frameUrl = nextUrl;
                $('#frame').src = $('#large-frame').src = state.frameUrl;
                if (old) URL.revokeObjectURL(old);
                lastPreviewFrameAt = performance.now();
            }
        } else if (state.frameUrl || lastPreviewFrameAt !== null) clearPreviewFrame();
    } catch {
        // Keep the last decoded frame through brief producer/network gaps.
    } finally {
        previewRequest = null;
        renderPreview();
        setTimeout(pollFrame, state.live ? 1000 / fps : 800);
    }
}

function awaitSavedBridge() {
    const entry = state.boot?.savedSections?.find(s => s.name === 'bridge' && s.enabled);
    return !!entry?.data.open_preview;
}
$('#toggle-preview').onclick = () => task(async () => {
    await syncSwitch('boot', [{name: 'bridge', enabled: true, data: {open_preview: !awaitSavedBridge()}}]);
    if (!awaitSavedBridge()) clearPreviewFrame();
    renderPreview();
});
$('#frame').onload = () => {
    if (!state.frameUrl || !canReceivePreview()) return;
    const size = `${$('#frame').naturalWidth} × ${$('#frame').naturalHeight}`;
    $('#frame-meta').textContent = size;
    $('#original-frame-meta').textContent = size;
};
$('#expanded-toggle-preview').onclick = () => $('#toggle-preview').click();
$('#expand-preview').onclick = () => {
    if (state.live && awaitSavedBridge()) $('#preview-dialog').showModal();
};
$('#close-preview').onclick = () => $('#preview-dialog').close();
$('#preview-dialog').addEventListener('click', event => {
    if (event.target !== $('#preview-dialog')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
});
try {
    $('#preview-fps').value = localStorage.getItem('razor-console.preview-fps') || '60'
} catch {}
$('#preview-fps').onchange = () => {
    try {
        localStorage.setItem('razor-console.preview-fps', $('#preview-fps').value)
    } catch {}
};
async function initialize() {
    await task(async () => {
        const health = await api('/api/health');
        state.bound = !!health.runtime.bound;
        document.body.classList.toggle('runtime-unbound', !state.bound);
        if (!state.bound) {
            $('#save-state').textContent = '未绑定 Runtime';
            return;
        }
        const summary = await api('/api/configs');
        state.games = summary.games;
        state.name = summary.active_loader || summary.games[0];
        if (!state.name) throw Error('未找到游戏配置，请先在 Runtime config 目录添加一个配置。');
        await readScope('boot');
        await readScope('game', state.name);
        render();
        $('#runtime-dir').textContent = health.runtime.directory;
        eventLog('配置工作台已连接')
    });
    pollStatus();
    pollLogs();
    pollSounds();
    pollFrame()
}
$('#bind-runtime').onclick = () => task(async () => {
    if (dirty('boot') || dirty('game')) throw Error('请先保存或撤销当前修改，再绑定 Runtime。');
    const button = $('#bind-runtime');
    button.disabled = true;
    button.textContent = '选择 Runtime 目录…';
    try {
        const result = await api('/api/runtime/bind', {method: 'POST'});
        if (result.path) location.reload();
    } finally {
        button.disabled = false;
        button.textContent = '绑定 Runtime';
    }
});
$('#unbind-runtime').onclick = () => task(async () => {
    if (anyDirty()) throw Error('请先保存或撤销当前修改，再解绑 Runtime。');
    await api('/api/runtime/unbind', {method: 'POST'});
    location.reload();
});
initialize();

// Keep native select values/events while drawing menus consistently across devices.
const selectMenus = new WeakMap();
function openSelectMenu(select) {
    if (select.disabled || state.busy) return;
    const currentMenu = selectMenus.get(select);
    if (currentMenu?.matches(':popover-open')) {
        currentMenu.hidePopover();
        return;
    }
    const menu = node('div', 'select-menu');
    selectMenus.set(select, menu);
    menu.setAttribute('popover', 'auto');
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', select.getAttribute('aria-label') || '选择选项');
    select.setAttribute('aria-expanded', 'true');
    const buttons = [...select.options].filter(option => !option.hidden).map(option => {
        const button = node('button', 'select-option', option.textContent);
        if (option.dataset.status) {
            button.classList.add('select-option-with-status');
            button.replaceChildren(node('span', 'select-option-label', option.textContent), node('span', 'select-option-status', option.dataset.status));
        }
        button.type = 'button';
        button.disabled = option.disabled || option.parentElement.disabled === true;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.selected));
        button.onclick = () => {
            const changed = select.selectedIndex !== option.index;
            select.selectedIndex = option.index;
            menu.hidePopover();
            select.focus({preventScroll: true});
            if (changed) {
                select.dispatchEvent(new Event('input', {bubbles: true}));
                select.dispatchEvent(new Event('change', {bubbles: true}));
            }
        };
        menu.append(button);
        return button;
    });
    const enabled = buttons.filter(button => !button.disabled);
    menu.onkeydown = event => {
        const index = enabled.indexOf(document.activeElement);
        let next;
        if (event.key === 'ArrowDown') next = (index + 1) % enabled.length;
        if (event.key === 'ArrowUp') next = (index - 1 + enabled.length) % enabled.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = enabled.length - 1;
        if (next !== undefined && enabled.length) {
            event.preventDefault();
            enabled[next].focus({preventScroll: true});
            enabled[next].scrollIntoView({block: 'nearest'});
        }
        if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation();
            menu.hidePopover(); select.focus({preventScroll: true});
        }
        if (event.key === 'Tab') menu.hidePopover();
    };
    menu.addEventListener('toggle', event => {
        if (event.newState === 'closed') {
            select.setAttribute('aria-expanded', 'false');
            menu.remove();
        }
    });
    (select.closest('dialog') || document.body).append(menu);
    const rect = select.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 160), innerWidth - 16);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    menu.style.maxHeight = `${Math.max(40, Math.min(280, Math.max(innerHeight - rect.bottom - 12, rect.top - 12)))}px`;
    menu.showPopover();
    const height = menu.getBoundingClientRect().height;
    menu.style.top = `${rect.bottom + height + 12 <= innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - height - 4)}px`;
    (enabled.find(button => button.getAttribute('aria-selected') === 'true') || enabled[0])?.focus({preventScroll: true});
}
let pressedSelect = null;
let pressedSelectWasOpen = false;
document.addEventListener('pointerdown', event => {
    pressedSelect = event.target instanceof HTMLSelectElement ? event.target : null;
    pressedSelectWasOpen = !!selectMenus.get(pressedSelect)?.matches(':popover-open');
}, true);
document.addEventListener('pointercancel', () => { pressedSelect = null; });
document.addEventListener('mousedown', event => {
    if (event.target instanceof HTMLSelectElement && !event.target.multiple && event.target.size <= 1) event.preventDefault();
});
document.addEventListener('click', event => {
    if (event.target instanceof HTMLSelectElement && !event.target.multiple && event.target.size <= 1) {
        event.preventDefault();
        if (pressedSelect === event.target) {
            if (pressedSelectWasOpen) {
                const menu = selectMenus.get(event.target);
                if (menu?.matches(':popover-open')) menu.hidePopover();
            } else openSelectMenu(event.target);
        }
    }
    pressedSelect = null;
});
document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLSelectElement && !event.target.multiple && event.target.size <= 1 &&
        (['Enter', ' ', 'F4'].includes(event.key) || (event.altKey && event.key === 'ArrowDown'))) {
        event.preventDefault(); openSelectMenu(event.target);
    }
});

// Mouse and keyboard share one active menu item, never two highlights.
const menuSelector = '.select-menu, .include-menu, .key-special-menu';
document.addEventListener('pointermove', event => {
    const menu = event.target.closest?.(menuSelector);
    if (!menu) return;
    menu.dataset.keyboard = 'false';
    const option = event.target.closest('button');
    if (option && !option.disabled && document.activeElement !== option) option.focus({preventScroll: true});
});
document.addEventListener('keydown', event => {
    const menu = event.target.closest?.(menuSelector);
    if (menu && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) menu.dataset.keyboard = 'true';
}, true);

// Dismiss anchored menus when their surrounding page moves, but allow list scrolling.
document.addEventListener('scroll', event => {
    if (event.target instanceof Element && event.target.closest(menuSelector)) return;
    for (const menu of document.querySelectorAll(menuSelector)) {
        if (menu.matches(':popover-open')) menu.hidePopover();
    }
}, {capture: true, passive: true});

// Auto popovers dismiss on outside clicks; pointer exit alone keeps them open.

function enhanceNumberInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'number' || input.closest('.number-input-wrap')) return;
    const wrap = node('span', 'number-input-wrap');
    input.before(wrap);
    wrap.append(input);
    const controls = node('span', 'number-stepper');
    for (const [direction, glyph, label] of [[1, '▲', '增加'], [-1, '▼', '减少']]) {
        const button = node('button', '', glyph);
        button.type = 'button';
        button.tabIndex = -1;
        button.setAttribute('aria-label', `${label}${input.getAttribute('aria-label') || '数值'}`);
        button.onclick = () => {
            try {
                direction > 0 ? input.stepUp() : input.stepDown();
            } catch {
                const current = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
                input.value = String(current + direction * .01);
            }
            input.dispatchEvent(new Event('input', {bubbles: true}));
            input.dispatchEvent(new Event('change', {bubbles: true}));
            input.focus({preventScroll: true});
        };
        controls.append(button);
    }
    wrap.append(controls);
}

function enhanceNumberInputs(root = document) {
    if (root instanceof HTMLInputElement) enhanceNumberInput(root);
    root.querySelectorAll?.('input[type=number]').forEach(enhanceNumberInput);
}

enhanceNumberInputs();
new MutationObserver(records => {
    for (const record of records) for (const added of record.addedNodes) {
        if (added instanceof Element) enhanceNumberInputs(added);
    }
}).observe(document.body, {childList: true, subtree: true});

// Scale rem-based content without scaling the viewport coordinate system used
// by fixed drawers, modal dialogs and anchored popovers.
// The base size is the large-window ceiling; smaller windows compact the UI.
let uiScaleFrame = 0;
function updateUiScale() {
    cancelAnimationFrame(uiScaleFrame);
    uiScaleFrame = requestAnimationFrame(() => {
        const desktop = window.innerWidth >= 801;
        const scale = desktop
            ? Math.min(1, Math.max(.85, Math.min(window.innerWidth / 1440, window.innerHeight / 900)))
            : 1;
        document.documentElement.style.setProperty('--ui-scale', String(Math.round(scale * 1000) / 1000));
    });
}
updateUiScale();
window.addEventListener('resize', updateUiScale, {passive: true});
