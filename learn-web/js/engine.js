// Engine mô phỏng dùng chung: khung điều khiển (phát/dừng/tốc độ), vòng lặp, tự dừng khi ngoài màn hình.
(function () {
  const TICK_MS = 33;
  const registry = {};

  const visibility = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.target.__state) e.target.__state.visible = e.isIntersecting; });
  }, { threshold: 0.1 });

  function defineScene(id, def) {
    registry[id] = def;
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // SVG inline thay vì ký tự Unicode (⛶/⤡) -- 2 ký tự đó bị thiếu glyph (hiện ô trống/tofu)
  // trên nhiều bộ font hệ thống, SVG thì luôn vẽ đúng, không phụ thuộc font cài sẵn.
  const ICON_EXPAND = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  const ICON_COLLAPSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

  function mountScene(host) {
    const def = registry[host.dataset.scene];
    if (!def) {
      host.remove();
      return;
    }
    const fig = document.createElement('figure');
    fig.className = 'scene';
    fig.innerHTML = `
      <div class="scene-head">
        <span class="scene-title">${esc(def.title)}</span>
        <div class="scene-ctrl">
          <button class="ic" data-act="toggle" aria-label="Tạm dừng">❚❚</button>
          <button class="ic" data-act="reset" aria-label="Chạy lại">↺</button>
          <select data-act="speed" aria-label="Tốc độ">
            <option value="0.5">0.5×</option>
            <option value="1" selected>1×</option>
            <option value="2">2×</option>
          </select>
          <button class="ic" data-act="fullscreen" aria-label="Toàn màn hình">${ICON_EXPAND}</button>
        </div>
      </div>
      <div class="scene-stage"></div>
      <div class="scene-ui"></div>
      ${def.caption ? `<figcaption class="scene-cap">${esc(def.caption)}</figcaption>` : ''}`;
    host.replaceWith(fig);

    const state = { playing: true, speed: 1, visible: true };
    fig.__state = state;
    const inst = def.setup({
      stage: fig.querySelector('.scene-stage'),
      ui: fig.querySelector('.scene-ui'),
    }) || {};
    if (inst.reset) inst.reset();

    const toggle = fig.querySelector('[data-act="toggle"]');
    toggle.addEventListener('click', () => {
      state.playing = !state.playing;
      toggle.textContent = state.playing ? '❚❚' : '▶';
      toggle.setAttribute('aria-label', state.playing ? 'Tạm dừng' : 'Tiếp tục');
    });
    fig.querySelector('[data-act="reset"]').addEventListener('click', () => inst.reset && inst.reset());
    fig.querySelector('[data-act="speed"]').addEventListener('change', (e) => {
      state.speed = Number(e.target.value);
    });

    // Toàn màn hình dùng chung cho mọi scene: SVG tự co giãn theo viewBox (width:100%) nên
    // không cần tính lại kích thước thủ công -- chỉ cần figure chiếm trọn viewport, CSS
    // (:fullscreen trong style.css) lo phần còn lại. Scene nào tự có nút toàn màn hình riêng
    // (vd 3D/Three.js, phải tính lại canvas) thì cứ giữ nguyên, nút này chỉ cộng thêm.
    const fsBtn = fig.querySelector('[data-act="fullscreen"]');
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement === fig) document.exitFullscreen();
      else fig.requestFullscreen?.().catch(() => {});
    });
    const onFsChange = () => {
      if (!fig.isConnected) { document.removeEventListener('fullscreenchange', onFsChange); return; }
      const isFs = document.fullscreenElement === fig;
      fsBtn.innerHTML = isFs ? ICON_COLLAPSE : ICON_EXPAND;
      fsBtn.setAttribute('aria-label', isFs ? 'Thoát toàn màn hình' : 'Toàn màn hình');
    };
    document.addEventListener('fullscreenchange', onFsChange);

    visibility.observe(fig);
    const timer = setInterval(() => {
      if (!fig.isConnected) {
        clearInterval(timer);
        visibility.unobserve(fig);
        return;
      }
      if (!state.playing || !state.visible || !inst.update) return;
      inst.update((TICK_MS / 1000) * state.speed);
    }, TICK_MS);
  }

  function mountAll(root) {
    root.querySelectorAll('[data-scene]').forEach(mountScene);
  }

  // Gắn icon file/folder kiểu VS Code vào mọi khối .filetree -- tự suy ra loại icon từ
  // phần mở rộng tên file, không cần sửa tay từng dòng <li class="ft-file"> trong content.
  const EXT_ICON = {
    py: 'py', xml: 'xml', xacro: 'xml', sdf: 'xml', urdf: 'xml', launch: 'xml',
    yaml: 'yaml', yml: 'yaml',
    cfg: 'cfg', ini: 'cfg', conf: 'cfg', toml: 'cfg',
    md: 'md', json: 'json', cpp: 'cpp', hpp: 'cpp', h: 'cpp', sh: 'sh',
  };
  function extOf(name) {
    if (/\.launch\.py$/i.test(name)) return 'py';
    const m = name.match(/\.([a-zA-Z0-9]+)$/);
    return m ? (EXT_ICON[m[1].toLowerCase()] || '') : '';
  }
  function enhanceFileTrees(root) {
    root.querySelectorAll('.filetree summary').forEach((s) => {
      if (s.querySelector(':scope > .fi-folder')) return;
      const icon = document.createElement('span');
      icon.className = 'fi-folder';
      s.insertBefore(icon, s.firstChild);
    });
    root.querySelectorAll('.filetree .ft-file').forEach((li) => {
      if (li.querySelector(':scope > .fi-file')) return;
      let name = '';
      li.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) name += node.textContent;
        else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('ft-note')) name += node.textContent;
      });
      const icon = document.createElement('span');
      icon.className = 'fi-file';
      const ext = extOf(name.trim());
      if (ext) icon.dataset.ext = ext;
      li.insertBefore(icon, li.firstChild);
    });
  }

  window.Atlas = {
    defineScene,
    mountAll,
    enhanceFileTrees,
    rand: (a, b) => a + Math.random() * (b - a),
  };
})();
