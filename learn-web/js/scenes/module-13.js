// Mô hình mô phỏng cho Module 13 (Capstone -- Atlas Delivery). Không khái niệm mới: 2 scene này
// chỉ GHÉP LẠI trực quan những gì Module 8-12 đã dạy, đúng tinh thần "capstone" của module.
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Pipeline capstone: ghép lại 5 module thành 1, cộng thêm việc MỚI ----------
  // Bố cục + nội dung bám sát docs/course/module-13-capstone/images/capstone-architecture.svg,
  // thêm lớp bấm-để-xem-chi-tiết (ảnh gốc chỉ tĩnh).
  defineScene('capstone-pipeline', {
    title: 'Capstone = ghép lại các khối đã học, theo 1 pipeline',
    caption: 'Bấm từng ô để xem nó ứng với lệnh/file thật nào. 5 ô hàng trên là các khối ĐÃ CHẠY ĐƯỢC riêng lẻ (Module 8-12) -- ô "Capstone" bên dưới là phần việc DUY NHẤT thật sự mới: không có sẵn ở module nào, bạn phải tự ghép.',
    setup({ stage }) {
      const BOXES = [
        { id: 'slam', label: 'SLAM', sub: 'vẽ map', mod: 'Module 8',
          info: 'slam_toolbox vẽ map trên world mới của bạn -- ros2 launch atlas_slam slam.launch.py, lưu bằng map_saver_cli -f <tên map>.' },
        { id: 'amcl', label: 'AMCL', sub: 'định vị', mod: 'Module 9',
          info: 'Nạp map vừa lưu, định vị bằng particle filter -- ros2 launch atlas_slam navigation.launch.py map:=<map>.yaml localization:=amcl.' },
        { id: 'nav2', label: 'Nav2 core', sub: 'costmap/planner/controller', mod: 'Module 10',
          info: 'costmap (static+obstacle+inflation) nuôi planner_server (NavFn) và controller_server (DWB/RPP/MPPI) -- vẫn navigation.launch.py, chọn qua controller:=.' },
        { id: 'bt', label: 'Recovery/BT', sub: 'tự khắc phục kẹt', mod: 'Module 11',
          info: 'bt_navigator điều phối theo BT XML: gặp vật cản mới tự ClearEntireCostmap, Spin, Wait, BackUp -- không cần viết thêm code, chỉ cần Nav2 core ở trên chạy đúng.' },
        { id: 'patrol', label: 'patrol_node.py', sub: 'tự viết, atlas_apps', mod: 'Module 12',
          info: 'BasicNavigator.followWaypoints(), đọc feedback.current_waypoint, cancelTask() -- code mẫu (waypoint_demo.py) đã có, bạn tự mở rộng thành kịch bản giao hàng.' },
      ];
      const CAP = {
        id: 'capstone', label: 'Capstone -- việc MỚI, không có sẵn ở module nào',
        info: 'warehouse world (đã có sẵn atlas_gazebo/worlds/warehouse.sdf, hoặc tự thiết kế) + ≥3 điểm giao hàng + vật cản tĩnh ngoài map gốc + log thời gian/quãng đường/số lần recovery -- đây là phần DUY NHẤT bạn phải tự ghép, không chạy sẵn lệnh nào ra được.',
      };

      const BW = 140, BH = 60, GAP = 20, BY = 50;
      BOXES.forEach((b, i) => { b.x = 20 + i * (BW + GAP); });
      const VW = 830, VH = 330;
      const CAPW = 500, CAPX = (VW - CAPW) / 2, CAPY = 200, CAPH = 90;
      const midX = VW / 2;

      let boxesSvg = '';
      for (let i = 0; i < BOXES.length - 1; i++) {
        const a = BOXES[i], b2 = BOXES[i + 1];
        boxesSvg += `<line x1="${a.x + BW}" y1="${BY + BH / 2}" x2="${b2.x}" y2="${BY + BH / 2}" data-flow stroke="#94a3b8" stroke-width="2.5"/>`;
      }
      boxesSvg += `<line x1="${midX}" y1="${BY + BH}" x2="${midX}" y2="${CAPY}" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#m13-arrow)"/>`;
      BOXES.forEach((b) => {
        boxesSvg += `<g data-box="${b.id}" style="cursor:pointer">
          <rect class="node-box-rect" x="${b.x}" y="${BY}" width="${BW}" height="${BH}" rx="8"/>
          <text class="node-name" x="${b.x + BW / 2}" y="${BY + 24}" style="font-size:12.5px">${esc(b.label)}</text>
          <text class="lbl-sm" x="${b.x + BW / 2}" y="${BY + 40}" style="font-size:9.5px">${esc(b.sub)}</text>
          <text class="lbl-sm" x="${b.x + BW / 2}" y="${BY + 53}" style="font-size:9px;fill:var(--brand)">${esc(b.mod)}</text>
        </g>`;
      });
      boxesSvg += `<g data-box="capstone" style="cursor:pointer">
        <rect x="${CAPX}" y="${CAPY}" width="${CAPW}" height="${CAPH}" rx="8" style="fill:#fff7ed;stroke:var(--accent);stroke-width:2"/>
        <text x="${midX}" y="${CAPY + 26}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:#c2410c">${esc(CAP.label)}</text>
        <text x="${midX}" y="${CAPY + 46}" text-anchor="middle" style="font-size:9.5px;fill:#9a3412">warehouse world + ≥3 điểm giao hàng + vật cản tĩnh ngoài map gốc</text>
        <text x="${midX}" y="${CAPY + 62}" text-anchor="middle" style="font-size:9.5px;fill:#9a3412">+ log thời gian / quãng đường / số lần recovery</text>
      </g>`;

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Pipeline capstone: SLAM, AMCL, Nav2 core, Recovery/BT, patrol_node.py đổ vào 1 khối Capstone mới">
          <defs><marker id="m13-arrow" markerWidth="9" markerHeight="9" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" style="fill:#94a3b8"/></marker></defs>
          ${boxesSvg}
        </svg>
        <div class="stat" data-k="info" style="margin-top:10px">Bấm 1 ô để xem nó ứng với lệnh/file thật nào.</div>`;

      const svg = stage.querySelector('svg');
      const infoEl = stage.querySelector('[data-k="info"]');
      const FLOW_IDS_SEL = '[data-flow]';
      const ALL = [...BOXES, CAP];

      function select(id) {
        svg.querySelectorAll('[data-box]').forEach((g) => g.querySelector('rect').classList.remove('hot'));
        const g = svg.querySelector(`[data-box="${id}"]`);
        if (g) g.querySelector('rect').classList.add('hot');
        const item = ALL.find((b) => b.id === id);
        infoEl.innerHTML = item ? `<b>${esc(item.label)}</b>${item.mod ? ` (${item.mod})` : ''} -- ${esc(item.info)}` : '';
      }
      svg.querySelectorAll('[data-box]').forEach((g) => {
        g.addEventListener('click', () => select(g.dataset.box));
      });

      const flowEls = [...svg.querySelectorAll(FLOW_IDS_SEL)];
      flowEls.forEach((el) => el.setAttribute('stroke-dasharray', '8 7'));
      let dashPhase = 0;
      return {
        reset() { select(null); dashPhase = 0; },
        update(dt) {
          dashPhase -= 40 * dt;
          flowEls.forEach((el) => el.setAttribute('stroke-dashoffset', dashPhase.toFixed(1)));
        },
      };
    },
  });

  // ---------- 1. Minh họa 1 lượt chạy capstone: giao hàng + vật cản mới + log sống ----------
  // Tường/kệ lấy ĐÚNG pose thật trong atlas_gazebo/worlds/warehouse.sdf (file đã có sẵn trong
  // repo, dùng được ngay qua world:=warehouse.sdf). 3 điểm giao hàng + vật cản là VÍ DỤ MINH HỌA
  // (world thật, lộ trình là của bạn tự chọn) -- quãng đường hiển thị CÓ tính thật từ toạ độ mét
  // thật của các điểm này, không phải số random.
  defineScene('warehouse-delivery-demo', {
    title: 'Ví dụ 1 lượt chạy: giao 3 điểm, né vật cản mới, log sống',
    caption: 'Tường + 6 kệ hàng là toạ độ THẬT trong atlas_gazebo/worlds/warehouse.sdf (file có sẵn, dùng ngay bằng world:=warehouse.sdf). 3 điểm giao hàng + vật cản (ô đỏ) chỉ là VÍ DỤ MINH HỌA lộ trình -- quãng đường hiển thị cộng dồn từ đúng khoảng cách mét thật giữa các điểm này. Thời gian là thời gian mô phỏng của scene (đã tăng tốc), không phải log robot thật.',
    setup({ stage, ui }) {
      const SCALE = 55, OX = 345, OY = 255; // đã kiểm bằng geom_m13.py trước khi vẽ
      const toPx = (xm, ym) => [OX + xm * SCALE, OY - ym * SCALE];

      const WALLS_M = [
        [0, 4.0, 12.1, 0.1], [0, -4.0, 12.1, 0.1], [6.0, 0, 0.1, 8.1], [-6.0, 0, 0.1, 8.1],
      ];
      const SHELVES_M = [
        [-3.25, 2.2, 4.5, 0.5], [3.25, 2.2, 4.5, 0.5],
        [-3.25, 0, 4.5, 0.5], [3.25, 0, 4.5, 0.5],
        [-3.25, -2.2, 4.5, 0.5], [3.25, -2.2, 4.5, 0.5],
      ];
      function rectPx([cx, cy, w, h]) {
        const [x0, y0] = toPx(cx - w / 2, cy + h / 2);
        const [x1, y1] = toPx(cx + w / 2, cy - h / 2);
        return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
      }
      const wallsSvg = WALLS_M.map((w) => { const [x, y, ww, hh] = rectPx(w); return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" style="fill:#475569"/>`; }).join('');
      const shelvesSvg = SHELVES_M.map((w) => { const [x, y, ww, hh] = rectPx(w); return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="3" style="fill:#b08a4a"/>`; }).join('');

      // Điểm thật (mét) -- DOCK = nơi xuất phát/kết thúc, CORNER = điểm trung chuyển trong lối
      // đi giữa (luôn an toàn: x=0 xuyên suốt mọi hàng kệ), D1-D3 = 3 điểm giao hàng ví dụ.
      const DOCK = [0, -3.2], CORNER = [0, 3.2], D1 = [-3.25, 3.2], D2 = [3.25, 3.2], D3 = [0, 0];
      const OBSTACLE = [0, 1.1];
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      // 6 chặng thẳng, mỗi chặng đã verify không xuyên kệ (geom_m13.py) -- chặng 0 và 4 đi qua
      // đúng toạ độ vật cản (x=0), nơi robot sẽ "phát hiện vật cản mới, né sang bên" 2 lần/vòng.
      const LEGS = [
        { from: DOCK, to: CORNER, obstacleT: (OBSTACLE[1] - DOCK[1]) / (CORNER[1] - DOCK[1]) },
        { from: CORNER, to: D1, deliver: 1 },
        { from: D1, to: D2, deliver: 2 },
        { from: D2, to: CORNER, deliver: null },
        { from: CORNER, to: D3, deliver: 3, obstacleT: (CORNER[1] - OBSTACLE[1]) / (CORNER[1] - D3[1]) },
        { from: D3, to: DOCK, deliver: null },
      ];
      const TOTAL_DIST = LEGS.reduce((s, l) => s + dist(l.from, l.to), 0); // 25.8m thật, cộng từ toạ độ trên

      const VW = 690, VH = 500;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Minh họa 1 lượt chạy capstone trong warehouse.sdf: giao 3 điểm, né vật cản mới">
          <text x="${VW / 2}" y="16" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--ink)">warehouse.sdf thật -- ví dụ 1 lượt giao hàng</text>
          ${wallsSvg}${shelvesSvg}
          <g data-k="obstacle"></g>
          <circle data-k="dock" cx="${toPx(...DOCK)[0]}" cy="${toPx(...DOCK)[1]}" r="5" class="pkt" style="fill:#64748b;stroke:none"/>
          <text x="${toPx(...DOCK)[0]}" y="${toPx(...DOCK)[1] + 18}" text-anchor="middle" style="font-size:8.5px;fill:var(--muted)">dock</text>
          <g data-k="deliveries"></g>
          <g data-k="robot"><polygon points="-9,-7 13,0 -9,7" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        </svg>
        <div class="stat" data-k="status" style="margin-top:10px;font-weight:600"></div>
        <div class="stat" data-k="metrics" style="margin-top:4px"></div>`;

      const deliveriesEl = stage.querySelector('[data-k="deliveries"]');
      const obstacleEl = stage.querySelector('[data-k="obstacle"]');
      const robotEl = stage.querySelector('[data-k="robot"]');
      const statusEl = stage.querySelector('[data-k="status"]');
      const metricsEl = stage.querySelector('[data-k="metrics"]');

      const DELIVS = [D1, D2, D3];
      function renderDeliveries(doneCount, activeDeliverIdx) {
        let svg = '';
        DELIVS.forEach((p, i) => {
          const [x, y] = toPx(...p);
          const done = i < doneCount;
          const active = i === activeDeliverIdx;
          const fill = active ? 'var(--brand-soft)' : done ? 'var(--ok-soft)' : 'var(--surface-2)';
          const stroke = active ? 'var(--brand)' : done ? 'var(--ok)' : '#94a3b8';
          svg += `<circle cx="${x}" cy="${y}" r="14" class="pkt" style="fill:${fill};stroke:${stroke};stroke-width:2.5"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--ink)">${i + 1}</text>`;
        });
        deliveriesEl.innerHTML = svg;
      }
      function renderObstacle(active) {
        const [x, y] = toPx(...OBSTACLE);
        obstacleEl.innerHTML = `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" rx="3" style="fill:${active ? '#fecaca' : '#fee2e2'};stroke:#dc2626;stroke-width:${active ? 2.5 : 1.5}"/><text x="${x}" y="${y + 24}" text-anchor="middle" style="font-size:8px;fill:#991b1b">vật cản mới</text>`;
      }

      const LEG_SPEED = 1.8; // m/s minh họa (đã tăng tốc so với max_velocity thật ~0.3 m/s để dễ xem)
      const DWELL_DUR = 0.5, AVOID_DUR = 0.9, HOLD_DUR = 2.5;
      let legIdx, phase, timer, legT, traveled, delivered, recoveries, simTime, avoiding, obstacleDoneThisLeg;

      function freshRun() {
        legIdx = 0; phase = 'moving'; timer = 0; legT = 0; traveled = 0; delivered = 0; recoveries = 0; simTime = 0;
        avoiding = false; obstacleDoneThisLeg = false;
        const [x, y] = toPx(...DOCK);
        robotEl.setAttribute('transform', `translate(${x},${y}) rotate(0)`);
      }
      freshRun();

      function draw() {
        const leg = LEGS[legIdx];
        const [fx, fy] = toPx(...leg.from), [tx, ty] = toPx(...leg.to);
        let px = fx + (tx - fx) * legT, py = fy + (ty - fy) * legT;
        const deg = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI;
        if (avoiding) {
          // nhích ngang 1 chút vuông góc hướng đi, để thấy rõ "né sang bên" trong lúc dừng.
          const nx = -(ty - fy), ny = (tx - fx);
          const nlen = Math.hypot(nx, ny) || 1;
          px += (nx / nlen) * 10; py += (ny / nlen) * 10;
        }
        robotEl.setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${deg.toFixed(1)})`);
        renderObstacle(avoiding);
        renderDeliveries(delivered, phase === 'result' ? null : (leg.deliver ? leg.deliver - 1 : null));

        if (phase === 'moving') {
          statusEl.textContent = avoiding
            ? 'Phát hiện vật cản mới (không có trong map gốc) -- costmap cập nhật, recovery: né sang bên'
            : leg.deliver ? `Đang đi giao điểm #${leg.deliver}/3` : 'Đang di chuyển trong kho...';
        } else if (phase === 'dwell') {
          statusEl.innerHTML = `<span style="color:var(--ok)">Đã giao điểm #${leg.deliver}/3</span>`;
        } else if (phase === 'result') {
          statusEl.innerHTML = `<span style="color:var(--ok)">Hoàn thành -- đã giao đủ 3/3 điểm, quay lại dock</span>`;
        }
        const mins = Math.floor(simTime / 60), secs = Math.floor(simTime % 60);
        metricsEl.innerHTML = `Thời gian mô phỏng: <b>${mins}:${String(secs).padStart(2, '0')}</b> · Quãng đường: <b>${traveled.toFixed(1)}/${TOTAL_DIST.toFixed(1)}m</b> · Đã giao: <b>${delivered}/3</b> · Số lần recovery: <b>${recoveries}</b>`;
      }
      draw();

      return {
        reset() { freshRun(); draw(); },
        update(dt) {
          simTime += dt;

          if (phase === 'moving') {
            const leg = LEGS[legIdx];
            if (avoiding) {
              timer += dt;
              if (timer >= AVOID_DUR) { avoiding = false; timer = 0; }
              draw();
              return;
            }
            // tới đúng mốc vật cản trên chặng này (nếu có) và chưa xử lý -- dừng lại né.
            if (leg.obstacleT != null && !obstacleDoneThisLeg && legT >= leg.obstacleT) {
              avoiding = true; obstacleDoneThisLeg = true; recoveries += 1; timer = 0;
              draw();
              return;
            }
            const legDist = dist(leg.from, leg.to);
            const legDur = legDist / LEG_SPEED;
            const prevT = legT;
            legT = Math.min(1, legT + dt / legDur);
            traveled += legDist * (legT - prevT);
            if (legT >= 1) {
              if (leg.deliver) { delivered += 1; phase = 'dwell'; timer = 0; }
              else if (legIdx >= LEGS.length - 1) { phase = 'result'; timer = 0; } // chặng cuối -- giữ nguyên legIdx (hợp lệ) để draw() còn dùng được
              else { legIdx += 1; legT = 0; obstacleDoneThisLeg = false; }
            }
            draw();
            return;
          }
          if (phase === 'dwell') {
            timer += dt;
            if (timer < DWELL_DUR) return;
            timer = 0;
            if (legIdx >= LEGS.length - 1) { phase = 'result'; }
            else { legIdx += 1; legT = 0; obstacleDoneThisLeg = false; phase = 'moving'; }
            draw();
            return;
          }
          if (phase === 'result') {
            timer += dt;
            if (timer < HOLD_DUR) return;
            freshRun();
            draw();
          }
        },
      };
    },
  });
})();
