// Mô hình chuyển động cho Module 1. Mỗi scene trả về update(dt) và reset().
(function () {
  const { defineScene, rand } = window.Atlas;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 0. Message chạy giữa các node (hero)
  defineScene('ros-graph', {
    title: 'Message chạy giữa các node',
    caption: 'Không node nào gọi trực tiếp node khác. Publisher đẩy dữ liệu lên topic; ai đăng ký nghe thì nhận. Node vừa nhận sẽ sáng lên.',
    setup({ stage }) {
      const nodes = {
        sensor: { x: 110, y: 150, name: 'sensor_publisher' },
        logger: { x: 320, y: 60, name: 'data_logger' },
        ctrl: { x: 530, y: 150, name: 'controller' },
      };
      const edges = [
        { from: 'sensor', to: 'logger', topic: '/sensor_data', dy: -12 },
        { from: 'sensor', to: 'ctrl', topic: '/sensor_data', dy: 20 },
        { from: 'ctrl', to: 'logger', topic: '/cmd_status', dy: -12 },
      ];
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 230" role="img" aria-label="Ba node trao đổi message qua topic">
          <g>${edges.map((e) => {
            const a = nodes[e.from], b = nodes[e.to];
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + e.dy;
            return `<line class="edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>
                    <text class="lbl-sm" x="${mx}" y="${my}">${e.topic}</text>`;
          }).join('')}</g>
          <g class="dyn"></g>
          <g>${Object.entries(nodes).map(([k, n]) => `
            <g class="node-g" data-n="${k}">
              <circle cx="${n.x}" cy="${n.y}" r="34"/>
              <text class="node-name" x="${n.x}" y="${n.y + 56}">${n.name}</text>
            </g>`).join('')}</g>
        </svg>`;
      const dyn = stage.querySelector('.dyn');
      let parts, hit, t, timer;
      return {
        reset() { parts = []; hit = {}; t = 0; timer = 0.4; },
        update(dt) {
          t += dt;
          timer += dt;
          if (timer > 0.55) {
            timer = 0;
            parts.push({ e: pick(edges), p: 0 });
          }
          parts.forEach((q) => { q.p += dt / 1.3; });
          parts = parts.filter((q) => {
            if (q.p >= 1) { hit[q.e.to] = t + 0.4; return false; }
            return true;
          });
          dyn.innerHTML = parts.map((q) => {
            const a = nodes[q.e.from], b = nodes[q.e.to];
            return `<circle class="pkt" cx="${lerp(a.x, b.x, q.p)}" cy="${lerp(a.y, b.y, q.p)}" r="6"/>`;
          }).join('');
          for (const k in nodes) {
            stage.querySelector(`[data-n="${k}"]`).classList.toggle('hit', t < (hit[k] || 0));
          }
        },
      };
    },
  });

  // 1. Một message đi qua các tầng
  defineScene('encap', {
    title: 'Một message đi qua những tầng nào?',
    caption: 'Khi publish, dữ liệu đi xuống qua các tầng rồi ra mạng. Máy nhận làm ngược lại: đi lên đến callback của bạn. Mỗi tầng chỉ nói chuyện với tầng ngay bên cạnh.',
    setup({ stage, ui }) {
      const LAYERS = ['Code của bạn (rclpy)', 'rcl (lõi C)', 'rmw (lớp trung gian)', 'DDS (Fast / Cyclone)'];
      const XL = 150, XR = 490, TOP = 70, GAP = 58;
      const yOf = (i) => TOP + i * GAP;
      const NET_Y = 290;
      const PATH = [
        { x: XL, y: yOf(0), layer: [0, 'L'], msg: 'Python object: String(data="hello")',
          code: 'msg = String(data="hello")\npublisher.publish(msg)' },
        { x: XL, y: yOf(1), layer: [1, 'L'], msg: 'rcl: đổi sang cấu trúc C chung cho mọi ngôn ngữ',
          code: '# rclpy gọi xuống rcl\nrcl_publish(publisher_handle, msg_as_c_struct)' },
        { x: XL, y: yOf(2), layer: [2, 'L'], msg: 'rmw_publish(): gọi qua lớp trung gian',
          code: '# rcl gọi qua lớp trung gian, không biết DDS nào\nrmw_publish(rmw_publisher, msg_as_c_struct)' },
        { x: XL, y: yOf(3), layer: [3, 'L'], msg: 'DDS: đóng gói thành bytes (CDR)',
          code: 'cdr_bytes = serialize(msg_as_c_struct)\n# b\'\\x00\\x01\\x00\\x00\\x05hello\\x00\\x00\\x00\'' },
        { x: 320, y: NET_Y, layer: null, msg: 'Gói tin đi trên mạng (UDP / RTPS)',
          code: 'send_udp(cdr_bytes)   # rời máy phát, chưa thuộc tầng nào' },
        { x: XR, y: yOf(3), layer: [3, 'R'], msg: 'DDS: nhận bytes, giải mã',
          code: 'cdr_bytes = recv_udp()\nmsg_as_c_struct = deserialize(cdr_bytes)' },
        { x: XR, y: yOf(2), layer: [2, 'R'], msg: 'rmw: chuyển lên rcl',
          code: '# rmw giao message đã giải mã lại cho rcl\nrmw_take(rmw_subscription)  # -> msg_as_c_struct' },
        { x: XR, y: yOf(1), layer: [1, 'R'], msg: 'rcl: xếp vào hàng đợi callback',
          code: '# rcl xếp message vào hàng đợi, chờ executor rảnh\nexecutor.queue.push(msg_as_c_struct)' },
        { x: XR, y: yOf(0), layer: [0, 'R'], msg: 'callback(msg): bạn nhận được "hello"',
          code: 'def callback(msg):\n    print(msg.data)   # in ra: hello' },
      ];
      const SEG = 0.7;
      const boxes = (cx) => LAYERS.map((name, i) => `
        <rect class="box" x="${cx - 100}" y="${yOf(i) - 20}" width="200" height="40" rx="8"/>
        <text class="box-lbl" x="${cx}" y="${yOf(i) + 5}">${name}</text>`).join('');
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 320" role="img" aria-label="Message đi xuống qua các tầng máy phát, qua mạng, rồi đi lên máy thu">
          <text class="col-hd" x="${XL}" y="34">Máy phát (publisher)</text>
          <text class="col-hd" x="${XR}" y="34">Máy thu (subscriber)</text>
          ${boxes(XL)}${boxes(XR)}
          <line class="chan" x1="${XL}" y1="${yOf(3) + 20}" x2="320" y2="${NET_Y}"/>
          <line class="chan" x1="320" y1="${NET_Y}" x2="${XR}" y2="${yOf(3) + 20}"/>
          <rect class="net" x="200" y="${NET_Y - 14}" width="240" height="28" rx="14"/>
          <text class="box-lbl" x="320" y="${NET_Y + 5}">Mạng (Ethernet / Wi-Fi)</text>
          <g class="dyn"></g>
        </svg>`;
      const dyn = stage.querySelector('.dyn');
      const msgBox = document.createElement('div');
      msgBox.className = 'flow-msg';
      msgBox.setAttribute('aria-live', 'polite');
      const codeBox = document.createElement('pre');
      codeBox.className = 'flow-code';
      const codeInner = document.createElement('code');
      codeBox.appendChild(codeInner);
      ui.innerHTML = '';
      ui.appendChild(msgBox);
      ui.appendChild(codeBox);
      const btn = document.createElement('button');
      btn.className = 'btn-sm';
      btn.textContent = 'Gửi 1 message';
      ui.appendChild(btn);

      const IDLE_MSG = 'Nhấn "Gửi 1 message" hoặc chờ — theo dõi code bên dưới đổi theo từng tầng mà chấm đi qua.';
      let packets, auto;
      btn.addEventListener('click', () => packets.push({ age: 0 }));
      return {
        reset() {
          packets = []; auto = 1;
          msgBox.textContent = IDLE_MSG;
          codeInner.textContent = PATH[0].code;
          dyn.innerHTML = '';
        },
        update(dt) {
          auto -= dt;
          if (auto <= 0) { packets.push({ age: 0 }); auto = 5; }
          packets.forEach((p) => { p.age += dt; });
          packets = packets.filter((p) => p.age < SEG * (PATH.length - 1) + 0.2);
          let html = '';
          let shownMsg = '';
          let shownCode = '';
          let litLayers = [];
          packets.forEach((p) => {
            const k = Math.min(Math.floor(p.age / SEG), PATH.length - 2);
            const f = clamp((p.age - k * SEG) / SEG, 0, 1);
            const a = PATH[k], b = PATH[k + 1];
            html += `<circle class="pkt" cx="${lerp(a.x, b.x, f)}" cy="${lerp(a.y, b.y, f)}" r="8"/>`;
            const near = f < 0.5 ? a : b;
            shownMsg = near.msg;
            shownCode = near.code;
            if (near.layer) litLayers.push(near.layer);
          });
          litLayers.forEach(([i, side]) => {
            const cx = side === 'L' ? XL : XR;
            html += `<rect class="hl" x="${cx - 104}" y="${yOf(i) - 24}" width="208" height="48" rx="10"/>`;
          });
          dyn.innerHTML = html;
          if (shownMsg) { msgBox.textContent = shownMsg; codeInner.textContent = shownCode; }
        },
      };
    },
  });

  // 2. DDS discovery: node tự tìm nhau
  defineScene('discovery', {
    title: 'Discovery: node tự tìm nhau',
    caption: 'Mỗi node định kỳ phát "thông báo" cho cả domain, kèm tên topic và kiểu message. Khi một publisher và một subscriber khớp cả tên topic lẫn kiểu, chúng được nối với nhau. Không khớp kiểu thì không nối.',
    setup({ stage }) {
      const nodes = [
        { id: 'talker', name: 'talker', x: 110, y: 170, role: 'pub', type: 'std_msgs/String' },
        { id: 'listener', name: 'listener', x: 530, y: 170, role: 'sub', type: 'std_msgs/String' },
        { id: 'other', name: 'other_node', x: 320, y: 60, role: 'pub', type: 'std_msgs/Int32' },
      ];
      const TOPIC = '/chatter';
      const WAVE = 170;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 260" role="img" aria-label="Các node phát thông báo, rồi nối nhau khi khớp topic và kiểu">
          <g class="dyn-rings"></g>
          <g class="dyn-links"></g>
          <g>${nodes.map((n) => `
            <g class="node-box" data-id="${n.id}">
              <rect x="${n.x - 84}" y="${n.y - 34}" width="168" height="68" rx="10"/>
              <text class="node-name" x="${n.x}" y="${n.y - 6}">${n.name}</text>
              <text class="lbl-sm" x="${n.x}" y="${n.y + 14}">${n.role === 'pub' ? 'pub' : 'sub'} ${TOPIC} · ${n.type.split('/')[1]}</text>
            </g>`).join('')}</g>
        </svg>`;
      const ringsG = stage.querySelector('.dyn-rings');
      const linksG = stage.querySelector('.dyn-links');
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const verdict = (a, b) => {
        if (a.role === b.role) return null;
        const pub = a.role === 'pub' ? a : b, sub = pub === a ? b : a;
        return pub.type === sub.type ? 'match' : 'type';
      };
      let rings, found, clock;
      return {
        reset() {
          rings = [];
          found = {};
          clock = nodes.map((_, i) => -i * 0.8);
        },
        update(dt) {
          clock = clock.map((c, i) => {
            const nc = c + dt;
            if (nc >= 3.2) { rings.push({ from: i, r: 0 }); return 0; }
            return nc;
          });
          rings.forEach((g) => { g.r += dt * WAVE; });
          rings.forEach((g) => {
            nodes.forEach((n, j) => {
              if (j === g.from) return;
              const key = [g.from, j].sort().join('-');
              if (!found[key] && g.r >= dist(nodes[g.from], n)) {
                found[key] = verdict(nodes[g.from], n) || 'none';
              }
            });
          });
          rings = rings.filter((g) => g.r < 520);
          ringsG.innerHTML = rings.map((g) => {
            const n = nodes[g.from];
            return `<circle class="ring" cx="${n.x}" cy="${n.y}" r="${g.r}" style="opacity:${clamp(1 - g.r / 520, 0, 1)}"/>`;
          }).join('');

          let html = '';
          Object.entries(found).forEach(([key, v]) => {
            if (v === 'none') return;
            const [i, j] = key.split('-').map(Number);
            const a = nodes[i], b = nodes[j];
            const cls = v === 'match' ? 'link-ok' : 'link-bad';
            const label = v === 'match' ? 'khớp: nối lại' : 'khác kiểu: không nối';
            html += `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
            html += `<text class="lbl-sm" x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 8}">${label}</text>`;
          });
          linksG.innerHTML = html;
        },
      };
    },
  });

  // 3. ROS_DOMAIN_ID cô lập mạng
  defineScene('domain', {
    title: 'ROS_DOMAIN_ID: mỗi domain là một mạng riêng',
    caption: 'Các node cùng domain nghe thấy nhau. Khác domain thì message bị chặn ngay ở tầng mạng, dù chạy trên cùng một máy. (Thực tế ID chạy từ 0 đến 232; ở đây chỉ dùng 0–2 cho dễ nhìn.)',
    setup({ stage, ui }) {
      const COL = ['#2563eb', '#ea580c', '#16a34a'];
      const nodes = [
        { name: 'talker', x: 150, y: 70, dom: 0 },
        { name: 'listener', x: 490, y: 70, dom: 0 },
        { name: 'sensor_pub', x: 150, y: 200, dom: 1 },
        { name: 'logger', x: 490, y: 200, dom: 1 },
      ];
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 270" role="img" aria-label="Message chỉ đi giữa các node cùng domain">
          <g class="dyn-links"></g>
          <g class="dyn-msg"></g>
          <g class="dyn-nodes"></g>
        </svg>`;
      ui.innerHTML = nodes.map((n, i) => `
        <label class="ctl">${n.name}
          <select data-i="${i}">
            ${[0, 1, 2].map((d) => `<option value="${d}"${d === n.dom ? ' selected' : ''}>domain ${d}</option>`).join('')}
          </select>
        </label>`).join('') + '<div class="stat" data-k="stat"></div>';
      const linksG = stage.querySelector('.dyn-links');
      const msgG = stage.querySelector('.dyn-msg');
      const nodesG = stage.querySelector('.dyn-nodes');
      const statEl = ui.querySelector('[data-k="stat"]');
      ui.querySelectorAll('select').forEach((sel) => {
        sel.addEventListener('change', () => { nodes[Number(sel.dataset.i)].dom = Number(sel.value); drawStatic(); });
      });

      let msgs, flash, timer, delivered, blocked, t;
      function drawStatic() {
        let html = '';
        nodes.forEach((a, i) => nodes.forEach((b, j) => {
          if (j <= i || a.dom !== b.dom) return;
          html += `<line class="link-ok" stroke="${COL[a.dom]}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        }));
        linksG.innerHTML = html;
        nodesG.innerHTML = nodes.map((n, i) => `
          <g class="node-box" data-idx="${i}">
            <rect x="${n.x - 76}" y="${n.y - 28}" width="152" height="56" rx="10" style="stroke:${COL[n.dom]}"/>
            <text class="node-name" x="${n.x}" y="${n.y - 2}">${n.name}</text>
            <text class="lbl-sm" x="${n.x}" y="${n.y + 14}" style="fill:${COL[n.dom]}">domain ${n.dom}</text>
          </g>`).join('');
        nodesG.querySelectorAll('.node-box').forEach((g) => {
          g.classList.toggle('hit', t < (flash[g.dataset.idx] || 0));
        });
        statEl.innerHTML = `Đã nhận: <b>${delivered}</b> · Bị chặn: <b>${blocked}</b>`;
      }
      return {
        reset() { msgs = []; flash = {}; timer = 0.5; delivered = 0; blocked = 0; t = 0; drawStatic(); msgG.innerHTML = ''; },
        update(dt) {
          t += dt;
          timer += dt;
          if (timer > 0.9) {
            timer = 0;
            const i = Math.floor(rand(0, nodes.length));
            let j = Math.floor(rand(0, nodes.length - 1));
            if (j >= i) j += 1;
            msgs.push({ from: i, to: j, p: 0, ok: nodes[i].dom === nodes[j].dom, blocked: false, bt: 0 });
          }
          msgs = msgs.filter((m) => {
            if (m.blocked) {
              m.bt += dt;
              if (m.bt > 0.7) { blocked++; return false; }
              return true;
            }
            m.p += dt / 1.5;
            if (!m.ok && m.p >= 0.45) { m.blocked = true; m.p = 0.45; return true; }
            if (m.p >= 1) { delivered++; flash[m.to] = t + 0.4; return false; }
            return true;
          });
          msgG.innerHTML = msgs.map((m) => {
            const a = nodes[m.from], b = nodes[m.to];
            const x = lerp(a.x, b.x, m.p), y = lerp(a.y, b.y, m.p);
            if (m.blocked) return `<text class="blocked" x="${x}" y="${y + 6}">✕</text>`;
            return `<circle class="pkt" cx="${x}" cy="${y}" r="6"/>`;
          }).join('');
          drawStatic();
        },
      };
    },
  });

  // 4. Callback và executor (một luồng)
  defineScene('callback', {
    title: 'Executor: một luồng, xử lý từng callback',
    caption: 'Message đến nhanh hơn tốc độ xử lý thì xếp vào hàng đợi. Thử tăng "thời gian xử lý" để thấy hàng đợi dài ra.',
    setup({ stage, ui }) {
      const ARRIVE = 0.5, SLOTS = 6;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 210" role="img" aria-label="Message xếp vào hàng đợi, executor đưa từng message vào callback">
          <text class="col-hd" x="80" y="30">Topic</text>
          <text class="col-hd" x="320" y="30">Hàng đợi</text>
          <text class="col-hd" x="550" y="30">Callback</text>
          <rect class="box" x="20" y="70" width="120" height="70" rx="10"/>
          <text class="box-lbl" x="80" y="110">/sensor_data</text>
          <g class="dyn-q"></g>
          <line class="chan" x1="140" y1="105" x2="200" y2="105"/>
          <line class="chan" x1="440" y1="105" x2="480" y2="105"/>
          <text class="lbl-sm" x="460" y="96">executor</text>
          <rect class="box" x="480" y="70" width="140" height="70" rx="10"/>
          <g class="dyn-cb"></g>
          <text class="lbl-sm" x="320" y="170" data-k="note"></text>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">Thời gian xử lý mỗi message
          <input type="range" min="100" max="1500" step="50" value="300" data-k="cb">
          <span data-k="cbv">300 ms</span>
        </label>
        <div class="stat" data-k="stat"></div>`;
      const cbSlider = ui.querySelector('[data-k="cb"]');
      const cbVal = ui.querySelector('[data-k="cbv"]');
      const statEl = ui.querySelector('[data-k="stat"]');
      const qG = stage.querySelector('.dyn-q');
      const cbG = stage.querySelector('.dyn-cb');
      const noteEl = stage.querySelector('[data-k="note"]');
      cbSlider.addEventListener('input', () => { cbVal.textContent = cbSlider.value + ' ms'; });

      let queue, nextId, arriveT, busy, current, done;
      return {
        reset() { queue = []; nextId = 0; arriveT = 0; busy = 0; current = null; done = 0; },
        update(dt) {
          const cb = Number(cbSlider.value) / 1000;
          arriveT += dt;
          if (arriveT >= ARRIVE) { arriveT = 0; nextId++; queue.push(nextId); }
          if (busy > 0) {
            busy -= dt;
            if (busy <= 0) { done++; current = null; }
          }
          if (busy <= 0 && queue.length) {
            current = queue.shift();
            busy = cb;
          }
          const shown = queue.slice(0, SLOTS);
          let q = '';
          for (let s = 0; s < SLOTS; s++) {
            const x = 200 + s * 40;
            const id = shown[s];
            q += `<rect class="slot${id ? ' full' : ''}" x="${x}" y="80" width="36" height="50" rx="6"/>`;
            if (id) q += `<text class="slot-id" x="${x + 18}" y="111">#${id}</text>`;
          }
          if (queue.length > SLOTS) q += `<text class="lbl-sm" x="438" y="150">+${queue.length - SLOTS}</text>`;
          qG.innerHTML = q;

          let c = '';
          if (current) {
            const frac = clamp(1 - busy / cb, 0, 1);
            c += `<text class="box-lbl" x="550" y="103">đang xử lý #${current}</text>`;
            c += `<rect class="bar-bg" x="496" y="120" width="108" height="8" rx="4"/>`;
            c += `<rect class="bar-fg" x="496" y="120" width="${108 * frac}" height="8" rx="4"/>`;
          } else {
            c += `<text class="lbl-sm" x="550" y="110">đang rảnh</text>`;
          }
          cbG.innerHTML = c;

          noteEl.textContent = cb > ARRIVE
            ? 'Callback chậm hơn tốc độ đến: hàng đợi sẽ dài dần.'
            : 'Callback kịp tốc độ đến: hàng đợi gần như trống.';
          statEl.innerHTML = `Đến: <b>${1 / ARRIVE} msg/s</b> · Đã xử lý: <b>${done}</b> · Đang chờ: <b>${queue.length}</b>`;
        },
      };
    },
  });

  // 5. Publish/Subscribe + QoS
  defineScene('pubsub-qos', {
    title: 'Publisher → Subscriber với QoS',
    caption: 'RELIABLE: gói bị mất thì gửi lại (cam) cho tới khi tới nơi. BEST_EFFORT: gói bị mất là mất luôn (đỏ). Thử kéo tỷ lệ mất gói lên để thấy khác biệt.',
    setup({ stage, ui }) {
      const X0 = 140, X1 = 500, MID = 320, Y = 90, TRAVEL = 1.4;
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 170" role="img" aria-label="Message chạy từ publisher tới subscriber qua topic">
          <rect class="node-box-rect" x="10" y="55" width="130" height="70" rx="10"/>
          <text class="node-name" x="75" y="88">Publisher</text>
          <text class="lbl-sm" x="75" y="108">/sensor_publisher</text>
          <line class="chan" x1="${X0}" y1="${Y}" x2="${X1}" y2="${Y}"/>
          <text class="lbl-sm" x="320" y="78">topic /sensor_data</text>
          <rect class="node-box-rect" x="500" y="55" width="130" height="70" rx="10"/>
          <text class="node-name" x="565" y="88">Subscriber</text>
          <text class="lbl-sm" x="565" y="108">/data_logger</text>
          <g class="dyn"></g>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">Reliability
          <select data-k="rel">
            <option value="reliable">RELIABLE</option>
            <option value="best">BEST_EFFORT</option>
          </select>
        </label>
        <label class="ctl">Tỷ lệ mất gói
          <input type="range" min="0" max="60" value="30" data-k="loss">
          <span data-k="lossv">30%</span>
        </label>
        <label class="ctl"><input type="checkbox" data-k="auto" checked> Tự động gửi</label>
        <button class="btn-sm" data-k="send">Gửi 1 message</button>
        <div class="stat" data-k="stat"></div>
        <div class="stat-note" data-k="note"></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const dyn = stage.querySelector('.dyn');
      let msgs, stats, timer;
      const note = () => {
        q('note').textContent = q('rel').value === 'reliable'
          ? 'RELIABLE: có thể trễ hơn, nhưng không mất dữ liệu.'
          : 'BEST_EFFORT: nhanh, không đảm bảo. Hợp cho dữ liệu liên tục khi mất vài mẫu không sao.';
      };
      const showStats = () => {
        q('stat').innerHTML = `Gửi: <b>${stats.sent}</b> · Nhận: <b>${stats.got}</b> · Mất hẳn: <b>${stats.lost}</b> · Gửi lại: <b>${stats.retry}</b>`;
      };
      const spawn = () => {
        stats.sent++;
        const loss = Number(q('loss').value) / 100;
        const reliable = q('rel').value === 'reliable';
        let fails = 0;
        if (reliable) while (Math.random() < loss && fails < 8) fails++;
        const dropped = !reliable && Math.random() < loss;
        msgs.push({ x: 0, reliable, fails, dropped, status: 'go', wait: 0, fade: 0 });
      };
      q('send').addEventListener('click', spawn);
      q('rel').addEventListener('change', note);
      q('loss').addEventListener('input', () => { q('lossv').textContent = q('loss').value + '%'; });
      note();

      return {
        reset() { msgs = []; stats = { sent: 0, got: 0, lost: 0, retry: 0 }; timer = 0.3; showStats(); },
        update(dt) {
          if (q('auto').checked) {
            timer += dt;
            if (timer > 1.0) { timer = 0; spawn(); }
          }
          msgs = msgs.filter((m) => {
            if (m.status === 'wait') {
              m.wait -= dt;
              if (m.wait <= 0) { m.status = 'go'; m.x = 0; }
              return true;
            }
            if (m.status === 'lost') {
              m.fade += dt;
              return m.fade < 0.4;
            }
            m.x += dt / TRAVEL;
            if (m.reliable && m.fails > 0 && m.x >= 0.5) {
              m.fails--; m.x = 0.5; m.status = 'wait'; m.wait = 0.5; stats.retry++;
              return true;
            }
            if (!m.reliable && m.dropped && m.x >= 0.5) {
              m.x = 0.5; m.status = 'lost'; stats.lost++;
              return true;
            }
            if (m.x >= 1) { stats.got++; return false; }
            return true;
          });
          dyn.innerHTML = msgs.map((m) => {
            const cx = lerp(X0, X1, m.x);
            const cls = m.status === 'lost' ? 'pkt-lost' : m.status === 'wait' ? 'pkt-retry' : 'pkt';
            const op = m.status === 'lost' ? 1 - m.fade / 0.4 : 1;
            return `<circle class="${cls}" cx="${cx}" cy="${Y}" r="7" opacity="${op}"/>`;
          }).join('');
          showStats();
        },
      };
    },
  });

  // 6. Service: request → response
  defineScene('service-flow', {
    title: 'Service: gửi request, đợi response',
    caption: 'Client gửi một yêu cầu rồi chờ. Server tính xong mới trả lời. Khác topic: đây là một cặp hỏi–đáp có kết thúc, không phải luồng liên tục.',
    setup({ stage, ui }) {
      const DUR = [0.9, 0.8, 0.9, 0.5];
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 200" role="img" aria-label="Client gửi request tới server, server trả về response">
          <rect class="node-box-rect" x="20" y="50" width="170" height="92" rx="10"/>
          <text class="node-name" x="105" y="88">Client</text>
          <text class="lbl-sm" x="105" y="108">add_two_ints_client</text>
          <rect class="node-box-rect" data-k="srv" x="450" y="50" width="170" height="92" rx="10"/>
          <text class="node-name" x="535" y="88">Server</text>
          <text class="lbl-sm" x="535" y="108">add_two_ints_server</text>
          <line class="life" x1="105" y1="142" x2="105" y2="190"/>
          <line class="life" x1="535" y1="142" x2="535" y2="190"/>
          <line class="chan" x1="190" y1="76" x2="450" y2="76"/>
          <line class="chan" x1="190" y1="118" x2="450" y2="118"/>
          <text class="lbl-sm" x="320" y="68">request (a, b)</text>
          <text class="lbl-sm" x="320" y="136">response (sum)</text>
          <g class="dyn"></g>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">a <input type="number" value="3" data-k="a" class="num"></label>
        <label class="ctl">b <input type="number" value="5" data-k="b" class="num"></label>
        <button class="btn-sm" data-k="go">Gửi request</button>
        <div class="steps">
          <span data-s="1">1 Client gửi request</span>
          <span data-s="2">2 Server tính a + b</span>
          <span data-s="3">3 Server trả response</span>
          <span data-s="4">4 Client nhận kết quả</span>
        </div>
        <div class="stat" data-k="res">Kết quả: <b>—</b></div>`;
      const q = (k) => ui.querySelector(`[data-k="${k}"]`);
      const dyn = stage.querySelector('.dyn');
      const srv = stage.querySelector('[data-k="srv"]');
      let phase, pt, sum, auto;
      const setSteps = (n) => ui.querySelectorAll('[data-s]').forEach((s) => {
        s.classList.toggle('active', Number(s.dataset.s) === n);
      });
      q('go').addEventListener('click', () => {
        if (phase === 0 || phase === 4) start();
      });
      function start() {
        const a = Number(q('a').value), b = Number(q('b').value);
        if (!Number.isFinite(a) || !Number.isFinite(b)) { q('res').innerHTML = 'Kết quả: <b>nhập số</b>'; return; }
        sum = a + b;
        phase = 1; pt = 0;
        setSteps(1);
        q('go').disabled = true;
        q('res').innerHTML = 'Kết quả: <b>đang chờ…</b>';
      }
      return {
        reset() { phase = 0; pt = 0; auto = 1.5; sum = null; q('go').disabled = false; setSteps(0); dyn.innerHTML = ''; srv.classList.remove('hot'); q('res').innerHTML = 'Kết quả: <b>—</b>'; },
        update(dt) {
          if (phase === 0) {
            auto -= dt;
            if (auto <= 0) start();
            return;
          }
          if (phase === 4) {
            auto -= dt;
            if (auto <= 0) { phase = 0; auto = 1.5; q('go').disabled = false; setSteps(0); }
            dyn.innerHTML = '';
            return;
          }
          pt += dt;
          setSteps(phase);
          srv.classList.toggle('hot', phase === 2);
          let html = '';
          if (phase === 1) {
            html = `<circle class="pkt" cx="${lerp(190, 450, Math.min(pt / DUR[0], 1))}" cy="76" r="7"/>`;
          } else if (phase === 3) {
            html = `<circle class="pkt-retry" cx="${lerp(450, 190, Math.min(pt / DUR[2], 1))}" cy="118" r="7"/>`;
          }
          dyn.innerHTML = html;
          if (pt >= DUR[phase - 1]) {
            pt = 0;
            phase++;
            if (phase === 4) {
              setSteps(4);
              q('res').innerHTML = `Kết quả: <b>${sum}</b>`;
              q('go').disabled = false;
            }
          }
        },
      };
    },
  });

  // 7. Parameter: đọc 1 lần hay đọc lại
  defineScene('param', {
    title: 'Parameter: đọc một lần hay đọc lại mỗi lần dùng?',
    caption: 'Node A đọc tham số lúc khởi động, sau đó không đọc lại nên không thấy thay đổi. Node B đọc lại trước mỗi lần dùng nên theo kịp. Vì vậy cùng một lệnh ros2 param set có tác dụng khác nhau.',
    setup({ stage, ui }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 290" role="img" aria-label="Lệnh param set gửi giá trị tới parameter server, hai node đọc theo hai cách">
          <rect class="node-box-rect" x="200" y="30" width="240" height="80" rx="10"/>
          <text class="node-name" x="320" y="58">Parameter server</text>
          <text class="box-lbl" x="320" y="92" data-k="srv"></text>
          <g class="dyn"></g>
          <rect class="node-box-rect" x="30" y="170" width="250" height="100" rx="10"/>
          <text class="node-name" x="155" y="196">Node A: đọc 1 lần</text>
          <rect class="bar-bg" x="50" y="220" width="210" height="14" rx="7"/>
          <rect class="bar-fg" data-k="a" x="50" y="220" width="0" height="14" rx="7"/>
          <text class="lbl-sm" x="155" y="256" data-k="av"></text>
          <rect class="node-box-rect" x="360" y="170" width="250" height="100" rx="10"/>
          <text class="node-name" x="485" y="196">Node B: đọc mỗi lần dùng</text>
          <rect class="bar-bg" x="380" y="220" width="210" height="14" rx="7"/>
          <rect class="bar-fg" data-k="b" x="380" y="220" width="0" height="14" rx="7"/>
          <text class="lbl-sm" x="485" y="256" data-k="bv"></text>
          <text class="lbl-sm" x="320" y="150" data-k="cmd">ros2 param set speed …</text>
        </svg>`;
      ui.innerHTML = `
        <label class="ctl">speed = <input type="range" min="0.2" max="1.5" step="0.1" value="1.0" data-k="v">
          <span data-k="vv">1.0</span></label>
        <button class="btn-sm" data-k="set">ros2 param set speed</button>`;
      const q = (k) => stage.querySelector(`[data-k="${k}"]`);
      const u = (k) => ui.querySelector(`[data-k="${k}"]`);
      const dyn = stage.querySelector('.dyn');
      const MAXW = 210;
      let server, a, b, pending, bTimer;
      u('v').addEventListener('input', () => { u('vv').textContent = Number(u('v').value).toFixed(1); });
      u('set').addEventListener('click', () => {
        pending = { v: Number(u('v').value), t: 0 };
      });
      return {
        reset() { server = 0.5; a = 0.5; b = 0.5; pending = null; bTimer = 0; dyn.innerHTML = ''; },
        update(dt) {
          if (pending) {
            pending.t += dt;
            if (pending.t >= 0.8) { server = pending.v; pending = null; }
          }
          bTimer += dt;
          if (bTimer >= 0.5) { bTimer = 0; b = server; }

          const dotHtml = pending
            ? `<circle class="pkt" cx="320" cy="${lerp(160, 112, pending.t / 0.8)}" r="7"/>`
            : '';
          dyn.innerHTML = dotHtml;
          q('srv').textContent = `speed = ${server.toFixed(1)}`;
          q('a').setAttribute('width', (a / 1.5) * MAXW);
          q('b').setAttribute('width', (b / 1.5) * MAXW);
          q('av').textContent = `đang dùng speed = ${a.toFixed(1)}` + (a !== server ? '  ⚠ đã cũ' : '');
          q('bv').textContent = `đang dùng speed = ${b.toFixed(1)}`;
        },
      };
    },
  });

  // 8. Launch file: thứ tự khởi động
  defineScene('launch', {
    title: 'Launch file: các node khởi động theo thời gian',
    caption: 'Launch file gọi tất cả node gần như cùng lúc. Mỗi node mất một lúc để sẵn sàng. Muốn node B đợi node A, bạn đặt thời gian trễ (TimerAction) hoặc lắng nghe sự kiện.',
    setup({ stage, ui }) {
      const ITEMS = [
        { name: 'robot_state_publisher', start: 0.0, load: 0.8 },
        { name: 'diff_drive_controller', start: 0.2, load: 1.2 },
        { name: 'slam_toolbox', start: 1.5, load: 1.5 },
      ];
      const X0 = 230, SCALE = 100, TOTAL = 5.5;
      const rowY = (i) => 70 + i * 58;
      let rows = '';
      ITEMS.forEach((it, i) => {
        rows += `<text class="lbl-sm" x="${X0 - 10}" y="${rowY(i) + 5}" text-anchor="end">${it.name}</text>`;
      });
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 640 260" role="img" aria-label="Ba node khởi động lệch thời gian, mỗi node có giai đoạn đang tải và sẵn sàng">
          ${rows}
          <line class="axis" x1="${X0}" y1="40" x2="${X0 + SCALE * TOTAL}" y2="40"/>
          ${[0, 1, 2, 3, 4, 5].map((s) => `<text class="lbl-sm" x="${X0 + s * SCALE}" y="30">${s}s</text>`).join('')}
          <g class="dyn"></g>
        </svg>`;
      ui.innerHTML = '<div class="stat" data-k="t"></div>';
      const dyn = stage.querySelector('.dyn');
      const tEl = ui.querySelector('[data-k="t"]');
      let t, hold;
      return {
        reset() { t = 0; hold = 0; },
        update(dt) {
          if (hold > 0) { hold -= dt; if (hold <= 0) t = 0; return; }
          t += dt;
          if (t >= TOTAL) hold = 1.5;
          let html = `<line class="cursor" x1="${X0 + t * SCALE}" y1="46" x2="${X0 + t * SCALE}" y2="${rowY(ITEMS.length - 1) + 20}"/>`;
          ITEMS.forEach((it, i) => {
            const y = rowY(i) - 12;
            if (t < it.start) return;
            const loadEnd = Math.min(t, it.start + it.load);
            html += `<rect class="bar-load" x="${X0 + it.start * SCALE}" y="${y}" width="${(loadEnd - it.start) * SCALE}" height="20" rx="6"/>`;
            if (t > it.start + it.load) {
              html += `<rect class="bar-ready" x="${X0 + (it.start + it.load) * SCALE}" y="${y}" width="${(t - it.start - it.load) * SCALE}" height="20" rx="6"/>`;
            }
          });
          dyn.innerHTML = html;
          tEl.innerHTML = `Thời điểm: <b>${Math.min(t, TOTAL).toFixed(1)} s</b> · cam = đang khởi động, xanh = đã sẵn sàng`;
        },
      };
    },
  });
})();
