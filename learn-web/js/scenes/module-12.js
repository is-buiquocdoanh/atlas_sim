// Mô hình mô phỏng cho Module 12 (Waypoint following & Nav2 Simple Commander API).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Action: 1 goal, NHIỀU feedback, rồi 1 result (hoặc hủy giữa chừng) ----------
  // Sơ đồ tự vẽ lại, KHÔNG chép nguyên hình trong docs/course/module-12-waypoint/images/
  // action-lifecycle.svg -- hình đó ghi nhãn server là "bt_navigator", nhưng action thật của
  // bài này (/follow_waypoints) do waypoint_follower mở (xác nhận ở bài 1, ros2 node info
  // /waypoint_follower) -- sửa đúng tên server thật khi vẽ lại.
  defineScene('action-lifecycle', {
    title: 'Action: 1 goal, nhiều feedback, rồi 1 result (hoặc hủy giữa chừng)',
    caption: 'Client = patrol_node/waypoint_demo.py, Server = waypoint_follower (node thật mở action /follow_waypoints -- không phải bt_navigator). Bấm "Hủy giữa chừng" bất cứ lúc nào trước khi có result để xem cancelTask() đổi kết quả cuối thành CANCELED.',
    setup({ stage, ui }) {
      const CX = 120, SX = 480, BW = 190, BH = 40, BY = 30;
      const Y0 = 100, ROWH = 42, LIFE_BOTTOM = 400;
      const VW = 600, VH = 430;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Sequence diagram: action goal, feedback, result hoặc hủy">
          <text x="${VW / 2}" y="18" text-anchor="middle" style="font-size:12.5px;font-weight:700;fill:var(--ink)">1 goal → nhiều feedback → 1 result (hoặc hủy giữa chừng)</text>
          <rect x="${CX - BW / 2}" y="${BY}" width="${BW}" height="${BH}" rx="8" style="fill:var(--surface-2);stroke:var(--brand);stroke-width:2"/>
          <text x="${CX}" y="${BY + BH / 2 + 4}" text-anchor="middle" style="font-size:11px;fill:var(--ink)">Client (patrol_node)</text>
          <line x1="${CX}" y1="${BY + BH}" x2="${CX}" y2="${LIFE_BOTTOM}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"/>
          <rect x="${SX - BW / 2}" y="${BY}" width="${BW}" height="${BH}" rx="8" style="fill:var(--surface-2);stroke:#7c3aed;stroke-width:2"/>
          <text x="${SX}" y="${BY + BH / 2 + 4}" text-anchor="middle" style="font-size:11px;fill:var(--ink)">Server (waypoint_follower)</text>
          <line x1="${SX}" y1="${BY + BH}" x2="${SX}" y2="${LIFE_BOTTOM}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"/>
          <g data-k="rows"></g>
        </svg>
        <div class="stat" data-k="status" style="margin-top:10px;font-weight:600"></div>`;
      ui.innerHTML = `<button class="btn-sm" data-k="cancel">Hủy giữa chừng (cancelTask)</button>`;

      const rowsEl = stage.querySelector('[data-k="rows"]');
      const statusEl = stage.querySelector('[data-k="status"]');
      const cancelBtn = ui.querySelector('[data-k="cancel"]');

      const N_FB = 4; // 4 waypoint -> feedback.current_waypoint = 0..3
      const STEP_DUR = 0.9, HOLD_DUR = 2.2;

      let shown, canceled, canceledAtK, timer, holding;
      function freshRun() { shown = 0; canceled = false; canceledAtK = null; timer = 0; holding = false; }
      freshRun();

      function totalRows() { return canceled ? canceledAtK + 3 : N_FB + 2; }

      function rowAt(i) {
        if (i === 0) return { type: 'goal' };
        if (!canceled) {
          if (i <= N_FB) return { type: 'fb', idx: i - 1 };
          return { type: 'result', outcome: 'SUCCEEDED' };
        }
        if (i <= canceledAtK) return { type: 'fb', idx: i - 1 };
        if (i === canceledAtK + 1) return { type: 'cancel' };
        return { type: 'result', outcome: 'CANCELED' };
      }

      function render() {
        let svg = '';
        let lastLabel = '';
        for (let i = 0; i < shown; i++) {
          const row = rowAt(i);
          const y = Y0 + i * ROWH;
          if (row.type === 'goal') {
            svg += `<line x1="${CX}" y1="${y}" x2="${SX - 4}" y2="${y}" style="stroke:#2563eb;stroke-width:2" marker-end="url(#m12-arrow-b)"/>`;
            svg += `<text x="${(CX + SX) / 2}" y="${y - 7}" text-anchor="middle" style="font-size:10px;fill:var(--ink-2)">goal: followWaypoints([4 điểm])</text>`;
            lastLabel = 'Đã gửi goal followWaypoints() -- action không chặn, trả về ngay.';
          } else if (row.type === 'fb') {
            svg += `<line x1="${SX}" y1="${y}" x2="${CX + 4}" y2="${y}" style="stroke:#d97706;stroke-width:1.8;stroke-dasharray:4 3" marker-end="url(#m12-arrow-w)"/>`;
            svg += `<text x="${(CX + SX) / 2}" y="${y - 7}" text-anchor="middle" style="font-size:10px;fill:var(--ink-2)">feedback: current_waypoint=${row.idx} (đi tới #${row.idx + 1}/4)</text>`;
            lastLabel = `getFeedback().current_waypoint = ${row.idx} -- đang đi tới waypoint thứ ${row.idx + 1}/4.`;
          } else if (row.type === 'cancel') {
            svg += `<line x1="${CX}" y1="${y}" x2="${SX - 4}" y2="${y}" style="stroke:#dc2626;stroke-width:2" marker-end="url(#m12-arrow-r)"/>`;
            svg += `<text x="${(CX + SX) / 2}" y="${y - 7}" text-anchor="middle" style="font-size:10px;fill:#dc2626">cancelTask() -- Ctrl+C, hoặc logic tự quyết định hủy</text>`;
            lastLabel = 'nav.cancelTask() -- yêu cầu hủy gửi đi, server dừng giữa chừng.';
          } else {
            const ok = row.outcome === 'SUCCEEDED';
            const col = ok ? '#059669' : '#dc2626';
            svg += `<line x1="${SX}" y1="${y}" x2="${CX + 4}" y2="${y}" style="stroke:${col};stroke-width:2.2" marker-end="url(#${ok ? 'm12-arrow-g' : 'm12-arrow-r'})"/>`;
            svg += `<text x="${(CX + SX) / 2}" y="${y - 7}" text-anchor="middle" style="font-size:10.5px;font-weight:700;fill:${col}">result: ${row.outcome}</text>`;
            lastLabel = ok
              ? 'nav.getResult() == TaskResult.SUCCEEDED -- cả 4 waypoint đã xong.'
              : 'nav.getResult() == TaskResult.CANCELED -- dừng đúng tại waypoint đang đi, không traceback.';
          }
        }
        rowsEl.innerHTML = svg;
        statusEl.textContent = shown === 0 ? 'Chuẩn bị gửi goal...' : lastLabel;
        const done = shown >= totalRows();
        cancelBtn.disabled = done || shown === 0;
      }

      // 4 marker màu khác nhau cho 4 loại mũi tên, định nghĩa 1 lần trong <defs>.
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <marker id="m12-arrow-b" markerWidth="9" markerHeight="9" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" style="fill:#2563eb"/></marker>
        <marker id="m12-arrow-w" markerWidth="9" markerHeight="9" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" style="fill:#d97706"/></marker>
        <marker id="m12-arrow-r" markerWidth="9" markerHeight="9" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" style="fill:#dc2626"/></marker>
        <marker id="m12-arrow-g" markerWidth="9" markerHeight="9" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" style="fill:#059669"/></marker>`;
      stage.querySelector('svg').prepend(defs);

      cancelBtn.addEventListener('click', () => {
        if (cancelBtn.disabled) return;
        canceled = true;
        canceledAtK = Math.max(0, shown - 1); // số feedback đã hiện ra tính tới lúc bấm
        timer = 0;
      });

      render();

      return {
        reset() { freshRun(); render(); },
        update(dt) {
          timer += dt;
          const done = shown >= totalRows();
          if (!done) {
            if (timer < STEP_DUR) return;
            timer = 0;
            shown++;
            render();
            return;
          }
          if (timer < HOLD_DUR) return;
          freshRun();
          render();
        },
      };
    },
  });

  // ---------- 1. Theo dõi waypoint sống: feedback, hủy giữa chừng, tuần tra vô hạn ----------
  // Toạ độ 4 waypoint + spawn mặc định (0,0) lấy NGUYÊN VĂN từ waypoint_demo.py / spawn_robot.
  // launch.py. Tường maze lấy đúng pose/size thật trong atlas_gazebo/worlds/maze.sdf. Đường nối
  // giữa các waypoint là đường cong MINH HỌA thứ tự ghé qua (không phải đường planner thật --
  // đường thẳng nối trực tiếp sẽ xuyên qua 3/4 bức tường trong, đã kiểm bằng script hình học
  // trước khi chọn các điểm điều khiển Bezier này -- xem geom_m12_*.py).
  defineScene('waypoint-follow-live', {
    title: 'Theo dõi BasicNavigator sống: feedback, hủy, tuần tra vô hạn',
    caption: 'Toạ độ 4 waypoint + 3 bức tường trong là số liệu thật (waypoint_demo.py, maze.sdf) -- đường cong nối giữa các điểm chỉ minh họa THỨ TỰ ghé qua, không phải đường planner thật (đường thẳng sẽ xuyên tường, Module 10 mới là nơi tính đường tránh vật cản thật). Bấm "Hủy giữa chừng" để xem cancelTask(), hoặc đổi chế độ để so sánh waypoint_demo.py (1 vòng) với patrol_node.py (vô hạn, bài tập).',
    setup({ stage, ui }) {
      const SCALE = 70, OX = 300, OY = 230; // khớp đúng geom_m12_maze.py đã kiểm trước khi vẽ
      const toPx = (xm, ym) => [OX + xm * SCALE, OY - ym * SCALE];

      const WP_M = [[-2.5, 0.0], [0.0, 2.0], [2.5, 0.0], [0.0, -2.0]]; // WAYPOINTS thật
      const ORIGIN_M = [0.0, 0.0]; // spawn mặc định thật (spawn_robot.launch.py: x=0.0 y=0.0)
      const WP_PX = WP_M.map(([x, y]) => toPx(x, y));
      const ORIGIN_PX = toPx(...ORIGIN_M);

      // Tường thật (tâm, kích thước mét) từ maze.sdf -- chỉ 3 tường trong + 4 tường bao.
      const WALLS_M = [
        [0, 2.5, 7.1, 0.1], [0, -2.5, 7.1, 0.1], [3.5, 0, 0.1, 5.1], [-3.5, 0, 0.1, 5.1],
        [-2.0, 1.4, 3.0, 0.1], [2.25, 0.3, 2.5, 0.1], [-1.45, -1.2, 4.1, 0.1],
      ];
      function wallRectPx([cx, cy, w, h]) {
        const [x0, y0] = toPx(cx - w / 2, cy + h / 2);
        const [x1, y1] = toPx(cx + w / 2, cy - h / 2);
        return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
      }
      const wallsSvg = WALLS_M.map((w) => {
        const [x, y, ww, hh] = wallRectPx(w);
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" style="fill:#475569"/>`;
      }).join('');

      // 5 chặng: L0 gốc->WP0 (thẳng, đã kiểm không xuyên tường), L1..L3 giữa các waypoint liên
      // tiếp, L4 WP3->WP0 (chặng lặp lại khi tuần tra) -- mỗi control point đã verify CLEAR.
      const CTRL_M = [null, [0.40, 1.00], [0.35, -0.60], [1.60, -1.00], [2.60, -0.50]];
      const LEGS = [0, 1, 2, 3, 4].map((i) => {
        const from = i === 0 ? ORIGIN_PX : WP_PX[(i - 1) % 4];
        const to = i === 4 ? WP_PX[0] : WP_PX[i];
        const ctrl = CTRL_M[i] ? toPx(...CTRL_M[i]) : [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        return { from, to, ctrl, targetFb: i === 4 ? 0 : i };
      });
      function bezierPos(leg, t) {
        const { from: p0, ctrl: c, to: p1 } = leg;
        const u = 1 - t;
        return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
      }
      function bezierTangentDeg(leg, t) {
        const { from: p0, ctrl: c, to: p1 } = leg;
        const u = 1 - t;
        const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
        const dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      const legPath = (leg) => `M${leg.from[0].toFixed(1)},${leg.from[1].toFixed(1)} Q${leg.ctrl[0].toFixed(1)},${leg.ctrl[1].toFixed(1)} ${leg.to[0].toFixed(1)},${leg.to[1].toFixed(1)}`;
      // Vòng lặp hiển thị cố định (không vẽ chặng khởi động L0, chỉ vẽ đúng vòng tuần tra).
      const loopPathsSvg = [1, 2, 3, 4].map((i) => `<path d="${legPath(LEGS[i])}" style="fill:none;stroke:#cbd5e1;stroke-width:2;stroke-dasharray:5 4"/>`).join('');

      const VW = 600, VH = 450;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Robot theo dõi 4 waypoint trong maze.sdf, feedback sống">
          <text x="${VW / 2}" y="20" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--ink)">maze.sdf -- 4 waypoint thật của waypoint_demo.py</text>
          ${wallsSvg}
          <g data-k="loop">${loopPathsSvg}</g>
          <circle data-k="origin" cx="${ORIGIN_PX[0]}" cy="${ORIGIN_PX[1]}" r="4" class="pkt" style="fill:#94a3b8;stroke:none"/>
          <text x="${ORIGIN_PX[0]}" y="${ORIGIN_PX[1] - 10}" text-anchor="middle" style="font-size:8.5px;fill:var(--muted)">spawn (0,0)</text>
          <g data-k="wps"></g>
          <g data-k="robot"><polygon points="-9,-7 13,0 -9,7" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        </svg>
        <div class="stat" data-k="status" style="margin-top:10px;font-weight:600"></div>
        <div class="stat" data-k="counters" style="margin-top:4px"></div>`;
      ui.innerHTML = `
        <button class="btn-sm" data-k="cancel">Hủy giữa chừng (cancelTask)</button>
        <button class="btn-sm" data-k="mode">Chế độ: 1 vòng (waypoint_demo.py)</button>`;

      const wpsEl = stage.querySelector('[data-k="wps"]');
      const robotEl = stage.querySelector('[data-k="robot"]');
      const statusEl = stage.querySelector('[data-k="status"]');
      const countersEl = stage.querySelector('[data-k="counters"]');
      const cancelBtn = ui.querySelector('[data-k="cancel"]');
      const modeBtn = ui.querySelector('[data-k="mode"]');

      function renderWaypoints(passedUpTo, activeIdx) {
        let svg = '';
        WP_PX.forEach(([x, y], i) => {
          const passed = passedUpTo !== null && i <= passedUpTo && !(activeIdx === i);
          const active = i === activeIdx;
          const fill = active ? 'var(--brand-soft)' : passed ? 'var(--ok-soft)' : 'var(--surface-2)';
          const stroke = active ? 'var(--brand)' : passed ? 'var(--ok)' : '#94a3b8';
          svg += `<circle cx="${x}" cy="${y}" r="15" class="pkt" style="fill:${fill};stroke:${stroke};stroke-width:2.5"/>`;
          svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--ink)">${i + 1}</text>`;
        });
        wpsEl.innerHTML = svg;
      }

      const LEG_DUR = 1.6, PAUSE_DUR = 0.5, HOLD_DUR = 2.2;
      let mode = 'single'; // 'single' | 'patrol'
      let legIdx, phase, t, timer, lap, canceled, frozenPos, frozenDeg;

      function freshRun() {
        legIdx = 0; phase = 'moving'; t = 0; timer = 0; lap = 0; canceled = false;
        frozenPos = null; frozenDeg = null;
        robotEl.setAttribute('transform', `translate(${ORIGIN_PX[0]},${ORIGIN_PX[1]}) rotate(0)`);
      }
      freshRun();

      function draw() {
        const leg = LEGS[legIdx];
        let pos, deg;
        if (phase === 'canceled_hold') {
          pos = frozenPos; deg = frozenDeg;
        } else if (phase === 'paused' || phase === 'result') {
          pos = leg.to; deg = bezierTangentDeg(leg, 1);
        } else {
          pos = bezierPos(leg, t); deg = bezierTangentDeg(leg, t);
        }
        robotEl.setAttribute('transform', `translate(${pos[0].toFixed(1)},${pos[1].toFixed(1)}) rotate(${deg.toFixed(1)})`);

        const target = leg.targetFb;
        const passedUpTo = legIdx === 0 ? null : (legIdx - 1) % 4;
        const activeIdx = phase === 'result' && !canceled ? null : target;
        renderWaypoints(phase === 'result' && !canceled ? 3 : passedUpTo, activeIdx);

        if (phase === 'moving') {
          statusEl.textContent = `Đang đi tới waypoint #${target + 1}/4 (feedback.current_waypoint=${target})`;
        } else if (phase === 'paused') {
          statusEl.textContent = `Đã tới waypoint #${target + 1}/4 -- dừng ngắn (wait_at_waypoint, waypoint_pause_duration thật=200ms)`;
        } else if (phase === 'canceled_hold') {
          statusEl.innerHTML = `<span style="color:var(--bad)">Ctrl+C -- hủy task giữa chừng... nav.cancelTask() → result: CANCELED</span>`;
        } else if (phase === 'result') {
          statusEl.innerHTML = mode === 'patrol'
            ? `<span style="color:var(--ok)">Hoàn thành vòng tuần tra #${lap} -- SUCCEEDED, gửi lại followWaypoints() ngay</span>`
            : `<span style="color:var(--ok)">Kết quả: SUCCEEDED -- nav.getResult() == TaskResult.SUCCEEDED</span>`;
        }
        countersEl.innerHTML = `Chế độ: <b>${mode === 'patrol' ? 'tuần tra vô hạn (patrol_node.py)' : '1 vòng (waypoint_demo.py)'}</b> · Vòng đã hoàn thành: <b>${lap}</b>`;
        cancelBtn.disabled = phase === 'canceled_hold' || phase === 'result';
      }
      draw();

      cancelBtn.addEventListener('click', () => {
        if (cancelBtn.disabled) return;
        const leg = LEGS[legIdx];
        frozenPos = phase === 'moving' ? bezierPos(leg, t) : leg.to;
        frozenDeg = phase === 'moving' ? bezierTangentDeg(leg, t) : bezierTangentDeg(leg, 1);
        canceled = true; phase = 'canceled_hold'; timer = 0;
        draw();
      });
      modeBtn.addEventListener('click', () => {
        mode = mode === 'single' ? 'patrol' : 'single';
        modeBtn.textContent = mode === 'patrol' ? 'Chế độ: tuần tra vô hạn (patrol_node.py)' : 'Chế độ: 1 vòng (waypoint_demo.py)';
        draw();
      });

      return {
        reset() { freshRun(); draw(); },
        update(dt) {
          timer += dt;
          if (phase === 'moving') {
            t = Math.min(1, timer / LEG_DUR);
            if (timer >= LEG_DUR) {
              timer = 0;
              const isLastOfLap = legIdx === 3; // vừa tới WP3 -> hết 1 vòng followWaypoints
              phase = isLastOfLap ? 'result' : 'paused';
            }
            draw();
            return;
          }
          if (phase === 'paused') {
            if (timer < PAUSE_DUR) return;
            timer = 0; legIdx += 1; t = 0; phase = 'moving';
            draw();
            return;
          }
          if (phase === 'result') {
            if (timer < HOLD_DUR) return;
            lap += 1;
            if (mode === 'patrol') {
              timer = 0; legIdx = 4; t = 0; phase = 'moving'; // chặng lặp lại WP3->WP0
            } else {
              freshRun(); lap = 0;
            }
            draw();
            return;
          }
          if (phase === 'canceled_hold') {
            if (timer < HOLD_DUR) return;
            freshRun();
            draw();
          }
        },
      };
    },
  });
})();
