// Mô hình mô phỏng cho Module 9 (Localization với AMCL: particle filter, AMCL vs slam_toolbox).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Bức tranh tổng thể: 2 cách định vị, chọn qua 1 tham số ----------
  // Toạ độ đã kiểm tra bằng script hình học trước khi viết (không đường nào cắt qua ô
  // không liên quan, không đoạn nào trùng đoạn nào) -- xem geom_check3.py lúc soạn bài.
  defineScene('localization-overview', {
    title: 'Bức tranh tổng thể: 2 cách định vị, chọn qua 1 tham số',
    caption: 'Bấm chọn 1 nhánh để xem đúng đường đi của nó. Cả 2 đều nhận cùng 3 nguồn vào (bản đồ, /scan, TF odom→base_footprint) và cùng tạo ra TF map→odom -- khác nhau ở thuật toán đứng giữa.',
    setup({ stage }) {
      const FLOWS = [
        {
          label: 'AMCL (particle filter)',
          ids: ['n-map', 'e-map-mapserver', 'n-mapserver', 'e-mapserver-amcl', 'n-scan', 'e-scan-amcl',
            'n-tf', 'e-tf-amcl', 'n-amcl', 'e-amcl-out', 'n-out'],
        },
        {
          label: 'slam_toolbox (mode: localization)',
          ids: ['n-map', 'e-map-slamloc', 'n-scan', 'e-scan-slamloc', 'n-tf', 'e-tf-slamloc',
            'n-slamloc', 'e-slamloc-out', 'n-out'],
        },
      ];
      stage.innerHTML = `
        <div data-k="rows" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
        <svg class="svg" viewBox="0 0 890 350" role="img" aria-label="2 cách định vị AMCL và slam_toolbox, chọn qua 1 tham số launch">
          <g data-id="n-map"><rect x="20" y="10" width="190" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="32" style="font-size:10.5px">bản đồ đã lưu</text><text class="lbl-sm" x="115" y="48">Module 8</text></g>
          <g data-id="n-scan"><rect x="20" y="120" width="190" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="150" style="font-size:12px">/scan</text></g>
          <g data-id="n-tf"><rect x="20" y="230" width="190" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="115" y="252" style="font-size:9.5px">TF odom → base_footprint</text><text class="lbl-sm" x="115" y="268">diff_drive_controller</text></g>

          <line data-id="e-map-mapserver" x1="210" y1="25" x2="270" y2="25" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-map-slamloc" points="210,45 245,45 245,320 480,320" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-mapserver"><rect x="270" y="10" width="150" height="50" rx="8" class="node-box-rect"/><text class="node-name" x="345" y="38" style="font-size:10.5px">map_server</text></g>
          <line data-id="e-mapserver-amcl" x1="420" y1="35" x2="480" y2="35" stroke="#cbd5e1" stroke-width="2"/>

          <polyline data-id="e-scan-amcl" points="210,135 460,135 460,65 480,65" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-scan-slamloc" points="210,155 430,155 430,275 480,275" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-tf-amcl" points="210,245 440,245 440,95 480,95" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <line data-id="e-tf-slamloc" x1="210" y1="265" x2="480" y2="265" stroke="#cbd5e1" stroke-width="2"/>

          <g data-id="n-amcl"><rect x="480" y="10" width="150" height="110" rx="8" class="node-box-rect"/><text class="node-name" x="555" y="60" style="font-size:11.5px">amcl</text><text class="lbl-sm" x="555" y="76">particle filter</text></g>
          <g data-id="n-slamloc"><rect x="480" y="220" width="150" height="110" rx="8" class="node-box-rect"/><text class="node-name" x="555" y="268" style="font-size:10px">slam_toolbox</text><text class="lbl-sm" x="555" y="284">mode: localization</text></g>

          <polyline data-id="e-amcl-out" points="630,65 660,65 660,170 720,170" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <polyline data-id="e-slamloc-out" points="630,275 680,275 680,200 720,200" fill="none" stroke="#cbd5e1" stroke-width="2"/>
          <g data-id="n-out"><rect x="720" y="150" width="150" height="70" rx="8" class="node-box-rect"/><text class="node-name" x="795" y="180" style="font-size:9.5px">TF map → odom</text><text class="lbl-sm" x="795" y="196">Nav2 đọc để biết robot ở đâu</text></g>
        </svg>`;
      const rowsEl = stage.querySelector('[data-k="rows"]');
      const svg = stage.querySelector('svg');
      rowsEl.innerHTML = FLOWS.map((f, i) => `
        <button data-row="${i}" style="text-align:left;font-size:12.5px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);
          background:var(--surface);color:var(--ink-2);cursor:pointer">${esc(f.label)}</button>`).join('');
      const btns = [...rowsEl.querySelectorAll('button')];

      const FLOW_SPEED = 55;
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
            if (isTarget) el.setAttribute('stroke-dasharray', '8 7');
            else { el.removeAttribute('stroke-dasharray'); el.removeAttribute('stroke-dashoffset'); }
          } else {
            el.querySelector('rect').classList.toggle('hot', isTarget);
          }
        });
      }
      btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
      select(0);

      return {
        reset() { select(0); },
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

  // ---------- 1. Particle filter sống: predict -> update -> resample ----------
  defineScene('particle-filter-mcl', {
    title: 'Particle filter: predict → update → resample',
    caption: 'Robot thật (tam giác xanh) đi theo quỹ đạo cố định. 60 hạt (chấm cam) bắt đầu rải ngẫu nhiên. Mỗi bước: hạt di chuyển theo đúng lệnh robot + nhiễu (predict), được chấm điểm bằng khoảng cách LiDAR mô phỏng so với vị trí hạt (update), rồi hạt điểm thấp bị thay bằng bản sao (nhiễu nhẹ) của hạt điểm cao (resample).',
    setup({ stage, ui }) {
      const WORLD_W = 3.0, WORLD_H = 2.1;
      const SCALE = 108, OX = 24, OY = 20;
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
            return { x: s.p[0] + s.dx * t, y: s.p[1] + s.dy * t, heading: Math.atan2(s.dy, s.dx) };
          }
          acc += s.len;
        }
      }
      function rayDist(ox, oy, ang, maxR) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        let best = maxR;
        for (const [x1, y1, x2, y2] of WALLS) {
          const spx = x2 - x1, spy = y2 - y1;
          const denom = dx * spy - dy * spx;
          if (Math.abs(denom) < 1e-9) continue;
          const t = ((x1 - ox) * spy - (y1 - oy) * spx) / denom;
          const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
          if (t >= 0 && t < best && u >= 0 && u <= 1) best = t;
        }
        return best;
      }

      const N_PARTICLES = 60, N_BEAMS = 8, MAX_R = 4.2;
      const ROBOT_SPEED = 0.3, STEP_DIST = 0.35;
      const rand = (a, b) => a + Math.random() * (b - a);
      const gauss = (sigma) => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

      const [W_PX, H_PX] = [OX * 2 + WORLD_W * SCALE, OY * 2 + WORLD_H * SCALE];
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${W_PX.toFixed(0)} ${H_PX.toFixed(0)}" role="img" aria-label="Đám mây hạt particle filter hội tụ về vị trí robot thật">
          <g data-k="walls"></g>
          <g data-k="particles"></g>
          <g data-k="robot"><polygon points="-8,-6 12,0 -8,6" style="fill:#16a34a;stroke:#fff;stroke-width:1"/></g>
        </svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = `
        <label class="ctl">độ lệch rải hạt ban đầu <input type="range" min="0" max="100" step="5" value="100" data-k="spread"> <span data-k="spreadv"></span>%</label>
        <button class="btn-sm" data-k="step">Bước tiếp</button>
        <button class="btn-sm" data-k="auto">Tự động: Bật</button>
        <button class="btn-sm" data-k="toggleRobot">Ẩn robot thật</button>`;

      const wallsEl = stage.querySelector('[data-k="walls"]');
      wallsEl.innerHTML = `
        <polygon points="${WALLS.slice(0, 4).map(([x1, y1]) => toPx(x1, y1).join(',')).join(' ')}" fill="none" stroke="#94a3b8" stroke-width="2"/>
        <polygon points="${WALLS.slice(4).map(([x1, y1]) => toPx(x1, y1).join(',')).join(' ')}" fill="none" stroke="#94a3b8" stroke-width="2"/>`;
      const particlesEl = stage.querySelector('[data-k="particles"]');
      particlesEl.innerHTML = Array.from({ length: N_PARTICLES }, (_, i) => `
        <g data-i="${i}">
          <circle r="3.4" class="pkt" style="fill:#f59e0b;opacity:0.85"/>
          <line x1="0" y1="0" x2="8" y2="0" style="stroke:#f59e0b;stroke-width:1.4;opacity:0.85"/>
        </g>`).join('');
      const pEls = [...particlesEl.querySelectorAll('g')];
      const robotEl = stage.querySelector('[data-k="robot"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const spreadEl = ui.querySelector('[data-k="spread"]');
      const spreadvEl = ui.querySelector('[data-k="spreadv"]');
      const stepBtn = ui.querySelector('[data-k="step"]');
      const autoBtn = ui.querySelector('[data-k="auto"]');
      const toggleRobotBtn = ui.querySelector('[data-k="toggleRobot"]');

      let particles, robotDist, auto, robotVisible, stepCount, autoTimer;

      function scatterParticles(spreadPct) {
        const frac = spreadPct / 100;
        const start = posAtDist(0);
        particles = Array.from({ length: N_PARTICLES }, () => {
          if (frac >= 0.999) return { x: rand(0.08, WORLD_W - 0.08), y: rand(0.08, WORLD_H - 0.08), h: rand(-Math.PI, Math.PI), w: 1 };
          const rx = start.x + rand(-1, 1) * frac * 1.4;
          const ry = start.y + rand(-1, 1) * frac * 1.4;
          return {
            x: Math.min(WORLD_W - 0.08, Math.max(0.08, rx)),
            y: Math.min(WORLD_H - 0.08, Math.max(0.08, ry)),
            h: start.heading + rand(-1, 1) * frac * Math.PI,
            w: 1,
          };
        });
      }

      function drawParticles() {
        pEls.forEach((g, i) => {
          const p = particles[i];
          const [px, py] = toPx(p.x, p.y);
          g.setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${(-p.h * 180 / Math.PI).toFixed(1)})`);
        });
      }

      function drawRobot() {
        const p = posAtDist(robotDist);
        const [rx, ry] = toPx(p.x, p.y);
        robotEl.setAttribute('transform', `translate(${rx.toFixed(1)},${ry.toFixed(1)}) rotate(${(-p.heading * 180 / Math.PI).toFixed(1)})`);
        return p;
      }

      function spreadMetric() {
        const mx = particles.reduce((a, p) => a + p.x, 0) / particles.length;
        const my = particles.reduce((a, p) => a + p.y, 0) / particles.length;
        const varr = particles.reduce((a, p) => a + (p.x - mx) ** 2 + (p.y - my) ** 2, 0) / particles.length;
        return { mx, my, sd: Math.sqrt(varr) };
      }

      function updateStat() {
        const { sd } = spreadMetric();
        const tight = sd < 0.12;
        statEl.innerHTML = `Bước #${stepCount} · độ lệch chuẩn đám mây hạt: <b style="color:${tight ? 'var(--ok)' : 'var(--ink)'}">${sd.toFixed(2)}m</b>${tight ? ' — đã hội tụ chặt' : ''}`;
      }

      function doStep() {
        stepCount++;
        const trueBefore = posAtDist(robotDist);
        robotDist += STEP_DIST;
        const trueAfter = drawRobot();
        const dx = trueAfter.x - trueBefore.x, dy = trueAfter.y - trueBefore.y;

        // Predict: mỗi hạt tự di chuyển theo đúng vector robot vừa đi + nhiễu Gauss nhỏ
        // (đơn giản hoá của mô hình rot1/trans/rot2 thật đã học ở bài lý thuyết).
        particles.forEach((p) => {
          p.x += dx + gauss(0.04);
          p.y += dy + gauss(0.04);
          p.x = Math.min(WORLD_W - 0.05, Math.max(0.05, p.x));
          p.y = Math.min(WORLD_H - 0.05, Math.max(0.05, p.y));
        });

        // Update: so N_BEAMS tia mô phỏng từ hạt với N_BEAMS tia thật từ robot -- hạt
        // càng khớp càng nặng (đơn giản hoá likelihood field model đã học).
        const trueRanges = Array.from({ length: N_BEAMS }, (_, i) => rayDist(trueAfter.x, trueAfter.y, (i / N_BEAMS) * Math.PI * 2, MAX_R));
        particles.forEach((p) => {
          let errSum = 0;
          for (let i = 0; i < N_BEAMS; i++) {
            const ang = (i / N_BEAMS) * Math.PI * 2;
            const d = rayDist(p.x, p.y, ang, MAX_R);
            errSum += Math.abs(d - trueRanges[i]);
          }
          const meanErr = errSum / N_BEAMS;
          p.w = Math.exp(-(meanErr * meanErr) / (2 * 0.3 * 0.3));
        });

        // Resample: bánh xe roulette theo trọng số -- hạt điểm cao được nhân bản (kèm
        // nhiễu nhỏ), hạt điểm thấp gần như chắc chắn bị loại.
        const total = particles.reduce((a, p) => a + p.w, 0) || 1;
        const newParticles = [];
        let r = Math.random() / N_PARTICLES;
        let c = particles[0].w / total, i = 0;
        for (let m = 0; m < N_PARTICLES; m++) {
          const u = r + m / N_PARTICLES;
          while (u > c && i < particles.length - 1) { i++; c += particles[i].w / total; }
          const src = particles[i];
          newParticles.push({ x: src.x + gauss(0.02), y: src.y + gauss(0.02), h: src.h + gauss(0.05), w: 1 });
        }
        particles = newParticles;
        drawParticles();
        updateStat();
      }

      stepBtn.addEventListener('click', doStep);
      autoBtn.addEventListener('click', () => {
        auto = !auto;
        autoBtn.textContent = auto ? 'Tự động: Tắt' : 'Tự động: Bật';
      });
      toggleRobotBtn.addEventListener('click', () => {
        robotVisible = !robotVisible;
        robotEl.style.opacity = robotVisible ? '1' : '0';
        toggleRobotBtn.textContent = robotVisible ? 'Ẩn robot thật' : 'Hiện robot thật';
      });
      spreadEl.addEventListener('input', () => { spreadvEl.textContent = spreadEl.value; });

      return {
        reset() {
          robotDist = 0; stepCount = 0; auto = false; robotVisible = true; autoTimer = 0;
          autoBtn.textContent = 'Tự động: Bật';
          robotEl.style.opacity = '1';
          toggleRobotBtn.textContent = 'Ẩn robot thật';
          spreadvEl.textContent = spreadEl.value;
          scatterParticles(Number(spreadEl.value));
          drawParticles();
          drawRobot();
          updateStat();
        },
        update(dt) {
          if (!auto) return;
          autoTimer += dt;
          if (autoTimer >= 0.6) { autoTimer = 0; doStep(); }
        },
      };
    },
  });

  // ---------- 2. AMCL (tìm toàn cục) vs slam_toolbox localization (tìm cục bộ) ----------
  defineScene('global-vs-local-search', {
    title: 'Khi pose ban đầu sai: tìm toàn cục vs tìm cục bộ',
    caption: 'Kéo độ lệch pose ban đầu rồi bấm "Thử định vị lại". AMCL rải hạt khắp map nên luôn có cơ hội tìm lại dù lệch nhiều; slam_toolbox (mode: localization) chỉ dò trong ô vuông ±0.25m quanh pose cho sẵn (đúng correlation_search_space_dimension=0.5m thật) -- lệch quá vùng đó là lạc hẳn, không tự tìm lại được.',
    setup({ stage, ui }) {
      const SCALE = 130, OX = 20, OY = 20;
      const W = 2.6, H = 1.8;
      const toPx = (x, y) => [OX + x * SCALE, OY + (H - y) * SCALE];
      const TRUE_POS = [1.3, 0.9];
      const SEARCH_WINDOW = 0.25; // ±0.25m, đúng correlation_search_space_dimension/2 thật

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${(OX * 2 + W * SCALE).toFixed(0)} ${(OY * 2 + H * SCALE).toFixed(0)}" role="img" aria-label="So sánh vùng tìm kiếm của AMCL và slam_toolbox localization khi pose ban đầu bị lệch">
          <rect x="${OX}" y="${OY}" width="${(W * SCALE).toFixed(0)}" height="${(H * SCALE).toFixed(0)}" fill="none" stroke="#94a3b8" stroke-width="2"/>
          <g data-k="slamWindow"></g>
          <circle data-k="truePos" r="7" class="pkt" style="fill:#16a34a"/>
          <g data-k="guessPos"></g>
        </svg>
        <div class="stat" data-k="verdictAmcl" style="margin-top:8px;font-weight:600"></div>
        <div class="stat" data-k="verdictSlam" style="margin-top:2px;font-weight:600"></div>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = `
        <label class="ctl">độ lệch pose ban đầu <input type="range" min="0" max="120" step="5" value="20" data-k="offset"> <span data-k="offsetv"></span> cm</label>
        <button class="btn-sm" data-k="try">Thử định vị lại</button>`;

      const [tx, ty] = toPx(...TRUE_POS);
      stage.querySelector('[data-k="truePos"]').setAttribute('cx', tx.toFixed(1));
      stage.querySelector('[data-k="truePos"]').setAttribute('cy', ty.toFixed(1));

      const slamWindowEl = stage.querySelector('[data-k="slamWindow"]');
      const guessEl = stage.querySelector('[data-k="guessPos"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const vAmclEl = stage.querySelector('[data-k="verdictAmcl"]');
      const vSlamEl = stage.querySelector('[data-k="verdictSlam"]');
      const offsetEl = ui.querySelector('[data-k="offset"]');
      const offsetvEl = ui.querySelector('[data-k="offsetv"]');
      const tryBtn = ui.querySelector('[data-k="try"]');

      let guessPos;

      function placeGuess() {
        const offM = Number(offsetEl.value) / 100;
        const ang = Math.PI * 0.72;
        guessPos = [TRUE_POS[0] + Math.cos(ang) * offM, TRUE_POS[1] + Math.sin(ang) * offM];
        const [gx, gy] = toPx(...guessPos);
        guessEl.innerHTML = `<circle r="7" class="pkt" style="fill:#2563eb" cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}"/>`;
        const [wx1, wy1] = toPx(guessPos[0] - SEARCH_WINDOW, guessPos[1] + SEARCH_WINDOW);
        const wSizePx = SEARCH_WINDOW * 2 * SCALE;
        slamWindowEl.innerHTML = `<rect x="${wx1.toFixed(1)}" y="${wy1.toFixed(1)}" width="${wSizePx.toFixed(1)}" height="${wSizePx.toFixed(1)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>`;
        vAmclEl.textContent = ''; vSlamEl.textContent = '';
        statEl.innerHTML = `Pose ban đầu lệch <b>${offsetEl.value}cm</b> so với vị trí thật (chấm xanh lá). Chấm xanh dương: pose bạn (hoặc initial_pose_*) đã khai báo. Ô cam nét đứt: vùng slam_toolbox sẽ dò (±0.25m quanh pose khai báo).`;
      }

      function runTry() {
        const dist = Math.hypot(guessPos[0] - TRUE_POS[0], guessPos[1] - TRUE_POS[1]);
        const slamOk = dist <= SEARCH_WINDOW * Math.SQRT2 * 0.78; // trong vùng dò thực tế (gần vuông quanh pose)
        vAmclEl.textContent = 'AMCL: luôn tìm lại được (rải hạt khắp map)';
        vAmclEl.style.color = 'var(--ok)';
        vSlamEl.textContent = slamOk ? 'slam_toolbox: trong vùng dò — tìm được' : 'slam_toolbox: NGOÀI vùng dò — lạc hẳn';
        vSlamEl.style.color = slamOk ? 'var(--ok)' : '#dc2626';
        statEl.innerHTML = `Khoảng cách thật: <b>${dist.toFixed(2)}m</b> — vùng dò slam_toolbox chỉ rộng ±0.25m (đường kính 0.5m = <code>correlation_search_space_dimension</code> thật). ${slamOk ? 'Trong trường hợp này slam_toolbox vẫn còn trong tầm.' : 'Trong trường hợp này slam_toolbox KHÔNG bao giờ nhìn thấy vị trí thật, dù dò kỹ tới đâu trong vùng của nó.'}`;
      }

      tryBtn.addEventListener('click', runTry);
      offsetEl.addEventListener('input', () => { offsetvEl.textContent = offsetEl.value; placeGuess(); });

      return {
        reset() { offsetvEl.textContent = offsetEl.value; placeGuess(); },
        update() {},
      };
    },
  });
})();
