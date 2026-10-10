// Mô hình chuyển động cho Module 5 (ros2_control).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 1. Kiến trúc: hardware interface / controller_manager / controller ----------
  // Lưới 2 cột, mọi đường nối chỉ đi ngang/dọc qua khoảng trống -- toạ độ đã kiểm tra bằng
  // script hình học riêng trước khi viết (không có đường nào cắt qua ô không liên quan).
  defineScene('ros2-control-architecture', {
    title: '3 luồng dữ liệu cùng chạy mỗi chu kỳ 100Hz',
    caption: 'Bấm 1 dòng bên trái để xem đúng luồng đó trong sơ đồ.',
    setup({ stage }) {
      const FLOWS = [
        {
          label: 'Lệnh chạy xuống bánh xe',
          ids: ['n-node', 'e-node-ddc', 'n-ddc', 'e-ddc-cm', 'n-cm', 'e-cm-hw', 'n-hw', 'e-hw-gz', 'n-gz'],
        },
        {
          label: 'Trạng thái đọc lên → /joint_states',
          ids: ['n-gz', 'e-hw-gz', 'n-hw', 'e-cm-hw', 'n-cm', 'e-cm-jsb', 'n-jsb', 'e-jsb-jstates', 'n-jstates'],
        },
        {
          label: 'Phản hồi tính → /odom + tf',
          ids: ['n-gz', 'e-hw-gz', 'n-hw', 'e-cm-hw', 'n-cm', 'e-ddc-cm', 'n-ddc', 'e-ddc-odom', 'n-odom'],
        },
      ];
      stage.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:18px;align-items:start">
          <div data-k="rows" style="display:flex;flex-direction:column;gap:6px"></div>
          <svg class="svg" viewBox="0 0 470 340" role="img" aria-label="Sơ đồ kiến trúc ros2_control của Atlas">
            <g data-id="n-node"><rect x="60" y="10" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="150" y="30" style="font-size:11px">Node của bạn</text><text class="lbl-sm" x="150" y="44">/cmd_vel</text></g>
            <line data-id="e-node-ddc" x1="150" y1="48" x2="150" y2="80" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-ddc"><rect x="60" y="80" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="150" y="104" style="font-size:10.5px">diff_drive_controller</text></g>
            <line data-id="e-ddc-odom" x1="240" y1="99" x2="280" y2="99" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-odom"><rect x="280" y="80" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="370" y="100" style="font-size:10px">/odom</text><text class="lbl-sm" x="370" y="113">+ tf odom→base_footprint</text></g>

            <line data-id="e-ddc-cm" x1="150" y1="118" x2="150" y2="150" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-cm"><rect x="60" y="150" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="150" y="170" style="font-size:10px">controller_manager</text><text class="lbl-sm" x="150" y="183">100 Hz</text></g>
            <line data-id="e-cm-jsb" x1="240" y1="169" x2="280" y2="169" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-jsb"><rect x="280" y="150" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="370" y="174" style="font-size:10px">joint_state_broadcaster</text></g>
            <line data-id="e-jsb-jstates" x1="370" y1="188" x2="370" y2="198" stroke="#cbd5e1" stroke-width="2"/>

            <line data-id="e-cm-hw" x1="150" y1="188" x2="150" y2="220" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-hw"><rect x="60" y="220" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="150" y="241" style="font-size:9.5px">Hardware Interface</text></g>
            <g data-id="n-jstates"><rect x="280" y="198" width="180" height="30" rx="8" class="node-box-rect"/><text class="node-name" x="370" y="217" style="font-size:10.5px">/joint_states</text></g>

            <line data-id="e-hw-gz" x1="150" y1="258" x2="150" y2="290" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-gz"><rect x="60" y="290" width="180" height="38" rx="8" class="node-box-rect"/><text class="node-name" x="150" y="311" style="font-size:9.5px">Gazebo — 2 joint thật quay</text></g>
          </svg>
        </div>`;
      const rowsEl = stage.querySelector('[data-k="rows"]');
      const svg = stage.querySelector('svg');
      rowsEl.innerHTML = FLOWS.map((f, i) => `
        <button data-row="${i}" style="text-align:left;font-size:13px;padding:10px 12px;border-radius:8px;border:1px solid var(--line);
          background:var(--surface);color:var(--ink-2);cursor:pointer">${esc(f.label)}</button>`).join('');
      const btns = [...rowsEl.querySelectorAll('button')];

      // Hiệu ứng "dòng dữ liệu chảy": đường đang chọn gạch nét đứt, lùi dần
      // stroke-dashoffset mỗi khung hình để nhìn như đang trôi theo chiều dữ liệu thật.
      const FLOW_SPEED = 55; // px/s
      let activeIds = new Set(FLOWS[0].ids);
      let dashPhase = 0;

      function select(i) {
        btns.forEach((b, j) => {
          const on = j === i;
          b.style.background = on ? 'var(--brand-soft)' : 'var(--surface)';
          b.style.color = on ? 'var(--brand-ink)' : 'var(--ink-2)';
          b.style.borderColor = on ? 'var(--brand)' : 'var(--line)';
        });
        activeIds = new Set(FLOWS[i].ids);
        svg.querySelectorAll('[data-id]').forEach((el) => {
          const isTarget = activeIds.has(el.getAttribute('data-id'));
          const tag = el.tagName.toLowerCase();
          if (tag === 'line' || tag === 'polyline') {
            el.setAttribute('stroke', isTarget ? '#2563eb' : '#cbd5e1');
            el.setAttribute('stroke-width', isTarget ? 3.5 : 2);
            if (isTarget) {
              el.setAttribute('stroke-dasharray', '8 7');
            } else {
              el.removeAttribute('stroke-dasharray');
              el.removeAttribute('stroke-dashoffset');
            }
          } else {
            el.querySelector('rect').classList.toggle('hot', isTarget);
          }
        });
      }
      btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
      select(0);

      return {
        update(dt) {
          dashPhase -= FLOW_SPEED * dt;
          svg.querySelectorAll('[data-id]').forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if ((tag === 'line' || tag === 'polyline') && activeIds.has(el.getAttribute('data-id'))) {
              el.setAttribute('stroke-dashoffset', dashPhase.toFixed(1));
            }
          });
        },
      };
    },
  });

  // ---------- 2. Động học vi sai: cmd_vel -> vận tốc từng bánh ----------
  defineScene('diff-drive-kinematics', {
    title: 'cmd_vel → vận tốc từng bánh',
    caption: 'Thân robot tự xoay theo đúng angular.z (đi thẳng không xoay thân, quay tại chỗ thì thân xoay hẳn); vạch trên mỗi bánh trượt theo chiều lăn thật của bánh đó, tốc độ trượt theo đúng |v|. Khung đỏ cảnh báo khi ω vượt ±10 rad/s khai báo ở command interface — nhắc lại: giới hạn này KHÔNG được enforce (xem bài học), vẫn gửi nguyên xuống Gazebo.',
    setup({ stage, ui }) {
      const SEP = 0.30, RAD = 0.05, HW_LIMIT = 10;
      const CX = 230, CY = 120, SCALE = 300;
      const bodyW = 0.30 * SCALE, bodyH = 0.24 * SCALE;
      const wheelLen = 0.10 * SCALE, wheelWid = 0.035 * SCALE;
      const wlY = -(SEP / 2) * SCALE, wrY = (SEP / 2) * SCALE; // toạ độ cục bộ, gốc ở tâm robot
      const N_TICKS = 4;
      const tickXs = Array.from({ length: N_TICKS }, (_, i) => (i / N_TICKS - 0.5) * wheelLen);

      function wheelMarkup(key, y) {
        const ticks = tickXs.map((x, i) => `<line data-k="${key}t${i}" x1="0" y1="${y - wheelWid / 2}" x2="0" y2="${y + wheelWid / 2}" stroke="#ffffff" stroke-width="1.6" opacity="0.9"/>`).join('');
        return `<g data-k="${key}clip">
          <rect data-k="${key}" x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}" rx="2"/>
          <clipPath id="${key}-clip"><rect x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}"/></clipPath>
          <g clip-path="url(#${key}-clip)">${ticks}</g>
        </g>`;
      }

      stage.innerHTML = `<svg class="svg" viewBox="0 0 460 240" role="img" aria-label="Robot nhìn từ trên xuống, thân xoay theo angular.z, vạch trên bánh trượt theo chiều lăn">
        <text class="lbl-sm" x="${CX}" y="18" text-anchor="middle">tiến (X) →</text>
        <g data-k="rig" transform="translate(${CX},${CY})">
          <rect x="${-bodyW / 2}" y="${-bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="8" class="node-box-rect"/>
          <line x1="0" y1="${-bodyH / 2}" x2="0" y2="${-bodyH / 2 - 10}" stroke="var(--brand)" stroke-width="2"/>
          ${wheelMarkup('wl', wlY)}
          ${wheelMarkup('wr', wrY)}
          <text class="lbl-sm" x="${-bodyW / 2 - 16}" y="${wlY + 4}" text-anchor="end">trái</text>
          <text class="lbl-sm" x="${-bodyW / 2 - 16}" y="${wrY + 4}" text-anchor="end">phải</text>
        </g>
      </svg>
      <div class="stat" data-k="stat" style="margin-top:6px"></div>`;
      ui.innerHTML = `
        <label class="ctl">linear.x <input type="range" min="-0.5" max="0.5" step="0.01" value="0.2" data-k="lin"> <span data-k="linv"></span> m/s</label>
        <label class="ctl">angular.z <input type="range" min="-1.5" max="1.5" step="0.05" value="0" data-k="ang"> <span data-k="angv"></span> rad/s</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-sm" data-k="p1">Thẳng</button>
          <button class="btn-sm" data-k="p2">Quay tại chỗ</button>
          <button class="btn-sm" data-k="p3">Trần của cả 2 (bài học)</button>
        </div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const rig = stage.querySelector('[data-k="rig"]');
      const wlEl = stage.querySelector('[data-k="wl"]');
      const wrEl = stage.querySelector('[data-k="wr"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const ticksL = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wlt${i}"]`));
      const ticksR = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wrt${i}"]`));

      function colorFor(v) {
        if (Math.abs(v) < 0.005) return '#94a3b8';
        return v > 0 ? '#059669' : '#ea580c';
      }
      // vệt bánh lăn: dịch chuyển theo đúng khoảng cách đã lăn (v*t), không phải chỉ "quay cho có" --
      // bánh đứng yên (v=0) thì vệt đứng yên, bánh lăn nhanh thì vệt trượt nhanh, đúng chiều v.
      function placeTicks(ticks, phase) {
        ticks.forEach((el, i) => {
          let x = tickXs[i] + phase;
          x = ((x + wheelLen / 2) % wheelLen + wheelLen) % wheelLen - wheelLen / 2;
          el.setAttribute('x1', x.toFixed(1));
          el.setAttribute('x2', x.toFixed(1));
        });
      }

      const state = { bodyAngle: 0, phaseL: 0, phaseR: 0 };

      function readCmd() {
        const lin = Number(q('lin').value), ang = Number(q('ang').value);
        q('linv').textContent = lin.toFixed(2);
        q('angv').textContent = ang.toFixed(2);
        const vL = lin - ang * (SEP / 2);
        const vR = lin + ang * (SEP / 2);
        return { lin, ang, vL, vR, wL: vL / RAD, wR: vR / RAD };
      }

      function draw() {
        const { vL, vR, wL, wR } = readCmd();

        rig.setAttribute('transform', `translate(${CX},${CY}) rotate(${(state.bodyAngle * 180 / Math.PI).toFixed(1)})`);
        wlEl.setAttribute('fill', colorFor(vL));
        wrEl.setAttribute('fill', colorFor(vR));
        placeTicks(ticksL, state.phaseL);
        placeTicks(ticksR, state.phaseR);

        const overL = Math.abs(wL) > HW_LIMIT;
        const overR = Math.abs(wR) > HW_LIMIT;
        wlEl.setAttribute('stroke', overL ? 'var(--bad)' : 'none');
        wlEl.setAttribute('stroke-width', overL ? 2.5 : 0);
        wrEl.setAttribute('stroke', overR ? 'var(--bad)' : 'none');
        wrEl.setAttribute('stroke-width', overR ? 2.5 : 0);

        statEl.innerHTML =
          `Trái: v=<b>${vL.toFixed(3)}</b> m/s → ω=<b style="color:${overL ? 'var(--bad)' : 'inherit'}">${wL.toFixed(2)}</b> rad/s` +
          ` &nbsp;·&nbsp; Phải: v=<b>${vR.toFixed(3)}</b> m/s → ω=<b style="color:${overR ? 'var(--bad)' : 'inherit'}">${wR.toFixed(2)}</b> rad/s` +
          ((overL || overR) ? ' &nbsp;·&nbsp; <span style="color:var(--bad);font-weight:700">⚠ vượt ±10 rad/s khai báo — không bị chặn thật</span>' : '');
      }

      q('lin').addEventListener('input', draw);
      q('ang').addEventListener('input', draw);
      q('p1').addEventListener('click', () => { q('lin').value = 0.3; q('ang').value = 0; draw(); });
      q('p2').addEventListener('click', () => { q('lin').value = 0; q('ang').value = 1.0; draw(); });
      q('p3').addEventListener('click', () => { q('lin').value = 0.5; q('ang').value = 1.5; draw(); });

      return {
        reset() {
          state.bodyAngle = 0; state.phaseL = 0; state.phaseR = 0;
          draw();
        },
        update(dt) {
          const { ang, vL, vR } = readCmd();
          state.bodyAngle += ang * dt;
          // vạch trượt theo đúng quãng đường đã lăn (SCALE px/m) -- bánh đứng yên thì vạch đứng yên
          state.phaseL += vL * SCALE * dt;
          state.phaseR += vR * SCALE * dt;
          draw();
        },
      };
    },
  });

  // ---------- 3. Vòng đời controller: 4 trạng thái, chỉ 1 vài lệnh hợp lệ từ mỗi trạng thái ----------
  defineScene('controller-lifecycle', {
    title: 'unconfigured → inactive → active → finalized',
    caption: 'Chỉ nút hợp lệ từ trạng thái hiện tại mới bấm được — giống hệt controller_manager thật từ chối lệnh chuyển trạng thái sai.',
    setup({ stage, ui }) {
      const STATES = ['unconfigured', 'inactive', 'active', 'finalized'];
      const TX = {
        unconfigured: { configure: 'inactive', shutdown: 'finalized' },
        inactive: { activate: 'active', cleanup: 'unconfigured', shutdown: 'finalized' },
        active: { deactivate: 'inactive', shutdown: 'finalized' },
        finalized: {},
      };
      const POS = { unconfigured: 60, inactive: 220, active: 380, finalized: 260 };
      const Y_MAIN = 40, Y_FIN = 140;

      stage.innerHTML = `<svg class="svg" viewBox="0 0 540 190" role="img" aria-label="Sơ đồ vòng đời controller">
        <line x1="${POS.unconfigured + 70}" y1="${Y_MAIN}" x2="${POS.inactive - 10}" y2="${Y_MAIN}" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="${POS.inactive + 70}" y1="${Y_MAIN}" x2="${POS.active - 10}" y2="${Y_MAIN}" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="${POS.unconfigured + 35}" y1="${Y_MAIN + 20}" x2="${POS.finalized - 30}" y2="${Y_FIN - 8}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="${POS.inactive + 35}" y1="${Y_MAIN + 20}" x2="${POS.finalized + 20}" y2="${Y_FIN - 8}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="${POS.active + 35}" y1="${Y_MAIN + 20}" x2="${POS.finalized + 70}" y2="${Y_FIN - 8}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4"/>
        <g data-id="n-unconfigured"><rect x="${POS.unconfigured}" y="${Y_MAIN - 20}" width="90" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="${POS.unconfigured + 45}" y="${Y_MAIN + 5}" style="font-size:10px">unconfigured</text></g>
        <g data-id="n-inactive"><rect x="${POS.inactive}" y="${Y_MAIN - 20}" width="90" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="${POS.inactive + 45}" y="${Y_MAIN + 5}" style="font-size:11px">inactive</text></g>
        <g data-id="n-active"><rect x="${POS.active}" y="${Y_MAIN - 20}" width="90" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="${POS.active + 45}" y="${Y_MAIN + 5}" style="font-size:11px">active</text></g>
        <g data-id="n-finalized"><rect x="${POS.finalized}" y="${Y_FIN}" width="90" height="36" rx="8" class="node-box-rect"/><text class="node-name" x="${POS.finalized + 45}" y="${Y_FIN + 22}" style="font-size:10px">finalized</text></g>
      </svg>
      <div class="stat" data-k="log" style="margin-top:4px"></div>`;
      ui.innerHTML = `
        <div data-k="btns" style="display:flex;gap:8px;flex-wrap:wrap"></div>
        <button class="btn-sm" data-k="spawner">spawner thật (configure + activate liền)</button>`;
      const svg = stage.querySelector('svg');
      const logEl = stage.querySelector('[data-k="log"]');
      const btnsEl = ui.querySelector('[data-k="btns"]');
      const ALL_ACTIONS = ['configure', 'activate', 'deactivate', 'cleanup', 'shutdown'];

      let state = 'unconfigured';

      function highlight() {
        svg.querySelectorAll('[data-id]').forEach((g) => {
          g.querySelector('rect').classList.toggle('hot', g.getAttribute('data-id') === `n-${state}`);
        });
      }
      function renderBtns() {
        const valid = TX[state];
        btnsEl.innerHTML = ALL_ACTIONS.map((a) => {
          const ok = a in valid;
          return `<button class="btn-sm" data-act="${a}" ${ok ? '' : 'disabled'}>${a}</button>`;
        }).join('');
        btnsEl.querySelectorAll('button').forEach((b) => {
          b.addEventListener('click', () => doAction(b.dataset.act));
        });
      }
      function doAction(action) {
        const next = TX[state][action];
        if (!next) return;
        logEl.innerHTML = `<b>${state}</b> --${action}--&gt; <b>${next}</b>`;
        state = next;
        highlight();
        renderBtns();
      }

      ui.querySelector('[data-k="spawner"]').addEventListener('click', () => {
        if (state === 'unconfigured') {
          doAction('configure');
          setTimeout(() => doAction('activate'), 350);
        } else if (state === 'inactive') {
          doAction('activate');
        }
      });

      return {
        reset() {
          state = 'unconfigured';
          logEl.textContent = 'Trạng thái ban đầu khi controller vừa được nạp.';
          highlight();
          renderBtns();
        },
      };
    },
  });
})();
