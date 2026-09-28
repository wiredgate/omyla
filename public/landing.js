(() => { const button = document.querySelector('.menu'); const nav = document.querySelector('.topbar nav'); button?.addEventListener('click', () => { const open = nav.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く'); }); nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); button?.setAttribute('aria-expanded', 'false'); })); })();
(() => {
  const targets = document.querySelectorAll('.way, .member');
  if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('is-active')); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
  }, { threshold: 0.18 });
  targets.forEach(el => observer.observe(el));
})();
