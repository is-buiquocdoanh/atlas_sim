(function () {
  const $ = (s) => document.querySelector(s);
  const KEY = 'atlas-learn-v2';

  const pad = (n) => String(n).padStart(2, '0');
  const loadedScenes = new Set();
  function loadScenesFor(modId) {
    if (loadedScenes.has(modId)) return Promise.resolve();
    loadedScenes.add(modId);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `js/scenes/module-${pad(modId)}.js`;
      s.onload = resolve;
      s.onerror = resolve; // module chưa có file scene riêng -- bỏ qua, không phải lỗi
      document.head.appendChild(s);
    });
  }

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{"done":{}}'); } catch (e) { return { done: {} }; }
  }
  function writeProgress(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* chế độ riêng tư: bỏ qua */ }
  }
  const lessonKey = (m, l) => `${m.id}/${l.slug}`;

  function renderHome() {
    const p = readProgress();
    const totalLessons = COURSE.reduce((n, m) => n + m.lessons.length, 0);
    const doneLessons = Object.keys(p.done).filter((k) => p.done[k]).length;
    $('#overall').innerHTML = `<b>${doneLessons}</b>/${totalLessons} bài đã học`;

    $('#modules').innerHTML = COURSE.map((m) => {
      const ready = m.lessons.length > 0;
      const done = m.lessons.filter((l) => p.done[lessonKey(m, l)]).length;
      const pct = ready ? Math.round((done / m.lessons.length) * 100) : 0;
      const first = ready ? `lesson.html?m=${m.id}&l=${m.lessons[0].slug}` : '#';
      return `
        <a class="card ${ready ? '' : 'is-todo'}" href="${first}" ${ready ? '' : 'aria-disabled="true" tabindex="-1"'}>
          <div class="card-top">
            <span class="badge">Module ${m.id}</span>
            <span class="pill ${ready ? 'pill-ok' : ''}">${ready ? `${done}/${m.lessons.length} bài` : 'Sắp có'}</span>
          </div>
          <h3>${m.title}</h3>
          <p>${m.summary}</p>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </a>`;
    }).join('');
  }

  function renderLesson() {
    const params = new URLSearchParams(location.search);
    const mod = COURSE.find((m) => m.id === Number(params.get('m')));
    if (!mod || !mod.lessons.length) {
      $('#article').innerHTML = '<p>Module này chưa có bài học. <a href="index.html">Về trang chủ</a></p>';
      return;
    }
    const idx = Math.max(0, mod.lessons.findIndex((l) => l.slug === params.get('l')));
    const lesson = mod.lessons[idx];
    const p = readProgress();

    $('#crumb').textContent = `Module ${mod.id} · ${mod.title}`;
    $('#sidebar').innerHTML = `
      <div class="side-mod">${mod.title}</div>
      <ol class="toc">${mod.lessons.map((l, i) => `
        <li><a class="${i === idx ? 'current' : ''}" href="lesson.html?m=${mod.id}&l=${l.slug}">
          <span class="check">${p.done[lessonKey(mod, l)] ? '✓' : i + 1}</span>${l.title}
        </a></li>`).join('')}
      </ol>
      <a class="side-back" href="index.html">← Tất cả module</a>`;

    document.title = `${lesson.title} · Atlas Learn`;
    loadLesson(mod, lesson).then(() => {
      $('#lesson-meta').textContent = `Bài ${idx + 1}/${mod.lessons.length} · khoảng ${lesson.min} phút`;
      const prev = mod.lessons[idx - 1], next = mod.lessons[idx + 1];
      $('#pager').innerHTML =
        (prev ? `<a href="lesson.html?m=${mod.id}&l=${prev.slug}">← ${prev.title}</a>` : '<span></span>') +
        (next ? `<a class="next" href="lesson.html?m=${mod.id}&l=${next.slug}">${next.title} →</a>` : '<span></span>');

      const btn = $('#done');
      const paint = () => {
        const on = !!readProgress().done[lessonKey(mod, lesson)];
        btn.textContent = on ? '✓ Đã học xong bài này' : 'Đánh dấu đã học xong';
        btn.classList.toggle('on', on);
      };
      btn.onclick = () => {
        const pr = readProgress();
        const k = lessonKey(mod, lesson);
        pr.done[k] = !pr.done[k];
        writeProgress(pr);
        paint();
      };
      paint();
    });
  }

  async function loadLesson(mod, lesson) {
    const article = $('#article');
    article.innerHTML = '<p class="loading">Đang tải bài…</p>';
    let text;
    try {
      const res = await fetch(lesson.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (err) {
      article.innerHTML = `<p>Không tải được bài (${err.message}). Hãy chắc chắn server đang chạy từ thư mục gốc repo.</p>`;
      return;
    }
    await loadScenesFor(mod.id);
    article.innerHTML = text;
    window.Atlas.mountAll(article);
    window.Atlas.enhanceFileTrees(article);
    article.querySelectorAll('pre').forEach((pre) => {
      const b = document.createElement('button');
      b.className = 'copy';
      b.textContent = 'Sao chép';
      b.addEventListener('click', () => {
        navigator.clipboard?.writeText(pre.querySelector('code')?.innerText || pre.innerText);
        b.textContent = 'Đã chép';
        setTimeout(() => { b.textContent = 'Sao chép'; }, 1200);
      });
      pre.appendChild(b);
    });
    window.scrollTo(0, 0);
  }

  if ($('#modules')) renderHome();
  if ($('#article')) renderLesson();
})();
