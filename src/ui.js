(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  WP.useCiter(OSINT);
  var PAPER_CSS = $('paper-css').textContent, BRIEF_CSS = $('brief-css').textContent, BOOK_CSS = $('book-css').textContent, EPUB_CSS = $('epub-css').textContent;
  // Kept apart from the White Paper and Intel Briefing builders, which may share this site's storage.
  var K_DOC = 'ebb-doc-v1', K_THEME = 'ebb-theme-v1', K_TAB = 'ebb-tab-v1';
  var ACCENTS = { paper: WP.PAPER_ACCENT, brief: WP.BRIEF_ACCENT, book: WP.BOOK_ACCENT };
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (x, i) { b[i] = Math.floor(Math.random() * 256); });
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ------------------------------------------------------------------ a new paper: the template, with its guidance in square brackets
  function monthYear() { var d = new Date(); return WP.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function starter() {
    var d = WP.defaults();
    Object.assign(d.meta, { title: '[Paper title: the question or the claim, in ten words or fewer]', subtitle: '[Subtitle: the scope, the period, or the method.]', date: monthYear(), shortTitle: '[Short title]', publisher: '[Publisher]', site: '[Website]' });
    d.aboutSeries = '[Two or three sentences: what the papers cover, who writes them, and how often a new one appears.]\n\nEach paper is numbered, dated, and versioned. When a paper is revised, its version number changes and the change is logged on the back page.';
    d.summary = {
      lead: '[The problem in two sentences: what is happening, and why it will still matter in five years.]',
      findings: '[Finding: the main claim, stated plainly enough that it could be proven wrong.]\n[Finding: the strongest evidence, in one sentence.]\n[Finding: the consequence the reader is most likely to miss.]',
      recommendations: '[Who should act, and what they should do.]\n[A second recommendation, for a different actor.]\n[What to stop doing, or what to start measuring.]'
    };
    d.body = [
      '# Introduction', '',
      '[Body text runs in one 5.3-inch column. Put each note right after the sentence it supports, like this.^[A note is written where it belongs: a caret and the note in square brackets. Notes run in one sequence through the paper and print at the foot of the page.] To cite a source from your OSINT list, write its key in square brackets with an at sign, as Sources explains.]', '',
      '>> [Margin note: a definition or a date. 25 words at most.]',
      '[A paragraph the margin note sits beside. Leave a blank line between paragraphs.]', '',
      '# Background', '',
      '[What the reader needs first: the history, the actors, and the terms.]', '',
      '[[fig-trend]]', '',
      '# Analysis', '',
      '[The core argument.]', '',
      '## [Subsection title]', '',
      '[Subsections are numbered 3.1, 3.2, and so on.]', '',
      '!> [The sentence from this paper a reader would quote.]', '',
      '# Evidence', '',
      '[[key-numbers]]', '',
      '[[table-compare]]', '',
      '# Implications and recommendations', '',
      '## Recommendations', '',
      '{R1} [Who should act, and what they should do. Why, and what it would cost.]',
      '{R2} [A second recommendation, for a different actor.]',
      '{R3} [What to stop doing, or what to start measuring.]', '',
      '## What to watch', '',
      '{Indicator 1} [An event the reader could observe, and what it would confirm.]',
      '{Indicator 2} [A second observable event, and what it would weaken.]',
      '{Indicator 3} [The event that would prove this paper wrong.]'
    ].join('\n');
    d.appendix = ['# Method and sources', '', '## Method', '', '[How the research was done: what was collected, from where, and over what period.]', '',
      '## Limitations', '', '[What the sources cannot show, and where the analysis is weakest.]', '', '## Source ratings', '', '[[rating-key]]'].join('\n');
    d.visuals = [
      { id: 'fig-trend', kind: 'bar', title: '[Chart title: state the finding, not the variable]', subtitle: '[Unit of measure, date range]', source: '[Source: dataset, publisher, year.]', note: 'Placeholder numbers. Replace them under Visuals.', data: 'Year,Value\n2019,28\n2020,34\n2021,31\n2022,46\n2023,58\n2024,82\n2025,71', highlight: '2024', image: '', wide: false },
      { id: 'key-numbers', kind: 'stats', title: '', subtitle: '', source: '', note: '', data: '[00], [What this number measures, with unit and year]\n[00], [A second figure that puts the first in proportion]\n[00], [A third figure, or the comparison that surprised you]', highlight: '', image: '', wide: false },
      { id: 'table-compare', kind: 'table', title: '[Table title: what is being compared]', subtitle: '', source: '[Source: dataset or document, publisher, year. Note any gaps.]', note: '', data: 'Actor or system,Attribute,Year,Count\n[Row label],[Text value],[YYYY],[000]\n[Row label],[Text value],[YYYY],[000]\n[Row label],[Text value],[YYYY],[000]', highlight: '', image: '', wide: false }
    ];
    d.authors = [{ name: '[Author name]', bio: '[Two-sentence biography: background, and what qualifies the author to write this paper.]', org: false }];
    d.back = { include: true, history: '1.0 | [Month DD, YYYY] | First publication', series: '001 | [This paper\'s title] | This paper\n002 | [Forthcoming title] | [Month YYYY]\n003 | [Forthcoming title] | [Month YYYY]', license: '[Reuse and licensing terms]' };
    return d;
  }

  // A new intelligence brief: numbered stories, a why-it-matters box after each, and the
  // sources at the end.
  function briefStarter() {
    var d = WP.defaults();
    Object.assign(d.meta, { kind: 'brief', briefName: '[Brief name]', number: '001', date: monthYear(), accent: WP.BRIEF_ACCENT, paper: 'white',
      colophon: '[Colophon: who publishes the brief, alongside what, and the copyright line. For example: The [Brief name] Intelligence Briefing is a product of [Publisher]. Copyright ' + new Date().getFullYear() + '.]' });
    d.body = [
      '# [Story title: what happened, in one line]', '',
      '[Open with who reported it, and where: "Writing in *Proceedings*, ..." Then the claim, in a sentence or two. Cite the source where you use it, as Sources explains. A small number prints in the text, linked to the source in the numbered list at the end of the brief.]', '',
      '> [A passage quoted from the source, in its own words. It is indented and set smaller.]', '',
      '[What else the source shows, and what the reader needs in order to follow it. Leave a blank line between paragraphs.]', '',
      '?> [So, why does this matter? What this changes, for whom, and what to watch next.]',
      '?>',
      '?> [A second paragraph, if you need one. A line with only ?> starts a new paragraph inside the box.]', '',
      '# [Second story title]', '',
      '[Stories run on, one after another. Each is numbered and listed under "In this brief".]', '',
      '[[fig-trend]]', '',
      '?> [Why it matters.]', '',
      '# [Third story title]', '',
      '[A story can carry a note at the foot of the page when it needs one.^[A note is written where it belongs: a caret and the note in square brackets.]]', '',
      '?> [Why it matters.]'
    ].join('\n');
    d.visuals = [
      { id: 'fig-trend', kind: 'bar', title: '[Chart title: state the finding, not the variable]', subtitle: '[Unit of measure, date range]', source: '[Source: dataset, publisher, year.]', note: 'Placeholder numbers. Replace them under Visuals.', data: 'Year,Value\n2019,28\n2020,34\n2021,31\n2022,46\n2023,58\n2024,82\n2025,71', highlight: '2024', image: '', wide: false }
    ];
    d.back.include = false;
    return d;
  }
  // A new eBook: front matter filled with guidance, an unnumbered introduction, a part, and
  // chapters that show each kind of block.
  function bookStarter() {
    var d = WP.defaults(), y = new Date().getFullYear();
    Object.assign(d.meta, { kind: 'book', title: '[Book title]', subtitle: '[Subtitle: what the book is about, in one line]', date: monthYear(), accent: WP.BOOK_ACCENT,
      publisher: '[Publisher]', site: '[Website]', colophon: '[Colophon: who publishes the book and for whom. For example: This eBook is an official product of [Publisher], made for paid subscribers of [Publication].]' });
    d.authors = [{ name: '[Author name]', bio: '[Two or three sentences: background, and what qualifies the author to write this book.]', org: false }];
    Object.assign(d.book, { copyright: '\u00A9 ' + y + ' [Publisher]. All rights reserved.', edition: 'First edition, ' + monthYear(),
      dedication: '[Dedication: for whom the book is written. Delete it if you do not want one.]', epigraph: '[An epigraph: a short quotation that sets up the book. Delete it if you do not want one.]', epigraphBy: '[Who said it, and where]',
      description: '[Two or three sentences on what the book covers, for reading apps and store listings.]', bookId: uuid() });
    d.book.cover.kicker = '';
    d.body = [
      '# Introduction {-}', '',
      '[An unnumbered chapter: an introduction, preface, or foreword. Put {-} after a heading to leave it unnumbered. Notes go where they belong.^[A note is written where it belongs: a caret and the note in square brackets. Notes are numbered afresh in each chapter.] To cite a source from your OSINT list, write its key in square brackets with an at sign, as Sources explains.]', '',
      '[Paragraphs are indented after the first, as in a printed book. Leave a blank line between paragraphs.]', '',
      '# [Title of the first part] {part}', '',
      '[A part gets a page of its own, numbered Part One. Leave parts out if the book does not need them.]', '',
      '# [Chapter title]', '',
      '[Each # heading starts a numbered chapter on a new page: Chapter One, Two, Three. The chapter title runs at the top of its pages.]', '',
      '## [A section heading inside the chapter]', '',
      '[Text.]', '',
      '* * *', '',
      '[A line of three asterisks is a scene break, for a shift in time or place.]', '',
      '[[fig-trend]]', '',
      '# [Second chapter title]', '',
      '[Chapter text.]', '',
      '!> [A pull quote: the sentence a reader would underline.]', '',
      '> [A block quotation, in the source\'s own words.]', '',
      '?> [A boxed aside. Its heading is set under Book, Layout.]'
    ].join('\n');
    d.appendix = ['# Acknowledgments', '', '[Thanks to the people who helped.]', '', '# A note on sources', '', '[How the research was done, and how the sources are rated.]', '', '[[rating-key]]'].join('\n');
    d.visuals = [
      { id: 'fig-trend', kind: 'bar', title: '[Chart title: state the finding, not the variable]', subtitle: '[Unit of measure, date range]', source: '[Source: dataset, publisher, year.]', note: 'Placeholder numbers. Replace them under Visuals.', data: 'Year,Value\n2019,28\n2020,34\n2021,31\n2022,46\n2023,58\n2024,82\n2025,71', highlight: '2024', image: '', wide: false }
    ];
    d.back.include = false;
    return d;
  }
  function starterOf(kind) { return kind === 'brief' ? briefStarter() : kind === 'book' ? bookStarter() : starter(); }

  // ------------------------------------------------------------------ state
  var doc = null, saveTimer = null, renderTimer = null, rendering = false, renderAgain = false, lastTarget = null, statusTimer = null;
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function setStatus(msg, bad) {
    var s = $('status'); s.textContent = msg; s.className = 'status' + (bad ? ' bad' : '');
    clearTimeout(statusTimer); if (!bad) statusTimer = setTimeout(function () { s.textContent = ''; }, 3000);
  }
  function get(path) { var p = path.split('.'), o = doc; for (var i = 0; i < p.length; i++) o = o == null ? undefined : o[p[i]]; return o; }
  function put(path, v) { var p = path.split('.'), o = doc; for (var i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; }
  var warnedSize = false;
  function changed(now) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (!store(K_DOC, doc) && !warnedSize) { warnedSize = true; setStatus('This paper is too large to keep in the browser between visits (images take the space). Save a project file to keep it.', true); }
    }, 400);
    schedule(now ? 0 : 650);
  }

  // ------------------------------------------------------------------ fields
  function fillFields() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (el) {
      var v = get(el.getAttribute('data-k'));
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'color') el.value = /^#[0-9a-f]{6}$/i.test(v || '') ? v : ACCENTS[doc.meta.kind] || WP.PAPER_ACCENT;
      else el.value = v == null ? '' : v;
    });
    $('coverInfo').textContent = doc.meta.coverImage ? 'Image chosen.' : 'No image.';
    $('bcoverInfo').textContent = doc.meta.coverImage ? 'Photo chosen.' : 'No photo yet.';
    $('ccoverInfo').textContent = doc.meta.coverImage ? 'Image chosen.' : 'No image yet.';
    applyKind();
    renderAuthors(); renderVisualList(); renderSources(); paintCover();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (el) {
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color' ? 'change' : 'input', function () {
      put(el.getAttribute('data-k'), el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value);
      // Duplicate fields (the same value under two kinds) stay in step.
      Array.prototype.forEach.call(document.querySelectorAll('[data-k="' + el.getAttribute('data-k') + '"]'), function (o) { if (o !== el && o.type !== 'checkbox') o.value = el.value; });
      if (/^book\.cover\.|^meta\.(title|subtitle|publisher|accent|coverImage)$|^book\.trim$/.test(el.getAttribute('data-k'))) paintCover();
      changed(el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color');
    });
    if (el.hasAttribute('data-cite')) el.addEventListener('focus', function () { lastTarget = el; });
  });

  Object.keys(WP.TRIMS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = WP.TRIMS[k].label; $('b-trim').appendChild(o); });

  // ------------------------------------------------------------------ tabs
  function showTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#tabs [data-tab]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name)); });
    Array.prototype.forEach.call(document.querySelectorAll('#panes [data-pane]'), function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
    store(K_TAB, name);
    if (name === 'cover') paintCover();
  }
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.getAttribute('data-tab')); });

  // ------------------------------------------------------------------ writing toolbar
  function insert(ta, before, after, placeholder) {
    ta = ta || (lastTarget && document.contains(lastTarget) ? lastTarget : $('t-body'));
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, sel = v.slice(s, e) || placeholder || '';
    ta.focus();
    ta.setRangeText(before + sel + (after || ''), s, e, 'end');
    if (!v.slice(s, e) && placeholder) { ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + placeholder.length; }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Block-level additions go on a line of their own: from the middle of a line, they start
  // after the end of that line rather than splitting it.
  function lineStart(ta, prefix, placeholder) {
    var s = ta.selectionStart, v = ta.value, ls = v.lastIndexOf('\n', s - 1) + 1;
    if (s !== ls || ta.selectionEnd !== s) {
      var le = v.indexOf('\n', ta.selectionEnd); if (le === -1) le = v.length;
      ta.selectionStart = ta.selectionEnd = le;
      insert(ta, '\n\n' + prefix, '', placeholder);
      return;
    }
    // At the start of a line that already has text, the new block goes above it.
    var le2 = v.indexOf('\n', s), rest = v.slice(s, le2 === -1 ? v.length : le2);
    if (rest.trim()) ta.setRangeText('\n\n', s, s, 'start');
    insert(ta, prefix, '', placeholder);
  }
  var BRIEF_TOOLS = [
    ['Story', function (ta) { lineStart(ta, '# ', 'Story title'); }, '# starts a numbered story'],
    ['Subhead', function (ta) { lineStart(ta, '## ', 'Subheading'); }, '## starts a subheading inside a story'],
    ['Why it matters', function (ta) { lineStart(ta, '?> ', 'Why this matters to the reader.'); }, 'The "So, why does this matter?" box'],
    ['Quote', function (ta) { lineStart(ta, '> ', 'Quoted text'); }, 'A quotation, indented'],
    ['Cite', function (ta) { lastTarget = ta; showTab('sources'); setStatus('Pick a source and click Cite. It goes where your cursor was.'); }, 'Cite a source: its number prints here and it joins the list at the end'],
    ['Note', function (ta) { insert(ta, '^[', ']', 'note text'); }, 'A footnote at the cursor'],
    ['Bold', function (ta) { insert(ta, '**', '**', 'bold text'); }, 'Bold: **text**'],
    ['Italic', function (ta) { insert(ta, '*', '*', 'italic text'); }, 'Italic: *text*'],
    ['List', function (ta) { lineStart(ta, '- ', 'Item'); }, 'A bulleted list'],
    ['Visual', function (ta) { var ids = doc.visuals.map(function (v) { return v.id; }); lineStart(ta, '[[', ids[0] || 'name'); insert(ta, '', ']]'); }, 'Place a chart, table, or image'],
    ['Page break', function (ta) { lineStart(ta, '---', ''); insert(ta, '\n\n', ''); }, 'Start a new page']
  ];
  var TOOLS = [
    ['Section', function (ta) { lineStart(ta, '# ', 'Section title'); }, '# starts a numbered section, on a new page'],
    ['Subsection', function (ta) { lineStart(ta, '## ', 'Subsection title'); }, '## starts a numbered subsection'],
    ['Note', function (ta) { insert(ta, '^[', ']', 'note text'); }, 'A footnote at the cursor'],
    ['Bold', function (ta) { insert(ta, '**', '**', 'bold text'); }, 'Bold: **text**'],
    ['Italic', function (ta) { insert(ta, '*', '*', 'italic text'); }, 'Italic: *text*'],
    ['Cite', function (ta) { lastTarget = ta; showTab('sources'); setStatus('Pick a source and click Cite. It goes where your cursor was.'); }, 'Cite a source from your list'],
    ['Key point', function (ta) { lineStart(ta, '!> ', 'The sentence a reader would quote.'); }, 'A pull-out key point'],
    ['Margin note', function (ta) { lineStart(ta, '>> ', 'A definition or a date.'); }, 'A note in the margin, beside the next paragraph'],
    ['Quote', function (ta) { lineStart(ta, '> ', 'Quoted text'); }, 'A block quotation'],
    ['List', function (ta) { lineStart(ta, '- ', 'Item'); }, 'A bulleted list'],
    ['Labeled', function (ta) { lineStart(ta, '{R1} ', 'Text'); }, 'A row with a label in the margin: {R1}, {Indicator 1}'],
    ['Visual', function (ta) { var ids = doc.visuals.map(function (v) { return v.id; }); lineStart(ta, '[[', ids[0] || 'name'); insert(ta, '', ']]'); }, 'Place a chart, table, or image'],
    ['Page break', function (ta) { lineStart(ta, '---', ''); insert(ta, '\n\n', ''); }, 'Start a new page']
  ];
  var BOOK_TOOLS = [
    ['Chapter', function (ta) { lineStart(ta, '# ', 'Chapter title'); }, '# starts a numbered chapter on a new page'],
    ['Unnumbered', function (ta) { lineStart(ta, '# ', 'Introduction'); insert(ta, '', ' {-}'); }, '# Title {-}: an unnumbered chapter, such as a preface or introduction'],
    ['Part', function (ta) { lineStart(ta, '# ', 'Part title'); insert(ta, '', ' {part}'); }, '# Title {part}: a part, on a page of its own'],
    ['Section', function (ta) { lineStart(ta, '## ', 'Section heading'); }, '## a section heading inside a chapter'],
    ['Scene break', function (ta) { lineStart(ta, '* * *', ''); insert(ta, '\n\n', ''); }, 'Three asterisks: a break for a shift in time or place'],
    ['Note', function (ta) { insert(ta, '^[', ']', 'note text'); }, 'A footnote at the cursor'],
    ['Cite', function (ta) { lastTarget = ta; showTab('sources'); setStatus('Pick a source and click Cite. It goes where your cursor was.'); }, 'Cite a source from your list'],
    ['Bold', function (ta) { insert(ta, '**', '**', 'bold text'); }, 'Bold: **text**'],
    ['Italic', function (ta) { insert(ta, '*', '*', 'italic text'); }, 'Italic: *text*'],
    ['Quote', function (ta) { lineStart(ta, '> ', 'Quoted text'); }, 'A block quotation'],
    ['Pull quote', function (ta) { lineStart(ta, '!> ', 'The sentence a reader would underline.'); }, 'A pull quote, set large between rules'],
    ['Box', function (ta) { lineStart(ta, '?> ', 'An aside in a box.'); }, 'A boxed aside, with the heading set under Book'],
    ['List', function (ta) { lineStart(ta, '- ', 'Item'); }, 'A bulleted list'],
    ['Visual', function (ta) { var ids = doc.visuals.map(function (v) { return v.id; }); lineStart(ta, '[[', ids[0] || 'name'); insert(ta, '', ']]'); }, 'Place a chart, table, or image'],
    ['Page break', function (ta) { lineStart(ta, '---', ''); insert(ta, '\n\n', ''); }, 'Start a new page in the PDF']
  ];
  function buildToolbars(kind) {
  Array.prototype.forEach.call(document.querySelectorAll('.toolbar'), function (bar) {
    var ta = $('t-' + bar.getAttribute('data-for'));
    bar.textContent = '';
    (kind === 'brief' ? BRIEF_TOOLS : kind === 'book' ? BOOK_TOOLS : TOOLS).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = t[0]; b.title = t[2];
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { t[1](ta); });
      bar.appendChild(b);
    });
    if (bar.getAttribute('data-for') === 'appendix') {
      var r = document.createElement('button'); r.type = 'button'; r.className = 'btn'; r.textContent = 'Rating key'; r.title = 'The Admiralty source rating key table';
      r.addEventListener('mousedown', function (e) { e.preventDefault(); });
      r.addEventListener('click', function () { lineStart(ta, '[[rating-key]]', ''); });
      bar.appendChild(r);
    }
  });
  }
  var HELP = [
    ['# Title', 'A numbered section. Each starts a new page unless you turn that off under Paper.'],
    ['## Title', 'A numbered subsection: 3.1, 3.2.'],
    ['### Title', 'A small heading, not numbered.'],
    ['(blank line)', 'Starts a new paragraph.'],
    ['*italic*  **bold**', 'Italic and bold. [text](https://...) makes a link.'],
    ['^[note text]', 'A footnote, numbered in order through the paper.'],
    ['[@key, p. 45]', 'Cites a source from Sources in a footnote. First use prints in full, later uses in short form. [@a; @b, p. 3] cites two in one note. Inside a note, [@key] prints the citation inline.'],
    ['!> text', 'A key point, set large with a rule above.'],
    ['>> text', 'A margin note beside the next paragraph.'],
    ['> text', 'A block quotation.'],
    ['- item  /  1. item', 'Bulleted and numbered lists.'],
    ['{R1} text', 'A row with a label in the margin, for recommendations and indicators.'],
    ['[[name]]', 'Places the chart, table, or image with that name from Visuals.'],
    ['---', 'Starts a new page.']
  ];
  var BRIEF_HELP = [
    ['# Title', 'A numbered story: 01, 02, 03. Each is listed under "In this brief". Stories run on, one after another.'],
    ['## Title', 'A subheading inside a story.'],
    ['(blank line)', 'Starts a new paragraph.'],
    ['*italic*  **bold**', 'Italic and bold. [text](https://...) makes a link.'],
    ['> text', 'A quotation, indented and set smaller.'],
    ['?> text', 'The "So, why does this matter?" box. A line with only ?> starts a new paragraph inside it.'],
    ['[@key]', 'Prints the source\'s number in the text, linked to its entry in the numbered list on the last page. Sources are numbered in order of first citation. [@a; @b] gives both numbers. [ORIGINAL STORY: @key] labels the entry.'],
    ['^[note text]', 'A footnote at the foot of the page, when a story needs one. Notes are marked *, \u2020, \u2021 so they are not confused with source numbers.'],
    ['- item  /  1. item', 'Bulleted and numbered lists.'],
    ['[[name]]', 'Places the chart, table, or image with that name from Visuals.'],
    ['---', 'Starts a new page.']
  ];
  var BOOK_HELP = [
    ['# Title', 'A numbered chapter: Chapter One, Two, Three. Each starts a new page and is listed in the contents.'],
    ['# Title {-}', 'An unnumbered chapter: an introduction, preface, foreword, prologue, or epilogue.'],
    ['# Title {part}', 'A part, on a page of its own: Part One. The chapters after it belong to it.'],
    ['## Title', 'A section heading inside a chapter.'],
    ['### Title', 'A small heading, in italics.'],
    ['(blank line)', 'Starts a new paragraph. Paragraphs after the first are indented, unless you choose spaced paragraphs under Book.'],
    ['* * *', 'A scene break.'],
    ['*italic*  **bold**', 'Italic and bold. [text](https://...) makes a link.'],
    ['^[note text]', 'A note. In the PDF it prints at the foot of the page or at the back of the book; in the ePUB, at the end of the chapter. Numbered afresh in each chapter.'],
    ['[@key, p. 45]', 'Cites a source from Sources in a note. The first citation of a source in each chapter prints in full, later ones in short form. [@a; @b, p. 3] cites two in one note.'],
    ['> text', 'A block quotation.'],
    ['!> text', 'A pull quote, set large between rules.'],
    ['?> text', 'A boxed aside, with the heading set under Book. A line with only ?> starts a new paragraph inside it.'],
    ['>> text', 'A short aside in italics, with a rule beside it.'],
    ['- item  /  1. item', 'Bulleted and numbered lists.'],
    ['{Label} text', 'A row with a label, for terms, dates, or recommendations.'],
    ['[[name]]', 'Places the chart, table, or image with that name from Visuals.'],
    ['---', 'Starts a new page in the PDF. The ePUB ignores it.']
  ];
  function paintHelp(kind) {
    $('helpTitle').textContent = kind === 'brief' ? 'How to write the stories' : kind === 'book' ? 'How to write the chapters' : 'How to write the body';
    $('helpTable').innerHTML = (kind === 'brief' ? BRIEF_HELP : kind === 'book' ? BOOK_HELP : HELP).map(function (h) { return '<tr><td>' + esc(h[0]) + '</td><td>' + esc(h[1]) + '</td></tr>'; }).join('');
  }

  // ------------------------------------------------------------------ white paper or brief
  var shownKind = null;
  var NAMES = { paper: 'paper', brief: 'brief', book: 'book' };
  function applyKind() {
    var k = NAMES[doc.meta.kind] || 'paper';
    $({ paper: 'kindPaper', brief: 'kindBrief', book: 'kindBook' }[k]).checked = true;
    Array.prototype.forEach.call(document.querySelectorAll('[data-only]'), function (el) { el.hidden = el.getAttribute('data-only').split(' ').indexOf(k) === -1; });
    var tabs = $('tabs');
    tabs.querySelector('[data-tab="paper"]').textContent = { paper: 'Paper', brief: 'Brief', book: 'Book' }[k];
    tabs.querySelector('[data-tab="body"]').textContent = { paper: 'Body', brief: 'Stories', book: 'Chapters' }[k];
    tabs.querySelector('[data-tab="appendix"]').textContent = k === 'book' ? 'Back matter' : 'Appendix';
    $('t-body').setAttribute('aria-label', { paper: 'Body text', brief: 'Stories', book: 'Chapters' }[k]);
    $('t-appendix').setAttribute('aria-label', k === 'book' ? 'Back matter' : 'Appendix text');
    if (!newArmed) $('newBtn').textContent = 'New ' + k;
    if (shownKind !== k) { shownKind = k; buildToolbars(k); paintHelp(k); }
    var cur = document.querySelector('#tabs [aria-selected="true"]');
    if (cur && cur.hidden) showTab('paper');
  }
  ['kindPaper', 'kindBrief', 'kindBook'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var k = $(id).value, from = doc.meta.kind;
      if (!$(id).checked || from === k) return;
      // The untouched template of one becomes the template of the other.
      var fresh = starterOf(from);
      if (doc.body === fresh.body) {
        var next = starterOf(k);
        doc.body = next.body; doc.visuals = next.visuals;
        Object.keys(next.meta).forEach(function (f) { if (f !== 'kind' && (doc.meta[f] === '' || doc.meta[f] === fresh.meta[f] && /^\[/.test(String(fresh.meta[f])))) doc.meta[f] = next.meta[f]; });
        if (!doc.appendix.trim() || doc.appendix === fresh.appendix) doc.appendix = next.appendix;
        if (k === 'paper') {
          Object.keys(next.summary).forEach(function (f) { if (!doc.summary[f].trim()) doc.summary[f] = next.summary[f]; });
          if (!doc.aboutSeries.trim()) doc.aboutSeries = next.aboutSeries;
          Object.keys(next.back).forEach(function (f) { if (doc.back[f] === '' || f === 'include') doc.back[f] = next.back[f]; });
        }
        if (k === 'book') Object.keys(next.book).forEach(function (f) { if (f !== 'cover' && doc.book[f] === '') doc.book[f] = next.book[f]; });
        if (!doc.authors.length && next.authors.length) doc.authors = next.authors;
        if (k === 'brief' && doc.authors.length === 1 && doc.authors[0].name === fresh.authors[0].name) doc.authors = [];
      }
      if (k === 'book' && !doc.book.bookId) doc.book.bookId = uuid();
      var was = String(doc.meta.accent || '').toUpperCase();
      if (was === String(ACCENTS[from]).toUpperCase() || !/^#[0-9A-F]{6}$/.test(was)) doc.meta.accent = ACCENTS[k];
      doc.meta.kind = k;
      fillFields(); changed(true);
      setStatus({ paper: 'Now building a white paper.', brief: 'Now building an intelligence brief.', book: 'Now building an eBook.' }[k]);
    });
  });
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ------------------------------------------------------------------ images
  // Large photos are scaled down so a project file stays a reasonable size.
  function readImage(file, cb) {
    if (!file) return;
    if (!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(file.type)) { setStatus('That file is not an image this page can use (PNG, JPEG, GIF, WebP, or SVG).', true); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var url = String(rd.result);
      if (file.type === 'image/svg+xml' || file.size < 400 * 1024) { cb(url); return; }
      var img = new Image();
      img.onload = function () {
        var max = 2000, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = function () { cb(url); };
      img.src = url;
    };
    rd.readAsDataURL(file);
  }
  $('coverPick').addEventListener('click', function () { $('coverFile').click(); });
  // The cover designer needs the image's shape to place it; a new image starts centered.
  $('coverFile').addEventListener('change', function () {
    readImage($('coverFile').files[0], function (u) {
      doc.meta.coverImage = u; $('coverFile').value = '';
      $('coverInfo').textContent = 'Image chosen.'; $('bcoverInfo').textContent = 'Photo chosen.'; $('ccoverInfo').textContent = 'Image chosen.';
      var im = new Image();
      im.onload = function () { Object.assign(doc.book.cover, { imgW: im.naturalWidth, imgH: im.naturalHeight, focusX: 50, focusY: 50, zoom: 100 }); fillFields(); changed(true); };
      im.onerror = function () { doc.book.cover.imgW = doc.book.cover.imgH = 0; fillFields(); changed(true); };
      im.src = u;
    });
  });
  function clearCover() { doc.meta.coverImage = ''; doc.book.cover.imgW = doc.book.cover.imgH = 0; $('coverInfo').textContent = 'No image.'; $('bcoverInfo').textContent = 'No photo yet.'; $('ccoverInfo').textContent = 'No image yet.'; paintCover(); changed(true); }
  $('coverClear').addEventListener('click', clearCover);
  $('ccoverPick').addEventListener('click', function () { $('coverFile').click(); });
  $('ccoverClear').addEventListener('click', clearCover);

  // ------------------------------------------------------------------ the eBook cover
  var measureCtx = document.createElement('canvas').getContext('2d');
  function measure(text, font) { measureCtx.font = font; return measureCtx.measureText(text).width; }
  function paintCover() {
    if (!doc || doc.meta.kind !== 'book') return;
    var box = $('coverPreview'); if (!box) return;
    box.innerHTML = WP.coverSvg(doc, { idPrefix: 'cvp', measure: measure });
    var art = doc.book.cover.layout === 'art';
    Array.prototype.forEach.call(document.querySelectorAll('.sliders input'), function (r) { r.disabled = !doc.meta.coverImage && r.getAttribute('data-k') !== 'book.cover.shade'; });
    $('coverHint').textContent = art ? 'The image is used as it is, with no text over it: make sure it carries the title. An upright image about 1600 × ' + WP.coverSize(doc).h + ' pixels fits this page size exactly.'
      : 'Drag the sliders to place the image. For a finished cover made elsewhere, choose the last layout. An upright image about 1600 × ' + WP.coverSize(doc).h + ' pixels fits this page size best.';
  }
  // The page's own font files, as @font-face rules and as bytes, for the cover image and the ePUB.
  function fontRules(families) {
    var css = $('fonts').textContent, out = [], re = /@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+);[^}]*?base64,([A-Za-z0-9+\/=]+)\)[^}]*?unicode-range:([^}]*)\}/g, mm;
    while ((mm = re.exec(css))) if (families.indexOf(mm[1]) !== -1) out.push({ family: mm[1], style: mm[2], weight: +mm[3], b64: mm[4], range: mm[5], css: mm[0] });
    return out;
  }
  function b64bytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  // Draws the cover to a canvas: a JPEG for the ePUB and for saving. Resolves to null if the
  // browser will not allow it, and the ePUB then carries the cover as a drawing (SVG).
  function coverJpeg() {
    var css = fontRules(WP.coverFamilies(doc)).map(function (r) { return r.css; }).join('');
    var size = WP.coverSize(doc), svg = WP.coverSvg(doc, { standalone: true, fontCss: css, idPrefix: 'cvx', measure: measure });
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        // Fonts inside an SVG image can take a moment to be ready; draw once they have had it.
        setTimeout(function () {
          try {
            var c = document.createElement('canvas'); c.width = size.w; c.height = size.h;
            var g = c.getContext('2d'); g.fillStyle = doc.book.cover.bg; g.fillRect(0, 0, size.w, size.h); g.drawImage(img, 0, 0, size.w, size.h);
            c.toBlob(function (b) { if (!b) { resolve(null); return; } b.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, function () { resolve(null); }); }, 'image/jpeg', 0.9);
          } catch (e) { resolve(null); }
        }, 150);
      };
      img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  $('coverSave').addEventListener('click', function () {
    setStatus('Drawing the cover…');
    coverJpeg().then(function (bytes) {
      if (!bytes) { setStatus('This browser would not draw the cover as an image. Try Chrome or Edge.', true); return; }
      var name = (WP.slug(String(doc.meta.title || 'book').replace(/[\[\]]/g, '')).slice(0, 60) || 'book') + '-cover.jpg';
      giveFile(name, bytes, 'image/jpeg').then(function (ok) { setStatus(ok ? 'Saved ' + name + '.' : 'The file could not be saved from this view.', !ok); });
    });
  });
  $('bcoverPick').addEventListener('click', function () { $('coverFile').click(); });
  $('bcoverClear').addEventListener('click', function () { doc.meta.coverImage = ''; $('bcoverInfo').textContent = 'No photo yet.'; changed(true); });

  // ------------------------------------------------------------------ authors
  function renderAuthors() {
    var box = $('authorList'), focusName = null; box.textContent = '';
    doc.authors.forEach(function (a, i) {
      var card = document.createElement('div'); card.className = 'author';
      var top = document.createElement('div'); top.className = 'top';
      var num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1);
      var name = document.createElement('input'); name.type = 'text'; name.className = 'nm'; name.value = a.name; name.placeholder = 'Name, as it should print';
      name.setAttribute('aria-label', 'Author ' + (i + 1) + ' name');
      name.addEventListener('input', function () { a.name = name.value; changed(); });
      var btn = function (label, title, fn, dis) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small quiet'; b.textContent = label; b.title = title; b.disabled = !!dis; b.addEventListener('click', fn); return b; };
      var move = function (d) { return function () { var j = i + d; doc.authors.splice(i, 1); doc.authors.splice(j, 0, a); renderAuthors(); changed(true); var c = $('authorList').children[j]; if (c) c.querySelector('.nm').focus(); }; };
      var up = btn('\u2191', 'Move up', move(-1), i === 0), down = btn('\u2193', 'Move down', move(1), i === doc.authors.length - 1);
      up.setAttribute('aria-label', 'Move ' + (a.name || 'author ' + (i + 1)) + ' up'); down.setAttribute('aria-label', 'Move ' + (a.name || 'author ' + (i + 1)) + ' down');
      var del = btn('Remove', 'Remove this author', null); del.classList.add('danger');
      var armed = false;
      del.addEventListener('click', function () {
        if (!armed) { armed = true; del.textContent = 'Click again to remove'; setTimeout(function () { armed = false; del.textContent = 'Remove'; }, 3000); return; }
        doc.authors.splice(doc.authors.indexOf(a), 1); renderAuthors(); changed(true);
      });
      top.appendChild(num); top.appendChild(name); top.appendChild(up); top.appendChild(down); top.appendChild(del);
      var bio = document.createElement('textarea'); bio.rows = 3; bio.value = a.bio; bio.placeholder = 'Biography: two sentences on background, and what qualifies this author to write the paper.';
      bio.setAttribute('aria-label', 'Biography of ' + (a.name || 'author ' + (i + 1)));
      bio.addEventListener('input', function () { a.bio = bio.value; changed(); });
      bio.addEventListener('focus', function () { lastTarget = bio; });
      var orgL = document.createElement('label'); orgL.className = 'check';
      var org = document.createElement('input'); org.type = 'checkbox'; org.checked = !!a.org;
      org.addEventListener('change', function () { a.org = org.checked; changed(true); });
      var orgS = document.createElement('span'); orgS.textContent = 'An organization, not a person: keep the name as written';
      orgL.appendChild(org); orgL.appendChild(orgS);
      card.appendChild(top); card.appendChild(bio); card.appendChild(orgL);
      box.appendChild(card);
    });
  }
  $('addAuthor').addEventListener('click', function () {
    doc.authors.push({ name: '', bio: '', org: false }); renderAuthors();
    var cards = $('authorList').children; cards[cards.length - 1].querySelector('.nm').focus();
  });

  // ------------------------------------------------------------------ visuals
  var KIND_HELP = {
    bar: 'One row per column: a label, then a value. Add more value columns to compare series. Paste from a spreadsheet, or type with commas; write 1200, not 1,200.',
    hbar: 'One row per bar: a label, then a value. Long labels read better here than in a column chart.',
    line: 'One row per point in time: a label, then one value per line. A header row names the lines.',
    table: 'One row per line of the table, cells separated by commas or tabs. Put a cell that contains a comma in "quotation marks".',
    timeline: 'One event per line: the date, a comma, then what happened.',
    stats: 'Up to four lines: the number, a comma, then what it measures.',
    image: 'A map, a screenshot, or a photo. Give its source.'
  };
  (function () {
    var box = $('addVisual');
    Object.keys(WP.VISUAL_KINDS).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = '+ ' + WP.VISUAL_KINDS[k].label;
      b.addEventListener('click', function () {
        var base = WP.slug(WP.VISUAL_KINDS[k].label).split('-')[0] || 'visual', n = 1, id;
        do { id = base + '-' + n++; } while (doc.visuals.some(function (v) { return v.id === id; }));
        doc.visuals.push({ id: id, kind: k, title: '', subtitle: '', source: '', note: '', data: '', highlight: '', image: '', wide: k === 'table' ? false : false });
        renderVisualList(); changed();
        var cards = $('visList').querySelectorAll('.card'); var last = cards[cards.length - 1]; if (last) { last.scrollIntoView({ block: 'nearest' }); last.querySelector('input').focus(); }
      });
      box.appendChild(b);
    });
  })();
  function vfield(card, v, key, label, type, attrs) {
    var f = document.createElement('div'); f.className = 'field';
    var id = 'v-' + Math.random().toString(36).slice(2);
    var lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = label; f.appendChild(lab);
    var el = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') el.type = 'text'; else { el.rows = 5; el.className = 'code'; }
    el.id = id; el.value = v[key] || '';
    Object.keys(attrs || {}).forEach(function (a) { el.setAttribute(a, attrs[a]); });
    el.addEventListener('input', function () { v[key] = el.value; changed(); });
    f.appendChild(el); card.appendChild(f);
    return el;
  }
  function renderVisualList() {
    var list = $('visList'); list.textContent = '';
    doc.visuals.forEach(function (v, i) {
      var card = document.createElement('div'); card.className = 'card';
      var top = document.createElement('div'); top.className = 'top';
      var name = document.createElement('input'); name.type = 'text'; name.value = v.id; name.setAttribute('aria-label', 'Name'); name.style.maxWidth = '180px'; name.style.fontFamily = 'var(--mono)';
      name.addEventListener('change', function () {
        var nv = WP.slug(name.value) || v.id;
        if (nv === 'rating-key') { setStatus('rating-key is the built-in source rating table. Choose another name.', true); name.value = v.id; return; }
        if (nv !== v.id && doc.visuals.some(function (x) { return x.id === nv; })) { setStatus('Another visual already has that name.', true); name.value = v.id; return; }
        var re = new RegExp('\\[\\[\\s*' + v.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\]\\]', 'g');
        doc.body = doc.body.replace(re, '[[' + nv + ']]'); doc.appendix = doc.appendix.replace(re, '[[' + nv + ']]');
        $('t-body').value = doc.body; $('t-appendix').value = doc.appendix;
        v.id = nv; name.value = nv; changed();
      });
      var kind = document.createElement('select'); kind.setAttribute('aria-label', 'Kind'); kind.style.maxWidth = '150px';
      Object.keys(WP.VISUAL_KINDS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = WP.VISUAL_KINDS[k].label; kind.appendChild(o); });
      kind.value = v.kind;
      kind.addEventListener('change', function () { v.kind = kind.value; renderVisualList(); changed(true); });
      var grow = document.createElement('span'); grow.className = 'grow';
      var place = document.createElement('button'); place.type = 'button'; place.className = 'btn small'; place.textContent = 'Place in body';
      place.title = 'Adds [[' + v.id + ']] at the cursor in the body';
      place.textContent = { brief: 'Place in stories', book: 'Place in chapters' }[doc.meta.kind] || 'Place in body';
      place.addEventListener('click', function () { showTab('body'); var ta = $('t-body'); lineStart(ta, '[[' + v.id + ']]', ''); });
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn small quiet danger'; del.textContent = 'Delete';
      var armed = false;
      del.addEventListener('click', function () {
        if (!armed) { armed = true; del.textContent = 'Click again to delete'; setTimeout(function () { armed = false; del.textContent = 'Delete'; }, 3000); return; }
        doc.visuals.splice(doc.visuals.indexOf(v), 1); renderVisualList(); changed(true);
      });
      top.appendChild(name); top.appendChild(kind); top.appendChild(grow); top.appendChild(place); top.appendChild(del);
      card.appendChild(top);
      var hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = KIND_HELP[v.kind]; card.appendChild(hint);
      vfield(card, v, 'title', v.kind === 'stats' ? 'Heading (optional)' : 'Title: state the finding, not the variable');
      if (v.kind !== 'stats') vfield(card, v, 'subtitle', 'Subtitle: unit of measure, date range');
      if (v.kind === 'image') {
        var row = document.createElement('div'); row.className = 'row'; row.style.gridTemplateColumns = 'auto 1fr'; row.style.alignItems = 'center';
        var pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn small'; pick.textContent = v.image ? 'Replace the image' : 'Choose an image';
        var info = document.createElement('span'); info.className = 'hint'; info.textContent = v.image ? 'Image chosen.' : 'No image yet.';
        var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'; file.hidden = true;
        pick.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () { readImage(file.files[0], function (u) { v.image = u; info.textContent = 'Image chosen.'; pick.textContent = 'Replace the image'; changed(true); }); });
        row.appendChild(pick); row.appendChild(info); card.appendChild(row); card.appendChild(file);
      } else {
        vfield(card, v, 'data', 'Data', 'textarea', { spellcheck: 'false', placeholder: v.kind === 'timeline' ? '1993, Event in one line: who did what, and where.' : v.kind === 'stats' ? '41%, What this number measures, with unit and year' : 'Year,Value\n2022,46\n2023,58' });
      }
      if (/^(bar|hbar|line|table)$/.test(v.kind)) vfield(card, v, 'highlight', v.kind === 'table' ? 'Row to highlight (its first cell)' : 'Label to highlight in the accent color');
      vfield(card, v, 'source', 'Source', 'text', { placeholder: 'Source: dataset or document, publisher, year.' });
      if (v.kind !== 'stats') vfield(card, v, 'note', doc.meta.kind === 'paper' ? 'Reading note (in the margin, optional)' : 'Reading note (under the figure, optional)');
      if (v.kind === 'table') {
        var hw = document.createElement('label'); hw.className = 'check';
        var hb = document.createElement('input'); hb.type = 'checkbox'; hb.checked = !v.noHeader;
        hb.addEventListener('change', function () { v.noHeader = !hb.checked; changed(true); });
        hw.appendChild(hb); var hs = document.createElement('span'); hs.textContent = 'The first row is the header'; hw.appendChild(hs); card.appendChild(hw);
      }
      if ((v.kind === 'image' || v.kind === 'table') && doc.meta.kind === 'paper') {
        var w = document.createElement('label'); w.className = 'check';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!v.wide;
        cb.addEventListener('change', function () { v.wide = cb.checked; changed(true); });
        w.appendChild(cb); var sp = document.createElement('span'); sp.textContent = 'Full width, across the margin column'; w.appendChild(sp); card.appendChild(w);
      }
      list.appendChild(card);
    });
  }

  // ------------------------------------------------------------------ sources
  function renderSources() {
    var box = $('srcList'); box.textContent = '';
    $('srcEmpty').hidden = doc.sources.length > 0;
    doc.sources.forEach(function (s) {
      var row = document.createElement('div'); row.className = 'src';
      var key = document.createElement('input'); key.type = 'text'; key.className = 'key'; key.value = s.key; key.setAttribute('aria-label', 'Key');
      key.addEventListener('change', function () {
        var nk = key.value.trim().replace(/^@/, '').replace(/[^\w.:-]/g, '-');
        if (!nk || (nk !== s.key && doc.sources.some(function (x) { return x.key === nk; }))) { key.value = s.key; setStatus('Keys must be unique.', true); return; }
        var re = new RegExp('@' + s.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w.:-]*\\w)', 'g');
        ['body', 'appendix'].forEach(function (k) { doc[k] = doc[k].replace(re, '@' + nk); });
        ['lead', 'findings', 'recommendations'].forEach(function (k) { doc.summary[k] = doc.summary[k].replace(re, '@' + nk); });
        doc.visuals.forEach(function (v) { ['title', 'subtitle', 'source', 'note', 'data'].forEach(function (k) { v[k] = String(v[k] || '').replace(re, '@' + nk); }); });
        doc.authors.forEach(function (a) { a.bio = a.bio.replace(re, '@' + nk); });
        s.key = nk; fillFields(); changed();
      });
      var acts = document.createElement('div'); acts.className = 'acts';
      var edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn small'; edit.textContent = editing === s ? 'Close' : 'Edit';
      edit.title = 'Correct this source here. Every note that cites it follows.';
      edit.addEventListener('click', function () { editing = editing === s ? null : s; renderSources(); if (editing) { var f = $('srcList').querySelector('.sedit input, .sedit select'); if (f) f.focus(); } });
      var cite = document.createElement('button'); cite.type = 'button'; cite.className = 'btn small primary'; cite.textContent = 'Cite';
      cite.title = 'Insert [@' + s.key + '] where your cursor was';
      cite.addEventListener('click', function () {
        var ta = lastTarget && document.contains(lastTarget) ? lastTarget : $('t-body');
        var tab = ta.closest('[data-pane]').getAttribute('data-pane'); showTab(tab);
        insert(ta, '[@' + s.key + ']', '');
        setStatus('Cited @' + s.key + '. Add a page inside the brackets: [@' + s.key + ', p. 12].');
      });
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn small quiet danger'; del.textContent = 'Remove';
      var armedDel = false;
      del.addEventListener('click', function () {
        if (!armedDel) { armedDel = true; del.textContent = 'Click again to remove'; setTimeout(function () { armedDel = false; del.textContent = 'Remove'; }, 3000); return; }
        doc.sources.splice(doc.sources.indexOf(s), 1); renderSources(); changed();
      });
      acts.appendChild(edit); acts.appendChild(cite); acts.appendChild(del);
      var txt = document.createElement('div'); txt.className = 'txt'; txt.textContent = WP.sourceLabel(s) || '(empty: fill it in below)';
      row.appendChild(key); row.appendChild(acts); row.appendChild(txt);
      if (editing === s) row.classList.add('editing');
      box.appendChild(row);
      if (editing === s) box.appendChild(sourceEditor(s, txt));
    });
  }

  // ---- Editing a source inside the builder. The fields are the OSINT Citation Generator's;
  // the full note, the short form, and the generator's checks update as you type.
  var editing = null, snapshot = null;
  var ACCESS = [['paywalled', 'Paywalled'], ['metered paywall', 'Metered paywall'], ['free registration required', 'Free registration required'], ['institutional access', 'Institutional access'], ['region-restricted', 'Region-restricted'], ['app only', 'App only']];
  function sourceEditor(s, txt) {
    var card = document.createElement('div'); card.className = 'sedit';
    if (snapshot === null || snapshot.src !== s) snapshot = { src: s, data: JSON.stringify(s) };
    function field(label, el, hint) {
      var f = document.createElement('div'); f.className = 'field';
      var id = 'se-' + Math.random().toString(36).slice(2); el.id = id;
      var l = document.createElement('label'); l.htmlFor = id; l.textContent = label; f.appendChild(l); f.appendChild(el);
      if (hint) { var h = document.createElement('p'); h.className = 'hint'; h.textContent = hint; f.appendChild(h); }
      return f;
    }
    function input(obj, k, ph, rows) {
      var el = rows ? document.createElement('textarea') : document.createElement('input');
      if (rows) el.rows = rows; else el.type = 'text';
      el.value = obj[k] || ''; if (ph) el.placeholder = ph;
      el.addEventListener('input', function () { obj[k] = el.value; update(); });
      return el;
    }
    function select(obj, k, opts) {
      var el = document.createElement('select');
      opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; el.appendChild(op); });
      el.value = obj[k] || ''; el.addEventListener('change', function () { obj[k] = el.value; update(); });
      return el;
    }
    function row() { var r = document.createElement('div'); r.className = 'row'; Array.prototype.slice.call(arguments).forEach(function (x) { r.appendChild(x); }); return r; }
    var pvFull = document.createElement('div'), pvShort = document.createElement('div'), checks = document.createElement('ul');
    pvFull.className = pvShort.className = 'pv'; checks.className = 'gchecks';
    function update() {
      if (s.kind === 'osint') {
        var p = WP.osintPreview(s.st);
        pvFull.innerHTML = '<span class="k">First citation</span>' + (p.empty ? '<i>Fill in the fields to build the note.</i>' : p.full);
        pvShort.innerHTML = '<span class="k">Later citations</span>' + (p.empty ? '' : p.short);
        checks.innerHTML = p.checks.filter(function (c) { return c.level !== 'note'; }).map(function (c) { return '<li>' + esc(c.msg) + '</li>'; }).join('');
      } else {
        pvFull.innerHTML = '<span class="k">First citation</span>' + esc(s.full);
        pvShort.innerHTML = '<span class="k">Later citations</span>' + esc(s.short || s.full);
      }
      txt.textContent = WP.sourceLabel(s) || '(empty: fill it in below)';
      changed();
    }
    if (s.kind === 'typed') {
      card.appendChild(field('Full citation, as the first note should read', input(s, 'full', '', 3), 'Use *asterisks* for italics.'));
      card.appendChild(field('Short form, for later notes', input(s, 'short', 'Beckley, *Unrivaled*.')));
    } else {
      var st = s.st, info = WP.OSINT_TYPE_INFO[st.type] || WP.OSINT_TYPE_INFO.web;
      var type = select(st, 'type', WP.OSINT_TYPES.map(function (t) { return [t, WP.OSINT_TYPE_INFO[t].label]; }));
      type.addEventListener('change', function () { st.titleStyle = WP.OSINT_TYPE_INFO[st.type].style; renderSources(); });
      card.appendChild(field('Kind of source', type));
      card.appendChild(field('Authors, one per line', input(st, 'authors', 'First name then surname. No named author: the organization, or the outlet plus Staff.', 2)));
      var style = select(st, 'titleStyle', [['quotes', '"Quotes" (short work)'], ['italics', 'Italics (larger work)'], ['plain', 'Plain (no title)']]);
      var tr = row(field('Title', input(st, 'title', 'As the source gives it')), field('Set as', style)); tr.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(0, 1fr)';
      card.appendChild(tr);
      card.appendChild(field(info.loc, input(st, 'location', '')));
      var desc = input(st, 'descType', 'Choose or type'); desc.setAttribute('list', 'descPicks');
      $('descPicks').innerHTML = info.picks.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('');
      card.appendChild(row(field('Description, in the square brackets', desc), field('Details (volume, issue, report number)', input(st, 'descDetails', ''))));
      var rel = select({ v: (st.rating || '').charAt(0) }, 'v', [['', 'Not rated']].concat('ABCDEF'.split('').map(function (x) { return [x, x]; })));
      var cred = select({ v: (st.rating || '').charAt(1) }, 'v', [['', '\u2013']].concat('123456'.split('').map(function (x) { return [x, x]; })));
      var setRating = function () { st.rating = rel.value && cred.value ? rel.value + cred.value : ''; update(); };
      rel.addEventListener('change', setRating); cred.addEventListener('change', setRating);
      card.appendChild(row(field('Reliability of the source', rel), field('Credibility of the information', cred), field('Publisher', input(st, 'publisher', ''))));
      var dk = select(st, 'dateKind', [['', 'Published'], ['updated', 'Last updated'], ['captured', 'Captured (imagery)']]);
      card.appendChild(row(field('Date', input(st, 'date', '2/12/2026, Feb 12 2026, or 2018')), field('This date is when it was', dk), field('Accessed', input(st, 'accessed', ''))));
      card.appendChild(field('Web address or DOI', input(st, 'url', 'https://')));
      card.appendChild(row(field('Page or place cited, by default', input(st, 'locator', '25-27')), field('Commentary (optional)', input(st, 'note', ''))));
      var more = document.createElement('details'), sum = document.createElement('summary'), inner = document.createElement('div');
      sum.textContent = 'More: editors, translation, access, archive, short form'; inner.className = 'inner';
      more.appendChild(sum); more.appendChild(inner);
      inner.appendChild(row(field('Editors, one per line', input(st, 'editors', '', 2)), field('Translators, one per line', input(st, 'translators', '', 2)), field('Contributors, one per line', input(st, 'contributors', '', 2))));
      inner.appendChild(row(field('Title in English', input(st, 'transTitle', '')), field('Original language', input(st, 'origLang', ''))));
      var acc = document.createElement('div'); acc.className = 'access';
      ACCESS.forEach(function (a) {
        var l = document.createElement('label'); l.className = 'check'; var c = document.createElement('input'); c.type = 'checkbox'; c.checked = st.access.indexOf(a[0]) !== -1;
        c.addEventListener('change', function () { st.access = st.access.filter(function (x) { return x !== a[0]; }); if (c.checked) st.access.push(a[0]); update(); });
        var sp = document.createElement('span'); sp.textContent = a[1]; l.appendChild(c); l.appendChild(sp); acc.appendChild(l);
      });
      var af = document.createElement('div'); af.className = 'field'; var al = document.createElement('span'); al.className = 'label'; al.textContent = 'Access'; af.appendChild(al); af.appendChild(acc); inner.appendChild(af);
      var quals = document.createElement('input'); quals.type = 'text'; quals.value = st.quals.join(', '); quals.placeholder = 'peer-reviewed, preprint, leaked';
      quals.addEventListener('input', function () { st.quals = quals.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); update(); });
      inner.appendChild(field('Qualifiers, separated by commas', quals));
      inner.appendChild(row(field('Archive link', input(st, 'archiveUrl', 'https://web.archive.org/...')), field('Archive captured', input(st, 'archiveDate', ''))));
      inner.appendChild(row(field('Short name, for later notes', input(st, 'shortName', 'Worked out from the authors')), field('Short title', input(st, 'shortTitle', 'Worked out from the title'))));
      card.appendChild(more);
    }
    card.appendChild(pvFull); card.appendChild(pvShort); card.appendChild(checks);
    var bar = document.createElement('div'); bar.className = 'row'; bar.style.gridTemplateColumns = 'auto auto 1fr';
    var done = document.createElement('button'); done.type = 'button'; done.className = 'btn small primary'; done.textContent = 'Done';
    done.addEventListener('click', function () {
      // A new source gets its key from what was filled in, until it is cited.
      if (s.fresh) { delete s.fresh; var cited = new RegExp('@' + s.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(doc.body + doc.appendix); if (!cited && s.kind === 'osint') { var others = doc.sources.filter(function (x) { return x !== s; }); s.key = WP.newOsintSource(s.st, others).key; } }
      editing = null; snapshot = null; renderSources(); changed();
    });
    var undo = document.createElement('button'); undo.type = 'button'; undo.className = 'btn small quiet'; undo.textContent = 'Undo these changes';
    undo.addEventListener('click', function () { var old = JSON.parse(snapshot.data); Object.keys(old).forEach(function (k) { s[k] = old[k]; }); renderSources(); changed(true); setStatus('Changes to @' + s.key + ' undone.'); });
    bar.appendChild(done); bar.appendChild(undo); bar.appendChild(document.createElement('span'));
    card.appendChild(bar);
    update();
    return card;
  }
  $('srcNew').addEventListener('click', function () {
    var s = WP.newOsintSource(WP.blankOsint('web'), doc.sources); s.fresh = true;
    doc.sources.unshift(s); editing = s; renderSources(); changed();
    var f = $('srcList').querySelector('.sedit select'); if (f) f.focus();
  });
  $('srcExport').addEventListener('click', function () {
    var n = doc.sources.filter(function (x) { return x.kind === 'osint'; }).length;
    if (!n) { srcSay('There are no OSINT sources to save. Sources added by hand have no fields to save.', true); return; }
    var title = String(doc.meta.title || doc.meta.briefName || 'sources').replace(/[\[\]]/g, '');
    var name = 'sources-' + (WP.slug(title).slice(0, 50) || 'list') + '.json';
    giveFile(name, WP.osintListFile(doc.sources, title)).then(function (ok) { srcSay(ok ? 'Saved ' + n + ' source' + (n === 1 ? '' : 's') + ' to ' + name + '.' : 'The file could not be saved from this view.', !ok); });
  });
  function srcSay(msg, bad) { var e = $('srcMsg'); e.textContent = msg; e.className = 'filemsg' + (bad ? ' bad' : ''); }
  $('srcOpen').addEventListener('click', function () { $('srcPick').click(); });
  $('srcPick').addEventListener('change', function () {
    var files = Array.prototype.slice.call($('srcPick').files), msgs = [], left = files.length;
    files.forEach(function (f) {
      var rd = new FileReader();
      rd.onload = function () {
        var res = WP.importOsintList(String(rd.result), doc.sources);
        if (res.error) msgs.push(f.name + ': ' + res.error);
        else { doc.sources = doc.sources.concat(res.sources); msgs.push(f.name + ': ' + res.sources.length + ' source' + (res.sources.length === 1 ? '' : 's') + ' added' + (res.skipped ? ', ' + res.skipped + ' already here' : '') + '.'); }
        if (--left === 0) { $('srcPick').value = ''; renderSources(); changed(); srcSay(msgs.join(' '), msgs.some(function (m) { return /not|could/.test(m) && !/added/.test(m); })); }
      };
      rd.readAsText(f);
    });
  });
  $('srcAddTyped').addEventListener('click', function () { $('typedForm').hidden = false; $('ty-key').focus(); });
  $('tyCancel').addEventListener('click', function () { $('typedForm').hidden = true; });
  $('tySave').addEventListener('click', function () {
    var k = $('ty-key').value.trim().replace(/^@/, '').replace(/[^\w.:-]/g, '-'), full = $('ty-full').value.trim();
    if (!k || !full) { srcSay('Give the source a key and its full citation.', true); return; }
    if (doc.sources.some(function (x) { return x.key === k; })) { srcSay('Another source already has the key ' + k + '.', true); return; }
    doc.sources.push({ key: k, kind: 'typed', full: full, short: $('ty-short').value.trim() });
    $('ty-key').value = $('ty-full').value = $('ty-short').value = ''; $('typedForm').hidden = true;
    renderSources(); changed(); srcSay('Added @' + k + '.');
  });

  // ------------------------------------------------------------------ layout with Paged.js
  var lastResult = null, pageCount = 0, pageWidth = 816;
  function whenIdle() {
    return new Promise(function (resolve) { (function poll() { if (rendering) setTimeout(poll, 80); else resolve(); })(); });
  }
  function schedule(ms) { clearTimeout(renderTimer); window.__wpbBusy = true; renderTimer = setTimeout(layout, ms); }
  function layout() {
    if (rendering) { renderAgain = true; return Promise.resolve(); }
    rendering = true; $('busy').hidden = false;
    var r;
    try { r = WP.render(doc, { measure: measure }); } catch (e) { rendering = false; $('busy').hidden = true; setStatus('Something went wrong building the paper: ' + e.message, true); return Promise.resolve(); }
    lastResult = r;
    paintChecks(r.problems);
    Array.prototype.forEach.call(document.querySelectorAll('style[data-pagedjs-inserted-styles]'), function (s) { s.remove(); });
    var stage = $('stage'); stage.textContent = '';
    var previewer = new PagedModule.Previewer();
    var isBrief = doc.meta.kind === 'brief', isBook = doc.meta.kind === 'book';
    pageWidth = r.size ? r.size.w : 816;
    return previewer.preview(r.html, [{ 'paper.css': (isBrief ? BRIEF_CSS : isBook ? BOOK_CSS : PAPER_CSS) + '\n' + r.vars }], stage).then(function (flow) {
      pageCount = flow.total;
      Array.prototype.forEach.call(stage.querySelectorAll('.cover-length'), function (el) { el.textContent = String(flow.total); });
      var pages = $('pages'); pages.textContent = '';
      var holder = stage.querySelector('.pagedjs_pages');
      // Paged.js can leave a filler page (before a chapter that starts on a right-hand page) unmarked;
      // marked blank, it loses its running head and page number, as a blank page should.
      if (isBook && holder) Array.prototype.forEach.call(holder.querySelectorAll('.pagedjs_page'), function (pg) {
        var c = pg.querySelector('.pagedjs_page_content');
        if (c && !c.textContent.trim() && !c.querySelector('img, svg, table, hr')) pg.classList.add('pagedjs_blank_page');
      });
      if (holder) pages.appendChild(holder);
      fit();
      var sumPages = Array.prototype.filter.call(pages.querySelectorAll('.pagedjs_page'), function (pg) { var sec = pg.querySelector('section.summary'); return sec && sec.textContent.trim(); }).length;
      if (sumPages > 1) paintChecks(r.problems.concat([{ level: 'check', msg: 'The executive summary runs to ' + sumPages + ' pages. The template keeps it to one.', where: 'summary' }]));
      $('viewStats').innerHTML = isBook
        ? '<b>' + flow.total + '</b> pages · <b>' + r.stats.chapters + '</b> ' + (r.stats.chapters === 1 ? 'chapter' : 'chapters') + ' · <b>' + r.stats.words.toLocaleString() + '</b> words · <b>' + r.stats.notes + '</b> ' + (r.stats.notes === 1 ? 'note' : 'notes') + ' · <b>' + r.stats.cited + '</b> ' + (r.stats.cited === 1 ? 'source' : 'sources')
        : isBrief
        ? '<b>' + flow.total + '</b> pages · <b>' + r.stats.stories + '</b> ' + (r.stats.stories === 1 ? 'story' : 'stories') + ' · <b>' + r.stats.words.toLocaleString() + '</b> words · <b>' + r.stats.cited + '</b> sources'
        : '<b>' + flow.total + '</b> pages · <b>' + r.stats.words.toLocaleString() + '</b> words · <b>' + r.stats.notes + '</b> notes · <b>' + r.stats.figures + '</b> figures and tables';
    }).catch(function (e) { setStatus('The pages could not be laid out: ' + (e && e.message ? e.message : e), true); }).then(function () {
      rendering = false; $('busy').hidden = true;
      if (renderAgain) { renderAgain = false; schedule(50); } else window.__wpbBusy = false;
      window.__wpbRendered = (window.__wpbRendered || 0) + 1;
    });
  }
  function fit() {
    var w = $('scroller').clientWidth - 40, z = Math.min(1, Math.max(0.3, w / pageWidth));
    $('pages').style.zoom = String(z);
  }
  window.addEventListener('resize', function () { fit(); });
  var WHERE = { paper: 'paper', summary: 'summary', body: 'body', visuals: 'visuals', sources: 'sources', back: 'back', cover: 'cover', appendix: 'appendix' };
  function paintChecks(list) {
    var ul = $('checks'); ul.textContent = '';
    list.forEach(function (x) {
      var li = document.createElement('li'), tag = document.createElement('span'), b = document.createElement('button');
      tag.className = 'tag ' + x.level; tag.textContent = x.level; b.type = 'button'; b.textContent = x.msg;
      b.addEventListener('click', function () { if (WHERE[x.where]) showTab(WHERE[x.where]); });
      li.appendChild(tag); li.appendChild(b); ul.appendChild(li);
    });
  }

  // ------------------------------------------------------------------ files and printing
  var inViewer = !!(window.claude && typeof window.claude.use === 'function'), dl = Promise.resolve(null);
  if (inViewer) { try { dl = Promise.resolve(window.claude.use('downloads')).catch(function () { return null; }); } catch (e) {} }
  function giveFile(name, data, type) {
    var blob = new Blob([data], { type: type || 'application/json' });
    if (inViewer) return dl.then(function (d) { return d ? d.save({ filename: name, data: blob }).then(function () { return true; }, function () { return false; }) : false; });
    try { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); return Promise.resolve(true); }
    catch (e) { return Promise.resolve(false); }
  }
  function fileName() {
    if (doc.meta.kind === 'book') return (WP.slug(String(doc.meta.title || 'book').replace(/[\[\]]/g, '')).slice(0, 60) || 'book') + '.json';
    if (doc.meta.kind === 'brief') return (WP.slug('brief-' + (doc.meta.number || '') + '-' + String(doc.meta.briefName || '').replace(/[\[\]]/g, '')).slice(0, 60) || 'brief') + '.json';
    var base = WP.slug((doc.meta.number ? 'wp-' + doc.meta.number + '-' : '') + (doc.meta.shortTitle || doc.meta.title || 'white-paper').replace(/[\[\]]/g, '')).slice(0, 60) || 'white-paper';
    return base + '.json';
  }
  $('saveBtn').addEventListener('click', function () {
    var name = fileName();
    giveFile(name, WP.projectFile(doc)).then(function (ok) { setStatus(ok ? 'Saved ' + name + '.' : 'The file could not be saved from this view.', !ok); });
  });
  $('openBtn').addEventListener('click', function () { $('openPick').click(); });
  $('openPick').addEventListener('change', function () {
    var f = $('openPick').files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      $('openPick').value = '';
      var res = WP.parseProject(String(rd.result));
      if (res.error) { setStatus(res.error, true); return; }
      doc = res.doc; fillFields(); changed(true); setStatus('Opened ' + f.name + '.');
    };
    rd.readAsText(f);
  });
  var newArmed = false;
  $('newBtn').addEventListener('click', function () {
    var b = $('newBtn'), k = doc.meta.kind;
    if (!newArmed) { newArmed = true; b.textContent = 'Click again: this clears the current ' + k; setTimeout(function () { newArmed = false; $('newBtn').textContent = 'New ' + doc.meta.kind; }, 4000); return; }
    newArmed = false; b.textContent = 'New ' + k;
    editing = null; doc = starterOf(k); fillFields(); changed(true); showTab('paper'); setStatus('Started a new ' + k + ' from the template. Save a project file first if you need the old one.');
  });
  // The ePUB: the cover drawn as a JPEG, the book's typefaces, and every chapter as its own file.
  var EPUB_FACES = { garamond: ['Garamond Body', 'Garamond Display'], plex: ['Plex Serif', 'Plex Sans Cond', 'Plex Mono'] };
  $('epubBtn').addEventListener('click', function () {
    if (doc.meta.kind !== 'book') return;
    if (!doc.book.bookId) { doc.book.bookId = uuid(); changed(); }
    setStatus('Building the ePUB…');
    coverJpeg().then(function (jpeg) {
      var fonts = fontRules(EPUB_FACES[doc.book.face]).map(function (f) { return { family: f.family, style: f.style, weight: f.weight, range: f.range, data: b64bytes(f.b64) }; });
      var bytes;
      try { bytes = WP.epub(doc, { cover: jpeg ? { data: jpeg, type: 'image/jpeg' } : null, fonts: fonts, css: EPUB_CSS, measure: measure }); }
      catch (e) { setStatus('The ePUB could not be built: ' + e.message, true); return; }
      var name = fileName().replace(/\.json$/, '.epub');
      giveFile(name, bytes, 'application/epub+zip').then(function (ok) {
        setStatus(ok ? 'Saved ' + name + (jpeg ? '.' : '. The cover went in as a drawing, since this browser would not make it an image.') : 'The file could not be saved from this view.', !ok);
      });
    });
  });
  $('printBtn').addEventListener('click', function () {
    clearTimeout(renderTimer);
    var go = function () {
      if (!pageCount) { setStatus('The pages are not ready yet.', true); return; }
      setStatus('In the print dialog, choose Save as PDF, and turn on Background graphics if the page color is missing.');
      // The PDF takes its file name from the page title.
      var was = document.title, t = String(doc.meta.kind === 'brief' ? (doc.meta.briefName + ' ' + doc.meta.number) : doc.meta.title || '').replace(/[\[\]*]/g, '').replace(/[\\/:?"<>|]+/g, ' ').trim();
      if (t) { document.title = t; setTimeout(function () { document.title = was; }, 1500); }
      try { window.print(); } catch (e) { setStatus('Printing is blocked in this view. Open the page in its own browser tab and try again.', true); }
    };
    whenIdle().then(function () { return layout(); }).then(go);
  });

  window.addEventListener('pagehide', function () { clearTimeout(saveTimer); store(K_DOC, doc); });

  // ------------------------------------------------------------------ theme
  ['themeAuto', 'themeLight', 'themeDark'].forEach(function (id) {
    $(id).addEventListener('change', function () { var v = $(id).value; store(K_THEME, v); if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); });
  });
  var th = load(K_THEME); if (th === 'light' || th === 'dark') $(th === 'light' ? 'themeLight' : 'themeDark').checked = true;

  // ------------------------------------------------------------------ boot
  var saved = load(K_DOC);
  doc = saved ? WP.normalize(saved) : bookStarter();
  if (doc.meta.kind === 'book' && !doc.book.bookId) doc.book.bookId = uuid();
  fillFields();
  var tab = load(K_TAB); showTab(typeof tab === 'string' && document.querySelector('[data-pane="' + tab + '"]') ? tab : 'paper');
  lastTarget = $('t-body');
  var fontsReady = document.fonts && document.fonts.load ? Promise.all(['400 16px "Plex Serif"', 'italic 400 16px "Plex Serif"', '600 16px "Plex Serif"', '700 40px "Plex Sans Cond"', '600 22px "Plex Sans Cond"', '400 12px "Plex Mono"', '700 12px "Plex Mono"', '400 16px "Garamond Body"', 'italic 400 16px "Garamond Body"', '600 16px "Garamond Body"', '600 30px "Garamond Display"', '500 60px "Garamond Display"', '500 16px "Plex Sans Cond"', '500 12px "Plex Mono"'].map(function (f) { return document.fonts.load(f); })) : Promise.resolve();
  fontsReady.then(function () { paintCover(); layout(); }, function () { layout(); });
})();
