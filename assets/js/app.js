/* ============================================================
   ПОРЯДОК 72 — интерактив
   ============================================================ */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Подстановка контактов из конфига ---------- */
  function applyConfig() {
    var map = [
      ['[data-brand]', SITE.brand],
      ['[data-legal]', SITE.legalName],
      ['[data-phone]', SITE.phone],
      ['[data-hours]', SITE.workHours]
    ];
    map.forEach(function (pair) {
      if (!pair[1]) return;
      $$(pair[0]).forEach(function (el) { el.textContent = pair[1]; });
    });
    if (SITE.phoneHref) {
      $$('[data-phone-href]').forEach(function (el) { el.setAttribute('href', 'tel:' + SITE.phoneHref); });
    }
    if (SITE.phoneSecondary && SITE.phoneSecondaryHref) {
      $$('[data-phone2]').forEach(function (el) {
        el.textContent = SITE.phoneSecondary;
        el.setAttribute('href', 'tel:' + SITE.phoneSecondaryHref);
      });
    }
    $$('[data-telegram]').forEach(function (el) {
      if (!SITE.telegram) { el.closest('[data-social-block]') && el.closest('[data-social-block]').remove(); return; }
      el.setAttribute('href', 'https://t.me/' + SITE.telegram.replace('@', ''));
    });
    $$('[data-whatsapp]').forEach(function (el) {
      if (!SITE.whatsapp) { el.closest('[data-social-block]') && el.closest('[data-social-block]').remove(); return; }
      el.setAttribute('href', 'https://wa.me/' + SITE.whatsapp);
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    if (SITE.yandexVerify) {
      var meta = document.createElement('meta');
      meta.name = 'yandex-verification';
      meta.content = SITE.yandexVerify;
      document.head.appendChild(meta);
    }
  }

  /* ---------- 2. Мобильное меню ---------- */
  function initMenu() {
    var burger = $('.burger');
    var menu = $('.mobile-menu');
    if (!burger || !menu) return;
    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('is-open');
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('is-open');
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080) {
        burger.classList.remove('is-open');
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- 3. Шапка при скролле ---------- */
  function initHeader() {
    var hdr = $('.hdr');
    if (!hdr) return;
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 4. Калькулятор ----------
     Модель цены: Газель 1 600 ₽/час, грузчик 700 ₽/час,
     комплект «Газель + 2 грузчика» — от 2 800 ₽/час.
     Вывоз мусора — фиксированной цены нет, уточняется по звонку. */
  var PRICE = {
    move: {
      truck: 1600,   // Газель, ₽/час
      loader: 700,   // один грузчик, ₽/час
      bundle: 2800,  // комплект «Газель + 2 грузчика», ₽/час
      minHours: 1
    },
    trash: { min: 3500 }
  };

  function chipVal(group) {
    var active = $('.chip.is-active', group);
    return active ? active.getAttribute('data-val') : null;
  }

  function money(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function calcMove(panel) {
    var hours = parseInt(chipVal($('[data-calc="moveHours"]', panel)) || '2', 10);
    var loaders = parseInt(chipVal($('[data-calc="loaders"]', panel)) || '2', 10);
    var extraKeys = $$('.chip.is-active', $('[data-calc="moveExtras"]', panel) || document.createElement('div'))
      .map(function (c) { return c.getAttribute('data-val'); });

    /* упаковка и разборка — те же 700 ₽/час бригады */
    var extraWorkers = extraKeys.filter(function (k) { return k === 'pack' || k === 'disasm'; }).length;
    /* 2 грузчика и больше — пакетная ставка «Газель + 2 грузчика» (2 800 ₽/час),
       каждый следующий грузчик добавляется по 700 ₽/час */
    var workers = loaders + extraWorkers;
    var perHour = workers >= 2
      ? PRICE.move.bundle + PRICE.move.loader * (workers - 2)
      : PRICE.move.truck + PRICE.move.loader * workers;
    var total = perHour * hours;

    var discount = extraKeys.indexOf('trash') > -1 ? 0.15 : 0;
    return {
      total: Math.round(total * (1 - discount) / 50) * 50,
      discount: discount,
      perHour: perHour,
      hours: hours,
      tael: extraKeys.indexOf('tael') > -1
    };
  }

  function calcTrash(panel) {
    /* фиксированной цены нет — считаем только отправную точку */
    return { total: PRICE.trash.min, discount: 0, fixed: true };
  }

  function initCalc() {
    var root = $('[data-calc-root]');
    if (!root) return;

    $$('.calc__tab', root).forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.calc__tab', root).forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var key = tab.getAttribute('data-tab');
        $$('.calc__panel', root).forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== key;
        });
        update(root, key);
      });
    });

    $$('.chip[data-val]', root).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var group = chip.closest('.chips');
        if (group.getAttribute('data-multi') === '1') {
          chip.classList.toggle('is-active');
        } else {
          $$('.chip', group).forEach(function (c) { c.classList.remove('is-active'); });
          chip.classList.add('is-active');
        }
        var key = root.querySelector('.calc__tab.is-active').getAttribute('data-tab');
        update(root, key);
      });
    });

    $$('select', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var key = root.querySelector('.calc__tab.is-active').getAttribute('data-tab');
        update(root, key);
      });
    });

    var initial = root.querySelector('.calc__tab.is-active');
    update(root, initial ? initial.getAttribute('data-tab') : 'move');
  }

  function update(root, key) {
    var panel = $('.calc__panel[data-panel="' + key + '"]', root);
    if (!panel) return;
    var res = key === 'move' ? calcMove(panel) : calcTrash(panel);
    var out = $('[data-price]', root);
    var note = $('[data-price-note]', root);
    var sub = $('[data-price-sub]', root);
    if (out) out.textContent = 'от ' + money(res.total);
    if (sub) {
      sub.textContent = key === 'move'
        ? (res.perHour.toLocaleString('ru-RU') + ' ₽/час · ' + res.hours + ' ' + plural(res.hours, 'час', 'часа', 'часов'))
        : 'Точная сумма — после разговора';
    }
    if (note) {
      if (key === 'trash') {
        note.textContent = 'Фиксированной цены нет: объём, этаж и тип мусора считаем на месте. От 3 500 ₽.';
      } else if (res.discount) {
        note.textContent = 'Учтена скидка 15% за комплекс: переезд + вывоз мусора.';
      } else if (res.tael) {
        note.textContent = 'Такелажные работы считаем отдельно — уточним по телефону.';
      } else {
        note.textContent = 'Оплата по часам: минимум 1 час. Точную сумму назовём по телефону.';
      }
    }
  }

  function plural(n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  /* ---------- 5. Переключатель цен ---------- */
  function initTabs() {
    $$('[data-tabgroup]').forEach(function (group) {
      $$('button', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('button', group).forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          var key = btn.getAttribute('data-tab');
          $$('[data-tabpanel]', group.parentNode).forEach(function (p) {
            p.hidden = p.getAttribute('data-tabpanel') !== key;
          });
        });
      });
    });
  }

  /* ---------- 6. FAQ ---------- */
  function initFaq() {
    $$('.faq__q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq__item');
        var ans = $('.faq__a', item);
        var open = item.classList.contains('is-open');
        $$('.faq__item.is-open').forEach(function (o) {
          o.classList.remove('is-open');
          $('.faq__a', o).style.maxHeight = null;
        });
        if (!open) {
          item.classList.add('is-open');
          ans.style.maxHeight = ans.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---------- 7. Появление блоков ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- 8. Счётчики ---------- */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var start = performance.now();
        var dur = 1200;
        var step = function (t) {
          var p = Math.min((t - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: .4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 9. Запуск ---------- */
  function boot() {
    applyConfig();
    initMenu();
    initHeader();
    initCalc();
    initTabs();
    initFaq();
    initReveal();
    initCounters();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
