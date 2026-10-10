// Mô hình chuyển động cho Module 3 (URDF/XACRO).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 1. Robot nhìn từ trên xuống: đổi property, hình dạng đổi theo ----------
  // Công thức lấy nguyên văn từ atlas.urdf.xacro / wheel.xacro / sensors.xacro.
  defineScene('robot-geometry', {
    title: 'Đổi property, xem robot đổi hình dạng',
    caption: 'Nhìn từ trên xuống: trục X (trước) sang phải, trục Y (trái) hướng lên trên màn hình, đúng REP-103. caster_radius và lidar_radius giữ cố định như Atlas thật, không phải tham số đang xét ở đây.',
    setup({ stage, ui }) {
      const CX = 320, CY = 180, SCALE = 480;
      const WHEEL_WIDTH = 0.03, CASTER_R = 0.02, LIDAR_R = 0.035;
      const sx = (xm) => CX + xm * SCALE;
      const sy = (ym) => CY - ym * SCALE;

      stage.innerHTML = `<svg class="svg" viewBox="0 0 640 360" role="img" aria-label="Robot nhìn từ trên xuống, đổi hình dạng theo tham số">
        <text class="lbl-sm" x="18" y="20" text-anchor="start">X (trước) →</text>
        <text class="lbl-sm" x="18" y="36" text-anchor="start">↑ Y (trái)</text>
        <g class="dyn-dim"></g>
        <g class="dyn-body"></g>
      </svg>`;
      ui.innerHTML = `
        <label class="ctl">base_length <input type="range" min="0.15" max="0.6" step="0.01" value="0.30" data-k="bl"> <span data-k="blv"></span> m</label>
        <label class="ctl">base_width <input type="range" min="0.15" max="0.4" step="0.01" value="0.24" data-k="bw"> <span data-k="bwv"></span> m</label>
        <label class="ctl">wheel_radius <input type="range" min="0.03" max="0.12" step="0.005" value="0.05" data-k="wr"> <span data-k="wrv"></span> m</label>
        <label class="ctl">wheel_separation <input type="range" min="0.15" max="0.6" step="0.01" value="0.30" data-k="ws"> <span data-k="wsv"></span> m</label>
        <label class="ctl">lidar_x_offset <input type="range" min="-0.15" max="0.2" step="0.01" value="0.05" data-k="lx"> <span data-k="lxv"></span> m</label>
        <label class="ctl"><input type="checkbox" data-k="lock"> Khóa lidar_x_offset = base_length / 4</label>
        <button class="btn-sm" data-k="reset">Đặt lại về Atlas gốc</button>
        <div class="stat" data-k="stat"></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const body = stage.querySelector('.dyn-body');
      const dim = stage.querySelector('.dyn-dim');
      const stat = q('stat');
      const DEFAULTS = { bl: 0.30, bw: 0.24, wr: 0.05, ws: 0.30, lx: 0.05 };

      function render() {
        const bl = Number(q('bl').value), bw = Number(q('bw').value);
        const wr = Number(q('wr').value), ws = Number(q('ws').value);
        const lock = q('lock').checked;
        let lx = lock ? bl / 4 : Number(q('lx').value);
        if (lock) q('lx').value = lx;
        q('lx').disabled = lock;
        ['bl', 'bw', 'wr', 'ws', 'lx'].forEach((k) => { q(k + 'v').textContent = Number(q(k).value).toFixed(2); });

        const frontX = bl / 2 - CASTER_R - 0.01, rearX = -(bl / 2 - CASTER_R - 0.01);

        const wheelRect = (ym) => {
          const x = sx(-wr), y = sy(ym) - (WHEEL_WIDTH * SCALE) / 2;
          return `<rect x="${x}" y="${y}" width="${2 * wr * SCALE}" height="${WHEEL_WIDTH * SCALE}" rx="3" fill="#334155"/>`;
        };
        body.innerHTML = `
          <rect x="${sx(-bl / 2)}" y="${sy(bw / 2)}" width="${bl * SCALE}" height="${bw * SCALE}" rx="6" class="node-box-rect"/>
          <circle cx="${sx(frontX)}" cy="${sy(0)}" r="${CASTER_R * SCALE}" fill="#1a202c"/>
          <circle cx="${sx(rearX)}" cy="${sy(0)}" r="${CASTER_R * SCALE}" fill="#1a202c"/>
          ${wheelRect(ws / 2)}
          ${wheelRect(-ws / 2)}
          <circle cx="${sx(lx)}" cy="${sy(0)}" r="${LIDAR_R * SCALE}" fill="#ea580c" opacity="0.85"/>`;

        const wsX = sx(bl / 2) + 26;
        dim.innerHTML = `
          <line x1="${wsX}" y1="${sy(ws / 2)}" x2="${wsX}" y2="${sy(-ws / 2)}" stroke="#94a3b8" stroke-width="1.5"/>
          <line x1="${wsX - 6}" y1="${sy(ws / 2)}" x2="${wsX + 6}" y2="${sy(ws / 2)}" stroke="#94a3b8" stroke-width="1.5"/>
          <line x1="${wsX - 6}" y1="${sy(-ws / 2)}" x2="${wsX + 6}" y2="${sy(-ws / 2)}" stroke="#94a3b8" stroke-width="1.5"/>`;

        const overhang = Math.max(0, ws / 2 - bw / 2);
        stat.innerHTML =
          `front_caster x=<b>${frontX.toFixed(3)}</b> m · rear_caster x=<b>${rearX.toFixed(3)}</b> m` +
          ` · Bánh nhô khỏi mép khung theo Y: <b style="color:${overhang > 0 ? '#dc2626' : 'inherit'}">${overhang.toFixed(3)} m</b>`;
      }

      ui.querySelectorAll('input').forEach((el) => el.addEventListener('input', render));
      q('reset').addEventListener('click', () => {
        Object.entries(DEFAULTS).forEach(([k, v]) => { q(k).value = v; });
        q('lock').checked = false;
        render();
      });

      return { reset: render };
    },
  });

  // ---------- 2. Các loại joint: động theo đúng cách mỗi loại được phép động ----------
  defineScene('joint-types', {
    title: '4 loại joint, 4 kiểu được phép chuyển động',
    caption: 'Chọn 1 loại joint. "parent" (xám) luôn đứng yên; "child" chuyển động đúng kiểu loại joint đó cho phép — hoặc không chuyển động gì cả, với fixed.',
    setup({ stage, ui }) {
      const CY = 110, PIVOT_X = 190, R = 58;
      const TYPES = {
        fixed: {
          label: 'fixed',
          xml: '<joint type="fixed">\n  <!-- không có <axis>, không có <limit> -->',
          note: 'Không có bậc tự do nào — transform cha→con không đổi theo thời gian. Dùng cho cảm biến hàn cứng, hoặc (như caster của Atlas) đơn giản hóa 1 khớp khó mô hình.',
        },
        continuous: {
          label: 'continuous',
          xml: '<joint type="continuous">\n  <axis xyz="0 1 0"/>\n  <!-- không có <limit> -->',
          note: 'Quay quanh 1 trục, KHÔNG giới hạn góc — đúng bánh xe chủ động của Atlas (left_wheel_joint, right_wheel_joint).',
        },
        revolute: {
          label: 'revolute',
          xml: '<joint type="revolute">\n  <axis xyz="0 1 0"/>\n  <limit lower="-1.05" upper="1.05" .../>',
          note: 'Quay quanh 1 trục nhưng CÓ giới hạn góc (radian) — ví dụ khớp tay máy, cổ pan-tilt camera. Atlas hiện không dùng loại này.',
        },
        prismatic: {
          label: 'prismatic',
          xml: '<joint type="prismatic">\n  <axis xyz="1 0 0"/>\n  <limit lower="-0.05" upper="0.05" .../>',
          note: 'Trượt thẳng dọc 1 trục, có giới hạn khoảng cách (mét) — ví dụ cột nâng, ngăn kéo. Atlas hiện không dùng loại này.',
        },
      };
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 480 220" role="img" aria-label="Minh họa chuyển động của joint đang chọn">
          <rect x="20" y="80" width="110" height="60" rx="8" class="node-box-rect"/>
          <text class="node-name" x="75" y="114" style="font-size:12px">parent</text>
          <g class="dyn-child"></g>
        </svg>
        <div class="stat" data-k="readout" style="margin-top:8px"></div>`;
      ui.innerHTML = `
        <div class="steps" data-k="tabs">${Object.keys(TYPES).map((k) => `<span data-type="${k}" style="cursor:pointer">${k}</span>`).join('')}</div>
        <pre class="flow-code" data-k="xml" style="width:100%"></pre>
        <p class="stat-note" data-k="note"></p>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const childG = stage.querySelector('.dyn-child');
      const readout = stage.querySelector('[data-k="readout"]');
      const tabs = [...q('tabs').children];

      let type = 'continuous', t = 0, laps = 0, lastWrapped = 0;

      function selectType(k) {
        type = k;
        tabs.forEach((el) => el.classList.toggle('active', el.dataset.type === k));
        q('xml').textContent = TYPES[k].xml;
        q('note').textContent = TYPES[k].note;
        laps = 0; t = 0;
        draw(0);
      }
      tabs.forEach((el) => el.addEventListener('click', () => selectType(el.dataset.type)));

      function draw(dt) {
        if (type === 'fixed') {
          childG.innerHTML = `<rect x="150" y="85" width="110" height="50" rx="8" class="node-box-rect"/>
            <text class="node-name" x="205" y="114" style="font-size:12px">child</text>`;
          readout.textContent = 'Không chuyển động — 0 bậc tự do.';
          return;
        }
        if (type === 'continuous' || type === 'revolute') {
          const speed = type === 'continuous' ? 1.1 : 1.6;
          t += dt * speed;
          const angle = type === 'continuous' ? t : (Math.PI / 3) * Math.sin(t);
          const tipX = PIVOT_X + R * Math.cos(angle), tipY = CY - R * Math.sin(angle);
          let html = `<circle cx="${PIVOT_X}" cy="${CY}" r="${R}" class="ring"/>`;
          if (type === 'revolute') {
            const p1x = PIVOT_X + R * Math.cos(-Math.PI / 3), p1y = CY - R * Math.sin(-Math.PI / 3);
            const p2x = PIVOT_X + R * Math.cos(Math.PI / 3), p2y = CY - R * Math.sin(Math.PI / 3);
            html += `<line x1="${PIVOT_X}" y1="${CY}" x2="${p1x}" y2="${p1y}" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3"/>
                     <line x1="${PIVOT_X}" y1="${CY}" x2="${p2x}" y2="${p2y}" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3"/>`;
          }
          html += `<line x1="${PIVOT_X}" y1="${CY}" x2="${tipX}" y2="${tipY}" stroke="#2563eb" stroke-width="4"/>
                   <circle cx="${tipX}" cy="${tipY}" r="8" class="pkt"/>`;
          childG.innerHTML = html;
          const deg = ((angle * 180) / Math.PI);
          const wrapped = ((deg % 360) + 360) % 360;
          if (type === 'continuous') {
            if (lastWrapped > 300 && wrapped < 60) laps++;
            lastWrapped = wrapped;
            readout.textContent = `Góc: ${wrapped.toFixed(0)}° — đã quay ${laps} vòng, không có giới hạn.`;
          } else {
            readout.textContent = `Góc: ${deg.toFixed(0)}° — giới hạn -60°…60° (nét đỏ đứt).`;
          }
          return;
        }
        if (type === 'prismatic') {
          t += dt * 1.3;
          const offM = 0.05 * Math.sin(t);
          const px = PIVOT_X + offM * 700;
          childG.innerHTML = `
            <line x1="150" y1="${CY}" x2="330" y2="${CY}" stroke="var(--line)" stroke-width="3"/>
            <line x1="${PIVOT_X - 35}" y1="${CY - 14}" x2="${PIVOT_X - 35}" y2="${CY + 14}" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3"/>
            <line x1="${PIVOT_X + 35}" y1="${CY - 14}" x2="${PIVOT_X + 35}" y2="${CY + 14}" stroke="#dc2626" stroke-width="2" stroke-dasharray="3 3"/>
            <rect x="${px - 16}" y="${CY - 16}" width="32" height="32" rx="6" fill="#2563eb"/>`;
          readout.textContent = `Vị trí: ${offM.toFixed(3)} m — giới hạn -0.05…0.05 m (nét đỏ đứt).`;
        }
      }

      selectType('continuous');
      return {
        reset() { t = 0; laps = 0; draw(0); },
        update(dt) { draw(dt); },
      };
    },
  });

  // ---------- 3. Link: visual/collision lệch nhau, inertial tính theo công thức thật ----------
  defineScene('link-layers', {
    title: 'visual, collision, inertial — 3 lớp độc lập của 1 link',
    caption: 'Viên bi nảy theo đúng biên COLLISION (đỏ đứt), không phải visual (xanh liền) — nếu 2 biên lệch nhau, bi sẽ nảy trong khoảng trống nhìn thấy được. Bánh đà bên phải quay nhanh/chậm theo đúng izz vừa tính khi bạn bấm "đẩy".',
    setup({ stage, ui }) {
      const CX = 150, CY = 150, SCALE = 260;
      const FX = 460, FR = 50;
      const sx = (xm) => CX + xm * SCALE, sy = (ym) => CY - ym * SCALE;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 600 300" role="img" aria-label="Hình khối visual/collision của 1 link với bi nảy theo collision, cộng bánh đà minh họa quán tính">
          <g class="dyn-shapes"></g>
          <g class="dyn-ball"></g>
          <text class="col-hd" x="${FX}" y="78">Quán tính quanh Z (izz)</text>
          <g class="dyn-fw"></g>
        </svg>
        <div class="stat" data-k="dims" style="margin-top:6px"></div>`;
      ui.innerHTML = `
        <label class="ctl">mass <input type="range" min="0.1" max="10" step="0.1" value="5.0" data-k="m"> <span data-k="mv"></span> kg</label>
        <label class="ctl">x (dài) <input type="range" min="0.05" max="0.6" step="0.01" value="0.30" data-k="x"> <span data-k="xv"></span> m</label>
        <label class="ctl">y (rộng) <input type="range" min="0.05" max="0.6" step="0.01" value="0.24" data-k="y"> <span data-k="yv"></span> m</label>
        <label class="ctl">z (cao) <input type="range" min="0.02" max="0.3" step="0.01" value="0.12" data-k="z"> <span data-k="zv"></span> m</label>
        <label class="ctl"><input type="checkbox" data-k="showVisual" checked> Visual</label>
        <label class="ctl"><input type="checkbox" data-k="showCollision" checked> Collision</label>
        <label class="ctl">tỉ lệ collision <input type="range" min="0.6" max="1.6" step="0.05" value="1.0" data-k="cs"></label>
        <button class="btn-sm" data-k="push">Đẩy quay bánh đà</button>
        <div class="stat" data-k="inertia"></div>
        <div class="stat" data-k="fwreadout"></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const shapes = stage.querySelector('.dyn-shapes');
      const ballG = stage.querySelector('.dyn-ball');
      const fwG = stage.querySelector('.dyn-fw');
      const dims = stage.querySelector('[data-k="dims"]');
      const inertia = q('inertia');
      const fwReadout = q('fwreadout');
      const BAR_MAX = 300;

      let ball = { bx: 0, by: 0, vx: 0.55, vy: 0.42 };
      let fw = { angle: 0, vel: 0 };
      let curIzz = 0.01;

      function computeInertia() {
        const m = Number(q('m').value), x = Number(q('x').value), y = Number(q('y').value), z = Number(q('z').value);
        return {
          ixx: (1 / 12) * m * (y * y + z * z),
          iyy: (1 / 12) * m * (x * x + z * z),
          izz: (1 / 12) * m * (x * x + y * y),
        };
      }

      function drawBall() {
        ballG.innerHTML = `<circle cx="${sx(ball.bx)}" cy="${sy(ball.by)}" r="6" class="pkt-retry"/>`;
      }
      function drawFlywheel() {
        const tipX = FX + FR * Math.cos(fw.angle), tipY = CY - FR * Math.sin(fw.angle);
        fwG.innerHTML = `
          <circle cx="${FX}" cy="${CY}" r="${FR}" class="ring"/>
          <line x1="${FX}" y1="${CY}" x2="${tipX}" y2="${tipY}" stroke="#2563eb" stroke-width="4"/>
          <circle cx="${tipX}" cy="${tipY}" r="7" class="pkt"/>`;
      }

      function render() {
        const x = Number(q('x').value), y = Number(q('y').value), cs = Number(q('cs').value);
        ['m', 'x', 'y', 'z'].forEach((k) => { q(k + 'v').textContent = Number(q(k).value).toFixed(2); });

        const vw = x * SCALE, vh = y * SCALE;
        const cw = vw * cs, ch = vh * cs;
        let html = '';
        if (q('showCollision').checked) {
          html += `<rect x="${CX - cw / 2}" y="${CY - ch / 2}" width="${cw}" height="${ch}" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6 4"/>`;
        }
        if (q('showVisual').checked) {
          html += `<rect x="${CX - vw / 2}" y="${CY - vh / 2}" width="${vw}" height="${vh}" rx="4" class="node-box-rect"/>`;
        }
        shapes.innerHTML = html;
        dims.innerHTML = `visual: ${x.toFixed(2)}×${y.toFixed(2)} m (nét liền) &nbsp;·&nbsp; collision: ${(x * cs).toFixed(2)}×${(y * cs).toFixed(2)} m (nét đỏ đứt)`;

        const { ixx, iyy, izz } = computeInertia();
        curIzz = izz;
        const bar = (label, v) => {
          const w = Math.min(BAR_MAX, (v / 0.15) * BAR_MAX);
          return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
            <code style="width:38px;flex:none">${label}</code>
            <div style="background:var(--surface-2);border-radius:4px;flex:1;max-width:${BAR_MAX}px">
              <div style="background:var(--brand);height:10px;border-radius:4px;width:${w}px"></div>
            </div>
            <span style="width:90px;flex:none;font-size:13px">${v.toFixed(4)} kg·m²</span>
          </div>`;
        };
        inertia.innerHTML =
          `<div style="margin-bottom:4px">Mô-men quán tính (chiều cao z = ${Number(q('z').value).toFixed(2)} m cũng tính vào đây, dù không thấy trên hình vuông góc từ trên):</div>` +
          bar('ixx', ixx) + bar('iyy', iyy) + bar('izz', izz);
        drawBall();
        drawFlywheel();
      }

      function paintFwReadout() {
        fwReadout.innerHTML = `Tốc độ quay bánh đà: <b>${Math.abs(fw.vel).toFixed(2)} rad/s</b> — izz hiện tại = ${curIzz.toFixed(4)} kg·m² (izz càng nhỏ, cùng 1 cú đẩy quay càng nhanh)`;
      }

      ui.querySelectorAll('input').forEach((el) => el.addEventListener('input', render));
      q('push').addEventListener('click', () => {
        fw.vel += 0.09 / curIzz; // "đẩy" 1 xung mô-men cố định: Δω = xung / izz -- izz nhỏ thì tăng tốc nhiều hơn
        drawFlywheel();
        paintFwReadout();
      });

      return {
        reset() {
          ball = { bx: 0, by: 0, vx: 0.55, vy: 0.42 };
          fw = { angle: 0, vel: 0 };
          render();
        },
        update(dt) {
          const x = Number(q('x').value), y = Number(q('y').value), cs = Number(q('cs').value);
          const hx = (x * cs) / 2, hy = (y * cs) / 2;
          ball.bx += ball.vx * dt;
          ball.by += ball.vy * dt;
          if (ball.bx > hx) { ball.bx = hx; ball.vx *= -1; }
          if (ball.bx < -hx) { ball.bx = -hx; ball.vx *= -1; }
          if (ball.by > hy) { ball.by = hy; ball.vy *= -1; }
          if (ball.by < -hy) { ball.by = -hy; ball.vy *= -1; }
          drawBall();

          if (Math.abs(fw.vel) > 0.005) {
            fw.angle += fw.vel * dt;
            fw.vel *= Math.exp(-0.5 * dt);
          } else {
            fw.vel = 0;
          }
          drawFlywheel();
          paintFwReadout();
        },
      };
    },
  });

  // ---------- 4. robot_state_publisher: joint fixed -> /tf_static, joint động -> /tf ----------
  defineScene('rsp-pipeline', {
    title: 'robot_state_publisher: ai cấp /joint_states quyết định nguồn',
    caption: 'Kéo thanh trượt mô phỏng joint_state_publisher_gui. base_link→lidar_link (fixed) không bao giờ đổi, dù kéo gì. base_link→left_wheel_link (continuous) đổi NGAY theo góc bạn kéo.',
    setup({ stage, ui }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 180" role="img" aria-label="xacro qua robot_description tới robot_state_publisher, tách thành /tf_static và /tf">
          <g data-k="top"></g>
          <line x1="540" y1="70" x2="540" y2="95" stroke="#94a3b8" stroke-width="2"/>
          <line x1="540" y1="95" x2="150" y2="95" stroke="#94a3b8" stroke-width="2"/>
          <line x1="540" y1="95" x2="490" y2="95" stroke="#94a3b8" stroke-width="2"/>
          <line x1="150" y1="95" x2="150" y2="118" stroke="#94a3b8" stroke-width="2"/>
          <line x1="490" y1="95" x2="490" y2="118" stroke="#94a3b8" stroke-width="2"/>
          <rect x="60" y="118" width="180" height="50" rx="8" class="node-box-rect"/>
          <text class="node-name" x="150" y="140" style="font-size:12px">/tf_static</text>
          <text class="lbl-sm" x="150" y="156">base_link → lidar_link (fixed)</text>
          <rect x="400" y="118" width="180" height="50" rx="8" class="node-box-rect"/>
          <text class="node-name" x="490" y="140" style="font-size:12px">/tf</text>
          <text class="lbl-sm" x="490" y="156">base_link → left_wheel_link</text>
        </svg>
        <div class="stat" data-k="readout" style="margin-top:4px"></div>`;
      ui.innerHTML = `
        <label class="ctl">joint_state_publisher_gui: left_wheel_joint
          <input type="range" min="-180" max="180" step="1" value="0" data-k="angle"> <span data-k="anglev"></span>°</label>
        <label class="ctl"><input type="checkbox" data-k="auto" checked> Tự kéo (giả lập bánh đang quay)</label>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const top = stage.querySelector('[data-k="top"]');
      const readout = stage.querySelector('[data-k="readout"]');

      top.innerHTML = `
        <rect x="20" y="20" width="140" height="50" rx="8" class="node-box-rect"/>
        <text class="node-name" x="90" y="42" style="font-size:12px">atlas.urdf.xacro</text>
        <text class="lbl-sm" x="90" y="58">xacro chạy lúc launch</text>
        <line x1="160" y1="45" x2="230" y2="45" stroke="#94a3b8" stroke-width="2"/>
        <rect x="230" y="20" width="160" height="50" rx="8" class="node-box-rect"/>
        <text class="node-name" x="310" y="42" style="font-size:12px">robot_description</text>
        <text class="lbl-sm" x="310" y="58">tham số, 1 chuỗi URDF</text>
        <line x1="390" y1="45" x2="460" y2="45" stroke="#94a3b8" stroke-width="2"/>
        <rect x="460" y="20" width="160" height="50" rx="8" class="node-box-rect"/>
        <text class="node-name" x="540" y="42" style="font-size:11.5px">robot_state_publisher</text>
        <text class="lbl-sm" x="540" y="58">chia 2 nhóm joint</text>`;

      function render() {
        const deg = Number(q('angle').value);
        q('anglev').textContent = deg.toFixed(0);
        readout.innerHTML =
          `/tf_static (base_link→lidar_link): x=0.050 y=0.000 z=0.140 m — <b>không đổi</b> &nbsp;·&nbsp; ` +
          `/tf (base_link→left_wheel_link): góc khớp=<b>${deg.toFixed(0)}°</b> — đổi theo slider, cập nhật mỗi khi nhận /joint_states`;
      }
      q('angle').addEventListener('input', render);

      let t = 0;
      return {
        reset() { t = 0; render(); },
        update(dt) {
          if (!q('auto').checked) return;
          t += dt * 60;
          const deg = (((t % 360) + 540) % 360) - 180;
          q('angle').value = deg;
          render();
        },
      };
    },
  });

  // ---------- 5. Cây TF thật của Atlas (đáp án bài tập Module 2) ----------
  defineScene('atlas-tf-tree', {
    title: 'Cây TF thật của Atlas',
    caption: 'Đường LIỀN XANH = joint continuous (đổi theo /joint_states). Đường NÉT ĐỨT XÁM = joint fixed (tĩnh, /tf_static). Đúng kết quả lệnh check_urdf/view_frames thật trên Atlas.',
    setup({ stage }) {
      const ROOT = { x: 320, y: 36 };
      const BASE = { x: 320, y: 110 };
      const ROW_Y = 220;
      const xs = [60, 164, 268, 372, 476, 580]; // cách đều 104px, mỗi ô rộng 96 -> hở 8px (đã kiểm chứng ở Module 2)
      const FRAMES = [
        { id: 'left_wheel_link', dyn: true },
        { id: 'right_wheel_link', dyn: true },
        { id: 'front_caster_link', dyn: false },
        { id: 'rear_caster_link', dyn: false },
        { id: 'lidar_link', dyn: false },
        { id: 'imu_link', dyn: false },
      ];
      const pos = Object.fromEntries(FRAMES.map((f, i) => [f.id, { x: xs[i], y: ROW_Y }]));

      const edge = (a, b, dyn) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
        stroke="${dyn ? '#2563eb' : '#94a3b8'}" stroke-width="${dyn ? 3 : 2}" stroke-dasharray="${dyn ? '0' : '6 5'}"/>`;
      const box = (x, y, w, h, name, sub) => `
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" class="node-box-rect"/>
        <text class="node-name" x="${x}" y="${y - (sub ? 2 : -4)}" style="font-size:11px">${name}</text>
        ${sub ? `<text class="lbl-sm" x="${x}" y="${y + 13}">${sub}</text>` : ''}`;

      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 260" role="img" aria-label="Cây TF thật của Atlas: base_footprint, base_link, và 6 frame con">
          ${edge(ROOT, BASE, false)}
          ${FRAMES.map((f) => edge(BASE, pos[f.id], f.dyn)).join('')}
          ${box(ROOT.x, ROOT.y, 160, 40, 'base_footprint', 'link ảo, gốc TF')}
          ${box(BASE.x, BASE.y, 140, 40, 'base_link')}
          ${FRAMES.map((f) => box(pos[f.id].x, pos[f.id].y, 96, 44, f.id.replace('_link', ''), '_link')).join('')}
        </svg>
        <p class="stat-note">8 link, 7 joint — 2 continuous (bánh), 5 fixed (base_joint + 2 caster + lidar + imu). Đúng số đếm <code>check_urdf</code> in ra.</p>`;

      return {};
    },
  });

  // ---------- 6. Mỗi <link>/<joint> ứng với gì trong TF ----------
  defineScene('urdf-tf-map', {
    title: '<link>/<joint> trong XML ứng với gì trong TF',
    caption: 'Bấm 1 dòng bên trái — đúng 3 cặp link/joint đầu tiên của Atlas thật (base_footprint → base_link → lidar_link).',
    setup({ stage }) {
      const ROWS = [
        { id: 'n-bf', kind: 'link', code: '<link name="base_footprint"/>' },
        { id: 'e-bf-bl', kind: 'joint', code: '<joint name="base_joint" type="fixed">\n  <parent link="base_footprint"/>\n  <child link="base_link"/>' },
        { id: 'n-bl', kind: 'link', code: '<link name="base_link">\n  ...\n</link>' },
        { id: 'e-bl-ll', kind: 'joint', code: '<joint name="lidar_joint" type="fixed">\n  <parent link="base_link"/>\n  <child link="lidar_link"/>' },
        { id: 'n-ll', kind: 'link', code: '<link name="lidar_link">\n  ...\n</link>' },
      ];
      stage.innerHTML = `
        <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start">
          <div data-k="rows" style="display:flex;flex-direction:column;gap:6px"></div>
          <svg class="svg" viewBox="0 0 220 280" role="img" aria-label="Cây TF: base_footprint, base_link, lidar_link">
            <line data-id="e-bf-bl" x1="110" y1="60" x2="110" y2="120" stroke="#cbd5e1" stroke-width="3"/>
            <line data-id="e-bl-ll" x1="110" y1="160" x2="110" y2="220" stroke="#cbd5e1" stroke-width="3"/>
            <g data-id="n-bf"><rect x="20" y="20" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="110" y="45" style="font-size:11.5px">base_footprint</text></g>
            <g data-id="n-bl"><rect x="20" y="120" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="110" y="145">base_link</text></g>
            <g data-id="n-ll"><rect x="20" y="220" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="110" y="245">lidar_link</text></g>
          </svg>
        </div>`;
      const rowsEl = stage.querySelector('[data-k="rows"]');
      const svg = stage.querySelector('svg');
      rowsEl.innerHTML = ROWS.map((r, i) => `
        <button data-row="${i}" style="text-align:left;white-space:pre;font-family:'Noto Sans Mono',monospace;font-size:12.5px;
          padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer">${esc(r.code)}</button>`).join('');
      const btns = [...rowsEl.querySelectorAll('button')];

      function select(i) {
        btns.forEach((b, j) => {
          const on = j === i;
          b.style.background = on ? 'var(--brand-soft)' : 'var(--surface)';
          b.style.color = on ? 'var(--brand-ink)' : 'var(--ink-2)';
          b.style.borderColor = on ? 'var(--brand)' : 'var(--line)';
        });
        svg.querySelectorAll('[data-id]').forEach((el) => {
          const isTarget = el.getAttribute('data-id') === ROWS[i].id;
          if (el.tagName.toLowerCase() === 'line') {
            el.setAttribute('stroke', isTarget ? '#2563eb' : '#cbd5e1');
            el.setAttribute('stroke-width', isTarget ? 5 : 3);
          } else {
            el.querySelector('rect').classList.toggle('hot', isTarget);
          }
        });
      }
      btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
      select(0);

      return {};
    },
  });

  // ---------- 7. Mô hình 3D thật của Atlas: xoay, phóng to/nhỏ, tách rời từng bộ phận ----------
  // Dựng đúng kích thước/vị trí từ atlas.urdf.xacro + wheel.xacro + sensors.xacro -- không phải
  // minh họa tượng trưng. Thư viện 3D (three.js + OrbitControls) chỉ tải khi scene này thật sự
  // được mở, giống cách app.js chỉ tải đúng file scene của module đang xem.
  defineScene('atlas-3d', {
    title: 'Mô hình 3D của Atlas — xoay, phóng to, tách rời từng bộ phận',
    caption: 'Kéo chuột để xoay, cuộn để phóng to/nhỏ, kéo chuột phải để dịch chuyển góc nhìn. Dựng đúng kích thước thật từ atlas.urdf.xacro.',
    setup({ stage, ui }) {
      stage.innerHTML = '<p class="stat-note" style="padding:30px 10px;text-align:center">Đang tải thư viện 3D…</p>';
      ui.innerHTML = '';
      const inst = { reset() {}, update() {} };

      function loadScript(src) {
        return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(src));
          document.head.appendChild(s);
        });
      }
      async function ensureThree() {
        if (!window.THREE) await loadScript('vendor/three.min.js');
        if (!window.THREE.OrbitControls) await loadScript('vendor/OrbitControls.js');
      }

      ensureThree()
        .then(() => { if (stage.isConnected) buildScene(); })
        .catch((err) => {
          if (stage.isConnected) {
            stage.innerHTML = `<p class="stat-note" style="padding:20px">Không tải được thư viện 3D (${err.message}). Cần file vendor/three.min.js và vendor/OrbitControls.js.</p>`;
          }
        });

      function buildScene() {
        stage.innerHTML = `
          <div data-k="wrap" style="background:var(--surface);border-radius:8px">
            <div style="position:relative">
              <canvas data-k="canvas" style="width:100%;display:block;border-radius:8px 8px 0 0;cursor:grab"></canvas>
              <div class="lbl-sm" style="position:absolute;bottom:6px;left:10px;opacity:.75;pointer-events:none">Kéo để xoay · cuộn để phóng to/nhỏ · chuột phải để dịch chuyển</div>
              <button class="ic" data-k="fs" title="Toàn màn hình" aria-label="Toàn màn hình" style="position:absolute;top:8px;right:8px">⛶</button>
            </div>
            <div data-k="controls" style="padding:10px 12px;border-top:1px solid var(--line)">
              <div data-k="parts" style="display:flex;flex-wrap:wrap;gap:4px 14px;width:100%;margin-bottom:8px"></div>
              <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center">
                <button class="btn-sm" data-k="explode">Tách rời từng bộ phận</button>
                <label class="ctl"><input type="checkbox" data-k="axes"> Hiện tên + trục tọa độ joint (kiểu RViz)</label>
                <label class="ctl"><input type="checkbox" data-k="grid" checked> Hiện lưới</label>
              </div>
            </div>
          </div>`;
        ui.innerHTML = '';

        const wrap = stage.querySelector('[data-k="wrap"]');
        const canvas = stage.querySelector('[data-k="canvas"]');
        const controlsBar = stage.querySelector('[data-k="controls"]');
        const partsEl = stage.querySelector('[data-k="parts"]');
        const explodeBtn = stage.querySelector('[data-k="explode"]');
        const axesCk = stage.querySelector('[data-k="axes"]');
        const gridCk = stage.querySelector('[data-k="grid"]');
        const fsBtn = stage.querySelector('[data-k="fs"]');

        // Thông số thật, nguyên văn từ atlas.urdf.xacro / wheel.xacro / sensors.xacro.
        const P = {
          baseLen: 0.30, baseWid: 0.24, baseH: 0.12,
          wheelR: 0.05, wheelW: 0.03, wheelSep: 0.30,
          casterR: 0.02,
          lidarR: 0.035, lidarH: 0.04, lidarX: 0.05,
          imuSize: 0.02,
        };
        const casterX = P.baseLen / 2 - P.casterR - 0.01;
        const COLORS = {
          white: new THREE.Color(0.95, 0.95, 0.95),
          darkGrey: new THREE.Color(0.2, 0.2, 0.2),
          orange: new THREE.Color(1.0, 0.45, 0.0),
          black: new THREE.Color(0.05, 0.05, 0.05),
        };
        const TETHER_COLOR = 0x2563eb; // khác hẳn màu lưới (xám), dễ phân biệt

        THREE.Object3D.DefaultUp.set(0, 0, 1); // Z lên trên, khớp REP-103 -- dùng thẳng tọa độ ROS, khỏi đổi trục tay

        const scene = new THREE.Scene();
        let bg = '#eef1f6';
        try { bg = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || bg; } catch (e) { /* giữ mặc định */ }
        scene.background = new THREE.Color(bg);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10);
        camera.up.set(0, 0, 1);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.12;
        controls.minDistance = 0.2;
        controls.maxDistance = 3;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
        dirLight.position.set(0.6, -0.4, 1.2);
        scene.add(dirLight);

        const grid = new THREE.GridHelper(1.2, 12, 0x94a3b8, 0xcbd5e1);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.001;
        scene.add(grid);

        const root = new THREE.Group();
        scene.add(root);

        function makePart(name, jointName, mesh, pos, color, visualOffset) {
          mesh.material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
          const g = new THREE.Group();
          if (visualOffset) mesh.position.copy(visualOffset);
          g.add(mesh);
          g.position.copy(pos);
          root.add(g);
          const explodeDir = pos.lengthSq() > 1e-9 ? pos.clone().normalize() : new THREE.Vector3(0, 0, 1);
          return { name, jointName, group: g, assembledPos: pos.clone(), explodeDir };
        }

        const parts = [];
        parts.push(makePart('base_link', 'base_link',
          new THREE.Mesh(new THREE.BoxGeometry(P.baseLen, P.baseWid, P.baseH)),
          new THREE.Vector3(0, 0, 0), COLORS.white, new THREE.Vector3(0, 0, P.baseH / 2)));
        [['left_wheel_link', 'left_wheel_joint', 1], ['right_wheel_link', 'right_wheel_joint', -1]].forEach(([name, jn, reflect]) => {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(P.wheelR, P.wheelR, P.wheelW, 28));
          parts.push(makePart(name, jn, mesh, new THREE.Vector3(0, (reflect * P.wheelSep) / 2, 0), COLORS.darkGrey));
        });
        [['front_caster_link', 'front_caster_joint', casterX], ['rear_caster_link', 'rear_caster_joint', -casterX]].forEach(([name, jn, x]) => {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(P.casterR, 20, 16));
          parts.push(makePart(name, jn, mesh, new THREE.Vector3(x, 0, -P.wheelR + P.casterR), COLORS.black));
        });
        {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(P.lidarR, P.lidarR, P.lidarH, 24));
          mesh.rotation.x = Math.PI / 2; // URDF không rpy -> trục Z; cylinder mặc định của three.js là trục Y
          parts.push(makePart('lidar_link', 'lidar_joint', mesh, new THREE.Vector3(P.lidarX, 0, P.baseH + P.lidarH / 2), COLORS.black));
        }
        parts.push(makePart('imu_link', 'imu_joint',
          new THREE.Mesh(new THREE.BoxGeometry(P.imuSize, P.imuSize, P.imuSize)),
          new THREE.Vector3(0, 0, P.imuSize / 2), COLORS.orange));

        // Trục tọa độ dày (không dùng AxesHelper vì line 1px rất khó thấy) -- đỏ=X, lục=Y, lam=Z,
        // đúng quy ước RViz vẽ TF. Mỗi bộ (trục + nhãn tên + dây nối) được CẬP NHẬT VỊ TRÍ MỖI
        // KHUNG HÌNH theo đúng vị trí HIỆN TẠI của phần đó, nên khi tách rời chúng bám theo luôn.
        function makeThickAxes(size) {
          const r = size * 0.05; // trục to rõ -- giữ đúng cỡ bản đầu, chỉ dây nối mới cần mảnh
          const g = new THREE.Group();
          const mk = (c) => new THREE.MeshBasicMaterial({ color: c });
          const xC = new THREE.Mesh(new THREE.CylinderGeometry(r, r, size, 8), mk(0xdc2626));
          xC.rotation.z = -Math.PI / 2; xC.position.x = size / 2; g.add(xC);
          const yC = new THREE.Mesh(new THREE.CylinderGeometry(r, r, size, 8), mk(0x16a34a));
          yC.position.y = size / 2; g.add(yC);
          const zC = new THREE.Mesh(new THREE.CylinderGeometry(r, r, size, 8), mk(0x2563eb));
          zC.rotation.x = Math.PI / 2; zC.position.z = size / 2; g.add(zC);
          return g;
        }
        function makeTextSprite(text) {
          // Chữ nhỏ, không khung nền -- kiểu nhãn frame của RViz: viền đen mảnh quanh chữ trắng để đọc được trên mọi nền.
          const c = document.createElement('canvas');
          const ctx = c.getContext('2d');
          const fontSize = 28;
          ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
          const pad = 6;
          const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
          const h = fontSize + pad * 2;
          c.width = w; c.height = h;
          ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.strokeText(text, pad, h / 2 + 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, pad, h / 2 + 1);
          const tex = new THREE.CanvasTexture(c);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
          const scaleH = 0.022; // nhỏ như chữ nhãn frame trong RViz, không choán hết khung hình
          sprite.scale.set((w / h) * scaleH, scaleH, 1);
          sprite.renderOrder = 999;
          return sprite;
        }
        function makeTether() {
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1, 1, 6),
            new THREE.MeshBasicMaterial({ color: TETHER_COLOR, transparent: true, opacity: 0.85, depthTest: false }),
          );
          mesh.renderOrder = 1;
          return mesh;
        }
        function updateTether(mesh, from, to) {
          const dir = new THREE.Vector3().subVectors(to, from);
          const len = dir.length();
          if (len < 1e-5) { mesh.visible = false; return; }
          mesh.visible = true;
          mesh.position.copy(from).addScaledVector(dir, 0.5);
          mesh.scale.set(0.0016, len, 0.0016); // dây mảnh, chỉ đủ thấy rõ hơn line 1px mặc định của WebGL
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        }

        const markersGroup = new THREE.Group();
        markersGroup.visible = false;
        scene.add(markersGroup);
        const markers = parts.map((p) => {
          const axes = makeThickAxes(p.name === 'base_link' ? 0.11 : 0.085);
          const label = makeTextSprite(p.jointName);
          markersGroup.add(axes, label);
          let tether = null;
          if (p.name !== 'base_link') { tether = makeTether(); markersGroup.add(tether); }
          return { part: p, axes, label, tether };
        });
        function updateMarkers() {
          markers.forEach((m) => {
            const pos = m.part.group.position;
            m.axes.position.copy(pos);
            m.label.position.copy(pos).add(new THREE.Vector3(0, 0, m.part.name === 'base_link' ? 0.09 : 0.07));
            if (m.tether) updateTether(m.tether, new THREE.Vector3(0, 0, 0), pos);
          });
        }

        partsEl.innerHTML = parts.map((p, i) => `
          <label class="ctl" style="font-size:13px"><input type="checkbox" data-part="${i}" checked> ${p.name}</label>`).join('');
        partsEl.querySelectorAll('input').forEach((el) => {
          el.addEventListener('change', () => { parts[Number(el.dataset.part)].group.visible = el.checked; });
        });

        let explodeTarget = 0, explodeCur = 0;
        explodeBtn.addEventListener('click', () => {
          explodeTarget = explodeTarget > 0.5 ? 0 : 1;
          explodeBtn.textContent = explodeTarget > 0.5 ? 'Ghép lại' : 'Tách rời từng bộ phận';
        });
        axesCk.addEventListener('change', () => { markersGroup.visible = axesCk.checked; });
        gridCk.addEventListener('change', () => { grid.visible = gridCk.checked; });

        const EXPLODE_DIST = 0.32;
        function applyExplode() {
          parts.forEach((p) => {
            if (p.name === 'base_link') return;
            p.group.position.copy(p.assembledPos).addScaledVector(p.explodeDir, explodeCur * EXPLODE_DIST);
          });
          updateMarkers();
        }

        function resizeRenderer() {
          const isFs = document.fullscreenElement === wrap;
          const w = wrap.clientWidth || 600;
          const h = isFs ? Math.max(240, wrap.clientHeight - controlsBar.offsetHeight - 6) : Math.round(w * 0.62);
          renderer.setSize(w, h, false);
          canvas.style.height = h + 'px';
          camera.aspect = w / Math.max(1, h);
          camera.updateProjectionMatrix();
        }
        function onWindowResize() {
          if (!stage.isConnected) { window.removeEventListener('resize', onWindowResize); return; }
          resizeRenderer();
        }
        window.addEventListener('resize', onWindowResize);

        fsBtn.addEventListener('click', () => {
          if (document.fullscreenElement === wrap) document.exitFullscreen();
          else wrap.requestFullscreen?.().catch(() => {});
        });
        function onFsChange() {
          if (!stage.isConnected) { document.removeEventListener('fullscreenchange', onFsChange); return; }
          const isFs = document.fullscreenElement === wrap;
          fsBtn.textContent = isFs ? '⤡' : '⛶';
          fsBtn.setAttribute('aria-label', isFs ? 'Thoát toàn màn hình' : 'Toàn màn hình');
          wrap.style.display = isFs ? 'flex' : '';
          wrap.style.flexDirection = isFs ? 'column' : '';
          wrap.style.height = isFs ? '100%' : '';
          resizeRenderer();
        }
        document.addEventListener('fullscreenchange', onFsChange);

        inst.reset = function () {
          parts.forEach((p, i) => {
            p.group.visible = true;
            const ck = partsEl.querySelector(`[data-part="${i}"]`);
            if (ck) ck.checked = true;
          });
          explodeTarget = 0; explodeCur = 0;
          explodeBtn.textContent = 'Tách rời từng bộ phận';
          axesCk.checked = false; markersGroup.visible = false;
          gridCk.checked = true; grid.visible = true;
          applyExplode();
          camera.position.set(0.55, -0.65, 0.45);
          controls.target.set(0, 0, 0.08);
          resizeRenderer();
          controls.update();
          renderer.render(scene, camera);
        };
        inst.update = function () {
          explodeCur += (explodeTarget - explodeCur) * 0.12;
          applyExplode();
          controls.update();
          renderer.render(scene, camera);
        };
        inst.reset();
      }

      return inst;
    },
  });
})();
