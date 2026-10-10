// Mô hình chuyển động cho Module 6 (Cảm biến: LiDAR & IMU).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 1. LiDAR: ranges[i] trong không gian thật ----------
  defineScene('lidar-scan', {
    title: 'ranges[i] trong không gian thật',
    caption: 'Kéo chậm để nhìn rõ từng tia theo index/góc. Kéo lên gần 10Hz (đúng update_rate thật của Atlas): hết còn là 1 tia bò quanh — toàn bộ 360 tia "chớp" cùng lúc mỗi 1/10 giây, đúng cách gpu_lidar thật hoạt động (không quét cơ học từng tia). range_max thật của Atlas là 10m, thu nhỏ lại trong khung hình này để vật cản còn nhìn thấy được. Khối /scan bên dưới đúng khuôn dạng ros2 topic echo, cộng nhiễu Gauss stddev=0.01 giống hệt cấu hình thật — trang này chạy tĩnh, không có robot thật đang chạy ở đâu để nối vào, nên đây là dữ liệu mô phỏng đúng khuôn dạng, không phải bắt sóng từ một phiên ROS thật.',
    setup({ stage, ui }) {
      const CX = 225, CY = 175, SCALE = 70;
      const SAMPLES = 360, ANGLE_MIN = -Math.PI, ANGLE_MAX = Math.PI;
      const ANGLE_INC = (ANGLE_MAX - ANGLE_MIN) / SAMPLES;
      const RANGE_MIN = 0.12, RANGE_MAX_VIS = 2.8, NOISE_STDDEV = 0.01;
      const HZ_FLASH_THRESHOLD = 3; // trên ngưỡng này: không còn quét từng tia nổi, chuyển sang "chớp" cả 360 tia 1 lần

      stage.innerHTML = `<svg class="svg" viewBox="0 0 450 350" role="img" aria-label="LiDAR quét 360 độ quanh robot, vật cản là các hình tròn">
        <g data-k="obstacles"></g>
        <g data-k="burst"></g>
        <g data-k="points"></g>
        <line data-k="ray" stroke="var(--brand)" stroke-width="1.5"/>
        <circle cx="${CX}" cy="${CY}" r="4" class="pkt-retry"/>
      </svg>
      <div class="stat" data-k="stat" style="margin-top:4px"></div>
      <div class="lbl-sm" data-k="echoLabel" style="margin-top:10px">/scan — ros2 topic echo (mẫu, cập nhật mỗi vòng quét)</div>
      <pre data-k="echo" style="position:relative;margin:4px 0 0;padding:14px 16px;border-radius:12px;background:var(--code-bg);color:var(--code-ink);
        border:1px solid var(--code-line);font-size:12.5px;line-height:1.55;max-height:220px;overflow-y:auto;white-space:pre-wrap"></pre>`;
      ui.innerHTML = `
        <label class="ctl">tốc độ quay <input type="range" min="0.1" max="10" step="0.1" value="1" data-k="hz"> <span data-k="hzv"></span> Hz</label>
        <button class="btn-sm" data-k="real">Tốc độ thật của Atlas (10Hz)</button>
        <button class="btn-sm" data-k="rand">Đổi vị trí vật cản</button>`;

      const obsEl = stage.querySelector('[data-k="obstacles"]');
      const burstEl = stage.querySelector('[data-k="burst"]');
      const ptsEl = stage.querySelector('[data-k="points"]');
      const rayEl = stage.querySelector('[data-k="ray"]');
      const statEl = stage.querySelector('[data-k="stat"]');

      let obstacles = [];
      function randomizeObstacles() {
        obstacles = [];
        for (let i = 0; i < 3; i++) {
          let x, y, r, d;
          do {
            x = (Math.random() * 2 - 1) * 2.2;
            y = (Math.random() * 2 - 1) * 2.2;
            r = 0.18 + Math.random() * 0.18;
            d = Math.hypot(x, y);
          } while (d < 0.6 || d + r > RANGE_MAX_VIS - 0.1);
          obstacles.push({ x, y, r });
        }
        obsEl.innerHTML = obstacles.map((o) =>
          // dùng style= (không phải fill=/stroke=) -- inline style thắng mọi rule CSS, kể cả
          // ".svg circle:not(.pkt)..." đang ép fill/stroke mặc định cho circle trần không class
          `<circle cx="${(CX + o.x * SCALE).toFixed(1)}" cy="${(CY - o.y * SCALE).toFixed(1)}" r="${(o.r * SCALE).toFixed(1)}" style="fill:#92603a;stroke:#6b4423;stroke-width:1.5"/>`
        ).join('');
      }
      randomizeObstacles();

      // Giao điểm tia-hình tròn: tia từ gốc (0,0) hướng (dx,dy), hình tròn tâm (ox,oy) bán kính r.
      function castRay(angle) {
        const dx = Math.cos(angle), dy = Math.sin(angle);
        let best = null;
        for (const o of obstacles) {
          const ocx = -o.x, ocy = -o.y;
          const b = 2 * (dx * ocx + dy * ocy);
          const c = ocx * ocx + ocy * ocy - o.r * o.r;
          const disc = b * b - 4 * c;
          if (disc < 0) continue;
          const sq = Math.sqrt(disc);
          const t1 = (-b - sq) / 2, t2 = (-b + sq) / 2;
          const t = t1 > RANGE_MIN ? t1 : (t2 > RANGE_MIN ? t2 : null);
          if (t != null && t <= RANGE_MAX_VIS && (best === null || t < best)) best = t;
        }
        return best;
      }

      const echoEl = stage.querySelector('[data-k="echo"]');
      let scanCount = 0;

      // Nhiễu Gauss (Box-Muller) -- đúng stddev=0.01 khai báo trong atlas.gazebo.xacro.
      function gaussianNoise(stddev) {
        const u1 = Math.max(Math.random(), 1e-9), u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stddev;
      }

      function computeFullScan() {
        const ranges = new Array(SAMPLES);
        for (let i = 0; i < SAMPLES; i++) {
          const angle = ANGLE_MIN + i * ANGLE_INC;
          const hit = castRay(angle);
          ranges[i] = hit != null ? Math.max(RANGE_MIN, hit + gaussianNoise(NOISE_STDDEV)) : null;
        }
        return ranges;
      }

      function formatRanges(ranges) {
        const cells = ranges.map((r) => (r == null ? '.inf' : r.toFixed(3)));
        const lines = [];
        for (let i = 0; i < cells.length; i += 10) lines.push('  ' + cells.slice(i, i + 10).join(', ') + (i + 10 < cells.length ? ',' : ']'));
        return '[\n' + lines.join('\n');
      }

      function renderEcho() {
        scanCount += 1;
        const ranges = computeFullScan();
        echoEl.textContent =
          `header:\n  stamp: {sec: ${scanCount * 10}, nanosec: 0}\n  frame_id: lidar_link\n` +
          `angle_min: ${ANGLE_MIN.toFixed(5)}\nangle_max: ${ANGLE_MAX.toFixed(5)}\nangle_increment: ${ANGLE_INC.toFixed(6)}\n` +
          `time_increment: 0.0\nscan_time: 0.10000\nrange_min: ${RANGE_MIN.toFixed(2)}\nrange_max: 10.0\n` +
          `ranges: ${formatRanges(ranges)}\nintensities: []`;
      }

      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      let sweepAngle = ANGLE_MIN;
      let points = [];
      let flashAcc = 0;

      function hitPoint(angle) {
        const hit = castRay(angle);
        if (hit == null) return null;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        return { x: CX + dx * hit * SCALE, y: CY - dy * hit * SCALE };
      }

      function flashFullScan() {
        points = [];
        const burstLines = [];
        for (let i = 0; i < SAMPLES; i++) {
          const angle = ANGLE_MIN + i * ANGLE_INC;
          const hit = castRay(angle);
          const dx = Math.cos(angle), dy = Math.sin(angle);
          const len = (hit != null ? hit : RANGE_MAX_VIS) * SCALE;
          const ex = CX + dx * len, ey = CY - dy * len;
          burstLines.push(`<line x1="${CX}" y1="${CY}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--brand)" stroke-width="0.6" opacity="0.4"/>`);
          if (hit != null) points.push({ x: ex, y: ey });
        }
        // Toàn bộ 360 tia laser bắn ra CÙNG LÚC -- đúng cách gpu_lidar thật hoạt động, không phải
        // 1 tia bò dần. Tia nào không trúng gì vẫn vẽ ra tới range_max, chỉ là không để lại chấm.
        burstEl.innerHTML = burstLines.join('');
        ptsEl.innerHTML = points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" class="pkt"/>`).join('');
        renderEcho();
      }

      function render() {
        const hz = Number(q('hz').value);
        q('hzv').textContent = hz.toFixed(1);
        const flashMode = hz > HZ_FLASH_THRESHOLD;
        rayEl.style.display = flashMode ? 'none' : '';

        if (flashMode) {
          statEl.innerHTML = `<b>${hz.toFixed(1)} Hz</b> · toàn bộ 360 tia cập nhật cùng lúc mỗi <b>${(1000 / hz).toFixed(0)}ms</b> — không còn tia nào "đang bò" để chỉ ra nữa, đúng cách gpu_lidar thật phát dữ liệu`;
          return;
        }
        let idx = Math.round((sweepAngle - ANGLE_MIN) / ANGLE_INC);
        idx = Math.max(0, Math.min(SAMPLES - 1, idx));
        const hit = castRay(sweepAngle);
        const dx = Math.cos(sweepAngle), dy = Math.sin(sweepAngle);
        const rayLen = (hit != null ? hit : RANGE_MAX_VIS) * SCALE;
        rayEl.setAttribute('x1', CX); rayEl.setAttribute('y1', CY);
        rayEl.setAttribute('x2', (CX + dx * rayLen).toFixed(1)); rayEl.setAttribute('y2', (CY - dy * rayLen).toFixed(1));
        statEl.innerHTML = `${hz.toFixed(1)} Hz → trọn 1 vòng mất ${(1 / hz).toFixed(2)}s · i=<b>${idx}</b> · góc=<b>${sweepAngle.toFixed(2)}</b> rad (<b>${(sweepAngle * 180 / Math.PI).toFixed(0)}°</b>) · ranges[i]=<b>${hit != null ? hit.toFixed(2) + ' m' : 'ngoài tầm (range_max)'}</b>`;
      }
      render();
      renderEcho();

      q('hz').addEventListener('input', () => {
        points = []; ptsEl.innerHTML = ''; burstEl.innerHTML = ''; flashAcc = 0; sweepAngle = ANGLE_MIN;
        render();
      });
      q('real').addEventListener('click', () => { q('hz').value = 10; q('hz').dispatchEvent(new Event('input', { bubbles: true })); });
      q('rand').addEventListener('click', () => {
        randomizeObstacles();
        points = []; ptsEl.innerHTML = '';
        renderEcho();
      });

      return {
        reset() {
          sweepAngle = ANGLE_MIN;
          flashAcc = 0;
          points = []; ptsEl.innerHTML = '';
          render();
          renderEcho();
        },
        update(dt) {
          const hz = Number(q('hz').value);
          const flashMode = hz > HZ_FLASH_THRESHOLD;

          if (flashMode) {
            flashAcc += dt;
            const period = 1 / hz;
            if (flashAcc >= period) {
              flashAcc -= period;
              flashFullScan();
            }
            render();
            return;
          }

          sweepAngle += (2 * Math.PI * hz) * dt;
          if (sweepAngle > ANGLE_MAX) {
            sweepAngle = ANGLE_MIN;
            points = []; ptsEl.innerHTML = '';
            renderEcho();
          }
          const p = hitPoint(sweepAngle);
          if (p) {
            points.push(p);
            if (points.length > 500) points.shift();
            ptsEl.innerHTML = points.map((pt) => `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2" class="pkt"/>`).join('');
          }
          render();
        },
      };
    },
  });

  // ---------- 2. IMU: mô hình máy bay 3D, chỉnh roll/pitch/yaw ----------
  defineScene('imu-fields', {
    title: '3 nhóm trường của sensor_msgs/msg/Imu',
    caption: 'Kéo chuột để xoay góc nhìn, cuộn để phóng to/nhỏ. 3 trục gắn trên thân máy bay (đỏ=X mũi, lục=Y cánh trái, lam=Z nóc) luôn xoay theo đúng roll/pitch/yaw — đúng 3 trục imu_link thật. Mũi tên cam đứng CỐ ĐỊNH ngoài máy bay là trọng lực phản lực thật trong thế giới, không bao giờ đổi hướng — so nó với 3 trục thân để thấy vì sao nghiêng máy bay làm cùng một trọng lực đọc ra 3 số khác hẳn nhau trên linear_acceleration.',
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
          <div style="position:relative">
            <canvas data-k="canvas" style="width:100%;display:block;border-radius:8px;cursor:grab"></canvas>
            <div class="lbl-sm" style="position:absolute;bottom:6px;left:10px;opacity:.75;pointer-events:none">Kéo để xoay · cuộn để phóng to/nhỏ</div>
          </div>
          <div class="stat" data-k="statOri" style="margin-top:6px"></div>
          <div class="stat" data-k="statAng" style="margin-top:2px"></div>
          <div class="stat" data-k="statAcc" style="margin-top:2px"></div>`;
        ui.innerHTML = `
          <label class="ctl">roll (quanh X thân) <input type="range" min="-180" max="180" step="1" value="0" data-k="roll"> <span data-k="rollv"></span>°</label>
          <label class="ctl">pitch (quanh Y thân) <input type="range" min="-89" max="89" step="1" value="0" data-k="pitch"> <span data-k="pitchv"></span>°</label>
          <label class="ctl">yaw (quanh Z thân) <input type="range" min="-180" max="180" step="1" value="0" data-k="yaw"> <span data-k="yawv"></span>°</label>
          <label class="ctl">lực đẩy tới (dọc X thân) <input type="range" min="-3" max="5" step="0.1" value="0" data-k="thrust"> <span data-k="thrustv"></span> m/s²</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px 16px">
            <label class="ctl" style="font-size:12.5px">angular_velocity.x <input type="range" min="-2" max="2" step="0.1" value="0" data-k="wx"> <span data-k="wxv"></span></label>
            <label class="ctl" style="font-size:12.5px">angular_velocity.y <input type="range" min="-2" max="2" step="0.1" value="0" data-k="wy"> <span data-k="wyv"></span></label>
            <label class="ctl" style="font-size:12.5px">angular_velocity.z <input type="range" min="-2" max="2" step="0.1" value="0" data-k="wz"> <span data-k="wzv"></span></label>
          </div>`;

        const canvas = stage.querySelector('[data-k="canvas"]');
        const q = (k) => ui.querySelector(`[data-k="${k}"]`);
        const statOri = stage.querySelector('[data-k="statOri"]');
        const statAng = stage.querySelector('[data-k="statAng"]');
        const statAcc = stage.querySelector('[data-k="statAcc"]');

        const G = 9.8;
        THREE.Object3D.DefaultUp.set(0, 0, 1); // Z lên trên, khớp REP-103

        const scene = new THREE.Scene();
        let bg = '#eef1f6';
        try { bg = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || bg; } catch (e) { /* giữ mặc định */ }
        scene.background = new THREE.Color(bg);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 20);
        camera.up.set(0, 0, 1);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.12;
        controls.minDistance = 0.5;
        controls.maxDistance = 8;

        scene.add(new THREE.AmbientLight(0xffffff, 0.65));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
        dirLight.position.set(1.2, -0.8, 1.6);
        scene.add(dirLight);

        const grid = new THREE.GridHelper(4, 16, 0x94a3b8, 0xcbd5e1);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.9;
        scene.add(grid);

        // Mảy bay: thân + cánh + đuôi, ghép từ hình khối cơ bản -- không phải mô hình thật của
        // bất kỳ máy bay cụ thể nào, chỉ để trực quan hóa 3 trục roll/pitch/yaw dễ hình dung.
        const plane = new THREE.Group();
        scene.add(plane);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe5e9f0, roughness: 0.55 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55 });

        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 16), bodyMat);
        fuselage.rotation.z = Math.PI / 2;
        plane.add(fuselage);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 16), accentMat);
        nose.rotation.z = -Math.PI / 2;
        nose.position.x = 0.63;
        plane.add(nose);

        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.035), accentMat);
        wing.position.x = -0.05;
        plane.add(wing);

        const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.03), accentMat);
        tailH.position.x = -0.45;
        plane.add(tailH);

        const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.3), accentMat);
        tailV.position.set(-0.45, 0, 0.15);
        plane.add(tailV);

        // Trục thân (đỏ=X mũi, lục=Y cánh trái, lam=Z nóc) -- con của `plane`, tự xoay theo.
        function makeThickAxes(size) {
          const r = size * 0.045;
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
        plane.add(makeThickAxes(0.85));

        // Mũi tên trọng lực phản lực -- CỐ ĐỊNH trong thế giới (không phải con của `plane`),
        // luôn thẳng đứng, đặt lệch sang bên để không che máy bay.
        function makeArrow(color, length) {
          const g = new THREE.Group();
          const mat = new THREE.MeshBasicMaterial({ color });
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length, 10), mat);
          shaft.position.y = length / 2;
          g.add(shaft);
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), mat);
          head.position.y = length + 0.06;
          g.add(head);
          return g;
        }
        const gravityArrow = makeArrow(0xf59e0b, 0.8);
        gravityArrow.position.set(1.0, 0.9, -0.9);
        gravityArrow.rotation.x = Math.PI / 2; // mặc định arrow dựng theo local Y -> xoay cho trỏ lên Z
        scene.add(gravityArrow);

        function render() {
          const rollDeg = Number(q('roll').value), pitchDeg = Number(q('pitch').value), yawDeg = Number(q('yaw').value);
          const thrust = Number(q('thrust').value);
          const wx = Number(q('wx').value), wy = Number(q('wy').value), wz = Number(q('wz').value);
          q('rollv').textContent = rollDeg.toFixed(0);
          q('pitchv').textContent = pitchDeg.toFixed(0);
          q('yawv').textContent = yawDeg.toFixed(0);
          q('thrustv').textContent = thrust.toFixed(1);
          q('wxv').textContent = wx.toFixed(1);
          q('wyv').textContent = wy.toFixed(1);
          q('wzv').textContent = wz.toFixed(1);

          const euler = new THREE.Euler(rollDeg * Math.PI / 180, pitchDeg * Math.PI / 180, yawDeg * Math.PI / 180, 'ZYX');
          const quat = new THREE.Quaternion().setFromEuler(euler);
          plane.quaternion.copy(quat);

          // Trọng lực phản lực thật (0,0,G) trong thế giới -- quy đổi sang hệ trục THÂN bằng quaternion
          // nghịch đảo: đây chính là công thức linear_acceleration thật của một IMU đứng yên nhưng bị nghiêng.
          const gWorld = new THREE.Vector3(0, 0, G);
          const gBody = gWorld.clone().applyQuaternion(quat.clone().invert());
          const accel = gBody.clone().add(new THREE.Vector3(thrust, 0, 0));

          statOri.innerHTML = `orientation (quaternion): x=<b>${quat.x.toFixed(3)}</b> y=<b>${quat.y.toFixed(3)}</b> z=<b>${quat.z.toFixed(3)}</b> w=<b>${quat.w.toFixed(3)}</b>`;
          statAng.innerHTML = `angular_velocity: x=<b>${wx.toFixed(1)}</b> y=<b>${wy.toFixed(1)}</b> z=<b>${wz.toFixed(1)}</b> rad/s`;
          statAcc.innerHTML = `linear_acceleration: x=<b>${accel.x.toFixed(2)}</b> y=<b>${accel.y.toFixed(2)}</b> z=<b>${accel.z.toFixed(2)}</b> m/s² — độ lớn ≈ <b>${accel.length().toFixed(2)}</b> m/s² (không bao giờ 0 khi còn trên mặt đất)`;

          controls.update();
          renderer.render(scene, camera);
        }
        ['roll', 'pitch', 'yaw', 'thrust', 'wx', 'wy', 'wz'].forEach((k) => q(k).addEventListener('input', render));

        function resizeRenderer() {
          const w = stage.clientWidth || 600;
          const h = Math.round(w * 0.62);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        function onWindowResize() {
          if (!stage.isConnected) { window.removeEventListener('resize', onWindowResize); return; }
          resizeRenderer();
        }
        window.addEventListener('resize', onWindowResize);

        inst.reset = function () {
          ['roll', 'pitch', 'yaw', 'thrust', 'wx', 'wy', 'wz'].forEach((k) => { q(k).value = 0; });
          camera.position.set(1.8, -2.0, 1.3);
          controls.target.set(0, 0, 0);
          resizeRenderer();
          render();
        };
        inst.update = function () { render(); };
        inst.reset();
      }
      return inst;
    },
  });

  // ---------- 3. Pipeline cảm biến trọn vẹn: xacro -> SDF -> Gazebo Transport -> bridge -> ROS 2 ----------
  defineScene('sensor-pipeline', {
    title: '6 bước: từ xacro tĩnh tới topic ROS 2 sống',
    caption: 'Bấm chọn LiDAR hoặc IMU để xem đúng đường đi của cảm biến đó — 3 bước đầu và bước bridge dùng chung cho cả hai.',
    setup({ stage }) {
      const FLOWS = [
        {
          label: 'LiDAR → /scan',
          ids: ['n-sxacro', 'e-sxacro-gxacro', 'n-gxacro', 'e-gxacro-plugin', 'n-plugin',
            'e-plugin-gzscan', 'n-gzscan', 'e-gzscan-bridge', 'n-bridge',
            'e-bridge-rosscan', 'n-rosscan', 'e-rosscan-consumer', 'n-consumer'],
        },
        {
          label: 'IMU → /imu',
          ids: ['n-sxacro', 'e-sxacro-gxacro', 'n-gxacro', 'e-gxacro-plugin', 'n-plugin',
            'e-plugin-gzimu', 'n-gzimu', 'e-gzimu-bridge', 'n-bridge',
            'e-bridge-rosimu', 'n-rosimu', 'e-rosimu-consumer', 'n-consumer'],
        },
      ];
      stage.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:18px;align-items:start">
          <div data-k="rows" style="display:flex;flex-direction:column;gap:6px"></div>
          <svg class="svg" viewBox="0 0 470 490" role="img" aria-label="Pipeline cảm biến từ xacro tới topic ROS 2">
            <g data-id="n-sxacro"><rect x="70" y="10" width="320" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="30" style="font-size:11px">sensors.xacro</text><text class="lbl-sm" x="230" y="44">hình học + vị trí lidar_link/imu_link</text></g>
            <line data-id="e-sxacro-gxacro" x1="230" y1="50" x2="230" y2="80" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-gxacro"><rect x="70" y="80" width="320" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="100" style="font-size:11px">atlas.gazebo.xacro</text><text class="lbl-sm" x="230" y="114">&lt;sensor&gt; lidar + imu</text></g>
            <line data-id="e-gxacro-plugin" x1="230" y1="120" x2="230" y2="150" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-plugin"><rect x="70" y="150" width="320" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="170" style="font-size:10.5px">world: Sensors + Imu system</text><text class="lbl-sm" x="230" y="184">Module 4</text></g>

            <line data-id="e-plugin-gzscan" x1="100" y1="190" x2="100" y2="220" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-plugin-gzimu" x1="360" y1="190" x2="360" y2="220" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-gzscan"><rect x="10" y="220" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="100" y="240" style="font-size:9.5px">/scan</text><text class="lbl-sm" x="100" y="254">Gazebo Transport</text></g>
            <g data-id="n-gzimu"><rect x="270" y="220" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="360" y="240" style="font-size:9.5px">/imu</text><text class="lbl-sm" x="360" y="254">Gazebo Transport</text></g>

            <line data-id="e-gzscan-bridge" x1="100" y1="260" x2="100" y2="290" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-gzimu-bridge" x1="360" y1="260" x2="360" y2="290" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-bridge"><rect x="70" y="290" width="320" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="314" style="font-size:11px">ros_gz_bridge</text></g>

            <line data-id="e-bridge-rosscan" x1="100" y1="330" x2="100" y2="360" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-bridge-rosimu" x1="360" y1="330" x2="360" y2="360" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-rosscan"><rect x="10" y="360" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="100" y="380" style="font-size:9.5px">/scan</text><text class="lbl-sm" x="100" y="394">ROS 2</text></g>
            <g data-id="n-rosimu"><rect x="270" y="360" width="180" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="360" y="380" style="font-size:9.5px">/imu</text><text class="lbl-sm" x="360" y="394">ROS 2</text></g>

            <line data-id="e-rosscan-consumer" x1="100" y1="400" x2="100" y2="430" stroke="#cbd5e1" stroke-width="2"/>
            <line data-id="e-rosimu-consumer" x1="360" y1="400" x2="360" y2="430" stroke="#cbd5e1" stroke-width="2"/>
            <g data-id="n-consumer"><rect x="70" y="430" width="320" height="40" rx="8" class="node-box-rect"/><text class="node-name" x="230" y="450" style="font-size:9.5px">ros2 topic echo / RViz / Module 8+</text></g>
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
