// Mô hình chuyển động cho Module 2 (TF2 & tọa độ).
(function () {
  const { defineScene } = window.Atlas;
  const NS = 'http://www.w3.org/2000/svg';
  const lerp = (a, b, t) => a + (b - a) * t;

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  // ---------- 1. Frame & Transform: kéo thả, hoặc tự xoay như tf_broadcaster.py ----------
  defineScene('frame-transform', {
    title: 'Transform: frame con cách frame cha bao nhiêu, xoay hướng nào',
    caption: 'Kéo thanh trượt để đổi độ lệch (translation) và góc xoay (yaw). Bật "Tự xoay" để xem đúng công thức x=R·cos(t), y=R·sin(t) trong tf_broadcaster.py — một transform ĐỘNG, publish liên tục.',
    setup({ stage, ui }) {
      const ORIGIN = { x: 170, y: 230 };
      const SCALE = 70;
      const AX = 56;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 300" role="img" aria-label="Frame cha cố định bên trái, frame con di chuyển theo transform">
          <defs>
            <marker id="fa-x" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z" fill="#dc2626"/></marker>
            <marker id="fa-y" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z" fill="#059669"/></marker>
          </defs>
          <line class="chan" data-k="link" x1="0" y1="0" x2="0" y2="0"/>
          <g data-k="parent"></g>
          <g data-k="child"></g>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">x (m) <input type="range" min="-2" max="2" step="0.1" value="1.6" data-k="x"></label>
        <label class="ctl">y (m) <input type="range" min="-1.5" max="1.5" step="0.1" value="-0.9" data-k="y"></label>
        <label class="ctl">yaw (°) <input type="range" min="-180" max="180" step="5" value="30" data-k="yaw"></label>
        <label class="ctl"><input type="checkbox" data-k="auto"> Tự xoay (như transform động)</label>
        <div class="stat" data-k="readout"></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const link = stage.querySelector('[data-k="link"]');
      const parentG = stage.querySelector('[data-k="parent"]');
      const childG = stage.querySelector('[data-k="child"]');

      function drawAxes(g, cx, cy, angle, label) {
        const x2 = cx + AX * Math.cos(angle), y2 = cy - AX * Math.sin(angle);
        const x2y = cx + AX * Math.cos(angle + Math.PI / 2), y2y = cy - AX * Math.sin(angle + Math.PI / 2);
        g.innerHTML = `
          <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#dc2626" stroke-width="3" marker-end="url(#fa-x)"/>
          <line x1="${cx}" y1="${cy}" x2="${x2y}" y2="${y2y}" stroke="#059669" stroke-width="3" marker-end="url(#fa-y)"/>
          <circle cx="${cx}" cy="${cy}" r="6"/>
          <text class="node-name" x="${cx}" y="${cy - 14}">${label}</text>`;
      }

      let t = 0;
      function render() {
        const auto = q('auto').checked;
        ['x', 'y', 'yaw'].forEach((k) => { q(k).disabled = auto; });
        let x, y, yawDeg;
        if (auto) {
          const R = 1.3;
          x = R * Math.cos(t); y = R * Math.sin(t); yawDeg = (t * 180) / Math.PI;
        } else {
          x = Number(q('x').value); y = Number(q('y').value); yawDeg = Number(q('yaw').value);
        }
        const yawRad = (yawDeg * Math.PI) / 180;
        const cx = ORIGIN.x + x * SCALE, cy = ORIGIN.y - y * SCALE;
        drawAxes(parentG, ORIGIN.x, ORIGIN.y, 0, 'parent');
        drawAxes(childG, cx, cy, yawRad, 'child');
        link.setAttribute('x1', ORIGIN.x); link.setAttribute('y1', ORIGIN.y);
        link.setAttribute('x2', cx); link.setAttribute('y2', cy);
        const qz = Math.sin(yawRad / 2), qw = Math.cos(yawRad / 2);
        q('readout').innerHTML =
          `transform cha→con: x=<b>${x.toFixed(2)}</b> m, y=<b>${y.toFixed(2)}</b> m, yaw=<b>${yawDeg.toFixed(0)}°</b>` +
          ` &nbsp;·&nbsp; quaternion z=${qz.toFixed(3)}, w=${qw.toFixed(3)}`;
      }
      ui.querySelectorAll('input').forEach((el) => el.addEventListener('input', render));

      return {
        reset() { t = 0; render(); },
        update(dt) {
          if (q('auto').checked) { t += dt * 0.8; render(); }
        },
      };
    },
  });

  // ---------- 2. TF tree: đi ngược lên tổ tiên chung để ghép transform ----------
  // Ma trận đồng nhất 3x3 cho transform 2D (x, y, yaw) -- đúng toán học tf2 dùng bên dưới,
  // chỉ rút gọn về 2D (bỏ z và dùng góc yaw thay quaternion) để nhân tay cho dễ theo dõi.
  function mat2d(x, y, yawDeg) {
    const r = (yawDeg * Math.PI) / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return [[c, -s, x], [s, c, y], [0, 0, 1]];
  }
  function matMul3(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    }
    return C;
  }
  function matInv3(T) {
    const c = T[0][0], s = T[1][0], x = T[0][2], y = T[1][2];
    return [[c, s, -(c * x + s * y)], [-s, c, s * x - c * y], [0, 0, 1]];
  }
  function fmtMat(T) {
    const n = (v) => (v >= 0 ? ' ' : '') + v.toFixed(2);
    return T.map((row) => `[ ${row.map(n).join('  ')} ]`).join('\n');
  }
  function decompose(T) {
    return { x: T[0][2], y: T[1][2], yaw: (Math.atan2(T[1][0], T[0][0]) * 180) / Math.PI };
  }

  defineScene('tf-lookup', {
    title: 'lookup_transform() đi qua tổ tiên chung thế nào',
    caption: 'Cây ví dụ CHUNG (không phải robot Atlas) — giữ dành cho bài tập cuối module. Vị trí hộp chỉ để vẽ cây cho dễ nhìn, KHÔNG phải tọa độ thật — số liệu transform thật nằm trong bảng "T" của mỗi frame. Đường NÉT ĐỨT là transform tĩnh (/tf_static), đường LIỀN là transform động (/tf).',
    setup({ stage, ui }) {
      const NODES = {
        robot_base: { x: 320, y: 50, parent: null },
        arm_base: { x: 170, y: 160, parent: 'robot_base', dyn: true, T: { x: -1.3, y: 0.6, yaw: 20 } },
        camera_mount: { x: 470, y: 160, parent: 'robot_base', dyn: false, T: { x: 1.2, y: 0.7, yaw: -15 } },
        gripper: { x: 170, y: 270, parent: 'arm_base', dyn: true, T: { x: 0.0, y: 1.0, yaw: -30 } },
      };
      const EDGES = Object.entries(NODES).filter(([, n]) => n.parent).map(([id, n]) => ({ from: n.parent, to: id, dyn: n.dyn }));

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 310" role="img" aria-label="Cây TF ví dụ: robot_base, arm_base, camera_mount, gripper">
          <g class="dyn-edges"></g>
          <g class="dyn-walk"></g>
          <g>${Object.entries(NODES).map(([id, n]) => `
            <g class="node-box" data-id="${id}">
              <rect x="${n.x - 68}" y="${n.y - 24}" width="136" height="48" rx="10"/>
              <text class="node-name" x="${n.x}" y="${n.y + 5}">${id}</text>
            </g>`).join('')}</g>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">Từ <select data-k="from"></select></label>
        <label class="ctl">Đến <select data-k="to"></select></label>
        <button class="btn-sm" data-k="go">Tìm transform</button>
        <label class="ctl"><input type="checkbox" data-k="showMath" checked> Hiện phép nhân ma trận</label>
        <div class="stat" data-k="log"></div>
        <pre class="flow-code" data-k="math" style="white-space:pre"></pre>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const edgesG = stage.querySelector('.dyn-edges');
      const walkG = stage.querySelector('.dyn-walk');
      const ids = Object.keys(NODES);
      ['from', 'to'].forEach((k) => {
        q(k).innerHTML = ids.map((id) => `<option value="${id}">${id}</option>`).join('');
      });
      q('from').value = 'gripper'; q('to').value = 'camera_mount';
      q('showMath').addEventListener('change', () => {
        q('math').style.display = q('showMath').checked ? '' : 'none';
      });

      function drawEdges() {
        edgesG.innerHTML = EDGES.map((e) => {
          const a = NODES[e.from], b = NODES[e.to];
          return `<line stroke="${e.dyn ? '#2563eb' : '#64748b'}" stroke-width="${e.dyn ? 3 : 2.5}"
                    stroke-dasharray="${e.dyn ? '0' : '6 5'}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        }).join('');
      }

      function pathToRoot(id) {
        const path = [];
        let cur = id;
        while (cur) { path.push(cur); cur = NODES[cur].parent; }
        return path;
      }

      let busy = false;
      q('go').addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        walkG.innerHTML = '';
        const from = q('from').value, to = q('to').value;
        if (from === to) { q('log').textContent = 'Chọn 2 frame khác nhau.'; busy = false; return; }
        const upFrom = pathToRoot(from), upTo = pathToRoot(to);
        const setTo = new Set(upTo);
        let lca = upFrom.find((n) => setTo.has(n));
        const down = upTo.slice(0, upTo.indexOf(lca)).reverse();
        const chain = [...upFrom.slice(0, upFrom.indexOf(lca) + 1), ...down];

        q('log').textContent = `Đi ngược từ "${from}" lên tổ tiên chung "${lca}", rồi đi xuống "${to}"…`;
        let M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        q('math').textContent = `Bắt đầu: M = I (ma trận đơn vị, vì đang đứng tại chính "${from}")`;
        for (let i = 0; i < chain.length - 1; i++) {
          const curId = chain[i], nextId = chain[i + 1];
          const a = NODES[curId], b = NODES[nextId];
          const dot = svgEl('circle', { cx: a.x, cy: a.y, r: 7, class: 'pkt-retry' }, walkG);
          const t0 = Date.now();
          await new Promise((resolve) => {
            const step = () => {
              const p = Math.min(1, (Date.now() - t0) / 550);
              dot.setAttribute('cx', lerp(a.x, b.x, p));
              dot.setAttribute('cy', lerp(a.y, b.y, p));
              if (p < 1 && walkG.isConnected) setTimeout(step, 16); else resolve();
            };
            step();
          });
          svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#ea580c', 'stroke-width': 3 }, walkG);

          const goingUp = NODES[curId].parent === nextId;
          const edgeT = goingUp ? NODES[curId].T : NODES[nextId].T;
          const step3 = goingUp ? matInv3(mat2d(edgeT.x, edgeT.y, edgeT.yaw)) : mat2d(edgeT.x, edgeT.y, edgeT.yaw);
          M = matMul3(M, step3);
          const label = goingUp
            ? `Bước ${i + 1}/${chain.length - 1}: đi NGƯỢC ${curId} → ${nextId} ⇒ nhân với T(${nextId}→${curId})⁻¹`
            : `Bước ${i + 1}/${chain.length - 1}: đi XUÔI ${curId} → ${nextId} ⇒ nhân với T(${curId}→${nextId})`;
          q('math').textContent =
            `${label}\n\n${fmtMat(step3)}\n\n` +
            `Tích lũy M = T(${from}→${nextId}) sau bước này:\n${fmtMat(M)}`;
          await new Promise((r) => setTimeout(r, 250));
        }
        const d = decompose(M);
        q('log').textContent = `Ghép ${chain.length - 1} transform liên tiếp ⇒ tính được "${from}" → "${to}", dù 2 frame không nối trực tiếp.`;
        q('math').textContent += `\n\n⇒ T(${from}→${to}) rút ra từ M: x=${d.x.toFixed(2)} m, y=${d.y.toFixed(2)} m, yaw=${d.yaw.toFixed(1)}°`;
        busy = false;
      });

      return {
        reset() {
          drawEdges(); walkG.innerHTML = ''; q('log').textContent = '';
          q('math').textContent = ''; q('math').style.display = q('showMath').checked ? '' : 'none';
        },
      };
    },
  });

  // ---------- 3. REP-105: map→odom nhảy bậc vs odom→base_link mượt ----------
  defineScene('rep105-timeline', {
    title: 'map→odom nhảy bậc, odom→base_link mượt',
    caption: 'Robot đi qua lại (đường xám đứt = vị trí thật). odom (cam) trôi dần theo thời gian — sai số cộng dồn, không tự sửa. Vị trí trong map (xanh) bám theo odom nhưng được "sửa" định kỳ — mỗi lần sửa là 1 cú NHẢY trong transform map→odom.',
    setup({ stage, ui }) {
      const W = 640, H = 230, PAD = 36;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ vị trí theo thời gian: thật, odom trôi dần, map được sửa định kỳ">
          <g class="dyn-grid"></g>
          <g class="dyn-lines"></g>
          <g class="dyn-flash"></g>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl"><input type="checkbox" data-k="auto" checked> Tự động sửa mỗi ~4s</label>
        <button class="btn-sm" data-k="fix">Buộc sửa ngay</button>
        <div class="stat" data-k="stat"></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const gridG = stage.querySelector('.dyn-grid');
      const linesG = stage.querySelector('.dyn-lines');
      const flashG = stage.querySelector('.dyn-flash');

      const WINDOW = 12;
      let pts, t, drift, correctionOffset, corrections, flashes, nextAuto;

      function doCorrection() {
        const last = pts[pts.length - 1];
        correctionOffset = last.odom - last.true;
        corrections++;
        flashes.push({ t: last.t, life: 0.7 });
        render();
      }

      q('fix').addEventListener('click', doCorrection);

      function render() {
        const tMin = t - WINDOW;
        const visible = pts.filter((p) => p.t >= tMin);
        let vmin = Infinity, vmax = -Infinity;
        visible.forEach((p) => { [p.true, p.odom, p.map].forEach((v) => { vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }); });
        if (!isFinite(vmin)) { vmin = 0; vmax = 1; }
        const pad = (vmax - vmin) * 0.15 + 0.1;
        vmin -= pad; vmax += pad;
        const X = (pt) => PAD + ((pt - tMin) / WINDOW) * (W - PAD - 10);
        const Y = (v) => (H - 26) - ((v - vmin) / (vmax - vmin)) * (H - 46);

        gridG.innerHTML = `<line class="axis" x1="${PAD}" y1="${H - 26}" x2="${W - 10}" y2="${H - 26}"/>`;

        const line = (key, color, dash) => visible.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.t)},${Y(p[key])}`).join(' ');
        linesG.innerHTML = `
          <path d="${line('true')}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>
          <path d="${line('odom')}" fill="none" stroke="#ea580c" stroke-width="2.5"/>
          <path d="${line('map')}" fill="none" stroke="#2563eb" stroke-width="3"/>`;
        flashG.innerHTML = flashes.map((f) => `<line class="cursor" x1="${X(f.t)}" y1="20" x2="${X(f.t)}" y2="${H - 26}" opacity="${f.life / 0.7}"/>`).join('');
        const last = pts[pts.length - 1] || { odom: 0, true: 0 };
        q('stat').innerHTML = `Đã sửa: <b>${corrections}</b> lần · Lệch odom hiện tại: <b>${(last.odom - last.true).toFixed(2)}</b> m`;
      }

      return {
        reset() {
          pts = []; t = 0; drift = 0; correctionOffset = 0; corrections = 0; flashes = []; nextAuto = 4;
          for (let i = 0; i < 2; i++) pts.push({ t: 0, true: 1.5, odom: 1.5, map: 1.5 });
          render();
        },
        update(dt) {
          t += dt;
          drift += dt * 0.028;
          const trueVal = 1.5 + 1.3 * Math.sin(t * 0.45);
          const odomVal = trueVal + drift;
          const mapVal = odomVal - correctionOffset;
          pts.push({ t, true: trueVal, odom: odomVal, map: mapVal });
          while (pts.length && pts[0].t < t - WINDOW - 1) pts.shift();

          if (q('auto').checked) {
            nextAuto -= dt;
            if (nextAuto <= 0) { doCorrection(); nextAuto = 4; }
          }
          flashes.forEach((f) => { f.life -= dt; });
          flashes = flashes.filter((f) => f.life > 0);
          render();
        },
      };
    },
  });

  // ---------- 4. tf2_echo: frame động vs frame tĩnh ----------
  defineScene('tf2-echo-live', {
    title: 'tf2_echo: số liệu động vs tĩnh',
    caption: 'Hai lệnh tf2_echo chạy cùng lúc trên 2 transform khác nhau trong demo_tf.launch.py. Bên trái đổi liên tục (tf_broadcaster.py publish mỗi khung hình); bên phải không đổi (publish 1 lần, qua /tf_static).',
    setup({ stage }) {
      stage.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <pre class="flow-code" style="flex:1;min-width:260px" data-k="dyn"></pre>
          <pre class="flow-code" style="flex:1;min-width:260px" data-k="stat"></pre>
        </div>`;
      const dynEl = stage.querySelector('[data-k="dyn"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const fmt = (x, y, z, yawDeg) =>
        `$ ros2 run tf2_ros tf2_echo world moving_frame\n\n` +
        `Translation: [${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]\n` +
        `Rotation: yaw=${yawDeg.toFixed(1)}°\n` +
        `(đang cập nhật…)`;
      let t = 0;
      const staticText =
        `$ ros2 run tf2_ros tf2_echo world static_frame\n\n` +
        `Translation: [1.000, 0.000, 0.500]\n` +
        `Rotation: yaw=0.0°\n` +
        `(không đổi kể từ lúc publish)`;
      return {
        reset() { t = 0; statEl.textContent = staticText; dynEl.textContent = fmt(1.3, 0, 0, 0); },
        update(dt) {
          t += dt * 0.9;
          dynEl.textContent = fmt(1.3 * Math.cos(t), 1.3 * Math.sin(t), 0, (t * 180) / Math.PI);
        },
      };
    },
  });

  // ---------- 5. Bài tập: tự kiểm tra cây TF của Atlas ----------
  defineScene('tf-tree-builder', {
    title: 'Tự kiểm tra: cha của mỗi frame là gì?',
    caption: 'Chọn frame cha cho từng frame bên dưới. Đường màu xanh = đang trỏ đúng; đỏ = sai. Đây là 6 frame GẮN CỨNG trên khung Atlas (đúng tên dùng trong atlas_description/urdf/).',
    setup({ stage, ui }) {
      const FRAMES = ['left_wheel_link', 'right_wheel_link', 'front_caster_link', 'rear_caster_link', 'lidar_link', 'imu_link'];
      const ANSWER = Object.fromEntries(FRAMES.map((f) => [f, 'base_link']));
      const DEFAULT = { ...ANSWER, imu_link: 'lidar_link' }; // 1 lỗi cố ý, giống nhầm lẫn hay gặp

      const ROOT = { x: 320, y: 44 };
      const ROW_Y = 190;
      const xs = [60, 164, 268, 372, 476, 580]; // cách đều 104px, mỗi ô rộng 96 -> hở 8px
      const pos = Object.fromEntries(FRAMES.map((f, i) => [f, { x: xs[i], y: ROW_Y }]));
      pos.base_link = ROOT;

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 230" role="img" aria-label="Chọn cha cho từng frame, đường nối đổi màu theo đúng/sai">
          <rect x="${ROOT.x - 60}" y="${ROOT.y - 20}" width="120" height="40" rx="8" class="node-box-rect"/>
          <text class="node-name" x="${ROOT.x}" y="${ROOT.y + 5}">base_link</text>
          <g>${FRAMES.map((f) => `
            <g data-id="${f}">
              <rect x="${pos[f].x - 48}" y="${pos[f].y - 22}" width="96" height="44" rx="8" class="node-box-rect"/>
              <text class="node-name" x="${pos[f].x}" y="${pos[f].y - 2}" style="font-size:11px">${f.replace('_link', '')}</text>
              <text class="lbl-sm" x="${pos[f].x}" y="${pos[f].y + 13}">_link</text>
            </g>`).join('')}</g>
          <g class="dyn-edges"></g>
        </svg>`;
      ui.innerHTML = FRAMES.map((f) => `
        <label class="ctl">${f}
          <select data-f="${f}">
            <option value="base_link">base_link</option>
            ${FRAMES.filter((x) => x !== f).map((x) => `<option value="${x}">${x}</option>`).join('')}
          </select>
        </label>`).join('') +
        `<button class="btn-sm" data-k="check">Kiểm tra</button><div class="stat" data-k="result"></div>`;

      const edgesG = stage.querySelector('.dyn-edges');
      FRAMES.forEach((f) => { ui.querySelector(`[data-f="${f}"]`).value = DEFAULT[f]; });
      ui.querySelectorAll('select').forEach((sel) => sel.addEventListener('change', draw));
      ui.querySelector('[data-k="check"]').addEventListener('click', () => {
        let correct = 0;
        FRAMES.forEach((f) => { if (ui.querySelector(`[data-f="${f}"]`).value === ANSWER[f]) correct++; });
        ui.querySelector('[data-k="result"]').innerHTML = correct === FRAMES.length
          ? `✓ Đúng cả ${FRAMES.length}/${FRAMES.length} — khớp atlas_description/urdf/.`
          : `${correct}/${FRAMES.length} đúng — còn ${FRAMES.length - correct} frame trỏ sai cha (xem đường đỏ).`;
      });

      function draw() {
        edgesG.innerHTML = FRAMES.map((f) => {
          const parent = ui.querySelector(`[data-f="${f}"]`).value;
          const a = pos[f], b = pos[parent] || ROOT;
          const ok = parent === ANSWER[f];
          const color = ok ? '#059669' : '#dc2626';
          if (b === ROOT) {
            return `<line stroke="${color}" stroke-width="2.5" x1="${a.x}" y1="${a.y - 22}" x2="${b.x}" y2="${b.y + 20}"/>`;
          }
          // Cha là 1 frame cùng hàng: vẽ cong vồng lên trên thay vì đường ngang đi
          // xuyên qua các ô ở giữa -- đường thẳng sẽ trùng viền ô và bị ô vẽ đè lên.
          const topY = ROW_Y - 22;
          const dist = Math.abs(a.x - b.x);
          const arcH = Math.min(90, 34 + dist * 0.18);
          const midX = (a.x + b.x) / 2;
          return `<path d="M${a.x},${topY} Q${midX},${topY - arcH} ${b.x},${topY}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
        }).join('');
      }

      return { reset() { ui.querySelector('[data-k="result"]').textContent = ''; draw(); } };
    },
  });
})();
