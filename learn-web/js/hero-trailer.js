// Trailer đầu trang chủ: mượn nguyên các scene THẬT đã có trong khóa học (không vẽ lại gì mới)
// để xem trước giống hệt những gì học viên sẽ thấy khi học. Mỗi slide = 1 scene thật, tự chạy
// (engine.js lo play/pause/update), script này chỉ lo phần chuyển cảnh mờ dần + caption/dots.
(function () {
  function init() {
    const stage = document.querySelector('.hero-trailer-stage');
    if (!stage || !window.Atlas) return;

    window.Atlas.mountAll(stage);

    // particle-filter-mcl (slide đầu) mặc định KHÔNG tự chạy (cần bấm "Tự động: Bật") --
    // bấm hộ 1 lần ngay sau khi mount để trailer tự chạy liền, không cần ai bấm gì.
    const slides = [...stage.querySelectorAll('.ht-slide')];
    slides[0]?.querySelector('[data-k="auto"]')?.click();

    const captionEl = document.querySelector('[data-k="caption"]');
    const dotsEl = document.querySelector('[data-k="dots"]');
    if (!captionEl || !dotsEl || !slides.length) return;

    dotsEl.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Xem cảnh ${i + 1}"></button>`).join('');
    const dots = [...dotsEl.querySelectorAll('button')];

    let idx = 0, timer = null;
    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle('active', j === idx));
      dots.forEach((d, j) => d.classList.toggle('active', j === idx));
      captionEl.textContent = slides[idx].dataset.caption || '';
    }
    function restartTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => show(idx + 1), 6000);
    }
    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); restartTimer(); }));

    show(0);
    restartTimer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
