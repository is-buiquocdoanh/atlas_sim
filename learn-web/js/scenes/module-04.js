// Mô hình chuyển động cho Module 4 (Đưa robot vào Gazebo).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 1. Physics engine: bước rời rạc + vật mỏng -> xuyên tường ----------
  defineScene('physics-tunneling', {
    title: 'Thí nghiệm: bước thời gian lớn có thể "xuyên tường"',
    caption: 'Mô hình giả lập chung để hiểu khái niệm, không phải tái dựng chính xác một sự cố đã xảy ra trên Atlas. Bề dày tường mặc định 0.1m khớp vách thật của maze.sdf; max_step_size thật của dự án là 0.001s ở mọi world.',
    setup({ stage, ui }) {
      const X0 = 40, SCALE = 415; // px per meter
      const WALL_X_M = 0.7, TRACK_END_M = 1.3;
      const sx = (m) => X0 + m * SCALE;
      const GROUND_Y = 150;

      stage.innerHTML = `<svg class="svg" viewBox="0 0 640 220" role="img" aria-label="Viên bi di chuyển về phía một bức tường mỏng, mô phỏng va chạm theo bước thời gian rời rạc">
        <line x1="${X0}" y1="${GROUND_Y}" x2="${sx(TRACK_END_M)}" y2="${GROUND_Y}" stroke="#cbd5e1" stroke-width="2"/>
        <text class="lbl-sm" x="${X0}" y="${GROUND_Y + 34}" text-anchor="start">xuất phát</text>
        <g data-k="ticks"></g>
        <rect data-k="wall" y="${GROUND_Y - 46}" height="46" fill="#b27f4c" stroke="#8a6238" stroke-width="1.5"/>
        <circle data-k="ball" cy="${GROUND_Y - 10}" r="9" class="pkt"/>
      </svg>
      <div class="stat" data-k="stat" style="margin-top:4px"></div>
      <div class="stat" data-k="status" style="margin-top:2px;font-weight:700"></div>`;
      ui.innerHTML = `
        <label class="ctl">tốc độ v <input type="range" min="0.05" max="3" step="0.05" value="0.6" data-k="v"> <span data-k="vv"></span> m/s</label>
        <label class="ctl">bước thời gian (max_step_size) <input type="range" min="0.001" max="0.05" step="0.001" value="0.001" data-k="dt"> <span data-k="dtv"></span> s</label>
        <label class="ctl">bề dày tường <input type="range" min="0.02" max="0.3" step="0.01" value="0.1" data-k="wt"> <span data-k="wtv"></span> m</label>
        <button class="btn-sm" data-k="fire">Bắn</button>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const wallEl = stage.querySelector('[data-k="wall"]');
      const ballEl = stage.querySelector('[data-k="ball"]');
      const ticksEl = stage.querySelector('[data-k="ticks"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const statusEl = stage.querySelector('[data-k="status"]');

      const ball = { xm: 0, moving: false, result: null };
      let samples = [];
      let simAcc = 0;

      function drawWall() {
        const wt = Number(q('wt').value);
        wallEl.setAttribute('x', sx(WALL_X_M));
        wallEl.setAttribute('width', Math.max(2, wt * SCALE));
      }
      function drawBall() {
        ballEl.setAttribute('cx', sx(ball.xm));
        ballEl.setAttribute('class', ball.result === 'tunnel' ? 'pkt-lost' : ball.result === 'caught' ? 'pkt' : 'pkt');
      }
      function drawTicks() {
        ticksEl.innerHTML = samples.slice(-180).map((xm) =>
          `<line x1="${sx(xm)}" y1="${GROUND_Y - 4}" x2="${sx(xm)}" y2="${GROUND_Y + 4}" stroke="#94a3b8" stroke-width="1.5" opacity=".55"/>`
        ).join('');
      }
      function readout() {
        const v = Number(q('v').value), dt = Number(q('dt').value), wt = Number(q('wt').value);
        q('vv').textContent = v.toFixed(2);
        q('dtv').textContent = dt.toFixed(3);
        q('wtv').textContent = wt.toFixed(2);
        const step = v * dt;
        const ratio = step / wt;
        statEl.innerHTML = `Mỗi bước bi đi <b>Δx = v·dt = ${step.toFixed(4)} m</b> &nbsp;·&nbsp; bề dày tường <b>${wt.toFixed(2)} m</b> ` +
          `&nbsp;·&nbsp; Δx/tường = <b>${ratio.toFixed(2)}×</b>${ratio >= 1 ? ' — mỗi bước đã đủ dài để nhảy qua hẳn, rất dễ xuyên' : ''}`;
      }
      function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.style.color = kind === 'bad' ? 'var(--bad)' : kind === 'ok' ? 'var(--ok)' : 'var(--muted)';
      }

      q('v').addEventListener('input', readout);
      q('dt').addEventListener('input', readout);
      q('wt').addEventListener('input', () => { readout(); drawWall(); });
      q('fire').addEventListener('click', () => {
        const v = Number(q('v').value), dt = Number(q('dt').value);
        ball.xm = Math.random() * v * dt; // lệch pha ngẫu nhiên mỗi lần bắn -- cùng 1 cấu hình có thể ra kết quả khác nhau
        ball.moving = true;
        ball.result = null;
        samples = [ball.xm];
        simAcc = 0;
        setStatus('Đang bắn…', null);
        drawBall(); drawTicks();
      });

      return {
        reset() {
          ball.xm = 0; ball.moving = false; ball.result = null;
          samples = []; simAcc = 0;
          readout(); drawWall(); drawBall(); drawTicks();
          setStatus('Bấm "Bắn" để thử.', null);
        },
        update(dt) {
          if (!ball.moving) return;
          simAcc += dt;
          const v = Number(q('v').value), step = Number(q('dt').value), wt = Number(q('wt').value);
          const wallStart = WALL_X_M, wallEnd = WALL_X_M + wt;
          let moved = false;
          while (simAcc >= step && ball.moving) {
            simAcc -= step;
            const prevXm = ball.xm;
            const newXm = prevXm + v * step;
            if (newXm >= wallStart && newXm <= wallEnd) {
              ball.xm = wallStart;
              ball.moving = false;
              ball.result = 'caught';
            } else {
              if (prevXm < wallStart && newXm > wallEnd && !ball.result) ball.result = 'tunnel';
              ball.xm = newXm;
              if (ball.xm >= TRACK_END_M) { ball.moving = false; if (!ball.result) ball.result = 'end'; }
            }
            samples.push(ball.xm);
            moved = true;
          }
          if (moved) {
            drawBall(); drawTicks();
            if (!ball.moving) {
              if (ball.result === 'caught') setStatus('✔ Bị chặn đúng tại tường — có mẫu thời gian rơi vào lúc va chạm.', 'ok');
              else if (ball.result === 'tunnel') setStatus('⚠ XUYÊN TƯỜNG — không mẫu thời gian nào rơi đúng lúc 2 vật chồng lên nhau.', 'bad');
              else setStatus('Hết quãng đường mà chưa chạm tường — chỉnh lại tham số.', null);
            }
          }
        },
      };
    },
  });

  // ---------- 2. <gazebo> tag: mu quyết định bánh lăn hay trượt, và vì sao caster cần mu=0 ----------
  defineScene('friction-wheel-caster', {
    title: 'mu quyết định: bánh lăn đúng, hay caster bị kéo lê',
    caption: 'Cùng một con số mu, áp cho 2 cơ chế khác nhau cho 2 kết quả trái ngược hẳn nhau — đúng lý do bánh chủ động và caster của Atlas cần mu khác nhau hoàn toàn.',
    setup({ stage, ui }) {
      const R_WHEEL = 0.05, OMEGA_T = 6, G_TEACH = 1.2, LOOP_M = 1.0;
      const SCALE = 240, PX0 = 30, GY = 190;
      const CASTER_SCALE = 230, CASTER_X0 = 360;
      const V_DRAG = 0.35, N_CASTER = 1.2;
      const loopX = (m) => PX0 + (m % LOOP_M) * SCALE;
      const casterLoopX = (m) => CASTER_X0 + (m % LOOP_M) * CASTER_SCALE;

      stage.innerHTML = `<svg class="svg" viewBox="0 0 640 230" role="img" aria-label="So sánh bánh chủ động và caster dưới cùng một hệ số ma sát">
        <text class="lbl-sm" x="150" y="18" text-anchor="middle">Bánh chủ động (continuous + động cơ)</text>
        <line x1="20" y1="${GY}" x2="300" y2="${GY}" stroke="#cbd5e1" stroke-width="2"/>
        <circle data-k="wheel" cy="${GY - 26}" r="26" class="ring" stroke-width="3"/>
        <line data-k="mark" stroke="#2563eb" stroke-width="3"/>
        <text class="stat-note" data-k="wheelTxt" x="150" y="${GY + 30}" text-anchor="middle"></text>

        <text class="lbl-sm" x="490" y="18" text-anchor="middle">Caster (fixed, hình cầu — bị kéo theo)</text>
        <line x1="340" y1="${GY}" x2="620" y2="${GY}" stroke="#cbd5e1" stroke-width="2"/>
        <circle data-k="caster" cy="${GY - 13}" r="13" class="pkt"/>
        <line data-k="resist" y1="${GY - 13}" y2="${GY - 13}" stroke="var(--bad)" stroke-linecap="round"/>
        <text class="stat-note" data-k="casterTxt" x="490" y="${GY + 30}" text-anchor="middle"></text>
      </svg>`;
      ui.innerHTML = `
        <label class="ctl">hệ số ma sát mu (áp cho cả hai) <input type="range" min="0" max="1" step="0.05" value="0.5" data-k="mu"> <span data-k="muv"></span></label>
        <div class="stat-note">mu=1.0 ≈ bánh thật của Atlas · mu=0.0 ≈ caster thật của Atlas. Kéo giữa 2 giá trị để thấy vì sao không thể dùng chung một con số cho cả hai.</div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const wheelEl = stage.querySelector('[data-k="wheel"]');
      const markEl = stage.querySelector('[data-k="mark"]');
      const wheelTxt = stage.querySelector('[data-k="wheelTxt"]');
      const casterEl = stage.querySelector('[data-k="caster"]');
      const resistEl = stage.querySelector('[data-k="resist"]');
      const casterTxt = stage.querySelector('[data-k="casterTxt"]');

      const wheel = { xm: 0, v: 0, theta: 0 };
      const caster = { xm: 0 };

      function draw() {
        const mu = Number(q('mu').value);
        q('muv').textContent = mu.toFixed(2);

        const wcx = loopX(wheel.xm);
        wheelEl.setAttribute('cx', wcx);
        const mx2 = wcx + 24 * Math.cos(wheel.theta), my2 = (GY - 26) + 24 * Math.sin(wheel.theta);
        markEl.setAttribute('x1', wcx); markEl.setAttribute('y1', GY - 26);
        markEl.setAttribute('x2', mx2); markEl.setAttribute('y2', my2);
        const vTarget = OMEGA_T * R_WHEEL;
        const slip = vTarget > 0 ? Math.max(0, (vTarget - wheel.v) / vTarget) : 0;
        const slipPct = Math.round(slip * 100);
        wheelTxt.textContent = `ω·r=${vTarget.toFixed(2)} m/s · v thật=${wheel.v.toFixed(2)} m/s · ${slipPct < 10 ? 'LĂN ổn định' : `TRƯỢT ${slipPct}%`}`;
        wheelTxt.style.fill = slipPct < 10 ? 'var(--ok)' : 'var(--bad)';

        const ccx = casterLoopX(caster.xm);
        casterEl.setAttribute('cx', ccx);
        const fResist = mu * N_CASTER;
        const armLen = 14 + fResist * 55;
        resistEl.setAttribute('x1', ccx); resistEl.setAttribute('y1', GY - 13);
        resistEl.setAttribute('x2', ccx - armLen); resistEl.setAttribute('y2', GY - 13);
        resistEl.setAttribute('stroke-width', 2 + mu * 8);
        casterTxt.textContent = `lực cản ≈ ${fResist.toFixed(2)} N · ${mu < 0.1 ? 'trượt gần như tự do' : mu > 0.5 ? 'bị kéo lê, cản rất mạnh' : 'cản vừa phải'}`;
        casterTxt.style.fill = mu < 0.1 ? 'var(--ok)' : mu > 0.5 ? 'var(--bad)' : 'var(--muted)';
      }

      q('mu').addEventListener('input', draw);

      return {
        reset() {
          wheel.xm = 0; wheel.v = 0; wheel.theta = 0;
          caster.xm = 0;
          draw();
        },
        update(dt) {
          const mu = Number(q('mu').value);
          const vTarget = OMEGA_T * R_WHEEL;
          // Tốc độ "ổn định" wheel.v hội tụ về, theo mu HIỆN TẠI -- không phụ thuộc lịch sử kéo
          // slider trước đó, để kéo qua kéo lại mu vẫn luôn phản ánh đúng giá trị đang đặt.
          const MU_FULL_ROLL = 0.3;
          const steadyV = vTarget * Math.min(1, mu / MU_FULL_ROLL);
          wheel.v += (steadyV - wheel.v) * Math.min(1, 4 * dt);
          wheel.theta += OMEGA_T * dt;
          wheel.xm += wheel.v * dt;
          caster.xm += V_DRAG * dt;
          draw();
        },
      };
    },
  });

  // ---------- 3. Inertial sai -> hậu quả thật (payoff lời hứa Module 3) ----------
  defineScene('inertial-stability', {
    title: 'Cùng một cú hích, quán tính khác nhau → kết quả khác hẳn',
    caption: 'Mô hình đơn giản hóa: hộp xoay wobble quanh tâm để so sánh phản ứng góc ngay sau cú hích, không dựng lại toàn bộ va chạm lật thật. Δω = (xung lực × cánh tay đòn) / iyy — đúng công thức Gazebo giải mỗi bước.',
    setup({ stage, ui }) {
      const CX = 320, CY = 150, PXPM = 300, IMPULSE = 0.29, FAKE_I = 0.001, DECAY = 0.6;

      stage.innerHTML = `<svg class="svg" viewBox="0 0 640 220" role="img" aria-label="Hộp đứng trên sàn, nhận một cú hích, xoay nhiều hay ít tùy quán tính">
        <line x1="60" y1="${CY + 56}" x2="580" y2="${CY + 56}" stroke="#cbd5e1" stroke-width="2"/>
        <g data-k="box"><rect data-k="rect" fill="var(--brand-soft)" stroke="var(--brand)" stroke-width="2"/></g>
      </svg>
      <div class="stat" data-k="stat" style="margin-top:6px"></div>`;
      ui.innerHTML = `
        <label class="ctl">mass <input type="range" min="0.5" max="10" step="0.1" value="5" data-k="m"> <span data-k="mv"></span> kg</label>
        <label class="ctl">x (dài) <input type="range" min="0.1" max="0.6" step="0.01" value="0.30" data-k="x"> <span data-k="xv"></span> m</label>
        <label class="ctl">z (cao) <input type="range" min="0.05" max="0.3" step="0.01" value="0.12" data-k="z"> <span data-k="zv"></span> m</label>
        <label class="ctl"><input type="checkbox" data-k="fake"> Quán tính giả (gần 0, như link thiếu &lt;inertial&gt;)</label>
        <button class="btn-sm" data-k="hit">Hích!</button>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const boxG = stage.querySelector('[data-k="box"]');
      const rectEl = stage.querySelector('[data-k="rect"]');
      const statEl = stage.querySelector('[data-k="stat"]');

      const state = { ang: 0, vel: 0 };

      function boxSizePx() {
        const x = Number(q('x').value), z = Number(q('z').value);
        return { w: x * PXPM, h: z * PXPM };
      }
      function drawBox() {
        const { w, h } = boxSizePx();
        rectEl.setAttribute('x', -w / 2); rectEl.setAttribute('y', -h / 2);
        rectEl.setAttribute('width', w); rectEl.setAttribute('height', h);
        boxG.setAttribute('transform', `translate(${CX},${CY}) rotate(${(state.ang * 180 / Math.PI).toFixed(2)})`);
      }
      function iyyOf() {
        const m = Number(q('m').value), x = Number(q('x').value), z = Number(q('z').value);
        return (1 / 12) * m * (x * x + z * z);
      }
      function readoutLive() {
        const spinRev = Math.abs(state.vel) / (2 * Math.PI);
        statEl.innerHTML = `iyy hiện dùng = <b>${(q('fake').checked ? FAKE_I : iyyOf()).toFixed(4)} kg·m²</b> &nbsp;·&nbsp; tốc độ quay hiện tại ≈ <b>${spinRev.toFixed(2)} vòng/s</b>`;
      }

      ['m', 'x', 'z'].forEach((k) => q(k).addEventListener('input', () => {
        q(k + 'v').textContent = Number(q(k).value).toFixed(2);
        drawBox(); readoutLive();
      }));
      q('hit').addEventListener('click', () => {
        const z = Number(q('z').value);
        const leverArm = z / 2;
        const I = q('fake').checked ? FAKE_I : iyyOf();
        const dOmega = (IMPULSE * leverArm) / I;
        state.vel += dOmega;
        statEl.innerHTML = `Cú hích vừa rồi: Δω = (${IMPULSE} × ${leverArm.toFixed(3)}) / ${I.toFixed(4)} = <b>${dOmega.toFixed(2)} rad/s</b> (${(dOmega / (2 * Math.PI)).toFixed(2)} vòng/s ngay sau cú hích)`;
      });

      return {
        reset() {
          state.ang = 0; state.vel = 0;
          ['m', 'x', 'z'].forEach((k) => { q(k + 'v').textContent = Number(q(k).value).toFixed(2); });
          q('fake').checked = false;
          drawBox(); readoutLive();
        },
        update(dt) {
          state.ang += state.vel * dt;
          state.vel *= Math.exp(-DECAY * dt);
          drawBox();
          if (Math.abs(state.vel) > 0.01) readoutLive();
        },
      };
    },
  });

  // ---------- 4. Sơ đồ dữ liệu của spawn_robot.launch.py ----------
  defineScene('spawn-pipeline', {
    title: 'Dữ liệu chảy thế nào trong spawn_robot.launch.py',
    caption: 'Bấm 1 dòng bên trái để xem đúng luồng đó trong sơ đồ.',
    setup({ stage }) {
      const FLOWS = [
        {
          id: 'desc',
          label: 'robot_description: xacro → publish → spawn',
          ids: ['n-xacro', 'n-rsp', 'e-xacro-rsp', 'e-rsp-topic', 'n-topic', 'e-topic-spawn', 'n-spawn', 'e-spawn-gz'],
        },
        {
          id: 'world',
          label: 'world: file .sdf → gz-sim mở ra',
          ids: ['n-world', 'e-world-gz', 'n-gz'],
        },
        {
          id: 'clock',
          label: '/clock: gz-sim → bridge → use_sim_time',
          ids: ['n-gz', 'e-gz-clock', 'n-bridge', 'e-clock-back', 'n-rsp'],
        },
      ];
      // Lưới 2 cột (ColA x=10-170, ColB x=250-410) × 4 hàng, đường nối chỉ đi ngang/dọc
      // trong khoảng trống giữa 2 cột (x=170-250) hoặc giữa các hàng -- không có đường nào
      // cắt qua một ô không liên quan (đã kiểm tra tọa độ bằng script trước khi viết).
      stage.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:18px;align-items:start">
          <div data-k="rows" style="display:flex;flex-direction:column;gap:6px"></div>
          <svg class="svg" viewBox="0 0 430 320" role="img" aria-label="Sơ đồ dữ liệu spawn_robot.launch.py">
            <g data-id="n-xacro"><rect x="10" y="10" width="160" height="44" rx="8" class="node-box-rect"/><text class="node-name" x="90" y="37" style="font-size:11px">xacro model</text></g>
            <g data-id="n-world"><rect x="250" y="10" width="160" height="44" rx="8" class="node-box-rect"/><text class="node-name" x="330" y="37" style="font-size:11px">world (.sdf)</text></g>
            <line data-id="e-xacro-rsp" x1="90" y1="54" x2="90" y2="94" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-world-gz" x1="330" y1="54" x2="330" y2="94" stroke="#cbd5e1" stroke-width="2"/>

            <g data-id="n-rsp"><rect x="10" y="94" width="160" height="46" rx="8" class="node-box-rect"/><text class="node-name" x="90" y="114" style="font-size:10.5px">robot_state_publisher</text><text class="lbl-sm" x="90" y="130">use_sim_time</text></g>
            <g data-id="n-gz"><rect x="250" y="94" width="160" height="46" rx="8" class="node-box-rect"/><text class="node-name" x="330" y="121" style="font-size:11px">gz-sim (Gazebo)</text></g>
            <line data-id="e-rsp-topic" x1="90" y1="140" x2="90" y2="174" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-spawn-gz" x1="330" y1="174" x2="330" y2="140" stroke="#cbd5e1" stroke-width="2"/>

            <g data-id="n-topic"><rect x="10" y="174" width="160" height="42" rx="8" class="node-box-rect"/><text class="lbl-sm" x="90" y="190">topic</text><text class="node-name" x="90" y="206" style="font-size:10px">/robot_description</text></g>
            <g data-id="n-spawn"><rect x="250" y="174" width="160" height="42" rx="8" class="node-box-rect"/><text class="node-name" x="330" y="199" style="font-size:10.5px">ros_gz_sim create</text></g>
            <line data-id="e-topic-spawn" x1="170" y1="195" x2="250" y2="195" stroke="#cbd5e1" stroke-width="2"/>

            <g data-id="n-bridge"><rect x="10" y="256" width="160" height="46" rx="8" class="node-box-rect"/><text class="node-name" x="90" y="276" style="font-size:11px">ros_gz_bridge</text><text class="lbl-sm" x="90" y="292">/clock</text></g>

            <polyline data-id="e-gz-clock" points="250,108 195,108 195,268 170,268" fill="none" stroke="#cbd5e1" stroke-width="2"/>
            <polyline data-id="e-clock-back" points="170,290 225,290 225,126 170,126" fill="none" stroke="#cbd5e1" stroke-width="2"/>
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
})();
