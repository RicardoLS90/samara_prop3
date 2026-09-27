/* =====================================================================
   SAMARA · main.js  —  COMPORTAMIENTO COMPARTIDO
   ---------------------------------------------------------------------
   Idéntico en las 3 propuestas. JavaScript vanilla, sin dependencias.
   Funciones:
     1. Navegación móvil (hamburguesa)
     2. Cabecera con estado al hacer scroll
     3. Scroll reveal con IntersectionObserver
     4. Enlace de navegación activo según sección visible
     5. Carrito de la tienda con localStorage (demo, sin pasarela)
     6. Formulario de reserva (validación cliente + confirmación simulada)
     7. Aviso de cookies (aceptar → ocultar y recordar en localStorage)
     8. Año dinámico del pie
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     UTILIDADES
     =================================================================== */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  const formatEUR = (n) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  /** Lee JSON de localStorage sin romper si está corrupto. */
  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado */ }
  }

  /* ===================================================================
     1. NAVEGACIÓN MÓVIL
     =================================================================== */
  function initNav() {
    const toggle = $('[data-nav-toggle]');
    const panel  = $('#navMobile');
    if (!toggle || !panel) return;

    const setOpen = (open) => {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    toggle.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
    // Cierra el panel al pulsar cualquier enlace dentro (navegación por anclas)
    $$('a', panel).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    // Cierra al pasar a escritorio
    window.addEventListener('resize', () => { if (window.innerWidth >= 992) setOpen(false); });
  }

  /* ===================================================================
     2. CABECERA AL HACER SCROLL
     =================================================================== */
  function initHeader() {
    const header = $('.site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===================================================================
     3. SCROLL REVEAL
     =================================================================== */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el) => io.observe(el));
  }

  /* ===================================================================
     4. ENLACE DE NAVEGACIÓN ACTIVO
     =================================================================== */
  function initActiveNav() {
    const sections = $$('main section[id]');
    const links = $$('.nav-desktop a[href^="#"], .nav-mobile a[href^="#"]');
    if (!sections.length || !links.length || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((s) => io.observe(s));
  }

  /* ===================================================================
     5. CARRITO (localStorage)
     =================================================================== */
  const Cart = (function () {
    const KEY = 'samara_cart_v1';
    let items = readStore(KEY, []);
    if (!Array.isArray(items)) items = [];

    const save = () => writeStore(KEY, items);

    function count() { return items.reduce((a, i) => a + i.qty, 0); }
    function total() { return items.reduce((a, i) => a + i.qty * i.price, 0); }

    function add(data) {
      const found = items.find((i) => i.id === data.id);
      if (found) {
        found.qty += 1;
      } else {
        items.push({ id: data.id, name: data.name, price: Number(data.price) || 0, img: data.img || '', qty: 1 });
      }
      save(); render();
    }
    function setQty(id, qty) {
      const it = items.find((i) => i.id === id);
      if (!it) return;
      it.qty = qty;
      if (it.qty <= 0) items = items.filter((i) => i.id !== id);
      save(); render();
    }
    function remove(id) {
      items = items.filter((i) => i.id !== id);
      save(); render();
    }

    function render() {
      // Contador de la cabecera
      $$('.cart-count').forEach((el) => {
        const n = count();
        el.textContent = n;
        el.classList.toggle('is-visible', n > 0);
      });

      // Cuerpo del panel
      const body = $('#cartBody');
      if (body) {
        if (!items.length) {
          body.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br>Descubre los productos de la tienda.</p>';
        } else {
          body.innerHTML = items.map((i) => `
            <div class="cart-item" data-cart-row="${i.id}">
              ${i.img ? `<img class="cart-item__img" src="${i.img}" alt="${i.name}">` : ''}
              <div>
                <h4 class="cart-item__name">${i.name}</h4>
                <p class="cart-item__price">${formatEUR(i.price)} / ud.</p>
                <div class="qty-control" aria-label="Cantidad de ${i.name}">
                  <button class="qty-btn" type="button" data-qty="-1" data-id="${i.id}" aria-label="Quitar una unidad de ${i.name}">&minus;</button>
                  <span aria-live="polite">${i.qty}</span>
                  <button class="qty-btn" type="button" data-qty="1" data-id="${i.id}" aria-label="Añadir una unidad de ${i.name}">+</button>
                </div>
              </div>
              <div style="text-align:right">
                <div class="cart-item__price">${formatEUR(i.price * i.qty)}</div>
                <button class="cart-item__remove" type="button" data-remove="${i.id}">Eliminar</button>
              </div>
            </div>`).join('');
        }
      }
      // Total
      const totalEl = $('#cartTotal');
      if (totalEl) totalEl.textContent = formatEUR(total());
    }

    function open() {
      const d = $('#cartDrawer'), o = $('#cartOverlay');
      if (d) { d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false'); }
      if (o) o.classList.add('is-open');
      const t = $('[data-cart-toggle]');
      if (t) t.setAttribute('aria-expanded', 'true');
    }
    function close() {
      const d = $('#cartDrawer'), o = $('#cartOverlay');
      if (d) { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); }
      if (o) o.classList.remove('is-open');
      const t = $('[data-cart-toggle]');
      if (t) t.setAttribute('aria-expanded', 'false');
    }

    return { add, setQty, remove, render, open, close, count };
  })();

  function initCart() {
    // Abrir / cerrar el panel
    $$('[data-cart-toggle]').forEach((b) => b.addEventListener('click', Cart.open));
    $$('[data-cart-close]').forEach((b) => b.addEventListener('click', Cart.close));
    const overlay = $('#cartOverlay');
    if (overlay) overlay.addEventListener('click', Cart.close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Cart.close(); });

    // Delegación de eventos para todo lo relacionado con el carrito
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.preventDefault();
        Cart.add(addBtn.dataset);
        // Feedback visual sin abrir el panel (permite seguir añadiendo productos).
        addBtn.textContent = 'Añadido ✓';
        setTimeout(() => { addBtn.textContent = 'Añadir al carrito'; }, 1400);
        // Pequeño "pulso" en el contador para señalar que se actualizó
        $$('.cart-count').forEach((c) => {
          c.style.transition = 'transform .18s ease';
          c.style.transform = 'scale(1.35)';
          setTimeout(() => { c.style.transform = 'scale(1)'; }, 200);
        });
        return;
      }
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) {
        const id = qtyBtn.dataset.id;
        const delta = Number(qtyBtn.dataset.qty);
        const row = qtyBtn.closest('[data-cart-row]');
        const current = row ? Number($('span', row).textContent) : 1;
        Cart.setQty(id, current + delta);
        return;
      }
      const rmBtn = e.target.closest('[data-remove]');
      if (rmBtn) { Cart.remove(rmBtn.dataset.remove); }
    });

    Cart.render();
  }

  /* ===================================================================
     6. FORMULARIO DE RESERVA
     =================================================================== */
  function initBookingForm() {
    const form = $('#bookingForm');
    if (!form) return;

    const showError = (input, on) => {
      input.classList.toggle('is-invalid', on);
      const err = input.parentElement.querySelector('.form-error');
      if (err) err.classList.toggle('is-visible', on);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      $$('[required]', form).forEach((input) => {
        const empty = !input.value.trim();
        showError(input, empty);
        if (empty) valid = false;
      });

      const email = $('#email', form);
      if (email && email.value.trim()) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
        showError(email, !ok);
        if (!ok) valid = false;
      }

      const success = $('#formSuccess');
      if (!valid) {
        if (success) success.classList.remove('is-visible');
        const firstBad = $('.is-invalid', form);
        if (firstBad) firstBad.focus();
        return;
      }

      // Sin backend: confirmación simulada
      if (success) {
        const name = ($('#nombre', form) || {}).value || '';
        success.innerHTML = `<strong>¡Gracias${name ? ', ' + name.split(' ')[0] : ''}!</strong> Hemos recibido tu solicitud de lectura. Te contactaremos para confirmar la cita. <br><small>(Demo visual: este formulario no envía datos a ningún servidor.)</small>`;
        success.classList.add('is-visible');
      }
      form.reset();
    });

    // Limpia el error al escribir
    $$('input, select, textarea', form).forEach((input) => {
      input.addEventListener('input', () => showError(input, false));
    });
  }

  /* ===================================================================
     7. AVISO DE COOKIES
     =================================================================== */
  function initCookies() {
    const banner = $('#cookieBanner');
    if (!banner) return;
    const KEY = 'samara_cookies_ok';
    if (localStorage.getItem(KEY) === '1') return;

    setTimeout(() => banner.classList.add('is-visible'), 700);
    const btn = $('#cookieAccept');
    if (btn) {
      btn.addEventListener('click', () => {
        localStorage.setItem(KEY, '1');
        banner.classList.remove('is-visible');
        setTimeout(() => banner.remove(), 500);
      });
    }
  }

  /* ===================================================================
     8. AÑO DINÁMICO
     =================================================================== */
  function initYear() {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ===================================================================
     ARRANQUE
     =================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHeader();
    initReveal();
    initActiveNav();
    initCart();
    initBookingForm();
    initCookies();
    initYear();
  });

  // Expuesto por comodidad para depurar en consola
  window.SamaraCart = Cart;
})();
