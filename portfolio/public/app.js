(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const escapeHtml = (value = '') =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const initials = (title) =>
    title.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  /* ------------------------------------------------------------------
     Fundo interativo: a imagem vira pontos (meio-tom) que fogem do cursor.
     Para trocar a imagem, substitua public/img/hero.jpg.
  ------------------------------------------------------------------ */
  function initBackground() {
    const canvas = $('#bg');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0, cell = 10, cols = 0, rows = 0;
    let lum, ox, oy, vx, vy;
    const pointer = { x: -9999, y: -9999, last: 0, pulse: 0 };
    let running = false;
    let startTime = 0;

    function setup() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cell = W < 700 ? 9 : 10;
      cols = Math.ceil(W / cell);
      rows = Math.ceil(H / cell);

      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (W < 800) {
        // Celular: a imagem inteira cabe na largura, com o planeta na parte de cima.
        const scale = (cols * 1.9) / img.width;
        const dw = img.width * scale;
        const dh = img.height * scale;
        octx.drawImage(img, cols * 0.5 - dw * 0.62, rows * 0.3 - dh * 0.52, dw, dh);
      } else {
        const scale = Math.max(cols / img.width, rows / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        octx.drawImage(img, -(dw - cols) * 0.62, -(dh - rows) * 0.5, dw, dh);
      }
      const data = octx.getImageData(0, 0, cols, rows).data;

      const n = cols * rows;
      lum = new Float32Array(n);
      ox = new Float32Array(n);
      oy = new Float32Array(n);
      vx = new Float32Array(n);
      vy = new Float32Array(n);
      for (let i = 0; i < n; i++) lum[i] = data[i * 4] / 255;
    }

    function frame(now) {
      const intro = reduceMotion ? 1 : Math.min(1, (now - startTime) / 2200);
      const active = now - pointer.last < 160;
      const R = 150 + pointer.pulse * 90;
      const R2 = R * R;
      const force = 2.4 + pointer.pulse * 3;
      const centerX = W * 0.62;
      const centerY = H * 0.5;
      const diag = Math.hypot(W, H);
      let moving = false;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.beginPath();

      for (let r = 0; r < rows; r++) {
        const hy = (r + 0.5) * cell;
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const l = lum[i];
          if (l < 0.05) continue;
          const hx = (c + 0.5) * cell;

          if (!reduceMotion) {
            if (active) {
              const dx = hx + ox[i] - pointer.x;
              const dy = hy + oy[i] - pointer.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < R2) {
                const d = Math.sqrt(d2) || 1;
                const f = (1 - d / R) ** 2 * force;
                vx[i] += (dx / d) * f;
                vy[i] += (dy / d) * f;
              }
            }
            vx[i] -= ox[i] * 0.06;
            vy[i] -= oy[i] * 0.06;
            vx[i] *= 0.84;
            vy[i] *= 0.84;
            ox[i] += vx[i];
            oy[i] += vy[i];
            if (Math.abs(ox[i]) + Math.abs(oy[i]) + Math.abs(vx[i]) + Math.abs(vy[i]) > 0.06) moving = true;
          }

          const x = hx + ox[i];
          const y = hy + oy[i];
          let s = 1;
          if (intro < 1) {
            const dist = Math.hypot(hx - centerX, hy - centerY) / diag;
            const t = Math.min(1, Math.max(0, (intro * 1.6 - dist * 1.3) * 2.2));
            s = 1 - (1 - t) ** 3;
          }
          const radius = cell * 0.52 * Math.pow(l, 0.7) * s;
          if (radius < 0.25) continue;
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, 6.2832);
        }
      }
      ctx.fill();

      pointer.pulse *= 0.92;
      if (intro < 1 || active || moving || pointer.pulse > 0.02) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function kick() {
      if (running || !lum) return;
      running = true;
      requestAnimationFrame(frame);
    }

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.last = performance.now();
      kick();
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.last = performance.now();
      pointer.pulse = 1;
      kick();
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { setup(); fadeOnScroll(); startTime = -1e9; kick(); }, 150);
    });

    // O fundo escurece conforme a página desce, para o texto ficar legível.
    const fadeOnScroll = () => {
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.85));
      const top = window.innerWidth < 800 ? 0.7 : 1;
      canvas.style.opacity = String(top * (1 - p * 0.78));
    };
    fadeOnScroll();
    window.addEventListener('scroll', fadeOnScroll, { passive: true });

    img.onload = () => {
      setup();
      startTime = performance.now();
      kick();
    };
    img.src = 'img/hero.jpg';
  }

  /* ------------------------------ Projetos ------------------------------ */
  let projects = [];
  const repoStats = new Map();

  function createCover(project) {
    const cover = document.createElement('div');
    cover.className = 'cover';
    cover.dataset.pattern = project.pattern || 'grid';
    cover.innerHTML = project.image
      ? `<img src="${escapeHtml(project.image)}" alt="" loading="lazy">`
      : `<b>${escapeHtml(initials(project.title))}</b>`;
    return cover;
  }

  function renderProjects() {
    const list = $('#projects');
    list.replaceChildren();
    projects.forEach((project, index) => {
      const item = document.createElement('li');
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.type = 'button';
      tile.setAttribute('aria-haspopup', 'dialog');
      tile.append(createCover(project));
      const cap = document.createElement('div');
      cap.className = 'tile-cap';
      cap.innerHTML = `<h3>${escapeHtml(project.title)}</h3><span>${escapeHtml((project.tags || []).slice(0, 2).join(', '))}</span>`;
      tile.append(cap);
      tile.addEventListener('click', () => openModal(index));
      item.append(tile);
      list.append(item);
    });
  }

  const modal = $('#modal');
  function openModal(index) {
    const project = projects[index];
    const body = $('#modal-body');
    const highlights = (project.highlights || []).length
      ? `<ul>${project.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
      : '';
    const links = (project.links || [])
      .map((l) => `<a class="btn primary" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
      .join('');

    body.innerHTML = `
      <div class="modal-cover"></div>
      <div class="modal-text">
        <h3 id="modal-title">${escapeHtml(project.title)}</h3>
        <div class="tags">${(project.tags || []).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}</div>
        <p>${escapeHtml(project.summary)}</p>
        ${highlights}
        <p class="modal-meta">${escapeHtml(statsText(project.repo))}</p>
        <div class="actions">${links}</div>
      </div>`;
    $('.modal-cover', body).append(createCover(project));
    modal.showModal();
    modal.scrollTop = 0;
  }

  $('#modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  function statsText(repoName) {
    const repo = repoStats.get(repoName);
    if (!repo) return '';
    const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    const parts = [];
    if (repo.language) parts.push(repo.language);
    if (repo.stars > 0) parts.push(repo.stars === 1 ? '1 estrela' : `${repo.stars} estrelas`);
    if (repo.pushedAt) parts.push(`atualizado em ${fmt.format(new Date(repo.pushedAt))}`);
    return parts.join(', ');
  }

  /* --------------------------- Outras seções --------------------------- */
  function renderStack(stack = []) {
    $('#stack').innerHTML = stack
      .map((g) => `<div><h3>${escapeHtml(g.group)}</h3><ul>${g.items.map((i) => `<li class="chip">${escapeHtml(i)}</li>`).join('')}</ul></div>`)
      .join('');
  }

  function setupEmail(email) {
    if (!email) return;
    const button = $('#copy-email');
    button.hidden = false;
    button.textContent = 'Copiar e-mail';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email);
        button.textContent = 'E-mail copiado';
        $('#live').textContent = 'E-mail copiado para a área de transferência';
      } catch {
        window.location.href = `mailto:${email}`;
      }
      setTimeout(() => { button.textContent = 'Copiar e-mail'; }, 2200);
    });
  }

  function setupCounters() {
    const box = $('.counters');
    let done = false;
    const run = () => {
      done = true;
      $$('[data-count]', box).forEach((el) => {
        const target = Number(el.dataset.count);
        if (reduceMotion) { el.textContent = target; return; }
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / 1400);
          el.textContent = Math.round(target * (1 - (1 - t) ** 3));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting && !done) { run(); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(box);
    return () => done;
  }

  function setupChrome() {
    const header = $('#top');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const nav = $('#nav');
    const btn = $('#menu-btn');
    const setMenu = (open) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Fechar' : 'Menu';
    };
    btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    const links = $$('#nav a');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => observer.observe(s));

    $('#year').textContent = new Date().getFullYear();
  }

  /* ------------------------ Interações dos botões ------------------------ */
  function setupInteractions() {
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const BUTTONS = '.btn, .social a, .menu-btn, .modal-close, .stack .chip';
    const closest = (target, selector) => (target instanceof Element ? target.closest(selector) : null);

    document.addEventListener('pointermove', (e) => {
      const button = closest(e.target, BUTTONS);
      if (button) {
        const r = button.getBoundingClientRect();
        // Ponto de onde a varredura de cor nasce
        button.style.setProperty('--x', `${e.clientX - r.left}px`);
        button.style.setProperty('--y', `${e.clientY - r.top}px`);
        // Efeito de ímã: o botão acompanha o cursor um pouco
        if (fine && !reduceMotion && e.pointerType === 'mouse') {
          const mx = ((e.clientX - r.left) / r.width - 0.5) * 12;
          const my = ((e.clientY - r.top) / r.height - 0.5) * 10;
          button.style.setProperty('--mx', `${mx.toFixed(1)}px`);
          button.style.setProperty('--my', `${my.toFixed(1)}px`);
        }
      }

      const tile = closest(e.target, '.tile');
      if (tile && fine && !reduceMotion && e.pointerType === 'mouse') {
        const r = tile.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tile.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
        tile.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
      }
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const button = closest(e.target, BUTTONS);
      if (button && !button.contains(e.relatedTarget)) {
        button.style.setProperty('--mx', '0px');
        button.style.setProperty('--my', '0px');
      }
      const tile = closest(e.target, '.tile');
      if (tile && !tile.contains(e.relatedTarget)) {
        tile.style.setProperty('--rx', '0deg');
        tile.style.setProperty('--ry', '0deg');
      }
    });

    // Onda no ponto do clique
    document.addEventListener('pointerdown', (e) => {
      if (reduceMotion) return;
      const button = closest(e.target, BUTTONS);
      if (!button) return;
      const r = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${e.clientX - r.left}px`;
      ripple.style.top = `${e.clientY - r.top}px`;
      button.append(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* -------------------------------- Início -------------------------------- */
  async function init() {
    setupChrome();
    setupInteractions();
    initBackground();
    const countersDone = setupCounters();

    try {
      const response = await fetch('portfolio.json');
      const data = await response.json();
      projects = data.projects || [];
      renderProjects();
      renderStack(data.stack);
      setupEmail(data.email);
      if (data.repoCountFallback) $('#repo-count').dataset.count = data.repoCountFallback;
    } catch (error) {
      $('#projects').innerHTML =
        '<li><p class="muted">Não foi possível carregar os projetos agora. Veja todos em <a href="https://github.com/pedropaulosil">github.com/pedropaulosil</a>.</p></li>';
    }

    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        const repos = (stats && stats.repos) || [];
        if (!repos.length) return;
        repos.forEach((repo) => repoStats.set(repo.name, repo));
        const counter = $('#repo-count');
        counter.dataset.count = repos.length;
        if (countersDone()) counter.textContent = repos.length;
      })
      .catch(() => {});
  }

  init();
})();