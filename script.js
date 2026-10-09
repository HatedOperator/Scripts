/* Indicator Studios site interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* Sticky nav gets a blurred background once scrolled */
  var nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  /* Scroll-reveal */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });

  /* Failsafe: if the observer is delayed or unavailable (background tabs,
     throttling, extensions), reveal everything anyway so the page is never blank. */
  setTimeout(function () {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }, 1500);

  /* Animated counters: change the numbers in index.html via data-count */
  /* Compact formatting: 72,417 -> 72.4K, 734,898 -> 734.9K, 2,500,000 -> 2.5M */
  function format(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var duration = 1600;
    var start = null;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = format(target);
      return;
    }
    function step(ts) {
      if (el.hasAttribute('data-live-done')) { el.textContent = format(target); return; }
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
      el.textContent = format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.count').forEach(function (el) { countObserver.observe(el); });

  /* Contact form: no backend, so it hands off to the visitor's email app pre-filled */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('cf-name').value.trim();
      var email = document.getElementById('cf-email').value.trim();
      var msg = document.getElementById('cf-message').value.trim();
      var subject = encodeURIComponent('indicatorstudios.cc message from ' + (name || 'a visitor'));
      var body = encodeURIComponent(msg + '\n\n-- ' + (name ? name + ' (' + email + ')' : email));
      window.location.href = 'mailto:hello@indicatorstudios.cc?subject=' + subject + '&body=' + body;
    });
  }

  /* Live stats: Roblox's API blocks direct browser calls, so requests go
     through public CORS readers (fallback chain). If every reader fails the
     baked snapshot values in index.html simply stay on screen. */
  var PROXIES = [
    function (u) { return 'https://r.jina.ai/' + u; },
    function (u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); }
  ];
  function fetchProxied(url) {
    var i = 0;
    function attempt() {
      if (i >= PROXIES.length) return Promise.reject(new Error('no reader reachable'));
      var proxied = PROXIES[i++](url);
      return fetch(proxied).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (text) {
        var s = text.indexOf('{');
        var e = text.lastIndexOf('}');
        if (s < 0 || e <= s) throw new Error('no JSON in response');
        return JSON.parse(text.slice(s, e + 1));
      }).catch(attempt);
    }
    return attempt();
  }
  function setLive(key, value) {
    document.querySelectorAll('[data-live="' + key + '"]').forEach(function (el) {
      el.setAttribute('data-count', String(value));
      el.setAttribute('data-live-done', '1');
      el.textContent = format(value);
    });
  }
  /* Studio totals: visits and favorites are summed across OP Lucky Blocks and
     the unlisted projects (places 7057123166 and 13804724033). They are
     aggregated but never shown as their own cards. */
  var OLB = 8048032846;
  var EXTRAS = [2719612759, 4788420399];
  function refreshLive() {
    fetchProxied('https://games.roblox.com/v1/games?universeIds=' + [OLB].concat(EXTRAS).join(','))
      .then(function (d) {
        var rows = (d && d.data) || [];
        var byId = {};
        rows.forEach(function (g) { if (g && g.id) byId[g.id] = g; });
        var main = byId[OLB];
        if (main) {
          setLive('playing', main.playing || 0);
          setLive('visits-main', main.visits || 0);
          setLive('favorites', main.favoritedCount || 0);
        }
        var visits = main ? main.visits || 0 : 0;
        EXTRAS.forEach(function (id) {
          var x = byId[id];
          if (x) visits += x.visits || 0;
        });
        setLive('visits', visits); /* studio-wide total: hero only */
      })
      .catch(function () { /* keep snapshot */ });
    /* Members are summed across the main community and the unlisted groups
       (EVIL 272213186, BFL 862042380); none are listed on the page. */
    var GROUPS = [107889388, 272213186, 862042380];
    Promise.all(GROUPS.map(function (id) {
      return fetchProxied('https://groups.roblox.com/v1/groups/' + id)
        .then(function (grp) { return (grp && grp.memberCount) || 0; })
        .catch(function () { return 0; });
    })).then(function (counts) {
      if (counts[0]) setLive('members-main', counts[0]); /* main group alone */
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      if (total > 0) setLive('members', total); /* studio-wide: hero only */
    });
  }
  refreshLive();
  setInterval(refreshLive, 60000);

  /* Footer year */
  document.getElementById('year').textContent = String(new Date().getFullYear());
})();
