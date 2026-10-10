// Mô hình chuyển động cho Module 7 (Teleoperation & RViz).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Bức tranh tổng thể: 4 nguồn lệnh, 1 điểm hội tụ ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (không đường nào cắt qua ô
  // không liên quan, không đoạn nào trùng đoạn nào).
  defineScene('teleop-overview', {
    title: 'Bức tranh tổng thể: 4 nguồn lệnh, 1 điểm hội tụ',
    caption: 'Bấm chọn 1 nguồn để xem đúng đường đi của nó. Nav2 vẽ nét đứt vì chưa tồn tại trong dự án tới module này — chỉ là chỗ trống twist_mux đã chừa sẵn.',
    setup({ stage }) {
      const FLOWS = [
        { label: 'Bàn phím (đi tắt, không qua ai)', ids: ['n-a', 'e-a-bypass', 'n-cmdvel'] },
        {
          label: 'Joystick (qua twist_mux)',
          ids: ['n-b1', 'e-b1-b2', 'n-b2', 'e-b2-b3', 'n-b3', 'e-b3-b4', 'n-b4', 'e-b4-b5', 'n-b5',
            'e-b5-mux', 'n-mux', 'e-mux-cmdvel', 'n-cmdvel'],
        },
        { label: 'Nav2 (chưa có — chỗ trống chừa sẵn)', ids: ['n-c1', 'e-c1-c2', 'n-c2', 'e-c2-mux', 'n-mux', 'e-mux-cmdvel', 'n-cmdvel'] },
        {
          label: 'collision_monitor (qua relay)',
          ids: ['n-d1', 'e-d1-d2', 'n-d2', 'e-d2-d3', 'n-d3', 'e-d3-mux', 'n-mux', 'e-mux-cmdvel', 'n-cmdvel'],
        },
      ];
      stage.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          <div data-k="rows" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        </div>
        <svg class="svg" viewBox="0 0 700 540" role="img" aria-label="4 nguồn lệnh cmd_vel hội tụ qua twist_mux, bàn phím đi tắt">
          <g data-id="n-a"><rect x="10" y="10" width="120" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="70" y="35" style="font-size:11px">bàn phím</text></g>

          <g data-id="n-b1"><rect x="10" y="90" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="60" y="115" style="font-size:10.5px">joystick</text></g>
          <line data-id="e-b1-b2" x1="110" y1="110" x2="130" y2="110" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-b2"><rect x="130" y="90" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="180" y="115" style="font-size:10px">joy_node</text></g>
          <line data-id="e-b2-b3" x1="230" y1="110" x2="250" y2="110" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-b3"><rect x="250" y="90" width="70" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="285" y="115" style="font-size:10.5px">/joy</text></g>
          <line data-id="e-b3-b4" x1="320" y1="110" x2="340" y2="110" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-b4"><rect x="340" y="90" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="390" y="115" style="font-size:9.5px">teleop_node</text></g>
          <line data-id="e-b4-b5" x1="440" y1="110" x2="460" y2="110" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-b5"><rect x="460" y="90" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="510" y="115" style="font-size:9px">cmd_vel_joy</text></g>

          <g data-id="n-c1" style="opacity:.65"><rect x="10" y="180" width="150" height="40" rx="8" class="node-box-rect" stroke-dasharray="5 4"/><text class="node-name" x="85" y="196" style="font-size:10.5px">Nav2</text><text class="lbl-sm" x="85" y="210">(chưa có, Module 10)</text></g>
          <line data-id="e-c1-c2" x1="160" y1="200" x2="460" y2="200" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="5 4"/>
          <g data-id="n-c2"><rect x="460" y="180" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="510" y="205" style="font-size:9px">cmd_vel_nav</text></g>

          <g data-id="n-d1"><rect x="10" y="270" width="150" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="85" y="295" style="font-size:10px">collision_monitor</text></g>
          <line data-id="e-d1-d2" x1="160" y1="290" x2="180" y2="290" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-d2"><rect x="180" y="270" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="295" style="font-size:11px">relay</text></g>
          <line data-id="e-d2-d3" x1="280" y1="290" x2="460" y2="290" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-d3"><rect x="460" y="270" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="510" y="290" style="font-size:8.5px">cmd_vel_collision</text></g>

          <polyline data-id="e-b5-mux" points="510,130 510,145 580,145 580,345 480,345 480,400" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-c2-mux" points="510,220 510,235 610,235 610,368 510,368 510,400" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-d3-mux" points="510,310 510,325 640,325 640,391 540,391 540,400" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-mux"><rect x="460" y="400" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="510" y="425" style="font-size:10.5px">twist_mux</text></g>

          <polyline data-id="e-a-bypass" points="130,30 670,30 670,500 560,500" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-mux-cmdvel" x1="510" y1="440" x2="510" y2="480" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-cmdvel"><rect x="460" y="480" width="100" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="510" y="505" style="font-size:11px">/cmd_vel</text></g>
        </svg>`;
      const rowsEl = stage.querySelector('[data-k="rows"]');
      const svg = stage.querySelector('svg');
      rowsEl.innerHTML = FLOWS.map((f, i) => `
        <button data-row="${i}" style="text-align:left;font-size:12.5px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);
          background:var(--surface);color:var(--ink-2);cursor:pointer">${esc(f.label)}</button>`).join('');
      const btns = [...rowsEl.querySelectorAll('button')];

      // Hiệu ứng "dòng dữ liệu chảy": đường đang chọn được gạch nét đứt, lùi dần
      // stroke-dashoffset mỗi khung hình -- tạo ảo giác nét đứt trôi theo chiều dữ liệu
      // thật sự di chuyển (nguồn -> /cmd_vel), không phải chỉ highlight đứng yên.
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

  // ---------- 1. Pipeline: joystick (qua twist_mux) vs bàn phím (đi tắt) ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (không đường nào cắt qua ô
  // không liên quan) -- xem cách làm đã dùng từ Module 4 trở đi.
  defineScene('teleop-pipeline', {
    title: '2 đường tới /cmd_vel',
    caption: 'Bấm chọn để so đường đi an toàn (joystick, qua twist_mux) với đường đi tắt (bàn phím, bỏ qua mọi cơ chế ưu tiên).',
    setup({ stage }) {
      const FLOWS = [
        {
          label: 'Joystick → /cmd_vel (qua twist_mux)',
          ids: ['n-joy', 'e-joy-joytopic', 'n-joytopic', 'e-joytopic-teleop', 'n-teleop',
            'e-teleop-cmdveljoy', 'n-cmdveljoy', 'e-cmdveljoy-twistmux', 'n-twistmux',
            'e-twistmux-cmdvel', 'n-cmdvel', 'e-cmdvel-ddc', 'n-ddc'],
        },
        {
          label: 'Bàn phím → /cmd_vel (đi tắt)',
          ids: ['n-kbd', 'e-kbd-bypass', 'n-cmdvel', 'e-cmdvel-ddc', 'n-ddc'],
        },
      ];
      stage.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:18px;align-items:start">
          <div data-k="rows" style="display:flex;flex-direction:column;gap:6px"></div>
          <svg class="svg" viewBox="0 0 390 530" role="img" aria-label="2 đường tới /cmd_vel: joystick qua twist_mux, bàn phím đi tắt">
            <g data-id="n-kbd"><rect x="10" y="10" width="140" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="80" y="35" style="font-size:10px">teleop_twist_keyboard</text></g>
            <g data-id="n-joy"><rect x="190" y="10" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="35" style="font-size:11px">joy_node</text></g>

            <line data-id="e-joy-joytopic" x1="280" y1="50" x2="280" y2="90" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-joytopic"><rect x="190" y="90" width="180" height="32" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="111" style="font-size:11px">/joy</text></g>

            <line data-id="e-joytopic-teleop" x1="280" y1="122" x2="280" y2="162" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-teleop"><rect x="190" y="162" width="180" height="42" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="183" style="font-size:9.5px">teleop_node</text><text class="lbl-sm" x="280" y="197">teleop_twist_joy</text></g>

            <line data-id="e-teleop-cmdveljoy" x1="280" y1="204" x2="280" y2="244" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-cmdveljoy"><rect x="190" y="244" width="180" height="32" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="265" style="font-size:10px">cmd_vel_joy</text></g>

            <line data-id="e-cmdveljoy-twistmux" x1="280" y1="276" x2="280" y2="316" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-twistmux"><rect x="190" y="316" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="341" style="font-size:11px">twist_mux</text></g>

            <polyline data-id="e-kbd-bypass" points="80,50 80,416 190,416" fill="none" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-twistmux-cmdvel" x1="280" y1="356" x2="280" y2="396" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-cmdvel"><rect x="190" y="396" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="421" style="font-size:11px">/cmd_vel</text></g>

            <line data-id="e-cmdvel-ddc" x1="280" y1="436" x2="280" y2="476" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-ddc"><rect x="190" y="476" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="280" y="497" style="font-size:9.5px">diff_drive_controller</text></g>
          </svg>
        </div>`;
      const rowsEl = stage.querySelector('[data-k="rows"]');
      const svg = stage.querySelector('svg');
      rowsEl.innerHTML = FLOWS.map((f, i) => `
        <button data-row="${i}" style="text-align:left;font-size:13px;padding:10px 12px;border-radius:8px;border:1px solid var(--line);
          background:var(--surface);color:var(--ink-2);cursor:pointer">${esc(f.label)}</button>`).join('');
      const btns = [...rowsEl.querySelectorAll('button')];

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

  // ---------- 2. twist_mux: ai đang thắng trong /cmd_vel ----------
  defineScene('twist-mux-priority', {
    title: 'twist_mux: nguồn nào đang thắng',
    caption: 'Đúng priority/timeout thật của Atlas. Bấm để BẬT một nguồn — giống hệt một node thật đang publish liên tục, không tự tắt sau 0.5s. Bật nhiều nguồn cùng lúc để thấy rõ nguồn priority cao hơn giành quyền ngay lập tức, không cần canh giờ. Tắt một nguồn để xem đúng cơ chế timeout: thanh ngang rút dần trong 0.5s trước khi quyền điều khiển nhường lại cho nguồn khác, giống hệt khi node thật ngừng publish. Robot phía dưới luôn chuyển động theo đúng lệnh của nguồn ĐANG thắng; viền thân + viền bánh đổi màu theo đúng nguồn đó. Lệnh của joystick lấy đúng scale_linear.x/scale_angular.yaw thật trong joystick_teleop.yaml; collision_detect gửi lệnh dừng (0,0) đúng ý nghĩa action_type=stop; magnetic/navigation là lệnh minh họa vì 2 package đó chưa tồn tại.',
    setup({ stage, ui }) {
      const SOURCES = [
        { key: 'magnetic', label: 'magnetic (line-follower)', topic: 'cmd_vel_mag', priority: 10, declared: null, timeout: 0.5, color: '#64748b', cmd: { lin: 0.15, ang: 0.1 } },
        { key: 'navigation', label: 'navigation (Nav2)', topic: 'cmd_vel_nav', priority: 50, declared: null, timeout: 0.5, color: '#7c3aed', cmd: { lin: 0.25, ang: -0.2 } },
        { key: 'joystick', label: 'joystick', topic: 'cmd_vel_joy', priority: 100, declared: null, timeout: 0.5, color: '#2563eb', cmd: { lin: 0.2, ang: 0.5 } },
        { key: 'collision_detect', label: 'collision_detect', topic: 'cmd_vel_collision', priority: 255, declared: 1000, timeout: 0.5, color: '#dc2626', cmd: { lin: 0, ang: 0 } },
      ];
      const IDLE_COLOR = '#94a3b8';

      // Robot 2D -- kỹ thuật y hệt scene diff-drive-kinematics (Module 5): vạch trên bánh
      // trượt theo đúng quãng đường đã lăn, thân tự xoay theo angular.z tích luỹ theo thời gian.
      const SEP = 0.30, RAD = 0.05;
      const CX = 230, CY = 110, SCALE = 260;
      const bodyW = 0.30 * SCALE, bodyH = 0.24 * SCALE;
      const wheelLen = 0.10 * SCALE, wheelWid = 0.035 * SCALE;
      const wlY = -(SEP / 2) * SCALE, wrY = (SEP / 2) * SCALE;
      const N_TICKS = 4;
      const tickXs = Array.from({ length: N_TICKS }, (_, i) => (i / N_TICKS - 0.5) * wheelLen);
      function wheelMarkup(key, y) {
        const ticks = tickXs.map((x, i) => `<line data-k="${key}t${i}" x1="0" y1="${y - wheelWid / 2}" x2="0" y2="${y + wheelWid / 2}" stroke="#ffffff" stroke-width="1.6" opacity="0.9"/>`).join('');
        return `<g>
          <rect data-k="${key}" x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}" rx="2" fill="${IDLE_COLOR}"/>
          <clipPath id="${key}-clip-mux"><rect x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}"/></clipPath>
          <g clip-path="url(#${key}-clip-mux)">${ticks}</g>
        </g>`;
      }

      stage.innerHTML = `
        <div data-k="rows" style="display:flex;flex-direction:column;gap:10px"></div>
        <div class="stat" data-k="winner" style="margin-top:12px;font-weight:700;font-size:15px"></div>
        <svg class="svg" viewBox="0 0 460 210" role="img" aria-label="Robot 2D chuyển động theo đúng lệnh của nguồn đang thắng" style="margin-top:10px">
          <text class="lbl-sm" x="${CX}" y="18" text-anchor="middle">tiến (X) →</text>
          <g data-k="rig" transform="translate(${CX},${CY})">
            <rect data-k="body" x="${-bodyW / 2}" y="${-bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="8" fill="var(--surface-2)" stroke="${IDLE_COLOR}" stroke-width="3"/>
            <line x1="0" y1="${-bodyH / 2}" x2="0" y2="${-bodyH / 2 - 10}" stroke="var(--brand)" stroke-width="2"/>
            ${wheelMarkup('wl', wlY)}
            ${wheelMarkup('wr', wrY)}
          </g>
          <text class="stat-note" data-k="activeLabel" x="${CX}" y="195" text-anchor="middle" style="font-weight:700"></text>
        </svg>`;
      ui.innerHTML = '';

      stage.querySelector('[data-k="rows"]').innerHTML = SOURCES.map((s) => `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="min-width:220px">
            <b style="color:${s.color}">${esc(s.label)}</b><br>
            <span class="lbl-sm">${esc(s.topic)} · priority ${s.priority}${s.declared ? ` (khai ${s.declared}, bị kẹp về 255)` : ''} · lệnh: linear.x=${s.cmd.lin}, angular.z=${s.cmd.ang}</span>
          </div>
          <div style="flex:1;min-width:120px;height:10px;border-radius:6px;background:var(--surface-2);overflow:hidden">
            <div data-k="bar-${s.key}" style="height:100%;width:0%;background:var(--brand);transition:background .15s"></div>
          </div>
          <button class="btn-sm" data-k="send-${s.key}" style="min-width:150px">Bật nguồn</button>
        </div>`).join('');

      const remaining = {};
      const publishing = {};
      SOURCES.forEach((s) => { remaining[s.key] = 0; publishing[s.key] = false; });
      const winnerEl = stage.querySelector('[data-k="winner"]');
      const rig = stage.querySelector('[data-k="rig"]');
      const bodyEl = stage.querySelector('[data-k="body"]');
      const wlEl = stage.querySelector('[data-k="wl"]');
      const wrEl = stage.querySelector('[data-k="wr"]');
      const activeLabelEl = stage.querySelector('[data-k="activeLabel"]');
      const ticksL = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wlt${i}"]`));
      const ticksR = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wrt${i}"]`));

      function placeTicks(ticks, phase) {
        ticks.forEach((el, i) => {
          let x = tickXs[i] + phase;
          x = ((x + wheelLen / 2) % wheelLen + wheelLen) % wheelLen - wheelLen / 2;
          el.setAttribute('x1', x.toFixed(1));
          el.setAttribute('x2', x.toFixed(1));
        });
      }

      SOURCES.forEach((s) => {
        const btn = stage.querySelector(`[data-k="send-${s.key}"]`);
        btn.addEventListener('click', () => {
          publishing[s.key] = !publishing[s.key];
          if (publishing[s.key]) remaining[s.key] = s.timeout; // tin đầu tiên tới ngay khi bật
          btn.textContent = publishing[s.key] ? 'Đang publish — Tắt' : 'Bật nguồn';
          btn.style.background = publishing[s.key] ? s.color : '';
          btn.style.borderColor = publishing[s.key] ? s.color : '';
          btn.style.color = publishing[s.key] ? '#fff' : '';
        });
      });

      const robotState = { bodyAngle: 0, phaseL: 0, phaseR: 0 };

      function render() {
        let winner = null;
        SOURCES.forEach((s) => {
          const bar = stage.querySelector(`[data-k="bar-${s.key}"]`);
          const active = remaining[s.key] > 0;
          const pct = active ? (remaining[s.key] / s.timeout) * 100 : 0;
          bar.style.width = pct.toFixed(0) + '%';
          bar.style.background = active ? 'var(--ok)' : 'var(--surface-2)';
          if (active && (winner === null || s.priority > winner.priority)) winner = s;
        });
        if (winner) {
          winnerEl.innerHTML = `/cmd_vel đang lấy từ: <span style="color:${winner.color}">${esc(winner.label)}</span> (priority ${winner.priority})`;
          activeLabelEl.textContent = `robot đang theo lệnh: ${winner.label}`;
          activeLabelEl.style.fill = winner.color;
          bodyEl.setAttribute('stroke', winner.color);
          wlEl.setAttribute('fill', winner.color);
          wrEl.setAttribute('fill', winner.color);
        } else {
          winnerEl.innerHTML = `Không nguồn nào còn trong hạn — twist_mux không có gì để chuyển tiếp ra /cmd_vel`;
          winnerEl.style.color = 'var(--muted)';
          activeLabelEl.textContent = 'robot đứng yên — không nguồn nào thắng';
          activeLabelEl.style.fill = 'var(--muted)';
          bodyEl.setAttribute('stroke', IDLE_COLOR);
          wlEl.setAttribute('fill', IDLE_COLOR);
          wrEl.setAttribute('fill', IDLE_COLOR);
        }
        return winner;
      }
      render();

      return {
        reset() {
          SOURCES.forEach((s) => {
            remaining[s.key] = 0;
            publishing[s.key] = false;
            const btn = stage.querySelector(`[data-k="send-${s.key}"]`);
            btn.textContent = 'Bật nguồn';
            btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = '';
          });
          robotState.bodyAngle = 0; robotState.phaseL = 0; robotState.phaseR = 0;
          render();
          rig.setAttribute('transform', `translate(${CX},${CY})`);
          placeTicks(ticksL, 0); placeTicks(ticksR, 0);
        },
        update(dt) {
          // Nguồn đang "bật" coi như publish liên tục -- tin luôn mới, không bao giờ hết hạn.
          // Nguồn vừa tắt thì rút dần đúng timeout 0.5s, y hệt khi 1 node thật ngừng publish.
          SOURCES.forEach((s) => {
            remaining[s.key] = publishing[s.key] ? s.timeout : Math.max(0, remaining[s.key] - dt);
          });
          const winner = render();
          const lin = winner ? winner.cmd.lin : 0, ang = winner ? winner.cmd.ang : 0;
          const vL = lin - ang * (SEP / 2), vR = lin + ang * (SEP / 2);
          robotState.bodyAngle += ang * dt;
          robotState.phaseL += vL * SCALE * dt;
          robotState.phaseR += vR * SCALE * dt;
          rig.setAttribute('transform', `translate(${CX},${CY}) rotate(${(robotState.bodyAngle * 180 / Math.PI).toFixed(1)})`);
          placeTicks(ticksL, robotState.phaseL);
          placeTicks(ticksR, robotState.phaseR);
        },
      };
    },
  });

  // ---------- 3. collision_monitor: 2 vùng đa giác thật, vật cản ở đâu thì action nào ----------
  defineScene('collision-zones', {
    title: 'Vật cản ở đâu → action_type nào',
    caption: 'Hình chữ nhật trong (đỏ nét đứt) là PolygonStop, ngoài (cam nét đứt) là PolygonSlow -- đúng toạ độ thật trong collision_monitor.yaml. Robot vẽ đúng kích thước thật (0.30 × 0.24m), bánh xe quay đúng tốc độ thật phản ứng theo action_type: DO_NOTHING quay bình thường, SLOWDOWN còn đúng 50% (slowdown_ratio thật trong file), STOP đứng khựng lại ngay.',
    setup({ stage, ui }) {
      const CX = 230, CY = 175, SCALE = 300;
      const bodyW = 0.30 * SCALE, bodyH = 0.24 * SCALE;
      const STOP = { x: 0.20, y: 0.17 }, SLOW = { x: 0.30, y: 0.27 };
      const SEP = 0.30, BASE_SPEED = 0.3, SLOWDOWN_RATIO = 0.5; // đúng wheel_separation + slowdown_ratio thật

      // Bánh xe có vạch trượt -- kỹ thuật y hệt scene diff-drive-kinematics (Module 5).
      const wheelLen = 0.10 * SCALE, wheelWid = 0.035 * SCALE;
      const wlY = -(SEP / 2) * SCALE, wrY = (SEP / 2) * SCALE;
      const N_TICKS = 4;
      const tickXs = Array.from({ length: N_TICKS }, (_, i) => (i / N_TICKS - 0.5) * wheelLen);
      function wheelMarkup(key, y) {
        const ticks = tickXs.map((x, i) => `<line data-k="${key}t${i}" x1="0" y1="${y - wheelWid / 2}" x2="0" y2="${y + wheelWid / 2}" stroke="#ffffff" stroke-width="1.6" opacity="0.9"/>`).join('');
        return `<g>
          <rect data-k="${key}" x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}" rx="2" fill="var(--ok)"/>
          <clipPath id="${key}-clip-cz"><rect x="${-wheelLen / 2}" y="${y - wheelWid / 2}" width="${wheelLen}" height="${wheelWid}"/></clipPath>
          <g clip-path="url(#${key}-clip-cz)">${ticks}</g>
        </g>`;
      }

      stage.innerHTML = `<svg class="svg" viewBox="0 0 460 350" role="img" aria-label="2 vùng đa giác an toàn quanh robot, vật cản di chuyển được, bánh xe quay theo action_type">
        <text class="lbl-sm" x="${CX}" y="18" text-anchor="middle">tiến (X) →</text>
        <rect x="${CX - SLOW.x * SCALE}" y="${CY - SLOW.y * SCALE}" width="${SLOW.x * 2 * SCALE}" height="${SLOW.y * 2 * SCALE}" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 5"/>
        <rect x="${CX - STOP.x * SCALE}" y="${CY - STOP.y * SCALE}" width="${STOP.x * 2 * SCALE}" height="${STOP.y * 2 * SCALE}" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 5"/>
        <g data-k="rig" transform="translate(${CX},${CY})">
          <rect x="${-bodyW / 2}" y="${-bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="6" class="node-box-rect"/>
          <line x1="0" y1="${-bodyH / 2}" x2="0" y2="${-bodyH / 2 - 10}" stroke="var(--brand)" stroke-width="2"/>
          ${wheelMarkup('wl', wlY)}
          ${wheelMarkup('wr', wrY)}
        </g>
        <circle data-k="obs" r="8" class="pkt-retry"/>
      </svg>
      <div class="stat" data-k="stat" style="margin-top:6px"></div>
      <div class="stat" data-k="relay" style="margin-top:2px"></div>`;
      ui.innerHTML = `
        <label class="ctl">vật cản: x <input type="range" min="-0.6" max="0.9" step="0.01" value="0.5" data-k="ox"> <span data-k="oxv"></span> m</label>
        <label class="ctl">y <input type="range" min="-0.5" max="0.5" step="0.01" value="0" data-k="oy"> <span data-k="oyv"></span> m</label>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const obsEl = stage.querySelector('[data-k="obs"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const relayEl = stage.querySelector('[data-k="relay"]');
      const wlEl = stage.querySelector('[data-k="wl"]');
      const wrEl = stage.querySelector('[data-k="wr"]');
      const ticksL = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wlt${i}"]`));
      const ticksR = Array.from({ length: N_TICKS }, (_, i) => stage.querySelector(`[data-k="wrt${i}"]`));

      function placeTicks(ticks, phase) {
        ticks.forEach((el, i) => {
          let x = tickXs[i] + phase;
          x = ((x + wheelLen / 2) % wheelLen + wheelLen) % wheelLen - wheelLen / 2;
          el.setAttribute('x1', x.toFixed(1));
          el.setAttribute('x2', x.toFixed(1));
        });
      }

      let phase = 0;

      function render() {
        const ox = Number(q('ox').value), oy = Number(q('oy').value);
        q('oxv').textContent = ox.toFixed(2);
        q('oyv').textContent = oy.toFixed(2);
        obsEl.setAttribute('cx', (CX + ox * SCALE).toFixed(1));
        obsEl.setAttribute('cy', (CY - oy * SCALE).toFixed(1));

        const inStop = Math.abs(ox) <= STOP.x && Math.abs(oy) <= STOP.y;
        const inSlow = !inStop && Math.abs(ox) <= SLOW.x && Math.abs(oy) <= SLOW.y;
        let action = 'DO_NOTHING', color = 'var(--ok)', polygon = '(không vào vùng nào)', speed = BASE_SPEED;
        if (inStop) { action = 'STOP'; color = 'var(--bad)'; polygon = 'PolygonStop'; speed = 0; }
        else if (inSlow) { action = 'SLOWDOWN (còn 50% tốc độ)'; color = 'var(--warn)'; polygon = 'PolygonSlow'; speed = BASE_SPEED * SLOWDOWN_RATIO; }

        obsEl.style.fill = inStop ? 'var(--bad)' : inSlow ? 'var(--warn)' : '';
        statEl.innerHTML = `collision_monitor_state: polygon=<b>${polygon}</b> · action_type=<b style="color:${color}">${action}</b>`;
        const active = action !== 'DO_NOTHING';
        relayEl.innerHTML = active
          ? `<span style="color:var(--bad)">collision_guard_relay: ĐANG forward sang /cmd_vel_collision (priority 255, bài 3)</span>`
          : `<span style="color:var(--muted)">collision_guard_relay: im lặng, không forward gì -- joystick/nav hoạt động bình thường</span>`;

        wlEl.setAttribute('fill', color);
        wrEl.setAttribute('fill', color);
        return speed;
      }
      q('ox').addEventListener('input', render);
      q('oy').addEventListener('input', render);
      render();

      return {
        reset() {
          phase = 0;
          placeTicks(ticksL, 0); placeTicks(ticksR, 0);
          render();
        },
        update(dt) {
          const speed = render();
          phase += speed * SCALE * dt;
          placeTicks(ticksL, phase);
          placeTicks(ticksR, phase);
        },
      };
    },
  });

  // ---------- 4. collision_guard_relay: chuỗi đầy đủ, từ /scan tới /cmd_vel ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết: cột giữa chứa các khối nối
  // tiếp, 2 khối state/cmd_vel_monitor_out tách sang 2 bên rồi hội tụ lại -- không đoạn
  // nào cắt qua khối không liên quan, không đoạn nào trùng đoạn nào.
  defineScene('collision-guard-pipeline', {
    title: 'Toàn bộ chuỗi: từ /scan tới /cmd_vel',
    caption: 'collision_guard_relay theo dõi CẢ 2: /collision_monitor_state (biết KHI NÀO cần quan tâm) và /cmd_vel_monitor_out (biết FORWARD CÁI GÌ) -- chỉ khi cả 2 đúng mới ghi ra /cmd_vel_collision. Nét đứt chảy trên mọi đường vì toàn bộ đều là topic ROS 2 thật, publish liên tục.',
    setup({ stage }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 420 580" role="img" aria-label="Chuỗi collision_guard_relay từ /scan tới /cmd_vel">
          <g data-id="n-scan"><rect x="130" y="10" width="160" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="35" style="font-size:11px">/scan</text></g>
          <line data-id="e-scan-monitor" x1="210" y1="50" x2="210" y2="80" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-monitor"><rect x="130" y="80" width="160" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="105" style="font-size:10px">collision_monitor</text></g>

          <polyline data-id="e-monitor-state" points="210,120 210,140 105,140 105,160" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-monitor-out" points="210,120 210,140 315,140 315,160" fill="none" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-state"><rect x="20" y="160" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="105" y="182" style="font-size:9px">/collision_monitor_state</text><text class="lbl-sm" x="105" y="198">action_type</text></g>
          <g data-id="n-out"><rect x="230" y="160" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="315" y="190" style="font-size:9px">/cmd_vel_monitor_out</text></g>

          <polyline data-id="e-state-relay" points="105,210 105,230 210,230 210,250" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-out-relay" points="315,210 315,230 210,230 210,250" fill="none" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-relay"><rect x="130" y="250" width="160" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="272" style="font-size:9.5px">collision_guard_relay</text><text class="lbl-sm" x="210" y="288">chỉ forward khi action_type ≠ DO_NOTHING</text></g>

          <line data-id="e-relay-cmdcol" x1="210" y1="300" x2="210" y2="370" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-cmdcol"><rect x="130" y="370" width="160" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="392" style="font-size:8.5px">/cmd_vel_collision</text><text class="lbl-sm" x="210" y="404">priority 255</text></g>

          <line data-id="e-cmdcol-mux" x1="210" y1="410" x2="210" y2="440" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-mux"><rect x="130" y="440" width="160" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="465" style="font-size:11px">twist_mux</text></g>

          <line data-id="e-mux-cmdvel" x1="210" y1="480" x2="210" y2="510" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-cmdvel"><rect x="130" y="510" width="160" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="210" y="535" style="font-size:11px">/cmd_vel</text></g>
        </svg>`;
      const svg = stage.querySelector('svg');
      const FLOW_IDS = ['e-scan-monitor', 'e-monitor-state', 'e-monitor-out', 'e-state-relay', 'e-out-relay', 'e-relay-cmdcol', 'e-cmdcol-mux', 'e-mux-cmdvel'];
      FLOW_IDS.forEach((id) => {
        const el = svg.querySelector(`[data-id="${id}"]`);
        el.setAttribute('stroke', '#2563eb');
        el.setAttribute('stroke-width', '3');
        el.setAttribute('stroke-dasharray', '8 7');
      });
      const FLOW_SPEED = 55;
      let dashPhase = 0;
      return {
        reset() { dashPhase = 0; },
        update(dt) {
          dashPhase -= FLOW_SPEED * dt;
          FLOW_IDS.forEach((id) => svg.querySelector(`[data-id="${id}"]`).setAttribute('stroke-dashoffset', dashPhase.toFixed(1)));
        },
      };
    },
  });
})();
