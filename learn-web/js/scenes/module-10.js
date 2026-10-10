// Mô hình mô phỏng cho Module 10 (Nav2 core: costmap, global planner, local controller).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Bức tranh tổng thể: costmap -> planner -> controller ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (không đường nào cắt qua ô
  // không liên quan, không đoạn nào trùng đoạn nào). bt_navigator vẽ như 1 ghi chú đứng
  // riêng (không nối dây) -- việc nó "gọi" planner/controller không phải luồng dữ liệu
  // topic thật, trộn chung với animation chảy-dữ-liệu sẽ gây hiểu nhầm.
  defineScene('nav2-pipeline-overview', {
    title: 'Bức tranh tổng thể: costmap → planner → controller',
    caption: 'Làn trên: lộ trình toàn cục (global costmap, frame map, chạy 1 lần). Làn dưới: bám đường tức thời (local costmap, frame odom, chạy liên tục 20Hz). bt_navigator (góc phải) điều phối cả 2 theo kịch bản XML -- không nối dây vì đó không phải luồng topic dữ liệu.',
    setup({ stage }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 830 280" role="img" aria-label="Pipeline Nav2: costmap toàn cục và cục bộ nuôi dữ liệu cho planner và controller, ra /cmd_vel">
          <g data-id="n-map"><rect x="20" y="20" width="150" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="95" y="42" style="font-size:10px">bản đồ đã lưu</text><text class="lbl-sm" x="95" y="56">Module 8</text></g>
          <g data-id="n-scan"><rect x="20" y="220" width="150" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="95" y="244" style="font-size:12px">/scan</text></g>

          <line data-id="e-map-costmapG" x1="170" y1="40" x2="220" y2="40" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-scan-costmapG" points="170,230 195,230 195,55 220,55" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-scan-costmapL" x1="170" y1="250" x2="220" y2="250" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-costmapG"><rect x="220" y="20" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="305" y="42" style="font-size:10.5px">global costmap</text><text class="lbl-sm" x="305" y="58">frame: map</text></g>
          <g data-id="n-costmapL"><rect x="220" y="210" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="305" y="232" style="font-size:10px">local costmap</text><text class="lbl-sm" x="305" y="248">frame: odom, rolling</text></g>

          <line data-id="e-costmapG-planner" x1="390" y1="45" x2="440" y2="45" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-plan" x1="520" y1="70" x2="520" y2="210" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-costmapL-controller" x1="390" y1="250" x2="440" y2="250" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-controller-cmdvel" x1="610" y1="235" x2="660" y2="235" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-planner"><rect x="440" y="20" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="525" y="42" style="font-size:10px">planner_server</text><text class="lbl-sm" x="525" y="58">NavFn (Dijkstra)</text></g>
          <g data-id="n-controller"><rect x="440" y="210" width="170" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="525" y="232" style="font-size:10px">controller_server</text><text class="lbl-sm" x="525" y="248">FollowPath</text></g>
          <g data-id="n-cmdvel"><rect x="660" y="210" width="150" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="735" y="238" style="font-size:11px">/cmd_vel</text></g>

          <text class="lbl-sm" x="525" y="190" text-anchor="middle">/plan</text>
          <rect x="600" y="110" width="180" height="50" rx="8" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 3"/>
          <text class="node-name" x="690" y="132" text-anchor="middle" style="font-size:10.5px">bt_navigator</text>
          <text class="lbl-sm" x="690" y="148" text-anchor="middle">điều phối (bài 4)</text>
        </svg>`;
      const svg = stage.querySelector('svg');
      const FLOW_IDS = ['e-map-costmapG', 'e-scan-costmapG', 'e-scan-costmapL', 'e-costmapG-planner', 'e-plan', 'e-costmapL-controller', 'e-controller-cmdvel'];
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

  // ---------- 1. Costmap: 3 layer cộng dồn + global vs local ----------
  defineScene('costmap-layers', {
    title: '3 layer cộng dồn thành costmap',
    caption: 'Bấm bật/tắt từng layer để xem nó đóng góp gì. Static = bản đồ tĩnh (chỉ global costmap có). Obstacle = vật cản /scan thấy NGAY BÂY GIỜ (ô robot di chuyển qua, có 1 "người" di động cắt ngang). Inflation = vùng chi phí tăng dần quanh mọi vật cản, bán kính 0.3m đúng số thật.',
    setup({ stage, ui }) {
      // Lưới mịn hơn hẳn bản đầu (16×11 ô 24px -> 28×19 ô 15px) -- cùng kích thước hình nhưng
      // nhiều ô nhỏ hơn thì dải gradient của inflation mới đủ bước để thấy tách biệt bằng mắt,
      // không bị vón thành 1-2 khối to.
      const COLS = 28, ROWS = 19, CELL = 15;
      const OX = 20, OY = 20;
      // Bản đồ tĩnh: khung ngoài + 1 cột trụ giữa (giống thế giới mô phỏng ở Module 8/9).
      const STATIC_WALLS = new Set();
      for (let c = 0; c < COLS; c++) { STATIC_WALLS.add(`${c},0`); STATIC_WALLS.add(`${c},${ROWS - 1}`); }
      for (let r = 0; r < ROWS; r++) { STATIC_WALLS.add(`0,${r}`); STATIC_WALLS.add(`${COLS - 1},${r}`); }
      for (let c = 13; c <= 14; c++) for (let r = 7; r <= 11; r++) STATIC_WALLS.add(`${c},${r}`);

      const INFLATION_RADIUS_CELLS = 3; // bán kính inflation_radius=0.3m thật, quy ra ~3 ô lưới mịn hơn

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${OX * 2 + COLS * CELL} ${OY * 2 + ROWS * CELL}" role="img" aria-label="Costmap gồm 3 layer cộng dồn: static, obstacle, inflation">
          <g data-k="cells"></g>
          <g data-k="movingObs"></g>
        </svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = `
        <label class="ctl"><input type="checkbox" data-k="static" checked> Static layer (bản đồ tĩnh)</label>
        <label class="ctl"><input type="checkbox" data-k="obstacle" checked> Obstacle layer (/scan sống)</label>
        <label class="ctl"><input type="checkbox" data-k="inflation" checked> Inflation layer (vùng né rộng ra)</label>
        <label class="ctl"><input type="checkbox" data-k="localMode"> Chế độ local costmap (cửa sổ nhỏ quanh robot)</label>`;

      const cellsEl = stage.querySelector('[data-k="cells"]');
      const movingObsEl = stage.querySelector('[data-k="movingObs"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const staticChk = ui.querySelector('[data-k="static"]');
      const obstacleChk = ui.querySelector('[data-k="obstacle"]');
      const inflationChk = ui.querySelector('[data-k="inflation"]');
      const localChk = ui.querySelector('[data-k="localMode"]');

      const cells = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = OX + c * CELL, y = OY + r * CELL;
          cells.push({ r, c, x, y });
        }
      }
      cellsEl.innerHTML = cells.map(({ x, y }) => `<rect x="${x}" y="${y}" width="${CELL - 1}" height="${CELL - 1}" style="fill:#ffffff;stroke:rgba(0,0,0,0.05);stroke-width:1"/>`).join('');
      const cellEls = [...cellsEl.querySelectorAll('rect')];

      // "Người" di động cắt ngang -- chỉ obstacle layer thấy được, static layer không biết.
      let movingT = 0;
      movingObsEl.innerHTML = `<circle r="7" class="pkt" style="fill:#7c3aed"/>`;
      const movingCircle = movingObsEl.querySelector('circle');

      function movingObsCell() {
        const col = 6 + Math.round(8 * (0.5 + 0.5 * Math.sin(movingT)));
        const row = 13;
        return { col, row };
      }

      function compute() {
        const showStatic = staticChk.checked;
        const showObstacle = obstacleChk.checked;
        const showInflation = inflationChk.checked;
        const localMode = localChk.checked;
        const { col: mc, row: mr } = movingObsCell();

        // Tập vật cản "đang thấy": static (nếu bật) hợp obstacle động (nếu bật).
        const occ = new Set();
        if (showStatic) STATIC_WALLS.forEach((k) => occ.add(k));
        if (showObstacle) occ.add(`${mc},${mr}`);

        // Inflation: khoảng cách Chebyshev nhỏ nhất tới 1 ô occ, quy thành chi phí giảm dần.
        cells.forEach(({ r, c, x, y }, i) => {
          const key = `${r === r ? r : r},${c}`;
          const isOcc = occ.has(`${c},${r}`);
          let costT = 0;
          if (showInflation && !isOcc) {
            let minD = Infinity;
            occ.forEach((k) => {
              const [oc, or_] = k.split(',').map(Number);
              const d = Math.max(Math.abs(oc - c), Math.abs(or_ - r));
              if (d < minD) minD = d;
            });
            if (minD <= INFLATION_RADIUS_CELLS) costT = 1 - minD / (INFLATION_RADIUS_CELLS + 1);
          }
          let fill = '#ffffff';
          if (isOcc) fill = '#1f2937';
          else if (costT > 0) {
            const t = Math.min(1, costT);
            const g = Math.round(255 - t * 120);
            fill = `rgb(255,${g},${Math.round(180 - t * 140)})`;
          }
          // Chế độ local costmap: chỉ 1 cửa sổ nhỏ quanh robot (giả định robot đứng giữa bản đồ) được "thấy".
          let inWindow = true;
          if (localMode) {
            const cx = Math.round(COLS / 2), cy = Math.round(ROWS / 2);
            inWindow = Math.abs(c - cx) <= 5 && Math.abs(r - cy) <= 5;
          }
          cellEls[i].style.fill = inWindow ? fill : '#f1f5f9';
          cellEls[i].style.opacity = inWindow ? '1' : '0.5';
        });

        const [mx, my] = [OX + mc * CELL + CELL / 2, OY + mr * CELL + CELL / 2];
        movingCircle.setAttribute('cx', mx.toFixed(1));
        movingCircle.setAttribute('cy', my.toFixed(1));
        movingObsEl.style.opacity = showObstacle ? '1' : '0';

        statEl.innerHTML = localMode
          ? `Chế độ <b>local costmap</b>: chỉ cửa sổ 11×11 ô quanh robot (vùng mờ là ngoài phạm vi) -- không có static_layer thật trong cấu hình Atlas, chỉ minh hoạ phạm vi hẹp ở đây.`
          : `Chế độ <b>global costmap</b>: phủ toàn bản đồ, đủ cả 3 layer khi bật hết -- đúng cấu hình thật (<code>plugins: ["static_layer","obstacle_layer","inflation_layer"]</code>).`;
      }

      [staticChk, obstacleChk, inflationChk, localChk].forEach((el) => el.addEventListener('change', compute));
      compute();

      return {
        reset() {
          staticChk.checked = true; obstacleChk.checked = true; inflationChk.checked = true; localChk.checked = false;
          movingT = 0;
          compute();
        },
        update(dt) {
          movingT += dt * 0.8;
          compute();
        },
      };
    },
  });

  // ---------- 2. Global planner: Dijkstra vét lưới + smoother làm mượt ----------
  defineScene('navfn-dijkstra-path', {
    title: 'NavFn: Dijkstra vs A* -- cùng 1 thuật toán, khác trọng số',
    caption: 'Bấm "📍 Đặt điểm xuất phát" / "🚩 Đặt đích" rồi bấm vào 1 ô trống trên lưới để tự chọn -- thử vài cặp điểm khác nhau (gần tường, xa tường, 2 bên vách chắn) để xem chênh lệch Dijkstra/A* đổi ra sao. Dijkstra (xanh dương) lan đều mọi hướng -- không biết đích ở đâu cho tới khi chạm phải. A* (tím) dùng thêm khoảng cách thẳng tới đích để "hướng" việc dò, duyệt ít ô hẳn. Cả 2 vẫn ra path NGẮN NHẤT bằng nhau -- A* không "đoán", nó vẫn đúng tuyệt đối nhờ heuristic admissible (toán học bên dưới). Bấm "Làm mượt" để xem atlas_slam thật có 1 bước xử lý riêng (SimpleSmoother) nắn lại đường trước khi đưa cho controller.',
    setup({ stage, ui }) {
      const COLS = 18, ROWS = 12, CELL = 22;
      const OX = 20, OY = 20;
      const WALLS = new Set();
      for (let c = 0; c < COLS; c++) { WALLS.add(`${c},0`); WALLS.add(`${c},${ROWS - 1}`); }
      for (let r = 0; r < ROWS; r++) { WALLS.add(`0,${r}`); WALLS.add(`${COLS - 1},${r}`); }
      // 1 vách chắn giữa đường, chừa 1 lối hẹp -- buộc cả 2 thuật toán phải vòng, tạo hình zigzag rõ.
      for (let r = 2; r <= 8; r++) if (r !== 5) WALLS.add(`9,${r}`);

      let START = [2, 2], GOAL = [15, 9];
      const key = ([c, r]) => `${c},${r}`;

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${OX * 2 + COLS * CELL} ${OY * 2 + ROWS * CELL}" role="img" aria-label="Dijkstra và A* lan toả trên cùng 1 lưới tìm đường, sau đó smoother làm mượt -- bấm vào lưới để tự đặt điểm xuất phát/đích">
          <g data-k="walls"></g>
          <g data-k="visited"></g>
          <g data-k="path"></g>
          <g data-k="smoothPath"></g>
          <circle data-k="start" r="6" class="pkt" style="fill:#16a34a;cursor:pointer"/>
          <circle data-k="goal" r="6" class="pkt" style="fill:#dc2626;cursor:pointer"/>
        </svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>
        <div class="stat" data-k="compare" style="margin-top:4px;font-weight:600"></div>`;
      ui.innerHTML = `
        <button class="btn-sm" data-k="pickStart">📍 Đặt điểm xuất phát</button>
        <button class="btn-sm" data-k="pickGoal">🚩 Đặt đích</button>
        <button class="btn-sm" data-k="dijkstra">Chạy Dijkstra</button>
        <button class="btn-sm" data-k="astar">Chạy A*</button>
        <button class="btn-sm" data-k="smooth" disabled>Làm mượt (smoother_server)</button>`;

      const toPx = (c, r) => [OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2];
      const wallsEl = stage.querySelector('[data-k="walls"]');
      wallsEl.innerHTML = [...WALLS].map((k) => {
        const [c, r] = k.split(',').map(Number);
        return `<rect x="${OX + c * CELL}" y="${OY + r * CELL}" width="${CELL - 1}" height="${CELL - 1}" style="fill:#1f2937"/>`;
      }).join('');

      const svgEl = stage.querySelector('svg');
      const startCircle = stage.querySelector('[data-k="start"]');
      const goalCircle = stage.querySelector('[data-k="goal"]');
      function placeMarkers() {
        const [sx, sy] = toPx(...START); const [gx, gy] = toPx(...GOAL);
        startCircle.setAttribute('cx', sx); startCircle.setAttribute('cy', sy);
        goalCircle.setAttribute('cx', gx); goalCircle.setAttribute('cy', gy);
      }
      placeMarkers();

      const visitedEl = stage.querySelector('[data-k="visited"]');
      const pathEl = stage.querySelector('[data-k="path"]');
      const smoothPathEl = stage.querySelector('[data-k="smoothPath"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const compareEl = stage.querySelector('[data-k="compare"]');
      const pickStartBtn = ui.querySelector('[data-k="pickStart"]');
      const pickGoalBtn = ui.querySelector('[data-k="pickGoal"]');
      const dijkstraBtn = ui.querySelector('[data-k="dijkstra"]');
      const astarBtn = ui.querySelector('[data-k="astar"]');
      const smoothBtn = ui.querySelector('[data-k="smooth"]');

      function neighbors([c, r]) {
        return [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(([nc, nr]) => nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !WALLS.has(`${nc},${nr}`));
      }

      // Dijkstra VÀ A* viết chung 1 hàm best-first search với hàng đợi ưu tiên theo f(n) =
      // g(n) + weight*h(n). weight=0 -> Dijkstra (ưu tiên thuần theo g, "quãng đường đã đi"),
      // weight=1 -> A* (cộng thêm h = khoảng cách thẳng Euclid tới đích -- admissible trên
      // lưới bước đơn vị, luôn <= quãng đường lưới thật, nên không làm mất tính tối ưu).
      // Lưới nhỏ (~200 ô) nên tìm-min kiểu O(n) mỗi vòng là đủ nhanh, không cần heap thật.
      function search(weight) {
        const h = ([c, r]) => weight * Math.hypot(c - GOAL[0], r - GOAL[1]);
        const g = new Map([[key(START), 0]]);
        const prev = new Map();
        const closed = new Set();
        const open = [{ cell: START, f: h(START) }];
        const visitedOrder = [];
        while (open.length) {
          let bi = 0;
          for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
          const { cell } = open.splice(bi, 1)[0];
          const ck = key(cell);
          if (closed.has(ck)) continue;
          closed.add(ck);
          visitedOrder.push(cell);
          if (ck === key(GOAL)) break;
          for (const n of neighbors(cell)) {
            const nk = key(n);
            const tentativeG = g.get(ck) + 1;
            if (!g.has(nk) || tentativeG < g.get(nk)) {
              g.set(nk, tentativeG);
              prev.set(nk, cell);
              open.push({ cell: n, f: tentativeG + h(n) });
            }
          }
        }
        const path = [];
        let cur = GOAL;
        while (cur) {
          path.unshift(cur);
          const ck = key(cur);
          cur = prev.get(ck);
          if (cur && cur[0] === START[0] && cur[1] === START[1]) { path.unshift(START); break; }
        }
        return { visitedOrder, path };
      }

      // Đo thời gian tính toán THẬT bằng performance.now() -- 1 lần chạy trên lưới nhỏ
      // (~200 ô) nhanh tới mức đồng hồ trình duyệt không đủ phân giải để đo đáng tin (thường
      // ra 0.00ms). Lặp lại nhiều lần trong vòng lặp kín, lấy trung bình -- đúng kỹ thuật
      // micro-benchmark chuẩn, không phải số bịa.
      const TIMING_REPS = 300;
      function timedSearch(weight) {
        const result = search(weight);
        const t0 = performance.now();
        for (let i = 0; i < TIMING_REPS; i++) search(weight);
        const t1 = performance.now();
        return { ...result, avgMs: (t1 - t0) / TIMING_REPS };
      }

      // Smoother đơn giản hoá: trung bình trượt (moving average) từng điểm với 2 điểm lân cận
      // nhiều lần -- cùng Ý TƯỞNG với nav2_smoother::SimpleSmoother thật (lặp điều chỉnh để
      // giảm độ cong gắt), không phải cùng thuật toán chính xác.
      function smoothPath(path) {
        let pts = path.map(([c, r]) => toPx(c, r));
        for (let iter = 0; iter < 40; iter++) {
          const next = pts.map((p, i) => {
            if (i === 0 || i === pts.length - 1) return p;
            const a = pts[i - 1], b = pts[i + 1];
            return [p[0] * 0.5 + (a[0] + b[0]) * 0.25, p[1] * 0.5 + (a[1] + b[1]) * 0.25];
          });
          pts = next;
        }
        return pts;
      }

      let state = { visited: [], path: [], revealCount: 0, phase: 'idle', timer: 0, algo: null, avgMs: 0 };
      const lastRun = { dijkstra: null, astar: null }; // { count, avgMs }
      const ALGO_COLOR = { dijkstra: '#bfdbfe', astar: '#ddd6fe' };
      const ALGO_LABEL = { dijkstra: 'Dijkstra', astar: 'A*' };

      function render() {
        const color = ALGO_COLOR[state.algo] || '#bfdbfe';
        visitedEl.innerHTML = state.visited.slice(0, state.revealCount).map(([c, r]) => {
          const [x, y] = toPx(c, r);
          return `<rect x="${x - CELL / 2 + 1}" y="${y - CELL / 2 + 1}" width="${CELL - 2}" height="${CELL - 2}" style="fill:${color};opacity:0.7"/>`;
        }).join('');
        if (state.phase === 'done' || state.phase === 'smoothed') {
          const pts = state.path.map((p) => toPx(...p));
          pathEl.innerHTML = `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
        } else pathEl.innerHTML = '';
        if (state.phase === 'smoothed') {
          const sp = smoothPath(state.path);
          smoothPathEl.innerHTML = `<polyline points="${sp.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#16a34a" stroke-width="3"/>`;
        } else smoothPathEl.innerHTML = '';
      }

      function updateCompare() {
        if (lastRun.dijkstra == null || lastRun.astar == null) { compareEl.innerHTML = ''; return; }
        const pctCount = Math.round((1 - lastRun.astar.count / lastRun.dijkstra.count) * 100);
        const pctTime = Math.round((1 - lastRun.astar.avgMs / lastRun.dijkstra.avgMs) * 100);
        compareEl.innerHTML = `So sánh: Dijkstra duyệt <b>${lastRun.dijkstra.count}</b> ô (<b>${lastRun.dijkstra.avgMs.toFixed(3)}ms</b>) ·
          A* duyệt <b>${lastRun.astar.count}</b> ô (<b>${lastRun.astar.avgMs.toFixed(3)}ms</b>) →
          A* duyệt ít hơn <b>${Math.max(0, pctCount)}%</b>, nhanh hơn <b>${Math.max(0, pctTime)}%</b> --
          nhưng đường đi dài bằng nhau (cả 2 đều tối ưu tuyệt đối). Thời gian là trung bình qua ${TIMING_REPS} lần chạy (performance.now()), không phải 1 lần đơn lẻ.`;
      }

      function startRun(algo) {
        const { visitedOrder, path, avgMs } = timedSearch(algo === 'astar' ? 1 : 0);
        state = { visited: visitedOrder, path, revealCount: 0, phase: 'expanding', timer: 0, algo, avgMs };
        dijkstraBtn.disabled = true; astarBtn.disabled = true; smoothBtn.disabled = true;
        pickStartBtn.disabled = true; pickGoalBtn.disabled = true;
        statEl.innerHTML = algo === 'astar'
          ? 'A* đang dò -- mỗi bước ưu tiên ô có f(n)=g(n)+h(n) nhỏ nhất, "hướng" dần về đích...'
          : 'Dijkstra đang lan đều mọi hướng -- không ưu tiên hướng nào, không biết đích ở đâu...';
      }
      dijkstraBtn.addEventListener('click', () => startRun('dijkstra'));
      astarBtn.addEventListener('click', () => startRun('astar'));
      smoothBtn.addEventListener('click', () => {
        state.phase = 'smoothed';
        render();
        statEl.innerHTML = `Cam = đường ${ALGO_LABEL[state.algo]} gốc (gấp khúc, theo đúng cạnh lưới). Xanh lá = sau <code>smoother_server</code> (SimpleSmoother thật trong config Atlas) -- bước này chạy TRƯỚC khi controller_server nhận đường, không phải việc của controller.`;
      });

      // Tự chọn điểm đầu/cuối: bấm 1 trong 2 nút để "nạp đạn" rồi bấm 1 ô trống trên lưới --
      // đổi điểm luôn xoá kết quả cũ (so sánh cũ không còn ý nghĩa với cặp điểm mới).
      let pickMode = null;
      function setPickMode(mode) {
        pickMode = pickMode === mode ? null : mode;
        pickStartBtn.style.outline = pickMode === 'start' ? '2px solid var(--brand)' : '';
        pickGoalBtn.style.outline = pickMode === 'goal' ? '2px solid var(--brand)' : '';
        if (pickMode) statEl.innerHTML = `Bấm vào 1 ô trống trên lưới để đặt ${pickMode === 'start' ? 'điểm xuất phát' : 'đích'}.`;
      }
      pickStartBtn.addEventListener('click', () => setPickMode('start'));
      pickGoalBtn.addEventListener('click', () => setPickMode('goal'));
      svgEl.addEventListener('click', (e) => {
        if (!pickMode) return;
        const pt = svgEl.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const loc = pt.matrixTransform(svgEl.getScreenCTM().inverse());
        const c = Math.floor((loc.x - OX) / CELL), r = Math.floor((loc.y - OY) / CELL);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS || WALLS.has(key([c, r]))) {
          statEl.innerHTML = 'Ô đó là tường -- bấm vào ô trống.';
          return;
        }
        if (pickMode === 'start') START = [c, r]; else GOAL = [c, r];
        placeMarkers();
        pickMode = null;
        pickStartBtn.style.outline = ''; pickGoalBtn.style.outline = '';
        clearRun('Đã đặt lại điểm -- bấm "Chạy Dijkstra"/"Chạy A*" để tìm đường mới.');
      });

      function clearRun(message) {
        state = { visited: [], path: [], revealCount: 0, phase: 'idle', timer: 0, algo: null, avgMs: 0 };
        lastRun.dijkstra = null; lastRun.astar = null;
        dijkstraBtn.disabled = false; astarBtn.disabled = false; smoothBtn.disabled = true;
        statEl.innerHTML = message;
        compareEl.innerHTML = '';
        render();
      }

      return {
        reset() {
          START = [2, 2]; GOAL = [15, 9];
          placeMarkers();
          pickMode = null; pickStartBtn.style.outline = ''; pickGoalBtn.style.outline = '';
          clearRun('Bấm chạy từng thuật toán để so sánh trực tiếp trên cùng 1 lưới, hoặc tự đặt điểm xuất phát/đích.');
        },
        update(dt) {
          if (state.phase !== 'expanding') return;
          state.timer += dt;
          const batch = Math.max(1, Math.ceil(state.visited.length / 30));
          if (state.timer >= 0.035) {
            state.timer = 0;
            state.revealCount = Math.min(state.visited.length, state.revealCount + batch);
            if (state.revealCount >= state.visited.length) {
              state.phase = 'done';
              dijkstraBtn.disabled = false; astarBtn.disabled = false; smoothBtn.disabled = false;
              pickStartBtn.disabled = false; pickGoalBtn.disabled = false;
              lastRun[state.algo] = { count: state.visited.length, avgMs: state.avgMs };
              statEl.innerHTML = `${ALGO_LABEL[state.algo]} xong -- duyệt <b>${state.visited.length}</b> ô trong <b>${state.avgMs.toFixed(3)}ms</b> (trung bình ${TIMING_REPS} lần chạy), đường cam dài ${state.path.length - 1} bước lưới. Bấm thuật toán còn lại để so sánh, hoặc "Làm mượt".`;
              updateCompare();
            }
            render();
          }
        },
      };
    },
  });

  // ---------- 2b. Thuật toán dạng pipeline: cùng 1 lưu đồ cho cả Dijkstra lẫn A* ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (xem geom_flowchart.py lúc soạn
  // bài) -- kể cả đoạn quay-vòng-lại (loop-back) bên trái, không đoạn nào cắt qua ô không
  // liên quan. Lưu đồ đúng từng bước với hàm search(weight) thật trong scene trước, không
  // phải giả thuyết trình bày riêng.
  defineScene('astar-algorithm-flowchart', {
    title: 'Thuật toán dạng pipeline: 1 lưu đồ cho cả 2',
    caption: 'Khung đang sáng tự chạy vòng lặp minh hoạ (không đồng bộ với scene trên). Dijkstra và A* chạy qua ĐÚNG 1 lưu đồ này -- khác nhau duy nhất ở công thức tính f(n) trong khung "mở rộng hàng xóm". "Khởi tạo" trong đời thực chỉ chạy đúng 1 lần, ở đây cho lặp lại cùng chu trình để dễ theo dõi hơn.',
    setup({ stage }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 720 470" role="img" aria-label="Lưu đồ best-first search dùng chung cho Dijkstra và A*">
          <g data-id="n-init"><rect x="220" y="10" width="200" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="320" y="35" style="font-size:10.5px">open=[start], g(start)=0</text></g>
          <line data-id="e-init-d1" x1="320" y1="50" x2="320" y2="55" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-d1"><polygon points="320,55 430,100 320,145 210,100" class="node-box-rect"/><text class="node-name" x="320" y="104" text-anchor="middle" style="font-size:10px">open rỗng?</text></g>
          <line data-id="e-d1-fail" x1="430" y1="100" x2="480" y2="100" stroke="#cbd5e1" stroke-width="2"/>
          <text class="lbl-sm" x="455" y="92">đúng</text>
          <line data-id="e-d1-popmin" x1="320" y1="145" x2="320" y2="180" stroke="#cbd5e1" stroke-width="2"/>
          <text class="lbl-sm" x="345" y="165">sai</text>
          <g data-id="n-fail"><rect x="480" y="80" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="570" y="105" text-anchor="middle" style="font-size:9.5px">Dừng: không có đường</text></g>

          <g data-id="n-popmin"><rect x="220" y="180" width="200" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="320" y="200" text-anchor="middle" style="font-size:9px">Lấy n có f(n) nhỏ nhất</text><text class="lbl-sm" x="320" y="215">(bỏ qua nếu đã closed); đánh dấu closed</text></g>
          <line data-id="e-popmin-d2" x1="320" y1="230" x2="320" y2="245" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-d2"><polygon points="320,245 430,290 320,335 210,290" class="node-box-rect"/><text class="node-name" x="320" y="294" text-anchor="middle" style="font-size:10px">n == đích?</text></g>
          <line data-id="e-d2-done" x1="430" y1="290" x2="480" y2="290" stroke="#cbd5e1" stroke-width="2"/>
          <text class="lbl-sm" x="455" y="282">đúng</text>
          <line data-id="e-d2-expand" x1="320" y1="335" x2="320" y2="390" stroke="#cbd5e1" stroke-width="2"/>
          <text class="lbl-sm" x="345" y="355">sai</text>
          <g data-id="n-done"><rect x="480" y="270" width="220" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="590" y="295" text-anchor="middle" style="font-size:9px">Truy vết path ngược prev[], XONG</text></g>

          <g data-id="n-expand"><rect x="220" y="390" width="220" height="60" rx="8" class="node-box-rect"/><text class="node-name" x="330" y="410" text-anchor="middle" style="font-size:9px">Mỗi hàng xóm m chưa tường: g'=g(n)+1</text><text class="lbl-sm" x="330" y="424">g' &lt; g(m) đã biết? → cập nhật g,prev,</text><text class="lbl-sm" x="330" y="437">đẩy m vào open, f(m)=g'+weight·h(m)</text></g>

          <polyline data-id="e-loopback" points="220,420 60,420 60,100 210,100" fill="none" stroke="#cbd5e1" stroke-width="2"/>
        </svg>`;
      const svg = stage.querySelector('svg');
      const ALL_EDGES = ['e-init-d1', 'e-d1-fail', 'e-d1-popmin', 'e-popmin-d2', 'e-d2-done', 'e-d2-expand', 'e-loopback'];
      ALL_EDGES.forEach((id) => {
        const el = svg.querySelector(`[data-id="${id}"]`);
        el.setAttribute('stroke', '#2563eb');
        el.setAttribute('stroke-width', '3');
        el.setAttribute('stroke-dasharray', '8 7');
      });
      const SEQUENCE = ['n-init', 'n-d1', 'n-popmin', 'n-d2', 'n-expand'];
      let seqIdx = 0, stepTimer = 0;
      const FLOW_SPEED = 55;
      let dashPhase = 0;

      function highlight(idx) {
        SEQUENCE.forEach((id, i) => {
          const shape = svg.querySelector(`[data-id="${id}"]`).querySelector('rect, polygon');
          shape.classList.toggle('hot', i === idx);
        });
      }
      highlight(0);

      return {
        reset() { seqIdx = 0; stepTimer = 0; dashPhase = 0; highlight(0); },
        update(dt) {
          dashPhase -= FLOW_SPEED * dt;
          ALL_EDGES.forEach((id) => svg.querySelector(`[data-id="${id}"]`).setAttribute('stroke-dashoffset', dashPhase.toFixed(1)));
          stepTimer += dt;
          if (stepTimer >= 0.9) {
            stepTimer = 0;
            seqIdx = (seqIdx + 1) % SEQUENCE.length;
            highlight(seqIdx);
          }
        },
      };
    },
  });

  // ---------- 3. So sánh 3 controller: DWB vs RPP vs MPPI qua 1 góc cua ----------
  defineScene('controller-comparison', {
    title: 'DWB vs RPP vs MPPI qua cùng 1 góc cua',
    caption: 'Cả 3 chạy CÙNG LÚC trong 1 khung hình, cùng tốc độ, cùng xuất phát -- xem chú thích màu bên dưới. Dùng đúng tham số thật của Atlas (sim_time=1.5s cho DWB, lookahead_dist=0.5m cho RPP, batch_size=3000 quỹ đạo mẫu cho MPPI). Cả 3 tới đích cùng lúc thì vệt vẽ tự xoá, quay lại từ đầu. Đây là hình minh hoạ phong cách, không phải chạy lại đúng thuật toán gốc.',
    setup({ stage, ui }) {
      const SCALE = 110, OX = 20, OY = 20;
      const WORLD_W = 3.2, WORLD_H = 2.2;
      const toPx = (x, y) => [OX + x * SCALE, OY + (WORLD_H - y) * SCALE];
      // Path chữ L: đi ngang rồi rẽ gấp lên -- đủ để lộ rõ khác biệt bám cua của 3 kiểu.
      const PATH = [[0.3, 0.3], [2.2, 0.3], [2.2, 1.9], [2.9, 1.9]];

      const CONTROLLERS = {
        dwb: {
          label: 'DWB', color: '#2563eb',
          note: 'sim_time=1.5s, mô phỏng trước quỹ đạo NGẮN mỗi bước -- bám sát path, phản ứng nhanh nhưng dễ "giật" nhẹ ở góc vì chỉ nhìn gần.',
          curve(t) { return followPolylineWithCorner(t, 0.05); },
        },
        rpp: {
          label: 'RPP', color: '#16a34a',
          note: 'lookahead_dist=0.5m, lái theo cung tròn nối thẳng tới 1 điểm nhìn trước trên path -- quỹ đạo mượt nhất nhìn bằng mắt, tự "bo tròn" góc cua thay vì bám sát góc vuông.',
          curve(t) { return followPolylineWithCorner(t, 0.5); },
        },
        mppi: {
          label: 'MPPI', color: '#f59e0b',
          note: 'batch_size=3000 quỹ đạo mẫu mỗi chu kỳ, chọn trung bình trọng số -- vào cua sớm nhất (thấy trước góc cua từ xa), nhưng có yếu tố ngẫu nhiên (vx_std/wz_std) nên 2 lần chạy không trùng tuyệt đối.',
          curve(t) { return followPolylineWithCorner(t, 0.28, true); },
        },
      };

      function pathLenInfo() {
        let total = 0; const cum = [0];
        for (let i = 1; i < PATH.length; i++) { total += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); cum.push(total); }
        return { total, cum };
      }
      const { total: PATH_LEN, cum: CUM } = pathLenInfo();

      function rawPointAt(d) {
        d = Math.max(0, Math.min(PATH_LEN, d));
        for (let i = 1; i < PATH.length; i++) {
          if (d <= CUM[i] || i === PATH.length - 1) {
            const segLen = CUM[i] - CUM[i - 1];
            const t = segLen > 0 ? (d - CUM[i - 1]) / segLen : 0;
            return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * t, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * t];
          }
        }
        return PATH[PATH.length - 1];
      }
      // "Bo cua" đơn giản hoá: trộn điểm trên path gốc với điểm đã nhìn trước 1 đoạn `lookahead`
      // -- lookahead càng lớn, đường càng bo tròn sớm qua góc (xấp xỉ cảm giác pure-pursuit/MPPI
      // nhìn xa, không phải chạy lại đúng thuật toán).
      function followPolylineWithCorner(t, lookahead, jitter) {
        const d = t * PATH_LEN;
        const p0 = rawPointAt(d);
        const p1 = rawPointAt(d + lookahead * PATH_LEN * 0.6);
        let x = p0[0] * 0.4 + p1[0] * 0.6, y = p0[1] * 0.4 + p1[1] * 0.6;
        if (jitter) { x += Math.sin(t * 47.0) * 0.012; y += Math.cos(t * 39.0) * 0.012; }
        return [x, y];
      }

      const [W_PX, H_PX] = [OX * 2 + WORLD_W * SCALE, OY * 2 + WORLD_H * SCALE];
      const keys = Object.keys(CONTROLLERS);
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${W_PX.toFixed(0)} ${H_PX.toFixed(0)}" role="img" aria-label="So sánh quỹ đạo bám cua của DWB, RPP, MPPI chạy đồng thời qua cùng 1 đường gấp khúc">
          <polyline points="${PATH.map((p) => toPx(...p).join(',')).join(' ')}" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4 4"/>
          ${keys.map((k) => `<g data-k="trace-${k}"></g>`).join('')}
          ${keys.map((k) => `<g data-k="robot-${k}"><polygon points="-8,-6 12,0 -8,6" style="fill:${CONTROLLERS[k].color};stroke:#fff;stroke-width:1"/></g>`).join('')}
        </svg>
        <div data-k="legend" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>`;
      ui.innerHTML = '';

      const legendEl = stage.querySelector('[data-k="legend"]');
      legendEl.innerHTML = keys.map((k) => `
        <div style="display:flex;align-items:baseline;gap:8px;font-size:12.5px">
          <span style="flex:none;width:12px;height:12px;border-radius:50%;background:${CONTROLLERS[k].color};margin-top:2px"></span>
          <span><b style="color:${CONTROLLERS[k].color}">${esc(CONTROLLERS[k].label)}</b> — ${esc(CONTROLLERS[k].note)}</span>
        </div>`).join('');

      const traceEls = {}, robotEls = {}, tracePts = {};
      keys.forEach((k) => {
        traceEls[k] = stage.querySelector(`[data-k="trace-${k}"]`);
        robotEls[k] = stage.querySelector(`[data-k="robot-${k}"]`);
        tracePts[k] = [];
      });

      let t = 0;

      function resetLap() {
        t = 0;
        keys.forEach((k) => { tracePts[k] = []; traceEls[k].innerHTML = ''; });
      }
      resetLap();

      return {
        reset() { resetLap(); },
        update(dt) {
          t += dt * 0.12;
          if (t >= 1) { resetLap(); return; }
          keys.forEach((k) => {
            const c = CONTROLLERS[k];
            const [x, y] = c.curve(t);
            const [px, py] = toPx(x, y);
            tracePts[k].push([px, py]);
            traceEls[k].innerHTML = `<polyline points="${tracePts[k].map((p) => p.join(',')).join(' ')}" fill="none" stroke="${c.color}" stroke-width="3"/>`;
            const [x2, y2] = c.curve(Math.min(1, t + 0.01));
            const heading = Math.atan2(-(y2 - y), x2 - x);
            robotEls[k].setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${(heading * 180 / Math.PI).toFixed(1)})`);
          });
        },
      };
    },
  });

  // ---------- 4. Hình học thật đứng sau mỗi thuật toán: DWB / RPP / MPPI ----------
  // Công thức lấy trực tiếp từ mã nguồn thật trên máy (đã đọc + verify trước khi viết):
  // - DWB: cửa sổ động projectVelocity() trong one_d_velocity_iterator.hpp
  //   (dwb_plugins) -- max_vel = min(giới hạn tuyệt đối, v0 + acc_lim*dt),
  //   min_vel = max(giới hạn tuyệt đối, v0 + decel_lim*dt), dt = 1/controller_frequency.
  // - RPP: calculateCurvature() trong regulated_pure_pursuit_controller.cpp --
  //   curvature = 2*y / (x²+y²), y/x là toạ độ điểm nhìn trước trong hệ robot.
  // - MPPI: optimizer.cpp dòng updateControlSequence() -- softmax đúng nghĩa:
  //   w_i = exp(-(cost_i - min(cost))/temperature) / Σ exp(...), rồi lấy trung bình
  //   trọng số của chính các chuỗi điều khiển đã lấy mẫu (không phải quỹ đạo).
  defineScene('controller-geometry', {
    title: 'Hình học thật đứng sau mỗi thuật toán',
    caption: 'Chọn 1 thuật toán -- hình bên dưới dựng lại ĐÚNG công thức thật đọc từ mã nguồn (không phải minh hoạ chung chung), số liệu dùng đúng tham số Atlas. Vòng lặp tự chạy để thấy cửa sổ/điểm nhìn trước/đám mẫu thay đổi theo thời gian thực.',
    setup({ stage, ui }) {
      // Mô phỏng unicycle (xe đạp 2 bánh) từ (x0,y0,heading0) với (v,w) không đổi --
      // dùng chung cho cả 3 panel để vẽ cung quỹ đạo thật từ công thức động học.
      function unicycleArc(x0, y0, heading0, v, w, duration, steps) {
        const pts = [[x0, y0]];
        let x = x0, y = y0, h = heading0;
        const dt = duration / steps;
        for (let i = 0; i < steps; i++) {
          x += v * Math.cos(h) * dt;
          y += v * Math.sin(h) * dt;
          h += w * dt;
          pts.push([x, y]);
        }
        return pts;
      }
      stage.innerHTML = `
        <div data-k="tabs" style="display:flex;gap:6px;margin-bottom:10px"></div>
        <svg class="svg" viewBox="0 0 580 480" role="img" aria-label="Hình học thật của DWB, RPP, MPPI"></svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = '';
      const tabsEl = stage.querySelector('[data-k="tabs"]');
      const svg = stage.querySelector('svg');
      const statEl = stage.querySelector('[data-k="stat"]');

      const TABS = ['dwb', 'rpp', 'mppi'];
      const TAB_LABEL = { dwb: 'DWB', rpp: 'RPP', mppi: 'MPPI' };
      tabsEl.innerHTML = TABS.map((k) => `
        <button data-key="${k}" style="font-size:12.5px;padding:7px 14px;border-radius:8px;border:1px solid var(--line);
          background:var(--surface);color:var(--ink-2);cursor:pointer">${TAB_LABEL[k]}</button>`).join('');
      const tabBtns = [...tabsEl.querySelectorAll('button')];

      let active = 'dwb', time = 0, seed = 0;

      // ===================== DWB: cửa sổ động (v, ω) + quạt quỹ đạo mẫu =====================
      function renderDWB() {
        const VMIN = 0, VMAX = 0.5, WMIN = -1.0, WMAX = 1.0;
        const DT = 1 / 20, ACC_X = 1.0, DEC_X = -1.5, ACC_TH = 2.0, DEC_TH = -2.0, SIM_T = 1.5;
        const v0 = 0.25 + 0.15 * Math.sin(time * 0.6);
        const w0 = 0.35 * Math.sin(time * 0.9);
        const vLo = Math.max(VMIN, v0 + DEC_X * DT), vHi = Math.min(VMAX, v0 + ACC_X * DT);
        const wLo = Math.max(WMIN, w0 + DEC_TH * DT), wHi = Math.min(WMAX, w0 + ACC_TH * DT);

        // Cửa sổ động CHỈ RỘNG ~0.1 trong khi toàn dải tốc độ rộng 0.5/2.0 -- vẽ đúng tỉ lệ
        // tuyệt đối sẽ ra 1 cụm chấm chồng lên nhau không đọc được gì. Nên PHÓNG TO quanh
        // đúng cửa sổ (không theo toàn dải), kèm 1 bản đồ nhỏ góc trên bên phải cho biết
        // cửa sổ đang nằm ở đâu trong toàn dải -- để không "nói dối" về tỉ lệ thật.
        const padV = (vHi - vLo) * 0.7 || 0.05, padW = (wHi - wLo) * 0.7 || 0.1;
        const pVMin = Math.max(VMIN, vLo - padV), pVMax = Math.min(VMAX, vHi + padV);
        const pWMin = Math.max(WMIN, wLo - padW), pWMax = Math.min(WMAX, wHi + padW);

        const VB = [24, 50, 290, 220]; // panel 1: velocity-space ĐÃ PHÓNG TO quanh cửa sổ
        const velToPx = (v, w) => [VB[0] + (v - pVMin) / (pVMax - pVMin) * VB[2], VB[1] + VB[3] - (w - pWMin) / (pWMax - pWMin) * VB[3]];
        const [wx1, wy1] = velToPx(vLo, wHi), [wx2, wy2] = velToPx(vHi, wLo);

        const N = 6;
        const samples = [];
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const sv = vLo + (vHi - vLo) * (N === 1 ? 0 : i / (N - 1));
          const sw = wLo + (wHi - wLo) * (N === 1 ? 0 : j / (N - 1));
          samples.push([sv, sw]);
        }
        // Điểm thắng minh hoạ: ưu tiên v lớn (tiến nhanh) + |ω| nhỏ (ít xoay) -- gần đúng tinh
        // thần GoalDist/PathDist thật, không phải chạy lại đủ 7 critic thật.
        let winner = samples[0];
        samples.forEach((s) => { if (s[0] - Math.abs(s[1]) * 0.2 > winner[0] - Math.abs(winner[1]) * 0.2) winner = s; });

        // Bản đồ nhỏ: cửa sổ (cam) nằm ở đâu trong TOÀN dải tốc độ thật (không phóng to).
        const MB = [368, 46, 188, 80];
        const miniToPx = (v, w) => [MB[0] + (v - VMIN) / (VMAX - VMIN) * MB[2], MB[1] + MB[3] - (w - WMIN) / (WMAX - WMIN) * MB[3]];
        const [mx1, my1] = miniToPx(vLo, wHi), [mx2, my2] = miniToPx(vHi, wLo);

        const RX = 24, RY = 350, RW = 532, RH = 108; // panel 2: quạt quỹ đạo thật, hàng dưới full-width
        const rScale = 105, rOx = RX + 20, rOy = RY + RH / 2;
        const rToPx = (x, y) => [rOx + x * rScale, rOy - y * rScale];

        const arcsSvg = samples.map(([sv, sw]) => {
          const pts = unicycleArc(0, 0, 0, sv, sw, SIM_T, 16).map((p) => rToPx(...p));
          const isWinner = sv === winner[0] && sw === winner[1];
          return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none"
            stroke="${isWinner ? '#2563eb' : '#94a3b8'}" stroke-width="${isWinner ? 3.5 : 1.3}" opacity="${isWinner ? 1 : 0.55}"/>`;
        }).join('');

        const [winX, winY] = velToPx(...winner);
        const [curX, curY] = velToPx(v0, w0);

        svg.innerHTML = `
          <text class="lbl-sm" x="${VB[0]}" y="20" style="font-size:14px;font-weight:700;fill:var(--ink)">① Chọn (v, ω) trong cửa sổ động</text>
          <text class="lbl-sm" x="${MB[0]}" y="20" style="font-size:12px">Cửa sổ nằm ở đâu trong toàn dải tốc độ?</text>
          <rect x="${MB[0]}" y="${MB[1]}" width="${MB[2]}" height="${MB[3]}" fill="none" stroke="#cbd5e1" stroke-width="1"/>
          <rect x="${Math.min(mx1, mx2).toFixed(1)}" y="${Math.min(my1, my2).toFixed(1)}" width="${Math.max(2, Math.abs(mx2 - mx1)).toFixed(1)}" height="${Math.max(2, Math.abs(my2 - my1)).toFixed(1)}" style="fill:#f59e0b"/>
          <text class="lbl-sm" x="${MB[0]}" y="${MB[1] + MB[3] + 20}" style="font-size:11.5px">v: 0→0.5 · ω: -1→1 (toàn dải thật)</text>

          <rect x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
          <rect x="${Math.min(wx1, wx2).toFixed(1)}" y="${Math.min(wy1, wy2).toFixed(1)}" width="${Math.abs(wx2 - wx1).toFixed(1)}" height="${Math.abs(wy2 - wy1).toFixed(1)}" style="fill:#fde68a;opacity:0.55;stroke:#f59e0b;stroke-width:2"/>
          ${samples.map(([sv, sw]) => { const [px, py] = velToPx(sv, sw); return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" class="pkt" style="fill:#64748b"/>`; }).join('')}
          <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="5.5" class="pkt" style="fill:#16a34a;stroke:#fff;stroke-width:1.5"/>
          <text class="lbl-sm" x="${curX.toFixed(1)}" y="${(curY - 14).toFixed(1)}" text-anchor="middle" style="font-size:11.5px">hiện tại</text>
          <circle cx="${winX.toFixed(1)}" cy="${winY.toFixed(1)}" r="9" class="pkt" style="fill:none;stroke:#2563eb;stroke-width:2"/>
          <circle cx="${winX.toFixed(1)}" cy="${winY.toFixed(1)}" r="4.5" class="pkt" style="fill:#2563eb"/>
          <text class="lbl-sm" x="${winX.toFixed(1)}" y="${(winY + 22).toFixed(1)}" text-anchor="middle" style="font-size:11.5px">mẫu thắng</text>
          <text class="lbl-sm" x="${VB[0]}" y="${VB[1] + VB[3] + 22}" style="font-size:11.5px">v: ${pVMin.toFixed(2)}→${pVMax.toFixed(2)}m/s, ω: ${pWMin.toFixed(2)}→${pWMax.toFixed(2)}rad/s (ĐÃ PHÓNG TO quanh cửa sổ)</text>

          <text class="lbl-sm" x="${RX}" y="${RY - 16}" style="font-size:14px;font-weight:700;fill:var(--ink)">② Mô phỏng quỹ đạo ${SIM_T}s cho từng mẫu, chấm điểm, chọn tốt nhất</text>
          <rect x="${RX}" y="${RY}" width="${RW}" height="${RH}" fill="none" stroke="#cbd5e1" stroke-width="1"/>
          ${arcsSvg}
          <g transform="translate(${rOx},${rOy})"><polygon points="-8,-6 12,0 -8,6" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        `;
        statEl.innerHTML = `<b style="color:#16a34a">● hiện tại</b> v₀=${v0.toFixed(2)}m/s, ω₀=${w0.toFixed(2)}rad/s — <b style="color:#f59e0b">▬ ô vàng</b> = cửa sổ động (quãng robot CÓ THỂ đạt trong 1 chu kỳ 0.05s, công thức thật <code>projectVelocity()</code>) — <b style="color:#64748b">● chấm xám</b> = ${samples.length} mẫu (v,ω) lấy trong cửa sổ đó — <b style="color:#2563eb">◎ vòng xanh</b> = mẫu điểm cao nhất, quỹ đạo tương ứng (xanh đậm) ở khung dưới.`;
      }

      // ===================== RPP: hình học pure pursuit =====================
      function renderRPP() {
        const RX = 24, RY = 60, RW = 532, RH = 390;
        const scale = 170, ox = RX + 190, oy = RY + RH / 2;
        const toPx = (x, y) => [ox + x * scale, oy - y * scale];

        const Ld = 0.5; // lookahead_dist thật trong nav2_params_rpp.yaml
        // Path minh hoạ: 1 đường cong nhẹ, biên độ dao động chậm theo thời gian để thấy
        // điểm nhìn trước + bán kính cung trượt theo thời gian thực.
        const amp = 0.55 + 0.25 * Math.sin(time * 0.35);
        const dir = Math.sin(time * 0.15) >= 0 ? 1 : -1; // đổi dấu chậm -- để thấy cả cua trái lẫn cua phải
        function pathY(x) { return dir * amp * Math.sin(x * 1.6); }
        // Tìm điểm trên path cách gốc (robot) đúng Ld (dò nhị phân thô theo x).
        let bestX = Ld, bestErr = Infinity;
        for (let x = 0.05; x <= 2.0; x += 0.01) {
          const y = pathY(x);
          const d = Math.hypot(x, y);
          const err = Math.abs(d - Ld);
          if (err < bestErr) { bestErr = err; bestX = x; }
        }
        const carrotX = bestX, carrotY = pathY(bestX);
        const carrotDist2 = carrotX * carrotX + carrotY * carrotY;
        const curvature = 2.0 * carrotY / carrotDist2; // calculateCurvature() thật
        const R = Math.abs(curvature) > 1e-6 ? 1 / curvature : Infinity;

        const pathPts = [];
        for (let x = -0.3; x <= 2.0; x += 0.04) pathPts.push(toPx(x, pathY(x)));

        let arcSvg = '';
        if (Number.isFinite(R)) {
          const cx = 0, cy = R; // tâm cung vuông góc hướng robot (trục x) tại khoảng cách R
          const pts = [];
          // atan2(carrotX/R, 1-carrotY/R), KHÔNG PHẢI atan2(carrotX, R-carrotY) -- chia cho R
          // (không phải nhân) mới giữ đúng dấu khi R âm (cua phải), đã tự kiểm chứng bằng số.
          const totalAngle = Math.atan2(carrotX / R, 1 - carrotY / R);
          const steps = 24;
          for (let i = 0; i <= steps; i++) {
            const a = (totalAngle * i) / steps;
            const px = R * Math.sin(a), py = R - R * Math.cos(a);
            pts.push(toPx(px, py));
          }
          arcSvg = `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#16a34a" stroke-width="3.5"/>
            <circle cx="${toPx(0, R)[0].toFixed(1)}" cy="${toPx(0, R)[1].toFixed(1)}" r="3" class="pkt" style="fill:#16a34a"/>
            <line x1="${toPx(0, 0)[0].toFixed(1)}" y1="${toPx(0, 0)[1].toFixed(1)}" x2="${toPx(0, R)[0].toFixed(1)}" y2="${toPx(0, R)[1].toFixed(1)}" stroke="#16a34a" stroke-width="1" stroke-dasharray="3 3"/>`;
        }

        const [cax, cay] = toPx(carrotX, carrotY);
        const [rx0, ry0] = toPx(0, 0);
        // Vòng tròn bán kính Ld quanh robot (dashed) để thấy "điểm nhìn trước" là giao điểm
        // của path với vòng tròn này.
        const circlePts = Array.from({ length: 49 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return toPx(Ld * Math.cos(a), Ld * Math.sin(a));
        });

        svg.innerHTML = `
          <text class="lbl-sm" x="${RX}" y="24" style="font-size:14px;font-weight:700;fill:var(--ink)">Hình học pure pursuit: cung tròn qua điểm nhìn trước</text>
          <polyline points="${pathPts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#94a3b8" stroke-width="2.5"/>
          <polyline points="${circlePts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4"/>
          ${arcSvg}
          <line x1="${rx0}" y1="${ry0}" x2="${cax.toFixed(1)}" y2="${cay.toFixed(1)}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>
          <g transform="translate(${rx0},${ry0})"><polygon points="-10,-7 15,0 -10,7" style="fill:#2563eb;stroke:#fff;stroke-width:1"/></g>
          <circle cx="${cax.toFixed(1)}" cy="${cay.toFixed(1)}" r="6" class="pkt" style="fill:#dc2626"/>
          <text class="lbl-sm" x="${cax.toFixed(1)}" y="${(cay - 18).toFixed(1)}" text-anchor="middle" style="font-size:12px">điểm nhìn trước</text>
        `;
        statEl.innerHTML = `Điểm nhìn trước trong hệ robot: x=<b>${carrotX.toFixed(2)}</b>, y=<b>${carrotY.toFixed(2)}</b> (cam) · công thức thật <code>calculateCurvature()</code>: κ = 2y/(x²+y²) = <b>${curvature.toFixed(3)}</b> → bán kính cung R=1/κ=<b>${Number.isFinite(R) ? R.toFixed(2) + 'm' : '∞ (đi thẳng)'}</b> (xanh lá, tâm cách robot đúng R theo phương vuông góc hướng đi). <code>lookahead_dist=0.5m</code> đúng số thật trong <code>nav2_params_rpp.yaml</code>.`;
      }

      // ===================== MPPI: softmax trên quỹ đạo mẫu =====================
      let mppiSamples = null, mppiTimer = 0;
      function regenMppi() {
        const SIM_T = 1.5, N = 24;
        const nomV = 0.3, nomW = 0.1;
        mppiSamples = Array.from({ length: N }, () => {
          const v = Math.max(0, nomV + (Math.random() - 0.5) * 0.35);
          const w = nomW + (Math.random() - 0.5) * 1.3;
          // Chi phí minh hoạ: lệch xa (v,ω) "mẫu tốt" (tiến đều, ít xoay) thì phạt nặng hơn --
          // cùng Ý TƯỞNG với PathFollowCritic/PreferForwardCritic thật, không phải full 9 critic.
          const cost = (v - nomV) ** 2 * 4 + (w - nomW) ** 2 * 1.5;
          return { v, w, cost };
        });
      }
      regenMppi();
      function renderMPPI() {
        const TEMP = 0.3; // temperature thật trong nav2_params_mppi.yaml
        const minCost = Math.min(...mppiSamples.map((s) => s.cost));
        const weights = mppiSamples.map((s) => Math.exp(-(s.cost - minCost) / TEMP));
        const wSum = weights.reduce((a, b) => a + b, 0);
        const wNorm = weights.map((w) => w / wSum);
        const avgV = mppiSamples.reduce((a, s, i) => a + s.v * wNorm[i], 0);
        const avgW = mppiSamples.reduce((a, s, i) => a + s.w * wNorm[i], 0);

        const RX = 24, RY = 60, RW = 532, RH = 390;
        const scale = 170, ox = RX + 130, oy = RY + RH / 2;
        const toPx = (x, y) => [ox + x * scale, oy - y * scale];
        const SIM_T = 1.5;
        const maxW = Math.max(...wNorm);

        const arcsSvg = mppiSamples.map((s, i) => {
          const pts = unicycleArc(0, 0, 0, s.v, s.w, SIM_T, 18).map((p) => toPx(...p));
          const t = wNorm[i] / maxW;
          return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#f59e0b" stroke-width="${(1 + t * 2.5).toFixed(1)}" opacity="${(0.15 + t * 0.6).toFixed(2)}"/>`;
        }).join('');
        const avgPts = unicycleArc(0, 0, 0, avgV, avgW, SIM_T, 24).map((p) => toPx(...p));

        svg.innerHTML = `
          <text class="lbl-sm" x="${RX}" y="24" style="font-size:14px;font-weight:700;fill:var(--ink)">${mppiSamples.length} quỹ đạo mẫu (minh hoạ batch_size=3000 thật)</text>
          <text class="lbl-sm" x="${RX}" y="${RY - 14}" style="font-size:12px">đậm/dày = trọng số cao, mờ/mảnh = trọng số thấp</text>
          ${arcsSvg}
          <polyline points="${avgPts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#2563eb" stroke-width="4"/>
          <g transform="translate(${ox},${oy})"><polygon points="-10,-7 15,0 -10,7" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        `;
        statEl.innerHTML = `Chi phí thấp nhất trong ${mppiSamples.length} mẫu → trọng số cao nhất <b>${(maxW).toFixed(2)}</b> (chuẩn hoá). Lệnh thật = TRUNG BÌNH TRỌNG SỐ (không phải "chọn 1 mẫu tốt nhất"): v=<b>${avgV.toFixed(3)}</b>m/s, ω=<b>${avgW.toFixed(3)}</b>rad/s (xanh dương đậm) · công thức thật <code>optimizer.cpp</code>: wᵢ = exp(-(costᵢ-min)/temperature) / Σexp(...), temperature=<b>0.3</b> đúng số thật. Mẫu lại mỗi ${2.0}s để thấy yếu tố ngẫu nhiên.`;
      }

      function render() {
        if (active === 'dwb') renderDWB();
        else if (active === 'rpp') renderRPP();
        else renderMPPI();
      }

      function selectTab(key) {
        active = key;
        tabBtns.forEach((b) => {
          const on = b.dataset.key === key;
          b.style.background = on ? 'var(--brand-soft)' : 'var(--surface)';
          b.style.borderColor = on ? 'var(--brand)' : 'var(--line)';
          b.style.color = on ? 'var(--brand-ink)' : 'var(--ink-2)';
        });
        render();
      }
      tabBtns.forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.key)));
      selectTab('dwb');

      return {
        reset() { time = 0; mppiTimer = 0; regenMppi(); selectTab('dwb'); },
        update(dt) {
          time += dt;
          if (active === 'mppi') {
            mppiTimer += dt;
            if (mppiTimer >= 2.0) { mppiTimer = 0; regenMppi(); }
          }
          render();
        },
      };
    },
  });

  // ---------- 5. Kiến trúc Nav2 đầy đủ: ai gọi ai -- phỏng theo sơ đồ chính thức của Nav2 ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (geom_nav2arch.py lúc soạn bài) --
  // không đường nào cắt qua ô không liên quan, không box nào chồng nhau ngoài ý muốn (trừ các
  // ô con costmap/footprint cố tình lồng bên trong ô server cha, giống bản gốc).
  // Danh sách node + remapping lấy ĐÚNG từ atlas_slam/launch/navigation.launch.py thật -- đã
  // bỏ "Route Server" (sơ đồ gốc của Nav2 có, Atlas KHÔNG dùng) và bỏ "Costmap Sub/Footprint
  // Sub" dưới Smoother Server (chỉ behavior_server thật có 2 tham số đó, smoother_server thì
  // không) -- 2 chỗ cố tình khác bản gốc vì đó là sự thật của dự án, không phải thiếu sót.
  defineScene('nav2-architecture', {
    title: 'Kiến trúc Nav2 đầy đủ: ai gọi ai',
    caption: 'Phỏng theo đúng sơ đồ kiến trúc chính thức của Nav2, đối chiếu lại với navigation.launch.py thật của Atlas. Mũi tên 2 đầu (xám) = gọi action/service qua lại, không phải luồng dữ liệu liên tục. Mũi tên nét đứt chảy (xanh) = topic dữ liệu thật, chảy liên tục. 2 chỗ CỐ TÌNH khác sơ đồ gốc: không có "Route Server" (Atlas không dùng) và Smoother Server không có ô "Costmap Sub" (chỉ Behavior Server thật có tham số đó).',
    setup({ stage }) {
      const esc3 = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      function box(x, y, w, h, label, opts) {
        opts = opts || {};
        const dash = opts.dashed ? ' stroke-dasharray="5 4"' : '';
        const fill = opts.fill || 'var(--surface-2)';
        const lines = Array.isArray(label) ? label : [label];
        const fs = opts.fs || 12.5;
        const lh = fs + 3;
        const startY = y + h / 2 - ((lines.length - 1) * lh) / 2 + fs * 0.32;
        const text = lines.map((l, i) => `<text x="${x + w / 2}" y="${(startY + i * lh).toFixed(1)}" text-anchor="middle" style="font-size:${fs}px;${opts.bold ? 'font-weight:700;' : ''}fill:var(--ink)">${esc3(l)}</text>`).join('');
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" style="fill:${fill};stroke:#94a3b8;stroke-width:1.5"${dash}/>${text}`;
      }
      const ARROW_DEFS = `<defs><marker id="nv2arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>
        <marker id="nv2arrowflow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2563eb"/></marker></defs>`;

      function biArrow(x1, y1, x2, y2) {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1.8" marker-start="url(#nv2arrow)" marker-end="url(#nv2arrow)"/>`;
      }
      function flowArrow(id, x1, y1, x2, y2) {
        return `<line data-id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="7 6" marker-end="url(#nv2arrowflow)"/>`;
      }

      const html = `
        ${ARROW_DEFS}
        ${box(180, 10, 220, 44, 'Waypoint Follower', { dashed: true })}
        ${box(500, 10, 300, 44, 'RViz / CLI / send_goal_and_time.py', { dashed: true, fs: 11.5 })}
        ${biArrow(290, 54, 290, 136)}
        ${biArrow(650, 54, 650, 136)}

        <rect x="120" y="70" width="700" height="480" rx="18" style="fill:#eff6ff;stroke:#93c5fd;stroke-width:2"/>
        ${box(730, 80, 90, 40, ['Lifecycle', 'Manager'], { fill: '#e2e8f0', fs: 11 })}
        ${box(140, 136, 660, 55, 'BT Navigator Server', { bold: true, fs: 14.5 })}
        <text x="730" y="172" text-anchor="middle" style="font-size:11px;fill:var(--muted)">(BT Plugins, bài trên)</text>

        ${biArrow(215, 191, 215, 240)}
        ${biArrow(385, 191, 385, 240)}
        ${biArrow(555, 191, 555, 240)}
        ${biArrow(725, 191, 725, 240)}

        ${box(140, 240, 150, 150, '', {})}
        <text x="215" y="268" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Controller</text>
        <text x="215" y="284" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Server</text>
        ${box(150, 310, 130, 55, 'Local Costmap', { fill: '#dbeafe', fs: 11.5 })}

        ${box(310, 240, 150, 150, '', {})}
        <text x="385" y="268" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Planner</text>
        <text x="385" y="284" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Server</text>
        ${box(320, 310, 130, 55, 'Global Costmap', { fill: '#dbeafe', fs: 11.5 })}

        ${box(480, 240, 150, 150, '', {})}
        <text x="555" y="268" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Behavior</text>
        <text x="555" y="284" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Server</text>
        ${box(490, 310, 130, 55, ['Costmap Sub.', 'Footprint Sub.'], { fill: '#dbeafe', fs: 10.5 })}

        ${box(650, 240, 150, 150, '', {})}
        <text x="725" y="268" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Smoother</text>
        <text x="725" y="284" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Server</text>
        <text x="725" y="335" text-anchor="middle" style="font-size:10.5px;fill:var(--muted);font-style:italic">(Atlas: không có</text>
        <text x="725" y="349" text-anchor="middle" style="font-size:10.5px;fill:var(--muted);font-style:italic">Costmap Sub ở đây)</text>

        <line x1="55" y1="163" x2="140" y2="163" stroke="#64748b" stroke-width="1.8" marker-end="url(#nv2arrow)"/>
        <text x="30" y="149" style="font-size:12px;fill:var(--muted)">BT</text>

        ${flowArrow('e-tf', 60, 215, 120, 215)}
        <text x="30" y="219" style="font-size:12px;fill:var(--muted)">TF</text>
        ${flowArrow('e-map', 60, 285, 120, 285)}
        <text x="20" y="289" style="font-size:12px;fill:var(--muted)">map</text>
        ${flowArrow('e-sensor', 60, 345, 120, 345)}
        <text x="4" y="337" style="font-size:12px;fill:var(--muted)">Sensor</text>
        <text x="8" y="351" style="font-size:12px;fill:var(--muted)">Data</text>

        ${flowArrow('e-ctrl-vel', 215, 390, 215, 590)}
        ${box(135, 590, 160, 55, 'Velocity Smoother', { fs: 12 })}
        ${flowArrow('e-vel-robot', 295, 617, 455, 617)}
        ${box(455, 590, 280, 55, ['Robot Base', '(diff_drive_controller, Module 5)'], { fs: 12, bold: false })}
      `;

      const [W, H] = [840, 665];
      stage.innerHTML = `<svg class="svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kiến trúc Nav2 đầy đủ: BT Navigator điều phối Controller/Planner/Behavior/Smoother Server, Lifecycle Manager quản lý vòng đời, Velocity Smoother ra /cmd_vel thật">${html}</svg>`;
      const svg = stage.querySelector('svg');
      const FLOW_IDS = ['e-tf', 'e-map', 'e-sensor', 'e-ctrl-vel', 'e-vel-robot'];
      const FLOW_SPEED = 45;
      let dashPhase = 0;
      return {
        reset() { dashPhase = 0; },
        update(dt) {
          dashPhase -= FLOW_SPEED * dt;
          FLOW_IDS.forEach((id) => { const el = svg.querySelector(`[data-id="${id}"]`); if (el) el.setAttribute('stroke-dashoffset', dashPhase.toFixed(1)); });
        },
      };
    },
  });
})();
