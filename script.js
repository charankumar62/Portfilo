(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionButton = document.querySelector('.motion-toggle');
  const role = document.querySelector('.role-text');
  const roles = ['Web Developer', 'Python Developer', 'Tech Enthusiast'];
  let motionPreference = null;
  let roleTimer = 0;
  let roleIndex = 0;
  let letterIndex = roles[0].length;
  let deleting = true;

  try { motionPreference = localStorage.getItem('kck-motion'); } catch (_) { /* Storage can be disabled. */ }
  const motionEnabled = () => !reducedMotion.matches && motionPreference !== 'off';

  function typeRole() {
    window.clearTimeout(roleTimer);
    if (!role || !motionEnabled() || document.hidden) return;
    const phrase = roles[roleIndex];
    letterIndex += deleting ? -1 : 1;
    role.textContent = phrase.slice(0, letterIndex);
    let delay = deleting ? 40 : 75;
    if (!deleting && letterIndex >= phrase.length) {
      deleting = true;
      delay = 1900;
    } else if (deleting && letterIndex <= 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 250;
    }
    roleTimer = window.setTimeout(typeRole, delay);
  }

  function applyMotion() {
    const enabled = motionEnabled();
    root.dataset.motion = enabled ? 'on' : 'off';
    window.clearTimeout(roleTimer);
    if (motionButton) {
      motionButton.hidden = false;
      motionButton.setAttribute('aria-pressed', String(enabled));
      motionButton.querySelector('span').textContent = enabled ? 'on' : 'off';
      motionButton.disabled = reducedMotion.matches;
      motionButton.title = reducedMotion.matches ? 'Reduced motion is enabled in your device settings' : 'Turn animations on or off';
    }
    if (role) {
      role.textContent = roles[0];
      roleIndex = 0;
      letterIndex = roles[0].length;
      deleting = true;
      if (enabled && !document.hidden) roleTimer = window.setTimeout(typeRole, 3000);
    }
    if (!enabled) {
      document.querySelectorAll('.is-revealing').forEach(el => el.classList.remove('is-revealing'));
      document.querySelectorAll('[data-tilt]').forEach(el => {
        el.style.removeProperty('--tilt-x');
        el.style.removeProperty('--tilt-y');
      });
    }
  }

  applyMotion();
  if (motionButton) motionButton.addEventListener('click', () => {
    motionPreference = motionEnabled() ? 'off' : 'on';
    try { localStorage.setItem('kck-motion', motionPreference); } catch (_) { /* Keep the choice for this page. */ }
    applyMotion();
  });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', applyMotion);
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(roleTimer);
    if (!document.hidden && role && motionEnabled()) roleTimer = window.setTimeout(typeRole, 900);
  });

  // The intro also dismisses through CSS if this script cannot run.
  const intro = document.querySelector('.intro-loader');
  if (intro) {
    intro.addEventListener('animationend', event => {
      if (event.animationName === 'loader-dismiss') intro.remove();
    });
    window.setTimeout(() => intro.remove(), 2200);
  }

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  function closeMenu(returnFocus = false) {
    if (!menuButton || !nav) return;
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }
  if (menuButton && nav) {
    menuButton.hidden = false;
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
    });
  }
  root.classList.add('js');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (motionEnabled()) entry.target.classList.add('is-revealing');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
  }

  // One scheduled update per frame for the progress line and active section.
  const progress = document.querySelector('.reading-progress > div');
  const navigationLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const sections = navigationLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0;
    if (progress) progress.style.transform = 'scaleX(' + fraction + ')';
    let current = null;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section.id; });
    navigationLinks.forEach(link => {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('load', scheduleScroll, { once: true });
  scheduleScroll();

  document.querySelectorAll('[data-tilt]').forEach(card => {
    let tiltFrame = 0;
    card.addEventListener('pointermove', event => {
      if (!motionEnabled() || !finePointer.matches || event.pointerType === 'touch') return;
      window.cancelAnimationFrame(tiltFrame);
      tiltFrame = window.requestAnimationFrame(() => {
        if (!motionEnabled()) return;
        const bounds = card.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.style.setProperty('--tilt-x', (-y * 5).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (x * 5).toFixed(2) + 'deg');
      });
    });
    card.addEventListener('pointerleave', () => {
      window.cancelAnimationFrame(tiltFrame);
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    });
  });

  const dialog = document.querySelector('.certificate-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const dialogImage = dialog.querySelector('.dialog-image');
    const dialogTitle = dialog.querySelector('#certificate-title');
    const originalLink = dialog.querySelector('.dialog-original');
    const downloadLink = dialog.querySelector('.dialog-download');
    const imageError = dialog.querySelector('.dialog-error');
    let trigger = null;
    document.querySelectorAll('[data-certificate]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        trigger = link;
        dialogTitle.textContent = link.dataset.title || 'Certificate';
        imageError.hidden = true;
        dialogImage.hidden = false;
        dialogImage.alt = dialogTitle.textContent;
        dialogImage.src = link.href;
        originalLink.href = link.href;
        downloadLink.href = link.href;
        if (!dialog.open) dialog.showModal();
        document.body.classList.add('modal-open');
      });
    });
    dialogImage.addEventListener('error', () => {
      dialogImage.hidden = true;
      imageError.hidden = false;
    });
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      dialogImage.removeAttribute('src');
      if (trigger) trigger.focus({ preventScroll: true });
    });
  }

  const form = document.getElementById('contact-form');
  if (form) {
    form.querySelector('button[type="submit"]').disabled = false;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      const subject = String(fields.get('subject') || '').trim();
      const body = String(fields.get('message') || '').trim() + '\n\nFrom: ' + String(fields.get('name') || '').trim() + '\nReply email: ' + String(fields.get('email') || '').trim();
      const address = document.querySelector('.email-link').getAttribute('href');
      window.location.href = address + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      form.querySelector('.form-status').textContent = 'Your email app should open with a draft. If it does not, use the email link. Your message has not been sent.';
    });
  }
})();
