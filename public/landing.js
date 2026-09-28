(() => { const button = document.querySelector('.menu'); const nav = document.querySelector('.topbar nav'); button?.addEventListener('click', () => { const open = nav.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く'); }); nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); button?.setAttribute('aria-expanded', 'false'); })); })();
(() => {
  const targets = document.querySelectorAll('.way, .member');
  if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('is-active')); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
  }, { threshold: 0.18 });
  targets.forEach(el => observer.observe(el));
})();

(() => {
  const videos = [...document.querySelectorAll('.member-video')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = (video, visible) => {
    if (visible && !reduced.matches && !document.hidden) video.play().catch(() => {});
    else video.pause();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => update(entry.target.querySelector('video'), entry.isIntersecting)), {rootMargin:'200px 0px',threshold:0.01});
    videos.forEach(video => observer.observe(video.parentElement));
    const refresh = () => videos.forEach(video => update(video, !document.hidden && video.parentElement.getBoundingClientRect().bottom > -200 && video.parentElement.getBoundingClientRect().top < innerHeight + 200));
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', refresh);
  } else {
    videos.forEach(video => update(video, true));
  }
})();
