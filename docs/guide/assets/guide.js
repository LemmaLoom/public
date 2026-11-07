(function () {
  var root = document.documentElement;
  var toggle = document.querySelector('.theme-toggle');

  function storedTheme() {
    try {
      var value = localStorage.getItem('guide-theme');
      return value === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);

    try {
      localStorage.setItem('guide-theme', theme);
    } catch (error) {
    }

    if (toggle) {
      toggle.textContent = toggle.dataset[theme];
      toggle.setAttribute('aria-label', toggle.dataset[theme]);
    }
  }

  if (toggle) {
    applyTheme(storedTheme());
    toggle.addEventListener('click', function () {
      applyTheme(storedTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  var menu = document.querySelector('.menu-toggle');
  if (menu) {
    menu.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.page-toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (link) {
      byId[decodeURIComponent(link.getAttribute('href').slice(1))] = link;
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && byId[entry.target.id]) {
          tocLinks.forEach(function (link) {
            link.classList.remove('active');
          });
          byId[entry.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    document.querySelectorAll('article h2[id], article h3[id]').forEach(function (heading) {
      observer.observe(heading);
    });
  }

  var input = document.getElementById('search');
  var results = document.getElementById('results');
  var index = null;
  var active = -1;

  function loadIndex(callback) {
    if (index) {
      callback();
      return;
    }

    fetch('search.json').then(function (response) {
      return response.json();
    }).then(function (data) {
      index = data;
      callback();
    }).catch(function () {
      index = [];
      callback();
    });
  }

  function fold(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function render(query) {
    var words = fold(query).split(/\s+/).filter(Boolean);
    results.innerHTML = '';
    active = -1;
    if (!words.length) {
      results.hidden = true;
      return;
    }

    var scored = [];
    index.forEach(function (entry) {
      var title = fold(entry.t);
      var body = fold(entry.b);
      var score = 0;
      for (var i = 0; i < words.length; i += 1) {
        var inTitle = title.indexOf(words[i]) !== -1;
        var inBody = body.indexOf(words[i]) !== -1;
        if (!inTitle && !inBody) {
          return;
        }

        score += inTitle ? 3 : 1;
      }

      scored.push({ entry: entry, score: score });
    });
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    scored.slice(0, 12).forEach(function (item) {
      var link = document.createElement('a');
      link.href = item.entry.u;
      link.textContent = item.entry.t;
      var where = document.createElement('span');
      where.className = 'where';
      where.textContent = item.entry.c;
      link.appendChild(where);
      results.appendChild(link);
    });
    if (!scored.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = input.dataset.empty;
      results.appendChild(empty);
    }

    results.hidden = false;
  }

  if (input && results) {
    input.addEventListener('input', function () {
      loadIndex(function () {
        render(input.value);
      });
    });
    input.addEventListener('keydown', function (event) {
      var links = results.querySelectorAll('a');
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!links.length) {
          return;
        }

        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach(function (link, i) {
          link.classList.toggle('active', i === active);
        });
      } else if (event.key === 'Enter' && active >= 0 && links[active]) {
        window.location.href = links[active].href;
      } else if (event.key === 'Escape') {
        results.hidden = true;
        input.blur();
      }
    });
    document.addEventListener('click', function (event) {
      if (!results.contains(event.target) && event.target !== input) {
        results.hidden = true;
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === '/' && document.activeElement !== input) {
        event.preventDefault();
        input.focus();
      }
    });
  }
})();
