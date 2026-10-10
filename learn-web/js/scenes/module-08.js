// Mô hình mô phỏng cho Module 8 (SLAM: scan matching, pose graph, loop closure, occupancy grid).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Bức tranh tổng thể: 3 nguồn vào, 2 ngả ra (1 topic thật, 1 nội bộ) ----------
  defineScene('slam-overview', {
    title: 'Bức tranh tổng thể: 3 nguồn vào, 2 ngả ra',
    caption: '3 đường nét liền bên trái là dữ liệu thật slam_toolbox đọc vào. Bên phải: /map là topic thật (nét đứt chảy, đúng chu kỳ map_update_interval=2s); pose graph là trạng thái NỘI BỘ -- viền đứt tĩnh, không chảy, vì nó không publish ra topic nào cả.',
    setup({ stage }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 660 320" role="img" aria-label="3 nguồn dữ liệu hội tụ vào slam_toolbox, toả ra /map thật và pose graph nội bộ">
          <g data-id="n-scan"><rect x="20" y="10" width="190" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="30" style="font-size:11px">/scan</text><text class="lbl-sm" x="115" y="44">Module 6</text></g>
          <g data-id="n-odom"><rect x="20" y="90" width="190" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="110" style="font-size:11px">/odom</text><text class="lbl-sm" x="115" y="124">Module 5</text></g>
          <g data-id="n-tf"><rect x="20" y="170" width="190" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="190" style="font-size:9.5px">TF odom → base_footprint</text><text class="lbl-sm" x="115" y="204">diff_drive_controller, Module 5</text></g>

          <polyline data-id="e-scan-slam" points="210,30 250,30 250,105" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-odom-slam" points="210,110 250,110 250,125" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-tf-slam" points="210,190 250,190 250,145" fill="none" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-slam"><rect x="250" y="95" width="160" height="60" rx="8" class="node-box-rect"/><text class="node-name" x="330" y="121" style="font-size:12px">slam_toolbox</text><text class="lbl-sm" x="330" y="138">mapper_params.yaml</text></g>

          <polyline data-id="e-slam-map" points="410,115 450,115 450,60 490,60" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-slam-pg" points="410,135 450,135 450,215 490,215" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>

          <g data-id="n-map"><rect x="490" y="40" width="150" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="565" y="60" style="font-size:10.5px">/map</text><text class="lbl-sm" x="565" y="74">occupancy grid, bài 5</text></g>
          <g data-id="n-pg"><rect x="490" y="195" width="150" height="50" rx="8" class="node-box-rect" stroke-dasharray="4 3" style="fill:var(--surface-2)"/><text class="node-name" x="565" y="216" style="font-size:9.5px">pose graph nội bộ</text><text class="lbl-sm" x="565" y="230">không publish ra topic</text></g>
        </svg>`;
      const svg = stage.querySelector('svg');
      const FLOW_IDS = ['e-scan-slam', 'e-odom-slam', 'e-tf-slam', 'e-slam-map'];
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

  // ---------- 1. Scan matching: kéo (dx, dy, dθ) cho tới khi 2 quét khớp ----------
  defineScene('scan-matching-align', {
    title: 'Scan matching: kéo cho tới khi khớp',
    caption: 'Quét A (xanh) cố định. Quét B (cam) là CÙNG góc tường đó nhìn từ vị trí robot đã dịch chuyển đi (dx, dy, dθ) — ẩn, chính là thứ scan matching phải tìm ra. Kéo 3 thanh để dịch quét B, xem sai số giảm dần. Giá trị ẩn đúng bằng ngưỡng minimum_travel_distance/heading thật (0.2m, 0.2rad).',
    setup({ stage, ui }) {
      // Góc tường L: 1 điểm góc + 2 cạnh tường (trục X và trục Y), đơn vị mét.
      const CORNER = [[0, 0]];
      for (let i = 1; i <= 6; i++) CORNER.push([i * 0.15, 0]);
      for (let i = 1; i <= 6; i++) CORNER.push([0, i * 0.15]);

      const TRUE_DX = 0.18, TRUE_DY = 0.08, TRUE_DTH = 0.2; // rad -- khớp minimum_travel_heading thật

      const SCALE = 160, OX = 150, OY = 300;
      const toPx = ([x, y]) => [OX + x * SCALE, OY - y * SCALE];
      const rot = ([x, y], th) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
      const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
      const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

      // Quét B trong hệ toạ độ cục bộ của nó (đã "nhìn thấy" góc tường từ vị trí dịch chuyển thật).
      const scanBLocal = CORNER.map((p) => rot(sub(p, [TRUE_DX, TRUE_DY]), -TRUE_DTH));

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 440 340" role="img" aria-label="Quét A cố định, quét B dịch chuyển theo 3 thanh kéo">
          <line x1="${OX}" y1="10" x2="${OX}" y2="330" stroke="var(--line)" stroke-width="1"/>
          <line x1="10" y1="${OY}" x2="430" y2="${OY}" stroke="var(--line)" stroke-width="1"/>
          <g data-k="ptsA"></g>
          <g data-k="ptsB"></g>
        </svg>
        <div class="stat" data-k="score" style="margin-top:10px;font-weight:700"></div>`;
      ui.innerHTML = `
        <label class="ctl">dx <input type="range" min="-30" max="30" step="1" value="0" data-k="dx"> <span data-k="dxv"></span> cm</label>
        <label class="ctl">dy <input type="range" min="-30" max="30" step="1" value="0" data-k="dy"> <span data-k="dyv"></span> cm</label>
        <label class="ctl">dθ <input type="range" min="-30" max="30" step="1" value="0" data-k="dth"> <span data-k="dthv"></span>°</label>
        <button class="btn-sm" data-k="answer">Đáp án</button>`;

      const ptsAEl = stage.querySelector('[data-k="ptsA"]');
      const ptsBEl = stage.querySelector('[data-k="ptsB"]');
      const scoreEl = stage.querySelector('[data-k="score"]');
      ptsAEl.innerHTML = CORNER.map((p) => { const [x, y] = toPx(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="pkt" style="fill:#2563eb"/>`; }).join('');
      ptsBEl.innerHTML = scanBLocal.map((_, i) => `<circle data-i="${i}" r="5" class="pkt" style="fill:#f59e0b;opacity:0.9"/>`).join('');
      const bCircles = [...ptsBEl.querySelectorAll('circle')];

      const dxEl = ui.querySelector('[data-k="dx"]'), dyEl = ui.querySelector('[data-k="dy"]'), dthEl = ui.querySelector('[data-k="dth"]');
      const dxvEl = ui.querySelector('[data-k="dxv"]'), dyvEl = ui.querySelector('[data-k="dyv"]'), dthvEl = ui.querySelector('[data-k="dthv"]');

      function render() {
        const dx = Number(dxEl.value) / 100, dy = Number(dyEl.value) / 100, dth = Number(dthEl.value) * Math.PI / 180;
        dxvEl.textContent = dxEl.value; dyvEl.textContent = dyEl.value; dthvEl.textContent = dthEl.value;
        let sumSq = 0;
        scanBLocal.forEach((p, i) => {
          const world = add(rot(p, dth), [dx, dy]);
          const [px, py] = toPx(world);
          bCircles[i].setAttribute('cx', px.toFixed(1));
          bCircles[i].setAttribute('cy', py.toFixed(1));
          const a = CORNER[i];
          sumSq += (world[0] - a[0]) ** 2 + (world[1] - a[1]) ** 2;
        });
        const rmse = Math.sqrt(sumSq / CORNER.length);
        const ok = rmse < 0.015;
        scoreEl.innerHTML = `Sai số (RMSE): <span style="color:${ok ? 'var(--ok)' : 'var(--ink)'}">${rmse.toFixed(3)} m</span>${ok ? ' — KHỚP, đúng là cùng 1 góc tường' : ''}`;
        bCircles.forEach((c) => c.style.opacity = ok ? '1' : '0.9');
      }
      [dxEl, dyEl, dthEl].forEach((el) => el.addEventListener('input', render));
      ui.querySelector('[data-k="answer"]').addEventListener('click', () => {
        dxEl.value = Math.round(TRUE_DX * 100);
        dyEl.value = Math.round(TRUE_DY * 100);
        dthEl.value = Math.round(TRUE_DTH * 180 / Math.PI);
        render();
      });
      render();

      return {
        reset() { dxEl.value = 0; dyEl.value = 0; dthEl.value = 0; render(); },
        update() {},
      };
    },
  });

  // ---------- 2. Pose graph: sai số tích lũy + đóng vòng lặp ----------
  defineScene('pose-graph-builder', {
    title: 'Xây pose graph — sai lệch tích lũy & đóng vòng lặp',
    caption: 'Mỗi lần bấm "Bước tiếp" robot đi một đoạn quanh 1 vòng chữ nhật, kèm sai số nhỏ (mô phỏng bánh trượt + lệch góc hệ thống). Đi hết 12 bước rồi bấm "Đóng vòng lặp": 1 cạnh constraint mới nối node cuối về node đầu, Ceres tối ưu lại TOÀN BỘ graph — mọi node dịch nhẹ, không chỉ 2 đầu cạnh.',
    setup({ stage, ui }) {
      const N = 12;
      // Đường chữ nhật "sạch" (sự thật), chia 12 điểm đều theo chu vi.
      const W = 2.0, H = 1.2, PERIM = 2 * (W + H), STEP = PERIM / N;
      function cleanAt(s) {
        s = ((s % PERIM) + PERIM) % PERIM;
        if (s <= W) return [s, 0];
        s -= W; if (s <= H) return [W, s];
        s -= H; if (s <= W) return [W - s, H];
        s -= W; return [0, H - s];
      }
      const clean = Array.from({ length: N }, (_, i) => cleanAt(i * STEP));

      // Drift hệ thống: mỗi bước, vector di chuyển bị xoay thêm 1 góc lệch tích lũy + phóng to nhẹ
      // -- đúng kiểu lỗi odometry thật (lệch góc quay + bánh trượt khiến đi xa hơn tưởng).
      const ROT_BIAS = 1.6 * Math.PI / 180, SCALE_BIAS = 1.012;
      const drifted = [clean[0].slice()];
      for (let i = 1; i < N; i++) {
        const v = [clean[i][0] - clean[i - 1][0], clean[i][1] - clean[i - 1][1]];
        const th = i * ROT_BIAS;
        const c = Math.cos(th), s = Math.sin(th);
        const vr = [(v[0] * c - v[1] * s) * SCALE_BIAS, (v[0] * s + v[1] * c) * SCALE_BIAS];
        drifted.push([drifted[i - 1][0] + vr[0], drifted[i - 1][1] + vr[1]]);
      }

      const SCALE = 110, OX = 60, OY = 260;
      const toPx = ([x, y]) => [OX + x * SCALE, OY - y * SCALE];

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 400 300" role="img" aria-label="Pose graph: node và cạnh, đóng vòng lặp sửa sai lệch">
          <g data-k="edges"></g>
          <g data-k="loopEdge"></g>
          <g data-k="nodes"></g>
        </svg>
        <div class="stat" data-k="info" style="margin-top:8px"></div>`;
      ui.innerHTML = `
        <button class="btn-sm" data-k="step">Bước tiếp (1/${N})</button>
        <button class="btn-sm" data-k="close" disabled>Đóng vòng lặp</button>`;

      const edgesEl = stage.querySelector('[data-k="edges"]');
      const loopEl = stage.querySelector('[data-k="loopEdge"]');
      const nodesEl = stage.querySelector('[data-k="nodes"]');
      const infoEl = stage.querySelector('[data-k="info"]');
      const stepBtn = ui.querySelector('[data-k="step"]');
      const closeBtn = ui.querySelector('[data-k="close"]');

      const st = { revealed: 0, closing: false, closed: false, t: 0 };
      const CLOSE_DUR = 1.4;

      function currentPos(i) {
        if (!st.closing && !st.closed) return drifted[i];
        const t = st.closed ? 1 : st.t / CLOSE_DUR;
        return [drifted[i][0] + (clean[i][0] - drifted[i][0]) * t, drifted[i][1] + (clean[i][1] - drifted[i][1]) * t];
      }

      function draw() {
        const pts = Array.from({ length: st.revealed }, (_, i) => currentPos(i));
        nodesEl.innerHTML = pts.map((p, i) => {
          const [x, y] = toPx(p);
          const isFirst = i === 0;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="pkt" style="fill:${isFirst ? '#16a34a' : '#2563eb'}"/>
            <text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" class="lbl-sm" text-anchor="middle">${i}</text>`;
        }).join('');
        edgesEl.innerHTML = pts.slice(1).map((p, i) => {
          const [x1, y1] = toPx(pts[i]); const [x2, y2] = toPx(p);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#94a3b8" stroke-width="2"/>`;
        }).join('');
        if (st.revealed === N) {
          const [x1, y1] = toPx(pts[N - 1]); const [x2, y2] = toPx(pts[0]);
          loopEl.innerHTML = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 5"/>`;
        } else loopEl.innerHTML = '';
        const gapNow = st.revealed === N ? Math.hypot(pts[N - 1][0] - clean[N - 1][0], pts[N - 1][1] - clean[N - 1][1]) : null;
        if (st.closed) infoEl.innerHTML = `Đã đóng vòng lặp — Ceres tối ưu lại toàn bộ graph, mọi node dịch nhẹ về đúng hình chữ nhật thật.`;
        else if (gapNow !== null) infoEl.innerHTML = `Node cuối (11) lệch khỏi node đầu (0, xanh) <b>${gapNow.toFixed(2)}m</b> dù đường đi là 1 vòng khép kín thật — sai số tích lũy từ 11 bước trước.`;
        else infoEl.innerHTML = `Đã đi ${st.revealed}/${N} bước.`;
      }

      stepBtn.addEventListener('click', () => {
        if (st.revealed >= N) return;
        st.revealed++;
        stepBtn.textContent = st.revealed < N ? `Bước tiếp (${st.revealed + 1}/${N})` : 'Đã đi hết vòng';
        stepBtn.disabled = st.revealed >= N;
        closeBtn.disabled = st.revealed < N;
        draw();
      });
      closeBtn.addEventListener('click', () => {
        if (st.closed || st.revealed < N) return;
        st.closing = true; st.t = 0;
        closeBtn.disabled = true;
      });
      draw();

      return {
        reset() {
          st.revealed = 0; st.closing = false; st.closed = false; st.t = 0;
          stepBtn.textContent = `Bước tiếp (1/${N})`; stepBtn.disabled = false; closeBtn.disabled = true;
          draw();
        },
        update(dt) {
          if (!st.closing) return;
          st.t += dt;
          if (st.t >= CLOSE_DUR) { st.closing = false; st.closed = true; st.t = CLOSE_DUR; }
          draw();
        },
      };
    },
  });

  // ---------- 3. Loop closure: world đối xứng đánh lừa so với world đã sửa ----------
  defineScene('loop-closure-symmetry', {
    title: 'World đối xứng đánh lừa loop closure',
    caption: 'Node A (xuất phát, trái) và Node B (góc khác, phải) có hình dạng tường cục bộ giống nhau khi world đối xứng — robot quay lại gần A nhưng thuật toán có thể chấm "khớp" với B. Thêm cột mốc (world đã sửa) phá vỡ sự giống nhau đó. Điểm response dùng đúng 2 ngưỡng thật loop_match_minimum_response_coarse/fine (0.45 / 0.55).',
    setup({ stage, ui }) {
      const FINE_THRESH = 0.55, COARSE_THRESH = 0.45;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 460 260" role="img" aria-label="So khớp loop closure đúng với Node A, nhầm với Node B khi world đối xứng">
          <g data-k="walls"></g>
          <circle cx="90" cy="190" r="7" class="pkt" style="fill:#16a34a"/>
          <text x="90" y="215" class="lbl-sm" text-anchor="middle">Node A (xuất phát)</text>
          <circle cx="370" cy="70" r="7" class="pkt" style="fill:#64748b"/>
          <text x="370" y="50" class="lbl-sm" text-anchor="middle">Node B (góc khác)</text>
          <circle cx="330" cy="150" r="7" class="pkt" style="fill:#2563eb"/>
          <text x="330" y="175" class="lbl-sm" text-anchor="middle">robot hiện tại</text>
          <g data-k="landmark"></g>
          <line data-k="lineA" x1="330" y1="150" x2="90" y2="190" stroke="#16a34a" stroke-width="2" stroke-dasharray="7 6"/>
          <line data-k="lineB" x1="330" y1="150" x2="370" y2="70" stroke="#dc2626" stroke-width="2" stroke-dasharray="7 6"/>
          <text data-k="scoreA" x="200" y="195" class="lbl-sm" text-anchor="middle"></text>
          <text data-k="scoreB" x="365" y="100" class="lbl-sm" text-anchor="middle"></text>
        </svg>
        <div class="stat" data-k="verdict" style="margin-top:10px;font-weight:700"></div>
        <div class="lbl-sm" data-k="thresh" style="margin-top:4px"></div>`;
      ui.innerHTML = `
        <button class="btn-sm" data-k="sym">World đối xứng (giả lập, lỗi thật)</button>
        <button class="btn-sm" data-k="fixed">World đã sửa (có cột mốc)</button>`;

      const wallsEl = stage.querySelector('[data-k="walls"]');
      const landmarkEl = stage.querySelector('[data-k="landmark"]');
      const lineAEl = stage.querySelector('[data-k="lineA"]');
      const lineBEl = stage.querySelector('[data-k="lineB"]');
      const scoreAEl = stage.querySelector('[data-k="scoreA"]');
      const scoreBEl = stage.querySelector('[data-k="scoreB"]');
      const verdictEl = stage.querySelector('[data-k="verdict"]');
      const threshEl = stage.querySelector('[data-k="thresh"]');
      const symBtn = ui.querySelector('[data-k="sym"]');
      const fixedBtn = ui.querySelector('[data-k="fixed"]');

      // Tường góc A (trái-dưới) và góc B (phải-trên) vẽ giống nhau (đối xứng điểm qua tâm).
      wallsEl.innerHTML = `
        <polyline points="30,190 90,190 90,230" fill="none" stroke="#334155" stroke-width="4"/>
        <polyline points="430,70 370,70 370,30" fill="none" stroke="#334155" stroke-width="4"/>
        <line x1="90" y1="190" x2="330" y2="150" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3 4"/>
        <line x1="330" y1="150" x2="370" y2="70" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3 4"/>`;

      let mode = 'sym';
      let pulse = 0;

      function render() {
        const symMode = mode === 'sym';
        landmarkEl.innerHTML = symMode ? '' : `<polygon points="385,55 395,55 390,42" style="fill:#f59e0b"/><text x="390" y="35" class="lbl-sm" text-anchor="middle">cột mốc</text>`;
        const scoreA = 0.80; // khớp đúng -- không đổi, hình dạng Node A luôn là chính nó
        const scoreB = symMode ? 0.83 : 0.21; // đối xứng: giống A hơn cả A thật; có cột mốc: rất khác A
        scoreAEl.textContent = `response = ${scoreA.toFixed(2)}`;
        scoreBEl.textContent = `response = ${scoreB.toFixed(2)}`;
        const bWins = scoreB > scoreA && scoreB >= FINE_THRESH;
        const aAccepted = scoreA >= FINE_THRESH;
        lineAEl.setAttribute('stroke-width', !bWins && aAccepted ? '4' : '2');
        lineBEl.setAttribute('stroke-width', bWins ? '4' : '2');
        lineAEl.style.opacity = String(0.5 + 0.5 * Math.abs(Math.sin(pulse)) * (!bWins && aAccepted ? 1 : 0.3));
        lineBEl.style.opacity = String(0.5 + 0.5 * Math.abs(Math.sin(pulse)) * (bWins ? 1 : 0.3));
        if (bWins) {
          verdictEl.innerHTML = `slam_toolbox chọn: <span style="color:#dc2626">Node B — SAI</span> (response cao hơn Node A thật, cả 2 đều vượt ngưỡng 0.55)`;
        } else if (aAccepted) {
          verdictEl.innerHTML = `slam_toolbox chọn: <span style="color:var(--ok)">Node A — ĐÚNG</span> (response Node B rơi dưới ngưỡng, bị loại ngay ở bước coarse/fine)`;
        } else {
          verdictEl.innerHTML = `Không node nào vượt ngưỡng — không có loop closure nào được chấp nhận lần này.`;
        }
        threshEl.textContent = `Ngưỡng thật: loop_match_minimum_response_coarse = ${COARSE_THRESH}, _fine = ${FINE_THRESH}`;
        symBtn.style.outline = symMode ? '2px solid var(--brand)' : '';
        fixedBtn.style.outline = !symMode ? '2px solid var(--brand)' : '';
      }
      symBtn.addEventListener('click', () => { mode = 'sym'; render(); });
      fixedBtn.addEventListener('click', () => { mode = 'fixed'; render(); });
      render();

      return {
        reset() { mode = 'sym'; pulse = 0; render(); },
        update(dt) { pulse += dt * 2; render(); },
      };
    },
  });

  // ---------- 4. Occupancy grid: kéo ngưỡng, xem ô nào occupied/free ----------
  defineScene('occupancy-threshold', {
    title: 'Kéo ngưỡng occupancy — ô nào occupied, ô nào free',
    caption: 'Mỗi ô mang 1 xác suất occupied cố định (mô phỏng kết quả tích lũy từ nhiều lần quét chồng lên 1 góc tường). Kéo occupancy_threshold để xem ranh giới occupied/free (viền đỏ) thay đổi ra sao -- đúng cơ chế lượng tử hoá khi xuất ảnh .pgm cuối cùng.',
    setup({ stage, ui }) {
      // Lưới minh hoạ 1 góc tường: cột 2 (dọc) + hàng 5 (ngang) xác suất cao, nhiễu quanh đó thấp hơn,
      // còn lại free gần như chắc chắn. Giá trị minh hoạ, không phải dữ liệu cảm biến thật.
      const ROWS = 7, COLS = 10;
      const P = Array.from({ length: ROWS }, () => Array(COLS).fill(0.03));
      const wallCol = 2, wallRow = 5;
      [0.88, 0.84, 0.79, 0.70, 0.58, 0.50].forEach((v, r) => { P[r][wallCol] = v; });
      [0.50, 0.80, 0.83, 0.86, 0.80, 0.70, 0.60, 0.45].forEach((v, i) => { P[wallRow][wallCol + i] = v; });
      P[0][1] = 0.14; P[2][3] = 0.18; P[3][1] = 0.12; P[6][3] = 0.18; P[6][4] = 0.20; P[6][5] = 0.15; P[1][7] = 0.09; P[4][8] = 0.15;

      const CELL = 36, OX = 20, OY = 20;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${OX * 2 + COLS * CELL} ${OY * 2 + ROWS * CELL}" role="img" aria-label="Lưới occupancy grid, kéo ngưỡng để phân loại occupied/free">
          <g data-k="cells"></g>
        </svg>
        <div class="stat" data-k="count" style="margin-top:8px"></div>`;
      ui.innerHTML = `<label class="ctl">occupancy_threshold <input type="range" min="0" max="1" step="0.01" value="0.1" data-k="th"> <span data-k="thv"></span></label>`;

      const cellsEl = stage.querySelector('[data-k="cells"]');
      const countEl = stage.querySelector('[data-k="count"]');
      const thEl = ui.querySelector('[data-k="th"]');
      const thvEl = ui.querySelector('[data-k="thv"]');

      const rects = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          rects.push({ r, c, p: P[r][c] });
        }
      }
      cellsEl.innerHTML = rects.map(({ r, c, p }) => {
        const x = OX + c * CELL, y = OY + r * CELL;
        const gray = Math.round(255 - p * 255);
        return `<rect data-r="${r}" data-c="${c}" x="${x}" y="${y}" width="${CELL - 2}" height="${CELL - 2}" rx="3"
          style="fill:rgb(${gray},${gray},${gray});stroke:var(--line);stroke-width:1" />
          <text x="${x + (CELL - 2) / 2}" y="${y + (CELL - 2) / 2 + 4}" text-anchor="middle" style="font-size:9px;fill:${p > 0.5 ? '#fff' : '#334155'}">${p.toFixed(2)}</text>`;
      }).join('');
      const rectEls = [...cellsEl.querySelectorAll('rect')];

      function render() {
        const th = Number(thEl.value);
        thvEl.textContent = th.toFixed(2);
        let occCount = 0;
        rectEls.forEach((el, i) => {
          const occ = rects[i].p > th;
          if (occ) occCount++;
          // style.* (không phải setAttribute) -- inline style đặt lúc tạo rect luôn thắng
          // presentation attribute, nên phải cập nhật qua .style để thắng lại chính nó.
          el.style.stroke = occ ? '#dc2626' : 'var(--line)';
          el.style.strokeWidth = occ ? '2.5' : '1';
        });
        countEl.innerHTML = `Ngưỡng hiện tại: <b>${th.toFixed(2)}</b> → <b>${occCount}</b>/${ROWS * COLS} ô bị xếp occupied (viền đỏ)${Math.abs(th - 0.1) < 0.005 ? ' — đúng giá trị thật trong mapper_params.yaml' : ''}`;
      }
      thEl.addEventListener('input', render);
      render();

      return {
        reset() { thEl.value = 0.1; render(); },
        update() {},
      };
    },
  });

  // ---------- 5. Mô phỏng sống: robot di chuyển, LiDAR quét, bản đồ + pose graph cùng hình thành ----------
  // Minh hoạ nguyên lý raycasting cập nhật occupancy grid nói chung (không phải chi tiết nội
  // bộ slam_toolbox -- cái đó dùng lưới tương quan Gauss, bài 1). Robot đi theo quỹ đạo cố định
  // quanh 1 cột trụ, LiDAR 36 tia bắn theo chu kỳ, mỗi tia "tô" ô trống dọc đường đi và tô đen ô
  // chạm vật cản -- tích luỹ qua nhiều vòng giống hệt cách bản đồ thật "dày" dần lên.
  defineScene('slam-live-mapping', {
    title: 'Mô phỏng sống: robot vừa đi vừa xây bản đồ',
    caption: 'LiDAR 36 tia bắn mỗi 0.2s; mỗi tia tô TRẮNG các ô nó đi qua (free) và tô ĐEN ô nó chạm phải (occupied) -- im dần, lớp dưới mờ dần: trùng khớp giống đúng quy ước PGM đã học (trắng/đen/xám). Pose graph (chấm + đường xanh) rơi 1 node mỗi 0.5m đi được -- đúng minimum_travel_distance thật. Mỗi lần khép kín 1 vòng quanh cột trụ, 1 cạnh loop closure đỏ nét đứt xuất hiện rồi pose graph bắt đầu chuỗi mới (bản đồ bên dưới thì KHÔNG xoá, cứ dày thêm). Node đặt ở vị trí thật — không giả lập trôi (đã học riêng ở bài Pose graph).',
    setup({ stage, ui }) {
      const CELL = 0.15, COLS = 20, ROWS = 14;
      const WORLD_W = COLS * CELL, WORLD_H = ROWS * CELL;
      const SCALE = 108, OX = 30, OY = 24;
      const toPx = (x, y) => [OX + x * SCALE, OY + (WORLD_H - y) * SCALE];

      const WALLS = [
        [0, 0, WORLD_W, 0], [WORLD_W, 0, WORLD_W, WORLD_H], [WORLD_W, WORLD_H, 0, WORLD_H], [0, WORLD_H, 0, 0],
        [1.3, 0.8, 1.7, 0.8], [1.7, 0.8, 1.7, 1.3], [1.7, 1.3, 1.3, 1.3], [1.3, 1.3, 1.3, 0.8],
      ];
      const WAYPOINTS = [[0.5, 0.4], [2.5, 0.4], [2.5, 1.7], [0.5, 1.7]];
      const segs = WAYPOINTS.map((p, i) => {
        const q = WAYPOINTS[(i + 1) % WAYPOINTS.length];
        const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
        return { p, dx, dy, len, ux: dx / len, uy: dy / len };
      });
      const PERIM = segs.reduce((a, s) => a + s.len, 0);
      function posAtDist(d) {
        d = ((d % PERIM) + PERIM) % PERIM;
        let acc = 0;
        for (const s of segs) {
          if (d <= acc + s.len || s === segs[segs.length - 1]) {
            const t = (d - acc) / s.len;
            return { x: s.p[0] + s.dx * t, y: s.p[1] + s.dy * t, ux: s.ux, uy: s.uy };
          }
          acc += s.len;
        }
      }

      const ROBOT_SPEED = 0.4, NODE_SPACING = 0.5, SCAN_INTERVAL = 0.2;
      const N_RAYS = 36, MAX_RANGE = 4.2, STEP = CELL / 2;
      const FREE_DECAY = 0.14, OCC_GAIN = 0.9;
      const UNKNOWN = [182, 188, 196], FREE = [255, 255, 255], OCC = [23, 23, 27];
      const lerp = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
      const colorFor = (s) => {
        s = Math.max(-2.5, Math.min(2.5, s));
        return s <= 0 ? lerp(UNKNOWN, FREE, Math.min(1, -s / 2)) : lerp(UNKNOWN, OCC, Math.min(1, s / 1.4));
      };

      function raySegmentHit(ox, oy, dx, dy) {
        let best = MAX_RANGE, did = false;
        for (const [x1, y1, x2, y2] of WALLS) {
          const spx = x2 - x1, spy = y2 - y1;
          const denom = dx * spy - dy * spx;
          if (Math.abs(denom) < 1e-9) continue;
          const t = ((x1 - ox) * spy - (y1 - oy) * spx) / denom;
          const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
          if (t >= 0 && t < best && u >= 0 && u <= 1) { best = t; did = true; }
        }
        return { dist: best, did };
      }

      const [W_PX, H_PX] = [OX * 2 + WORLD_W * SCALE, OY * 2 + WORLD_H * SCALE];
      let cellsHtml = '';
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const [px, py] = toPx(col * CELL, (row + 1) * CELL);
          cellsHtml += `<rect data-idx="${row * COLS + col}" x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${(CELL * SCALE).toFixed(1)}" height="${(CELL * SCALE).toFixed(1)}" style="fill:rgb(182,188,196);stroke:rgba(0,0,0,0.05);stroke-width:0.5"/>`;
        }
      }
      const truePolys = `
        <polygon points="${WALLS.slice(0, 4).map(([x1, y1]) => toPx(x1, y1).join(',')).join(' ')}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
        <polygon points="${WALLS.slice(4).map(([x1, y1]) => toPx(x1, y1).join(',')).join(' ')}" fill="none" stroke="#2563eb" stroke-width="2.5"/>`;

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${W_PX.toFixed(0)} ${H_PX.toFixed(0)}" role="img" aria-label="Robot di chuyển quanh 1 cột trụ, LiDAR dần vẽ nên occupancy grid, pose graph rơi node theo quãng đường">
          <g data-k="cells">${cellsHtml}</g>
          <g data-k="trueWalls" style="opacity:0">${truePolys}</g>
          <g data-k="rays"></g>
          <g data-k="pgEdges"></g>
          <g data-k="loopEdge"></g>
          <g data-k="pgNodes"></g>
          <g data-k="robot"><polygon points="-7,-5 10,0 -7,5" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        </svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = `<button class="btn-sm" data-k="truth">Hiện tường thật (đáp án)</button>`;

      const raysEl = stage.querySelector('[data-k="rays"]');
      raysEl.innerHTML = Array.from({ length: N_RAYS }, (_, i) => `<line data-i="${i}" x1="0" y1="0" x2="0" y2="0" stroke="#38bdf8" stroke-width="1" style="opacity:0"/>`).join('');
      const rayEls = [...raysEl.querySelectorAll('line')];
      const cellEls = [...stage.querySelectorAll('[data-idx]')];
      const edgesEl = stage.querySelector('[data-k="pgEdges"]');
      const nodesEl = stage.querySelector('[data-k="pgNodes"]');
      const loopEl = stage.querySelector('[data-k="loopEdge"]');
      const robotEl = stage.querySelector('[data-k="robot"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const truthBtn = ui.querySelector('[data-k="truth"]');
      let truthOn = false;
      truthBtn.addEventListener('click', () => {
        truthOn = !truthOn;
        stage.querySelector('[data-k="trueWalls"]').style.opacity = truthOn ? '1' : '0';
        truthBtn.textContent = truthOn ? 'Ẩn tường thật' : 'Hiện tường thật (đáp án)';
      });

      let grid, nodes, st;

      function cellIndex(x, y) {
        let col = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
        let row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
        return row * COLS + col;
      }
      function paintCell(idx) { cellEls[idx].style.fill = colorFor(grid[idx]); }

      function renderPoseGraph() {
        edgesEl.innerHTML = nodes.slice(1).map((n, i) => `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="#2563eb" stroke-width="2"/>`).join('');
        nodesEl.innerHTML = nodes.map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="4" class="pkt" style="fill:#2563eb"/>`).join('');
      }

      function doScan() {
        st.scanCount++;
        for (let i = 0; i < N_RAYS; i++) {
          const ang = (i / N_RAYS) * Math.PI * 2;
          const dx = Math.cos(ang), dy = Math.sin(ang);
          const { dist, did } = raySegmentHit(st.x, st.y, dx, dy);
          const steps = Math.floor(dist / STEP);
          for (let s = 0; s < steps; s++) {
            const idx = cellIndex(st.x + dx * s * STEP, st.y + dy * s * STEP);
            grid[idx] = Math.max(-2.5, grid[idx] - FREE_DECAY);
            paintCell(idx);
          }
          if (did) {
            const idx = cellIndex(st.x + dx * dist, st.y + dy * dist);
            grid[idx] = Math.min(2.5, grid[idx] + OCC_GAIN);
            paintCell(idx);
          }
          const [ox, oy] = toPx(st.x, st.y);
          const [ex, ey] = toPx(st.x + dx * dist, st.y + dy * dist);
          const rl = rayEls[i];
          rl.setAttribute('x1', ox.toFixed(1)); rl.setAttribute('y1', oy.toFixed(1));
          rl.setAttribute('x2', ex.toFixed(1)); rl.setAttribute('y2', ey.toFixed(1));
          rl.style.opacity = '0.9';
        }
        st.rayAge = 0;
        let confirmed = 0;
        for (let i = 0; i < grid.length; i++) if (Math.abs(grid[i]) >= 1) confirmed++;
        st.coverage = Math.round((confirmed / grid.length) * 100);
      }

      function addPoseNode() {
        const [px, py] = toPx(st.x, st.y);
        nodes.push({ x: px, y: py });
        renderPoseGraph();
      }

      function closeLoopFlourish() {
        if (nodes.length > 1) {
          const first = nodes[0], last = nodes[nodes.length - 1];
          loopEl.innerHTML = `<line x1="${last.x.toFixed(1)}" y1="${last.y.toFixed(1)}" x2="${first.x.toFixed(1)}" y2="${first.y.toFixed(1)}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6 5"/>`;
          loopEl.style.opacity = '1';
          st.loopFlashAge = 0;
          st.loopCount++;
        }
        const [px, py] = toPx(st.x, st.y);
        nodes = [{ x: px, y: py }];
        renderPoseGraph();
      }

      function updateStat() {
        statEl.innerHTML = `Robot đã đi (vòng này): <b>${st.dist.toFixed(1)}m</b> · scan #${st.scanCount} · pose graph: <b>${nodes.length}</b> node · đã đóng vòng lặp <b>${st.loopCount}</b> lần · đã xác định <b>${st.coverage || 0}%</b> ô (free/occupied rõ ràng)`;
      }

      return {
        reset() {
          grid = new Float32Array(COLS * ROWS);
          cellEls.forEach((el) => { el.style.fill = colorFor(0); });
          const start = posAtDist(0);
          nodes = [{ x: toPx(start.x, start.y)[0], y: toPx(start.x, start.y)[1] }];
          st = { x: start.x, y: start.y, dist: 0, distSinceNode: 0, scanTimer: 0, scanCount: 0, loopCount: 0, coverage: 0, rayAge: 0, loopFlashAge: 0 };
          loopEl.innerHTML = ''; loopEl.style.opacity = '0';
          rayEls.forEach((el) => { el.style.opacity = '0'; });
          renderPoseGraph();
          doScan();
          const [rx, ry] = toPx(st.x, st.y);
          robotEl.setAttribute('transform', `translate(${rx.toFixed(1)},${ry.toFixed(1)}) rotate(${(Math.atan2(-start.uy, start.ux) * 180 / Math.PI).toFixed(1)})`);
          updateStat();
        },
        update(dt) {
          const moved = ROBOT_SPEED * dt;
          st.dist += moved;
          st.distSinceNode += moved;
          if (st.dist >= PERIM) { st.dist -= PERIM; closeLoopFlourish(); }
          const p = posAtDist(st.dist);
          st.x = p.x; st.y = p.y;
          const [rx, ry] = toPx(st.x, st.y);
          robotEl.setAttribute('transform', `translate(${rx.toFixed(1)},${ry.toFixed(1)}) rotate(${(Math.atan2(-p.uy, p.ux) * 180 / Math.PI).toFixed(1)})`);
          if (st.distSinceNode >= NODE_SPACING) { st.distSinceNode -= NODE_SPACING; addPoseNode(); }
          st.scanTimer += dt;
          if (st.scanTimer >= SCAN_INTERVAL) { st.scanTimer -= SCAN_INTERVAL; doScan(); }
          st.rayAge += dt;
          const fadeT = Math.max(0, 1 - st.rayAge / 0.5);
          rayEls.forEach((el) => { el.style.opacity = String(0.1 + 0.8 * fadeT); });
          if (loopEl.innerHTML) {
            st.loopFlashAge += dt;
            const t = Math.max(0, 1 - st.loopFlashAge / 1.6);
            loopEl.style.opacity = String(t);
            if (t <= 0) loopEl.innerHTML = '';
          }
          updateStat();
        },
      };
    },
  });
})();
