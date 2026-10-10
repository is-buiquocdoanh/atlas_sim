// Mô hình mô phỏng cho Module 11 (Recovery behaviors & Behavior Tree).
(function () {
  const { defineScene } = window.Atlas;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- 0. Behavior Tree vs State Machine: thêm 1 hành vi mới tốn gì ----------
  defineScene('bt-vs-state-machine', {
    title: 'Thêm 1 hành vi mới: state machine vs Behavior Tree',
    caption: 'State machine: mỗi trạng thái phải tự biết chuyển sang trạng thái nào -- thêm 1 trạng thái mới (hình lục giác tím) kéo theo nhiều đường nối chéo mới (đỏ), rối dần theo N². Behavior Tree: thêm hành vi mới chỉ là thêm 1 nhánh con (cam) vào đúng chỗ, không đụng gì tới nhánh cũ.',
    setup({ stage, ui }) {
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 820 320" role="img" aria-label="So sánh thêm 1 hành vi mới vào state machine và Behavior Tree">
          <text x="130" y="20" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">State machine</text>
          <g data-k="sm"></g>
          <text x="525" y="20" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--ink)">Behavior Tree</text>
          <g data-k="bt"></g>
        </svg>
        <div class="stat" data-k="stat" style="margin-top:8px"></div>`;
      ui.innerHTML = `<button class="btn-sm" data-k="add">Thêm 1 hành vi mới: "NéVậtCảnDiĐộng"</button>`;

      const smEl = stage.querySelector('[data-k="sm"]');
      const btEl = stage.querySelector('[data-k="bt"]');
      const statEl = stage.querySelector('[data-k="stat"]');
      const addBtn = ui.querySelector('[data-k="add"]');

      // 4 trạng thái cũ, bố trí hình vuông quanh tâm (90,170), nối gần như đầy đủ (N²).
      const SM_CENTER = [130, 175];
      const smStates = [
        { id: 'idle', label: 'Idle', a: -90 },
        { id: 'plan', label: 'Planning', a: 0 },
        { id: 'follow', label: 'Following', a: 90 },
        { id: 'recover', label: 'Recovering', a: 180 },
      ];
      const SM_R = 85;
      function smPos(a) { const rad = (a * Math.PI) / 180; return [SM_CENTER[0] + SM_R * Math.cos(rad), SM_CENTER[1] + SM_R * Math.sin(rad)]; }
      const smOldEdges = [['idle', 'plan'], ['plan', 'follow'], ['follow', 'idle'], ['follow', 'recover'], ['recover', 'plan'], ['recover', 'idle'], ['plan', 'idle'], ['idle', 'follow']];

      // Behavior Tree cũ: RecoveryNode gốc + 3 nhánh con (giống thật, rút gọn).
      const BT_ROOT = [525, 60];
      const btOld = [
        { id: 'spin', label: 'Spin', x: 420, y: 150 },
        { id: 'wait', label: 'Wait', x: 525, y: 150 },
        { id: 'backup', label: 'BackUp', x: 630, y: 150 },
      ];

      function render(added) {
        // --- state machine ---
        let smHtml = '';
        smOldEdges.forEach(([a, b]) => {
          const pa = smPos(smStates.find((s) => s.id === a).a), pb = smPos(smStates.find((s) => s.id === b).a);
          smHtml += `<line x1="${pa[0].toFixed(1)}" y1="${pa[1].toFixed(1)}" x2="${pb[0].toFixed(1)}" y2="${pb[1].toFixed(1)}" stroke="#cbd5e1" stroke-width="1.5"/>`;
        });
        if (added) {
          const newPos = [SM_CENTER[0], SM_CENTER[1] + 4];
          smStates.forEach((s) => {
            const p = smPos(s.a);
            smHtml += `<line x1="${newPos[0]}" y1="${newPos[1]}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="#dc2626" stroke-width="2"/>`;
          });
        }
        smStates.forEach((s) => {
          const [x, y] = smPos(s.a);
          smHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="30" style="fill:var(--surface-2);stroke:#64748b;stroke-width:1.5"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" style="font-size:10px;fill:var(--ink)">${esc(s.label)}</text>`;
        });
        if (added) {
          const [x, y] = [SM_CENTER[0], SM_CENTER[1] + 4];
          smHtml += `<polygon points="${x - 32},${y} ${x - 16},${y - 26} ${x + 16},${y - 26} ${x + 32},${y} ${x + 16},${y + 26} ${x - 16},${y + 26}" style="fill:#f3e8ff;stroke:#9333ea;stroke-width:2"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="font-size:8.5px;fill:#7e22ce">NéVậtCản</text>`;
        }
        smEl.innerHTML = smHtml;

        // --- behavior tree ---
        let btHtml = '';
        const kids = added ? [...btOld, { id: 'ne', label: 'NéVậtCản', x: 735, y: 150, added: true }] : btOld;
        kids.forEach((k) => {
          btHtml += `<line x1="${BT_ROOT[0]}" y1="${BT_ROOT[1] + 20}" x2="${k.x}" y2="${k.y - 22}" stroke="${k.added ? '#f59e0b' : '#cbd5e1'}" stroke-width="${k.added ? 2.5 : 1.5}"/>`;
        });
        btHtml += `<rect x="${BT_ROOT[0] - 90}" y="${BT_ROOT[1] - 20}" width="180" height="40" rx="8" style="fill:var(--surface-2);stroke:#ea580c;stroke-width:1.5"/><text x="${BT_ROOT[0]}" y="${BT_ROOT[1] + 5}" text-anchor="middle" style="font-size:10.5px;fill:var(--ink)">RecoveryFallback</text>`;
        kids.forEach((k) => {
          const w = 95, h = 44;
          btHtml += `<rect x="${k.x - w / 2}" y="${k.y - 22}" width="${w}" height="${h}" rx="8" style="fill:${k.added ? '#fff7ed' : 'var(--surface-2)'};stroke:${k.added ? '#f59e0b' : '#64748b'};stroke-width:${k.added ? 2.5 : 1.5}"/><text x="${k.x}" y="${k.y + 4}" text-anchor="middle" style="font-size:10px;fill:${k.added ? '#c2410c' : 'var(--ink)'}">${esc(k.label)}</text>`;
        });
        btEl.innerHTML = btHtml;

        statEl.innerHTML = added
          ? `State machine: thêm <b style="color:#9333ea">1 trạng thái mới</b> → phải tự hỏi "từ đây có thể đi tiếp những đâu" cho CẢ 4 trạng thái cũ → <b style="color:#dc2626">4 đường nối mới</b> (đỏ), rủi ro quên 1 đường. Behavior Tree: thêm <b style="color:#c2410c">1 nhánh con mới</b> (cam) vào <code>RecoveryFallback</code> → xong, không đụng gì 3 nhánh cũ.`
          : `Bấm nút để thêm 1 hành vi mới vào cả 2 mô hình -- xem bên nào phải sửa nhiều hơn.`;
      }
      let added = false;
      addBtn.addEventListener('click', () => { added = !added; addBtn.textContent = added ? 'Bỏ hành vi mới (xem lại trạng thái gốc)' : 'Thêm 1 hành vi mới: "NéVậtCảnDiĐộng"'; render(added); });
      render(false);

      return { reset() { added = false; addBtn.textContent = 'Thêm 1 hành vi mới: "NéVậtCảnDiĐộng"'; render(false); }, update() {} };
    },
  });

  // ---------- 1. Cây BT thật của Atlas -- tick sống, SUCCESS/FAILURE/RUNNING lan truyền ----------
  // Cấu trúc + số liệu lấy NGUYÊN VĂN từ navigate_to_pose_w_replanning_and_recovery.xml thật
  // (đã đọc trực tiếp từ /opt/ros/humble/share/nav2_bt_navigator/behavior_trees/ lúc soạn bài).
  // Toạ độ tính bằng centroid-of-children chuẩn (không đoán) -- xem comment từng bước lúc viết.
  defineScene('bt-tree-live', {
    title: 'Cây BT thật của Atlas: tick lan truyền sống',
    caption: 'Cây khá rộng (18 ô) -- bấm nút ⛶ góc phải thanh điều khiển để xem toàn màn hình cho dễ đọc. Đúng cây 37 dòng XML thật atlas_slam đang chạy mỗi lần gửi goal. Tự chạy liên tục: robot "tính đường" → "bám đường" → giả lập 1 vật cản mới chặn đường → FollowPath thất bại → ReactiveFallback kích hoạt → RoundRobin xoay vòng qua 4 cách khắc phục. Vàng=đang chạy (RUNNING), xanh=SUCCESS, đỏ=FAILURE.',
    setup({ stage }) {
      const ROWY = [40, 140, 230, 320, 410];
      // Toạ độ x tính lại bằng script hình học (centroid-of-children, gap tối thiểu 20px
      // giữa MỌI cặp ô cùng hàng cạnh nhau -- kiểm tra bằng geom_bttree2.py trước khi viết,
      // 0 ô chồng nhau, 0 đường nối cắt qua ô không liên quan).
      const NODES = {
        root: { label: ['RecoveryNode', '(NavigateRecovery) retries≤6'], x: 552, row: 0, w: 190, h: 56 },
        pipeSeq: { label: ['PipelineSequence', '(NavigateWithReplanning)'], x: 277, row: 1, w: 180, h: 44 },
        reactFB: { label: ['ReactiveFallback', '(RecoveryFallback)'], x: 826, row: 1, w: 180, h: 44 },
        rateCtrl: { label: ['RateController', 'hz = 1.0'], x: 142, row: 2, w: 130, h: 44 },
        rnFollow: { label: ['RecoveryNode', '(FollowPath) retries≤1'], x: 412, row: 2, w: 160, h: 44 },
        goalUpd: { label: ['GoalUpdated'], x: 611, row: 2, w: 110, h: 44 },
        roundRobin: { label: ['RoundRobin', '(RecoveryActions)'], x: 1042, row: 2, w: 160, h: 44 },
        rnCPtP: { label: ['RecoveryNode', '(ComputePathToPose) ≤1'], x: 142, row: 3, w: 160, h: 48 },
        followPath: { label: ['FollowPath', 'controller_id=FollowPath'], x: 344, row: 3, w: 120, h: 54 },
        clearL_ctx: { label: ['ClearEntireCostmap', '(local, context)'], x: 480, row: 3, w: 112, h: 54 },
        seqClearing: { label: ['Sequence', '(ClearingActions)'], x: 808, row: 3, w: 150, h: 48 },
        spin: { label: ['Spin', 'spin_dist=1.57'], x: 1000, row: 3, w: 100, h: 54 },
        wait: { label: ['Wait', 'wait_duration=5s'], x: 1120, row: 3, w: 100, h: 54 },
        backup: { label: ['BackUp', 'dist=0.30, v=0.05'], x: 1240, row: 3, w: 100, h: 54 },
        cptp: { label: ['ComputePathToPose', 'planner_id=GridBased'], x: 76, row: 4, w: 112, h: 54 },
        clearG_ctx: { label: ['ClearEntireCostmap', '(global, context)'], x: 208, row: 4, w: 112, h: 54 },
        clearL_sub: { label: ['ClearEntireCostmap', '(local, subtree)'], x: 742, row: 4, w: 112, h: 54 },
        clearG_sub: { label: ['ClearEntireCostmap', '(global, subtree)'], x: 874, row: 4, w: 112, h: 54 },
      };
      const EDGES = [
        ['root', 'pipeSeq'], ['root', 'reactFB'],
        ['pipeSeq', 'rateCtrl'], ['pipeSeq', 'rnFollow'],
        ['reactFB', 'goalUpd'], ['reactFB', 'roundRobin'],
        ['rateCtrl', 'rnCPtP'],
        ['rnFollow', 'followPath'], ['rnFollow', 'clearL_ctx'],
        ['roundRobin', 'seqClearing'], ['roundRobin', 'spin'], ['roundRobin', 'wait'], ['roundRobin', 'backup'],
        ['rnCPtP', 'cptp'], ['rnCPtP', 'clearG_ctx'],
        ['seqClearing', 'clearL_sub'], ['seqClearing', 'clearG_sub'],
      ];

      Object.values(NODES).forEach((n) => { n.y = ROWY[n.row]; n.cy = n.y + n.h / 2; });

      const STATE_COLOR = {
        idle: ['#e2e8f0', '#94a3b8'],
        running: ['#fde68a', '#f59e0b'],
        success: ['#bbf7d0', '#16a34a'],
        failure: ['#fecaca', '#dc2626'],
      };

      let edgesSvg = '';
      EDGES.forEach(([a, b]) => {
        const na = NODES[a], nb = NODES[b];
        edgesSvg += `<line data-edge="${a}-${b}" x1="${na.x}" y1="${na.y + na.h}" x2="${nb.x}" y2="${nb.y}" stroke="#cbd5e1" stroke-width="2"/>`;
      });
      let nodesSvg = '';
      Object.entries(NODES).forEach(([id, n]) => {
        const lines = n.label;
        const fs = 10.5, lh = 12;
        const startY = n.cy - ((lines.length - 1) * lh) / 2 + fs * 0.32;
        const textSvg = lines.map((l, i) => `<text x="${n.x}" y="${(startY + i * lh).toFixed(1)}" text-anchor="middle" style="font-size:${fs}px;fill:var(--ink)">${esc(l)}</text>`).join('');
        nodesSvg += `<g data-node="${id}"><rect x="${n.x - n.w / 2}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" style="fill:#e2e8f0;stroke:#94a3b8;stroke-width:1.5"/>${textSvg}</g>`;
      });

      const [VW, VH] = [1330, 500];
      stage.innerHTML = `
        <svg class="svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Cây Behavior Tree thật của Atlas, tick lan truyền SUCCESS/FAILURE/RUNNING">
          <g data-k="edges">${edgesSvg}</g>
          <g data-k="nodes">${nodesSvg}</g>
        </svg>
        <div class="stat" data-k="phase" style="margin-top:10px;font-weight:600"></div>
        <div class="stat" data-k="counters" style="margin-top:4px"></div>`;
      const svg = stage.querySelector('svg');
      const phaseEl = stage.querySelector('[data-k="phase"]');
      const countersEl = stage.querySelector('[data-k="counters"]');

      function setStates(states) {
        Object.keys(NODES).forEach((id) => {
          const st = states[id] || 'idle';
          const [fill, stroke] = STATE_COLOR[st];
          const rect = svg.querySelector(`[data-node="${id}"] rect`);
          rect.style.fill = fill; rect.style.stroke = stroke;
          rect.style.strokeWidth = st === 'idle' ? '1.5' : '2.5';
        });
      }

      const RR_IDS = ['seqClearing', 'spin', 'wait', 'backup'];
      const RR_LABELS = ['ClearingActions (xoá costmap local+global)', 'Spin (quay tại chỗ 1.57 rad)', 'Wait (đứng yên 5 giây)', 'BackUp (lùi 0.30m, tốc độ 0.05m/s)'];

      function buildPhases(rrIdx, retryN) {
        const rrId = RR_IDS[rrIdx];
        const extra = rrId === 'seqClearing' ? { clearL_sub: 'running', clearG_sub: 'running' } : {};
        const extraDone = rrId === 'seqClearing' ? { clearL_sub: 'success', clearG_sub: 'success' } : {};
        return [
          { dur: 0.7, label: `Lần thử ${retryN}/6 -- tính lại đường (RateController, 1Hz)`,
            states: { root: 'running', pipeSeq: 'running', rateCtrl: 'running', rnCPtP: 'running', cptp: 'running' } },
          { dur: 0.6, label: 'ComputePathToPose THÀNH CÔNG -- chuyển sang bám đường (FollowPath)',
            states: { root: 'running', pipeSeq: 'running', rateCtrl: 'success', rnCPtP: 'success', cptp: 'success', clearG_ctx: 'idle', rnFollow: 'running', followPath: 'running' } },
          { dur: 0.8, label: 'FollowPath THẤT BẠI -- vật cản mới chặn đường',
            states: { root: 'running', pipeSeq: 'running', rateCtrl: 'success', rnCPtP: 'success', cptp: 'success', rnFollow: 'running', followPath: 'failure', clearL_ctx: 'running' } },
          { dur: 0.8, label: 'Đã tự xoá costmap cục bộ, thử lại NGAY -- vẫn thất bại (vật cản còn đó)',
            states: { root: 'running', pipeSeq: 'failure', rateCtrl: 'success', rnCPtP: 'success', cptp: 'success', rnFollow: 'failure', followPath: 'failure', clearL_ctx: 'success' } },
          { dur: 0.9, label: `ReactiveFallback kích hoạt -- GoalUpdated: không -- RoundRobin chọn: ${RR_LABELS[rrIdx]}`,
            states: { root: 'running', pipeSeq: 'failure', rnFollow: 'failure', followPath: 'failure', clearL_ctx: 'success', reactFB: 'running', goalUpd: 'failure', roundRobin: 'running', [rrId]: 'running', ...extra } },
          { dur: 0.6, label: 'Recovery hoàn tất -- toàn cây thử lại từ gốc',
            states: { root: 'running', reactFB: 'success', roundRobin: 'success', [rrId]: 'success', ...extraDone } },
        ];
      }
      const FAILED_DUR = 2.2;

      let st = { retryN: 1, rrIdx: 0, phaseIdx: 0, phaseTimer: 0, phases: buildPhases(0, 1), failed: false };
      setStates({});
      phaseEl.textContent = st.phases[0].label;
      countersEl.innerHTML = `Lần thử: <b>1/6</b> · RoundRobin đang ở lượt: <b>${RR_LABELS[0]}</b>`;

      function applyPhase() {
        if (st.failed) {
          const allFail = {};
          Object.keys(NODES).forEach((id) => { allFail[id] = 'failure'; });
          setStates(allFail);
          phaseEl.innerHTML = `<span style="color:#dc2626">ĐÃ THỬ ĐỦ 6 LẦN -- goal báo FAILED</span> (thiết kế có chủ đích: tránh kẹt vĩnh viễn, báo lại tầng trên xử lý khác)`;
          countersEl.innerHTML = `Lần thử: <b>6/6</b> -- sắp quay lại từ đầu để minh hoạ tiếp...`;
          return;
        }
        const ph = st.phases[st.phaseIdx];
        setStates(ph.states);
        phaseEl.textContent = ph.label;
        countersEl.innerHTML = `Lần thử: <b>${st.retryN}/6</b> · RoundRobin đang ở lượt: <b>${RR_LABELS[st.rrIdx]}</b>`;
      }

      return {
        reset() {
          st = { retryN: 1, rrIdx: 0, phaseIdx: 0, phaseTimer: 0, phases: buildPhases(0, 1), failed: false };
          applyPhase();
        },
        update(dt) {
          st.phaseTimer += dt;
          const curDur = st.failed ? FAILED_DUR : st.phases[st.phaseIdx].dur;
          if (st.phaseTimer < curDur) return;
          st.phaseTimer = 0;
          if (st.failed) {
            st.failed = false; st.retryN = 1; st.rrIdx = 0;
            st.phases = buildPhases(0, 1); st.phaseIdx = 0;
            applyPhase();
            return;
          }
          st.phaseIdx++;
          if (st.phaseIdx >= st.phases.length) {
            if (st.retryN >= 6) { st.failed = true; applyPhase(); return; }
            st.retryN++;
            st.rrIdx = (st.rrIdx + 1) % RR_IDS.length;
            st.phases = buildPhases(st.rrIdx, st.retryN);
            st.phaseIdx = 0;
          }
          applyPhase();
        },
      };
    },
  });
})();
