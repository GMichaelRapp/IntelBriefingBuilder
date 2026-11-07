/*
 * White Paper Builder core: turns a paper (a plain JavaScript object, saved as a project
 * file) into HTML for Paged.js to lay out as printed pages. No page, no network: the
 * tests run this directly.
 *
 * Citations come from OSINT Citation Generator list files and are formatted by that
 * tool's own core (OSINT), which the page loads before this file: the first citation of
 * a source is given in full, later ones in short form.
 */
var WP = (function () {
  'use strict';
  var CITER = typeof OSINT !== 'undefined' ? OSINT : null;
  function useCiter(c) { CITER = c; }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // The OSINT Citation Generator's source types and saved fields (list file format 2).
  var OSINT_TYPES = ['book', 'journal', 'news', 'chapter', 'web', 'report', 'social', 'video', 'archival', 'live', 'imagery', 'ai'];
  var OSINT_KEYS = ['lead', 'authors', 'editors', 'translators', 'contributors', 'title', 'titleStyle', 'transTitle', 'origLang', 'transBy', 'location', 'descType', 'descDetails',
    'accessNote', 'rating', 'publisher', 'date', 'dateKind', 'accessed', 'url', 'archiveUrl', 'archiveDate', 'locator', 'note', 'shortName', 'shortTitle'];
  // Grades and their meanings in the words of the OSINT Style Guide, version 1.5.
  var RATING_KEY = {
    rel: [['A', 'Highly Reliable', 'Long track record, direct access, transparent method. Errors are rare and corrected.'],
      ['B', 'Usually Reliable', 'Generally sound, but with known institutional framing, incentives, or occasional error.'],
      ['C', 'Fairly Reliable', 'Mixed or short record. Sometimes right, sometimes not. Requires corroboration.'],
      ['D', 'Not Usually Reliable', 'More often wrong than right, or method is opaque. Use only with strong corroboration.'],
      ['E', 'Unreliable', 'Demonstrated pattern of error or deliberate distortion. Treat as a claim about the source, not the world.'],
      ['F', 'Unknown', 'No basis on which to judge. Anonymous, new, or unattributable.']],
    cred: [['1', 'Confirmed', 'Corroborated by independent sources or direct evidence.'],
      ['2', 'Probable', 'Consistent with other reporting; not independently confirmed.'],
      ['3', 'Possible', 'Plausible and not contradicted, but uncorroborated.'],
      ['4', 'Doubtful', 'In tension with better-supported information.'],
      ['5', 'Improbable', 'Contradicted by evidence, or internally incoherent.'],
      ['6', 'Unknown', 'No basis for judging the claim either way.']]
  };
  var VISUAL_KINDS = {
    bar: { label: 'Column chart', fig: 'figure' },
    hbar: { label: 'Bar chart', fig: 'figure' },
    line: { label: 'Line chart', fig: 'figure' },
    table: { label: 'Table', fig: 'table' },
    timeline: { label: 'Timeline', fig: 'figure' },
    stats: { label: 'Key numbers', fig: '' },
    image: { label: 'Image or map', fig: 'figure' }
  };

  // ------------------------------------------------------------------ small helpers
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lines(s) { return String(s == null ? '' : s).split(/\r?\n/).map(clean).filter(Boolean); }
  function words(s) { var t = clean(String(s || '').replace(/[#*>\[\]^@{}]/g, ' ')); return t ? t.split(' ').length : 0; }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function letter(n) { return String.fromCharCode(65 + n); }
  function safeUrl(u) { u = clean(u); return /^(https?:|mailto:)/i.test(u) ? u : ''; }
  function safeImage(u) { return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+\/=\s]+$/.test(String(u || '')) ? String(u).replace(/\s/g, '') : ''; }
  function slug(s) { return clean(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // Inline formatting inside an already-escaped string: **bold**, *italic*, [text](url).
  function fmt(escaped) {
    return escaped
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, function (m, t, u) { return '<a href="' + u.replace(/"/g, '%22') + '">' + t + '</a>'; })
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1<i>$2</i>');
  }
  function fmtText(s) { return fmt(esc(smart(s))); }
  // Typographer's quotes and apostrophes: "a" -> “a”, it's -> it’s.
  function smart(s) {
    return String(s == null ? '' : s)
      .replace(/(^|[\s(\[{\u2014\u2013\/-])"/g, '$1\u201C').replace(/"/g, '\u201D')
      .replace(/(^|[\s(\[{\u2014\u2013\/-])'/g, '$1\u2018').replace(/'/g, '\u2019');
  }
  // The same, applied only to the text between tags of a finished HTML string.
  function smartHtml(h) { return String(h).split(/(<[^>]*>)/).map(function (part, i) { return i % 2 ? part : smart(part); }).join(''); }

  // ------------------------------------------------------------------ sources
  function surnameOf(name) {
    var n = clean(name);
    if (!n) return '';
    if (n.indexOf(',') !== -1) return n.split(',')[0];
    var w = n.split(' ');
    return w.length > 1 && !/\b(Staff|Department|Ministry|Institute|University|Corporation|Council|Bureau|Service|Office|Agency|News|Organization|Press|Group|Center|Centre)\b/.test(n) ? w[w.length - 1] : w[0];
  }
  var STOP = /^(a|an|the|of|on|in|and|for|to|how|why|what|is|are|at|by|with)$/i;
  function keyFor(st, taken) {
    var who = surnameOf(lines(st.authors)[0] || st.publisher || st.location || '');
    if (STOP.test(who)) who = (clean(lines(st.authors)[0] || st.publisher || st.location || '').split(' ').filter(function (w) { return !STOP.test(w); })[0] || '');
    var tw = clean(st.title).replace(/["“”'’]/g, '').split(/[\s:]+/).filter(function (w) { return w && !STOP.test(w); })[0] || '';
    var base = slug((who ? who + '-' : '') + tw).split('-').slice(0, 4).join('-') || 'source';
    var k = base, n = 2;
    while (taken[k]) k = base + '-' + n++;
    taken[k] = 1;
    return k;
  }
  // Reads an OSINT Citation Generator list file into sources with short keys for citing.
  function importOsintList(text, existing) {
    if (!CITER) return { error: 'The OSINT citation engine is not loaded.' };
    var res = CITER.parseListFile(text, OSINT_TYPES, OSINT_KEYS);
    if (res.error) return { error: res.error };
    var taken = {}, have = {};
    var texts = {};
    (existing || []).forEach(function (s) { taken[s.key] = 1; if (s.osintId) have[s.osintId] = s; if (s.kind === 'osint') texts[sourceLabel(s)] = 1; });
    var added = [], skipped = 0;
    res.items.forEach(function (it) {
      var label = sourceLabel({ kind: 'osint', st: it.st });
      if (have[it.id] || texts[label]) { skipped++; return; }
      texts[label] = 1;
      added.push({ key: keyFor(it.st, taken), kind: 'osint', osintId: it.id, st: it.st });
    });
    return { name: res.name, sources: added, skipped: skipped };
  }
  function sourceLabel(src) {
    if (src.kind === 'osint' && CITER) return CITER.toPlain(CITER.build(Object.assign({}, src.st, { locator: '' })).seg);
    return clean(src.full);
  }
  // A locator added before the closing period of a typed citation.
  function withLocator(text, loc) {
    var t = clean(text);
    if (!loc) return t;
    if (/\.["\u201D]$/.test(t)) return t.replace(/\.(["\u201D])$/, ',$1') + ' ' + loc + '.';
    return t.replace(/\.$/, '') + ', ' + loc + '.';
  }
  function citeHtml(src, loc, first) {
    if (src.kind === 'osint' && CITER) {
      var st = Object.assign({}, src.st, { locator: loc || '' });
      var seg = first ? CITER.build(st).seg : CITER.shortForms(st).short;
      return linkUrls(smartHtml(CITER.toHTML(seg)));
    }
    var raw = first || !clean(src.short) ? src.full : src.short;
    return linkUrls(fmtText(withLocator(raw, loc && CITER ? CITER.normLocator(loc) : loc)));
  }
  // Web addresses in a citation become links, so a reader of the PDF can open the source.
  // Only text outside tags is touched; a closing period or comma stays outside the link.
  function linkUrls(h) {
    var depth = 0;
    return String(h).split(/(<[^>]*>)/).map(function (part, i) {
      if (i % 2) { if (/^<a[\s>]/i.test(part)) depth++; else if (/^<\/a>/i.test(part)) depth--; return part; }
      if (depth > 0) return part;
      return part.replace(/\bhttps?:\/\/[^\s<>"\u201C\u201D]+/g, function (u) {
        var tail = (u.match(/[.,;:)\]\u2019]+$/) || [''])[0], href = u.slice(0, u.length - tail.length);
        return href ? '<a class="url" href="' + href.replace(/"/g, '%22') + '">' + href + '</a>' + tail : u;
      });
    }).join('');
  }

  // ------------------------------------------------------------------ inline text with notes and citations
  // ^[note text] is a footnote; [@key, p. 4; @other] cites sources in a footnote of their own,
  // or inline when it sits inside a note. In a brief, a citation prints as a small raised
  // number where it stands, linked to that source's entry in the numbered list at the end
  // (or as nothing at all, when the brief turns the numbers off).
  function matching(s, i) {
    var depth = 0;
    for (var j = i; j < s.length; j++) {
      if (s[j] === '[') depth++;
      else if (s[j] === ']') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  // A citation starts [@key, or [LABEL: @key (as in [ORIGINAL STORY: @key]), or [see @key.
  var CITE_LEAD = /^\[(?:@|(?:[A-Za-z][\w .,'\u2019-]{0,38}:|see also|see|cf\.|compare|e\.g\.,?)\s*@)[A-Za-z0-9]/i;
  function citeEnd(s, i) {
    if (s[i] !== '[' || !CITE_LEAD.test(s.slice(i, i + 48))) return -1;
    var e = s.indexOf(']', i);
    return e > 0 && s.slice(i + 1, e).indexOf('[') === -1 ? e : -1;
  }
  function parseCites(inner) {
    return inner.split(';').map(function (part) {
      var m = part.match(/^\s*(.*?)@([A-Za-z0-9][\w.:-]*)\s*,?\s*(.*?)\s*$/);
      return m ? { prefix: m[1], key: m[2].replace(/[.:]$/, ''), loc: m[3] } : { text: clean(part) };
    });
  }
  function inline(text, ctx, inNote) {
    var s = String(text == null ? '' : text), out = '', buf = '', i = 0;
    function flush() { if (buf) { out += fmtText(buf); buf = ''; } }
    while (i < s.length) {
      if (!inNote && s[i] === '^' && s[i + 1] === '[') {
        var end = matching(s, i + 1);
        if (end > 0) { buf = buf.replace(/\s+$/, ''); flush(); out += ctx.note(inline(s.slice(i + 2, end), ctx, true)); i = end + 1; continue; }
      }
      if (s[i] === '[') {
        var e2 = citeEnd(s, i), i0 = i;
        if (e2 > 0) {
          if (!inNote) buf = buf.replace(/\s+$/, '');
          flush();
          var html = ctx.cite(parseCites(s.slice(i + 1, e2)));
          i = e2 + 1;
          if (inNote) {
            // The note's own punctuation follows: drop the citation's final period, or, after a
            // closing quotation mark (."), drop the period typed after the brackets instead.
            if (/\.$/.test(html)) html = html.replace(/\.$/, '');
            else if (/\.\u201D$/.test(html.replace(/<[^>]+>/g, '')) && s[i] === '.') i++;
            out += html;
          } else if (!ctx.silent) out += ctx.note(html);
          else if (ctx.mark) out += ctx.mark(parseCites(s.slice(i0 + 1, e2)));
          continue;
        }
      }
      buf += s[i++];
    }
    flush();
    return out;
  }

  // ------------------------------------------------------------------ blocks
  // # section, ## subsection, ### minor heading, > quotation, !> key point, >> margin note,
  // ?> why it matters (a bare ?> line starts a new paragraph inside the box),
  // - bullets, 1. numbers, {R1} labeled item, [[visual-id]], [[rating-key]], --- new page.
  function blocks(md) {
    var out = [], para = [], last = null;
    function flush() { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = []; } last = null; }
    String(md || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      var line = raw.trim(), m;
      if (!line) { flush(); return; }
      if ((m = line.match(/^(#{1,3})\s+(.+)$/))) { flush(); out.push({ t: 'h', level: m[1].length, text: m[2] }); return; }
      if ((m = line.match(/^\[\[\s*([\w.-]+)\s*\]\]$/))) { flush(); out.push({ t: 'visual', id: m[1] }); return; }
      if (/^-{3,}$/.test(line)) { flush(); out.push({ t: 'break' }); return; }
      if (/^(\*\s*){3,}$/.test(line) || line === '⁂') { flush(); out.push({ t: 'scene' }); return; }
      var kinds = [[/^\?>\s?(.*)$/, 'matter'], [/^!>\s?(.*)$/, 'key'], [/^>>\s?(.*)$/, 'side'], [/^>\s?(.*)$/, 'quote']];
      for (var k = 0; k < kinds.length; k++) {
        if ((m = line.match(kinds[k][0]))) {
          if (para.length) flush();
          var kt = kinds[k][1];
          if (last && last.t === kt) {
            if (kt === 'matter' && !m[1]) last.text += '\n\n';
            else last.text += (!last.text || /\n\n$/.test(last.text) ? '' : ' ') + m[1];
          } else { last = { t: kt, text: m[1] }; out.push(last); }
          return;
        }
      }
      if ((m = line.match(/^[-*•]\s+(.+)$/)) || (m = line.match(/^(\d+)[.)]\s+(.+)$/))) {
        var ordered = m.length === 3, item = ordered ? m[2] : m[1];
        if (para.length) flush();
        var t = ordered ? 'ol' : 'ul';
        if (last && last.t === t) last.items.push(item);
        else { last = { t: t, items: [item], start: ordered ? +m[1] : 1 }; out.push(last); }
        return;
      }
      if ((m = line.match(/^\{([^}]{1,24})\}\s*(.*)$/))) {
        if (para.length) flush();
        if (last && last.t === 'labeled') last.items.push({ label: m[1], text: m[2] });
        else { last = { t: 'labeled', items: [{ label: m[1], text: m[2] }] }; out.push(last); }
        return;
      }
      if (last && (last.t === 'ul' || last.t === 'ol')) { last.items[last.items.length - 1] += ' ' + line; return; }
      if (last && last.t === 'labeled') { last.items[last.items.length - 1].text += ' ' + line; return; }
      if (last) last = null;
      para.push(line);
    });
    flush();
    return out;
  }

  // ------------------------------------------------------------------ data for visuals
  function parseNumber(s) {
    var t = clean(s).replace(/[,\s$€£¥]/g, '').replace(/%$/, '');
    return /^[-+−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? parseFloat(t.replace('−', '-')) : null;
  }
  function splitRow(line, d) {
    if (d === '|') return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(clean);
    if (d === '\t') return line.split('\t').map(clean);
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === d) { out.push(clean(cur)); cur = ''; }
      else cur += c;
    }
    out.push(clean(cur));
    return out;
  }
  // Pasted CSV, tab-separated (from a spreadsheet), or a Markdown table. A first row with
  // words where the numbers go is a header.
  function parseData(text, header) {
    var rows = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() && !/^\s*\|?\s*:?-{2,}/.test(l); });
    if (!rows.length) return { head: null, rows: [] };
    var f = rows[0], d = f.indexOf('\t') !== -1 ? '\t' : /^\s*\|/.test(f) ? '|' : (f.indexOf(';') !== -1 && f.indexOf(',') === -1) ? ';' : ',';
    var cells = rows.map(function (r) { return splitRow(r, d); });
    var head = null;
    if (header === true && cells.length > 1) head = cells.shift();
    else if (header === undefined && cells.length > 1 && cells[0].slice(1).some(function (c) { return c && parseNumber(c) === null; }) && cells[1].slice(1).some(function (c) { return parseNumber(c) !== null; })) head = cells.shift();
    return { head: head, rows: cells };
  }
  function series(data) {
    var n = Math.max.apply(null, data.rows.map(function (r) { return r.length; }).concat([2])) - 1, out = [];
    for (var j = 1; j <= n; j++) out.push({ name: data.head ? data.head[j] || '' : '', values: data.rows.map(function (r) { return parseNumber(r[j]); }) });
    return out.filter(function (s) { return s.values.some(function (v) { return v !== null; }); });
  }
  function fmtNum(v) {
    if (v === null || v === undefined || isNaN(v)) return '';
    var a = Math.abs(v), dp = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    var s = v.toFixed(dp).replace(/\.0+$|(\.\d*?)0+$/, '$1');
    var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.').replace(/^-/, '−');
  }
  function niceStep(range, target) {
    var raw = range / target, e = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function scale(min, max) {
    if (min === max) { max = max === 0 ? 1 : max * 1.1; min = Math.min(0, min); }
    var step = niceStep(max - min, 4), lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
    for (var v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
    return { lo: lo, hi: hi, ticks: ticks };
  }

  // ------------------------------------------------------------------ charts (SVG)
  var INK = '#15181B', GRAY = '#565C61', RULE = '#C2C6BF';
  function svgText(x, y, s, o) {
    o = o || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + ' font-family="' + (o.serif ? 'Plex Serif, serif' : 'Plex Mono, monospace') + '" font-size="' + (o.size || 11) + '"'
      + (o.bold ? ' font-weight="700"' : '') + ' fill="' + (o.fill || GRAY) + '">' + esc(s) + '</text>';
  }
  function trunc(s, n) { s = clean(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function palette(accent) { return [INK, accent, '#8A9096', '#7A3B2E']; }
  function legend(ss, accent, W) {
    if (ss.length < 2) return { svg: '', h: 0 };
    var x = 0, out = '', pal = palette(accent);
    ss.forEach(function (s, i) {
      out += '<rect x="' + x + '" y="2" width="14" height="4" fill="' + pal[i % 4] + '"/>' + svgText(x + 20, 9, trunc(s.name || 'Series ' + (i + 1), 28), { fill: INK });
      x += 34 + Math.min(28, (s.name || 'Series 1').length) * 6.6;
    });
    return { svg: out, h: 22 };
  }
  function chartSvg(v, accent) {
    var data = parseData(v.data), ss = series(data), W = 512, kind = v.kind;
    var labels = data.rows.map(function (r) { return r[0] || ''; });
    if (!ss.length || !labels.length) return '<div class="vempty">Paste data under Data to draw this chart.</div>';
    var hl = clean(v.highlight).toLowerCase(), pal = palette(accent), lg = legend(ss, accent, W);
    var all = []; ss.forEach(function (s) { s.values.forEach(function (x) { if (x !== null) all.push(x); }); });
    var sc = scale(Math.min(0, Math.min.apply(null, all)), Math.max(0, Math.max.apply(null, all)));
    var out = [], H, top = lg.h + 8;
    if (kind === 'hbar') {
      var rowH = ss.length > 1 ? 14 * ss.length + 10 : 26, lw = 150, cw = W - lw - 48;
      H = top + labels.length * rowH + 26;
      var hx = function (x) { return lw + (x - sc.lo) / (sc.hi - sc.lo) * cw; };
      sc.ticks.forEach(function (t) { out.push('<line x1="' + hx(t).toFixed(1) + '" x2="' + hx(t).toFixed(1) + '" y1="' + top + '" y2="' + (H - 22) + '" stroke="' + RULE + '" stroke-width="0.75"/>' + svgText(hx(t), H - 8, fmtNum(t), { anchor: 'middle' })); });
      labels.forEach(function (lab, i) {
        var y0 = top + i * rowH + 4, hot = hl && lab.toLowerCase() === hl;
        out.push(svgText(lw - 8, y0 + (rowH - 8) / 2 + 4, trunc(lab, 24), { anchor: 'end', serif: true, size: 12, fill: hot ? accent : INK, bold: hot }));
        ss.forEach(function (s, j) {
          var val = s.values[i]; if (val === null) return;
          var bh = ss.length > 1 ? 12 : rowH - 10, y = y0 + j * (bh + 2), x0 = hx(Math.max(0, sc.lo)), x1 = hx(val);
          out.push('<rect x="' + Math.min(x0, x1).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, Math.abs(x1 - x0)).toFixed(1) + '" height="' + bh + '" fill="' + (ss.length > 1 ? pal[j % 4] : hot ? accent : INK) + '"/>');
          out.push(svgText(Math.max(x0, x1) + 4, y + bh / 2 + 4, fmtNum(val), { fill: hot ? accent : INK }));
        });
      });
      out.push('<line x1="' + hx(Math.max(0, sc.lo)).toFixed(1) + '" x2="' + hx(Math.max(0, sc.lo)).toFixed(1) + '" y1="' + top + '" y2="' + (H - 22) + '" stroke="' + INK + '" stroke-width="1"/>');
    } else {
      H = top + 260 + 30;
      var L = 44, R = 8, ch = 260, cw2 = W - L - R, n = labels.length;
      var y = function (val) { return top + ch - (val - sc.lo) / (sc.hi - sc.lo) * ch; };
      sc.ticks.forEach(function (t) { out.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + RULE + '" stroke-width="0.75"/>' + svgText(L - 6, y(t) + 4, fmtNum(t), { anchor: 'end' })); });
      var every = Math.ceil(n / 12), band = cw2 / n;
      labels.forEach(function (lab, i) {
        if (i % every && i !== n - 1) return;
        var hot = hl && lab.toLowerCase() === hl;
        out.push(svgText(L + band * (i + 0.5), top + ch + 16, trunc(lab, Math.max(4, Math.floor(band * every / 7))), { anchor: 'middle', fill: hot ? accent : GRAY, bold: hot }));
      });
      if (kind === 'line') {
        ss.forEach(function (s, j) {
          var pts = [], col = pal[j % 4];
          s.values.forEach(function (val, i) { if (val !== null) pts.push([L + band * (i + 0.5), y(val), val, i]); });
          out.push('<polyline fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>');
          var lastP = pts[pts.length - 1];
          if (lastP) out.push('<circle cx="' + lastP[0].toFixed(1) + '" cy="' + lastP[1].toFixed(1) + '" r="3" fill="' + col + '"/>' + svgText(Math.min(lastP[0], W - 30), lastP[1] - 8, fmtNum(lastP[2]), { anchor: 'middle', fill: col, bold: true }));
          pts.forEach(function (p) { if (hl && labels[p[3]].toLowerCase() === hl) out.push('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + accent + '"/>' + svgText(p[0], p[1] - 9, fmtNum(p[2]), { anchor: 'middle', fill: accent, bold: true })); });
        });
      } else {
        var gw = band * 0.7, bw = gw / ss.length;
        labels.forEach(function (lab, i) {
          var hot = hl && lab.toLowerCase() === hl;
          ss.forEach(function (s, j) {
            var val = s.values[i]; if (val === null) return;
            var x = L + band * i + (band - gw) / 2 + j * bw, y0 = y(Math.max(0, sc.lo)), y1 = y(val);
            out.push('<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + Math.max(1, bw - (ss.length > 1 ? 1 : 0)).toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + (ss.length > 1 ? pal[j % 4] : hot ? accent : INK) + '"/>');
            if (ss.length === 1 && n <= 12) out.push(svgText(x + bw / 2, Math.min(y0, y1) - 5, fmtNum(val), { anchor: 'middle', fill: hot ? accent : INK, bold: hot }));
          });
        });
      }
      out.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(Math.max(0, sc.lo)).toFixed(1) + '" y2="' + y(Math.max(0, sc.lo)).toFixed(1) + '" stroke="' + INK + '" stroke-width="1"/>');
      out.push('<line x1="' + L + '" x2="' + L + '" y1="' + top + '" y2="' + (top + ch) + '" stroke="' + INK + '" stroke-width="1"/>');
    }
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(clean(v.title) || 'Chart') + '">' + lg.svg + out.join('') + '</svg>';
  }
  function tableHtml(v, ctx) {
    var data = parseData(v.data, !v.noHeader);
    if (!data.rows.length) return '<div class="vempty">Paste the table under Data.</div>';
    var cols = Math.max.apply(null, data.rows.map(function (r) { return r.length; }).concat(data.head ? [data.head.length] : []));
    var num = []; for (var c = 0; c < cols; c++) num.push(c > 0 && data.rows.every(function (r) { return !r[c] || parseNumber(r[c]) !== null || /^[\d\s–-]+$/.test(r[c]); }));
    var hl = clean(v.highlight).toLowerCase();
    var cell = function (s) { return inline(s, ctx, true); };
    var h = '<table class="dtable">';
    if (data.head) h += '<thead><tr>' + data.head.map(function (x, c) { return '<th' + (num[c] ? ' class="n"' : '') + '>' + cell(x) + '</th>'; }).join('') + '</tr></thead>';
    h += '<tbody>' + data.rows.map(function (r) {
      var hot = hl && clean(r[0]).toLowerCase() === hl;
      var row = []; for (var c2 = 0; c2 < cols; c2++) row.push('<td' + (num[c2] ? ' class="n"' : '') + '>' + cell(r[c2] || '') + '</td>');
      return '<tr' + (hot ? ' class="hot"' : '') + '>' + row.join('') + '</tr>';
    }).join('') + '</tbody></table>';
    return h;
  }
  // "March 3, 2022, What happened": the date runs to its year; "1,200, What it measures": the
  // number keeps its thousands separators. Otherwise a tab, or the first comma, divides the line.
  function splitLead(line, kind) {
    var l = clean(line), m;
    if (l.indexOf('\t') !== -1 || /\t/.test(line)) { var t = String(line).split('\t'); return [clean(t[0]), clean(t.slice(1).join(' '))]; }
    if (kind === 'timeline' && (m = l.match(/^(.*?\b\d{3,4}s?\b(?:\s*(?:BC|BCE|AD|CE))?)\s*[,:\u2013\u2014-]\s*(.+)$/))) return [m[1], m[2]];
    if (kind === 'stats' && (m = l.match(/^((?:[^,\s]|,(?=\d{3}(?!\d)))+)\s*,\s*(.+)$/))) return [m[1], m[2]];
    var i = l.indexOf(',');
    return i === -1 ? [l, ''] : [clean(l.slice(0, i)), clean(l.slice(i + 1))];
  }
  function leadRows(text, kind) { return String(text || '').split(/\r?\n/).filter(function (x) { return x.trim(); }).map(function (x) { return splitLead(x, kind); }); }
  function timelineHtml(v, ctx) {
    var rows = leadRows(v.data, 'timeline');
    if (!rows.length) return '<div class="vempty">Add one event per line: date, then what happened.</div>';
    return '<ol class="timeline">' + rows.map(function (r) {
      return '<li><span class="when">' + fmtText(r[0]) + '</span><span class="what">' + inline(r[1], ctx, true) + '</span></li>';
    }).join('') + '</ol>';
  }
  function statsHtml(v, ctx) {
    var rows = leadRows(v.data, 'stats');
    if (!rows.length) return '<div class="vempty">Add one number per line: the number, then what it measures.</div>';
    return '<div class="stats" style="grid-template-columns: repeat(' + Math.min(4, rows.length) + ', minmax(0, 1fr))">' + rows.slice(0, 4).map(function (r) {
      return '<div class="stat"><div class="big">' + fmtText(r[0]) + '</div><div class="what">' + inline(r[1], ctx, true) + '</div></div>';
    }).join('') + '</div>';
  }

  // ------------------------------------------------------------------ the paper
  var PAPER_ACCENT = '#C42A14', BRIEF_ACCENT = '#D9B063', BOOK_ACCENT = '#9E3B22';
  // eBook page sizes, in inches, with the page margins and text size that suit each (px at 96 per inch).
  var TRIMS = {
    '6x9': { w: 6, h: 9, label: '6 × 9 in, trade paperback', m: [62, 52, 70, 64], fs: 15, lh: 22.5 },
    '5.5x8.5': { w: 5.5, h: 8.5, label: '5.5 × 8.5 in, digest', m: [58, 48, 66, 60], fs: 14.5, lh: 21.5 },
    'a5': { w: 5.83, h: 8.27, label: 'A5, 148 × 210 mm', m: [58, 48, 66, 60], fs: 14.5, lh: 21.5 },
    'letter': { w: 8.5, h: 11, label: '8.5 × 11 in, US Letter (easy to print at home)', m: [84, 80, 92, 92], fs: 17, lh: 27 }
  };
  var COVER_LAYOUTS = ['photo', 'band', 'framed', 'type', 'art'];
  // Cover title faces: the family, weight, line height, and a rough width per character
  // (used to fit the title when the page cannot measure text, as in the tests).
  var COVER_FONTS = {
    display: { family: 'Garamond Display', css: "'Garamond Display', 'Cormorant Garamond', Garamond, serif", weight: 600, lh: 1.02, cw: 0.44, small: 'Garamond Body' },
    serif: { family: 'Garamond Body', css: "'Garamond Body', 'EB Garamond', Garamond, Georgia, serif", weight: 400, lh: 1.08, cw: 0.47, small: 'Garamond Body' },
    sans: { family: 'Plex Sans Cond', css: "'Plex Sans Cond', 'Arial Narrow', sans-serif", weight: 700, lh: 1.02, cw: 0.47, small: 'Plex Sans Cond' },
    mono: { family: 'Plex Mono', css: "'Plex Mono', Menlo, monospace", weight: 700, lh: 1.12, cw: 0.6, small: 'Plex Mono' }
  };
  var SMALL_CSS = { 'Garamond Body': "'Garamond Body', 'EB Garamond', Garamond, Georgia, serif", 'Plex Sans Cond': "'Plex Sans Cond', 'Arial Narrow', sans-serif", 'Plex Mono': "'Plex Mono', Menlo, monospace" };
  var SMALL_CW = { 'Garamond Body': 0.47, 'Plex Sans Cond': 0.47, 'Plex Mono': 0.6 };
  var SOURCES_NOTE = 'In order of appearance. Formatted to the OSINT Style Guide v1.5 pattern: Author, “Title,” Location [Description] (Publisher: Date) URL/DOI: Locator.';
  function defaults() {
    return {
      meta: {
        kind: 'paper', briefName: '', colophon: '', citeMarks: true, matterLabel: 'So, why does this matter?', sourcesNote: SOURCES_NOTE,
        series: 'White paper series', masthead: 'White Paper', tagline: 'Cybersecurity\nGeopolitics\nMilitary affairs',
        number: '001', date: '', version: '1.0', versionNote: 'first edition', title: '', subtitle: '', shortTitle: '',
        publisher: '', site: '', url: '', accent: '', paper: 'tinted', coverImage: '', coverCaption: '', sectionBreaks: true
      },
      summary: { lead: '', findings: '', recommendations: '' },
      // Each author: { name, bio, org }. org keeps an organization's name as written in "Cite as".
      authors: [],
      aboutSeries: '',
      body: '', appendix: '',
      back: { include: true, history: '', series: '', license: '' },
      // The eBook: its own front matter, layout choices, ePUB details, and cover design.
      // Title, subtitle, authors, date, publisher, colophon, accent, and cover image are
      // shared with the paper and the brief, under meta and authors.
      book: {
        trim: '6x9', face: 'garamond', para: 'indent', chapterWord: 'Chapter', numStyle: 'word', recto: false, notes: 'foot', halfTitle: true, openers: true,
        dedication: '', epigraph: '', epigraphBy: '',
        copyright: '', edition: '', isbn: '', issn: '', credits: '', typeNote: true, aboutAuthors: true,
        lang: 'en', description: '', subjects: '', series: '', seriesNo: '', bookId: '',
        cover: { layout: 'photo', bg: '#1F2124', ink: '#FFFFFF', valign: 'bottom', align: 'center', shade: 70, font: 'display', scale: 100, upper: false,
          kicker: '', showSub: true, showAuthor: true, showPub: true, focusX: 50, focusY: 50, zoom: 100, imgW: 0, imgH: 0 }
      },
      visuals: [], sources: []
    };
  }
  function normalize(doc) {
    var d = defaults();
    doc = doc && typeof doc === 'object' ? doc : {};
    ['meta', 'summary', 'back'].forEach(function (k) {
      var src = doc[k] && typeof doc[k] === 'object' ? doc[k] : {};
      Object.keys(d[k]).forEach(function (f) { if (typeof src[f] === typeof d[k][f]) d[k][f] = src[f]; });
    });
    if (d.meta.kind !== 'brief' && d.meta.kind !== 'book') d.meta.kind = 'paper';
    var bk = doc.book && typeof doc.book === 'object' ? doc.book : {};
    Object.keys(d.book).forEach(function (f) { if (f !== 'cover' && typeof bk[f] === typeof d.book[f]) d.book[f] = bk[f]; });
    var bc = bk.cover && typeof bk.cover === 'object' ? bk.cover : {};
    Object.keys(d.book.cover).forEach(function (f) {
      var want = typeof d.book.cover[f], v = bc[f];
      if (want === 'number' && v !== '' && v !== null && isFinite(+v)) d.book.cover[f] = +v;
      else if (typeof v === want) d.book.cover[f] = v;
    });
    if (!TRIMS[d.book.trim]) d.book.trim = '6x9';
    if (d.book.face !== 'plex') d.book.face = 'garamond';
    if (d.book.para !== 'block') d.book.para = 'indent';
    if (d.book.notes !== 'end') d.book.notes = 'foot';
    if (['word', 'arabic', 'roman', 'none'].indexOf(d.book.numStyle) === -1) d.book.numStyle = 'word';
    var C0 = d.book.cover;
    if (COVER_LAYOUTS.indexOf(C0.layout) === -1) C0.layout = 'photo';
    if (['top', 'middle', 'bottom'].indexOf(C0.valign) === -1) C0.valign = 'bottom';
    if (C0.align !== 'left') C0.align = 'center';
    if (!COVER_FONTS[C0.font]) C0.font = 'display';
    ['bg', 'ink'].forEach(function (k) { if (!/^#[0-9a-f]{6}$/i.test(C0[k])) C0[k] = k === 'bg' ? '#1F2124' : '#FFFFFF'; });
    C0.shade = Math.max(0, Math.min(100, C0.shade)); C0.scale = Math.max(50, Math.min(150, C0.scale)); C0.zoom = Math.max(100, Math.min(300, C0.zoom));
    C0.focusX = Math.max(0, Math.min(100, C0.focusX)); C0.focusY = Math.max(0, Math.min(100, C0.focusY));
    if (Array.isArray(doc.authors)) d.authors = doc.authors.filter(function (a) { return a && typeof a === 'object'; }).map(function (a) {
      return { name: String(a.name == null ? '' : a.name), bio: String(a.bio == null ? '' : a.bio), org: !!a.org };
    }).filter(function (a) { return clean(a.name) || clean(a.bio); }).slice(0, 40);
    // Projects from before version 1.3 had one author under Paper and one biography on the back page.
    if (!d.authors.length) {
      var oldName = doc.meta && typeof doc.meta.author === 'string' ? doc.meta.author : '', oldBio = doc.back && typeof doc.back.bio === 'string' ? doc.back.bio : '';
      if (clean(oldName) || clean(oldBio)) d.authors = [{ name: oldName, bio: oldBio, org: false }];
    }
    ['aboutSeries', 'body', 'appendix'].forEach(function (k) { if (typeof doc[k] === 'string') d[k] = doc[k]; });
    if (Array.isArray(doc.visuals)) d.visuals = doc.visuals.filter(function (v) { return v && typeof v.id === 'string' && VISUAL_KINDS[v.kind]; }).map(function (v) {
      return { id: v.id.slice(0, 60), kind: v.kind, title: String(v.title || ''), subtitle: String(v.subtitle || ''), source: String(v.source || ''), note: String(v.note || ''),
        data: String(v.data || ''), highlight: String(v.highlight || ''), image: safeImage(v.image), wide: !!v.wide, noHeader: !!v.noHeader };
    });
    if (Array.isArray(doc.sources)) d.sources = doc.sources.filter(function (s) { return s && typeof s.key === 'string' && s.key; }).map(function (s) {
      if (s.kind === 'osint' && s.st && typeof s.st === 'object') {
        var st = {}; OSINT_KEYS.forEach(function (k) { st[k] = typeof s.st[k] === 'string' ? s.st[k] : ''; });
        st.type = OSINT_TYPES.indexOf(s.st.type) !== -1 ? s.st.type : 'web';
        st.access = Array.isArray(s.st.access) ? s.st.access.filter(function (x) { return typeof x === 'string'; }) : [];
        st.quals = Array.isArray(s.st.quals) ? s.st.quals.filter(function (x) { return typeof x === 'string'; }) : [];
        st.shortUseTitle = s.st.shortUseTitle !== false;
        return { key: s.key.slice(0, 60), kind: 'osint', osintId: String(s.osintId || ''), st: st };
      }
      return { key: s.key.slice(0, 60), kind: 'typed', full: String(s.full || ''), short: String(s.short || '') };
    });
    return d;
  }

  function render(input, opts) {
    opts = opts || {};
    var doc = normalize(input), m = doc.meta, brief = m.kind === 'brief';
    var accent = /^#[0-9a-f]{6}$/i.test(m.accent) ? m.accent : brief ? BRIEF_ACCENT : m.kind === 'book' ? BOOK_ACCENT : PAPER_ACCENT;
    var problems = [], notes = 0, srcByKey = {}, seen = {}, usedKeys = {}, order = [], firstLoc = {}, labelOf = {};
    doc.sources.forEach(function (s) { srcByKey[s.key] = s; });
    var visById = {}; doc.visuals.forEach(function (v) { visById[v.id] = v; });
    function problem(level, msg, where) { if (!problems.some(function (p) { return p.msg === msg; })) problems.push({ level: level, msg: msg, where: where || '' }); }
    var ctx = {
      note: function (html) { notes++; var lab = ctx.noteLabel ? ctx.noteLabel(notes) : String(notes); return '<span class="fn"><span class="fn-n">' + lab + '</span> ' + html + '</span><sup class="fn-call' + (/^\d+$/.test(lab) ? '' : ' sym') + '">' + lab + '</sup>'; },
      cite: function (list) {
        return list.map(function (c, n) {
          if (c.text !== undefined) return fmtText(c.text);
          var src = srcByKey[c.key];
          if (!src) { problem('fix', 'No source has the key @' + c.key + '. Check the spelling, or open the list file that has it under Sources.', 'sources'); return '<span class="missing">[@' + esc(c.key) + ']</span>'; }
          usedKeys[c.key] = 1;
          var first = !seen[c.key]; seen[c.key] = 1;
          if (first) { order.push(c.key); firstLoc[c.key] = c.loc; }
          if (c.prefix && /:\s*$/.test(c.prefix) && !labelOf[c.key]) labelOf[c.key] = clean(c.prefix);
          var h = citeHtml(src, c.loc, first);
          if (n < list.length - 1) h = h.replace(/\.(\u201D)?$/, '$1');
          return (c.prefix ? fmtText(c.prefix) : '') + h;
        }).join('; ');
      }
    };
    var figs = [], figN = 0, tabN = 0, appTabN = 0, appFigN = 0, usedVis = {}, toc = [];
    function visualHtml(id, inAppendix, sectionLetter) {
      var v = visById[id];
      if (id === 'rating-key') return ratingKey(inAppendix ? (sectionLetter || 'A') + (++appTabN) : String(++tabN));
      if (!v) { problem('fix', 'There is no visual called [[' + id + ']]. Check its name under Visuals.', 'visuals'); return '<p class="missing">[[' + esc(id) + ']]</p>'; }
      usedVis[id] = 1;
      var kind = VISUAL_KINDS[v.kind], label = '', anchor = 'v-' + slug(id);
      if (kind.fig === 'figure') label = 'Figure ' + (inAppendix ? (sectionLetter || 'A') + (++appFigN) : ++figN);
      else if (kind.fig === 'table') label = 'Table ' + (inAppendix ? (sectionLetter || 'A') + (++appTabN) : ++tabN);
      if (label && clean(v.title)) figs.push({ label: label, title: v.title, anchor: anchor });
      if (label && !clean(v.source) && v.kind !== 'image') problem('check', label + ' (' + (clean(v.title) || id) + ') has no source line. Say where the data comes from.', 'visuals');
      if (v.kind === 'stats' && leadRows(v.data, 'stats').length > 4) problem('check', 'Key numbers ([[' + id + ']]) shows only the first four lines.', 'visuals');
      if (label && v.kind === 'image' && !v.image) problem('fix', label + ' (' + (clean(v.title) || id) + ') has no image yet.', 'visuals');
      var bodyH = v.kind === 'table' ? tableHtml(v, ctx) : v.kind === 'timeline' ? timelineHtml(v, ctx) : v.kind === 'stats' ? statsHtml(v, ctx)
        : v.kind === 'image' ? (v.image ? '<img class="vimg" src="' + v.image + '" alt="' + esc(clean(v.title)) + '">' : '<div class="vempty">Choose an image file under Visuals.</div>')
        : chartSvg(v, accent);
      if (v.kind === 'stats') return '<div class="vis stats-wrap" id="' + anchor + '">' + (clean(v.title) ? '<h4 class="stats-title">' + fmtText(v.title) + '</h4>' : '') + bodyH + (clean(v.source) ? '<div class="stats-src">' + inline(v.source, ctx, true) + '</div>' : '') + '</div>';
      return '<figure class="vis vis-' + v.kind + (v.wide ? ' wide' : '') + '" id="' + anchor + '">'
        + '<figcaption class="gut">' + (label ? '<div class="vlabel">' + label + '</div>' : '') + (clean(v.source) ? '<div class="vsrc">' + inline(v.source, ctx, true) + '</div>' : '') + (clean(v.note) ? '<div class="vnote">' + inline(v.note, ctx, true) + '</div>' : '') + '</figcaption>'
        + '<div class="vbody">' + (clean(v.title) ? '<h4 class="vtitle">' + fmtText(v.title) + '</h4>' : '') + (clean(v.subtitle) ? '<div class="vsub">' + fmtText(v.subtitle) + '</div>' : '') + bodyH + '</div></figure>';
    }
    function ratingKey(n) {
      var label = 'Table ' + n;
      figs.push({ label: label, title: 'Source rating key', anchor: 'v-rating-key' });
      var rows = function (list) { return list.map(function (r) { return '<tr><td class="code">' + r[0] + '</td><td class="mean">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join(''); };
      return '<figure class="vis vis-table rating" id="v-rating-key"><figcaption class="gut"><div class="vlabel">' + label + '</div><div class="vsrc">OSINT Style Guide, version 1.5: Source Reliability &amp; Credibility.</div></figcaption><div class="vbody">'
        + '<h4 class="vtitle">Source rating key</h4>'
        + '<p class="rnote">Ratings go inside a note\u2019s description bracket, as in [Social Media Post; C3]. Two separate things are rated. Letters A\u2013F rate the source: how much confidence its track record, access, and method warrant. Numbers 1\u20136 rate the information: how well the particular claim is corroborated, independent of who is making it.</p>'
        + '<table class="dtable"><thead><tr><th>Grade</th><th>Reliability of the source</th><th>In practice</th></tr></thead><tbody>' + rows(RATING_KEY.rel) + '</tbody></table>'
        + '<table class="dtable"><thead><tr><th>Grade</th><th>Credibility of the information</th><th>In practice</th></tr></thead><tbody>' + rows(RATING_KEY.cred) + '</tbody></table>'
        + '</div></figure>';
    }

    // Body and appendix share one renderer; the appendix numbers A, A.1.
    function flow(md, appendix) {
      var bs = blocks(md), out = [], sec = 0, sub = 0, pendingSide = '', letterNow = '';
      bs.forEach(function (b) {
        var side = pendingSide; pendingSide = '';
        var sideHtml = side ? '<aside class="side">' + side + '</aside>' : '';
        if (b.t === 'h') {
          var text = inline(b.text, ctx, false), plain = plainText(b.text);
          if (b.level === 1) {
            sec++; sub = 0;
            var num = appendix ? letter(sec - 1) : String(sec), id = (appendix ? 'app-' : 'sec-') + num;
            letterNow = num;
            if (appendix) { appTabN = 0; appFigN = 0; }
            var runLabel = appendix ? 'Appendix ' + num : num + ' ' + plain;
            toc.push({ level: 1, num: num, title: appendix ? 'Appendix ' + num + ': ' + plain : plain, anchor: id });
            out.push('<h2 class="sec' + (m.sectionBreaks ? ' brk' : '') + '" id="' + id + '" data-run="' + esc(runLabel) + '"><span class="num">' + num + '</span>' + (appendix ? '<span class="pre">Appendix ' + num + '</span>' : '') + '<span class="t">' + text + '</span></h2>');
          } else if (b.level === 2) {
            sub++;
            var n2 = (sec ? (appendix ? letter(sec - 1) : sec) + '.' : '') + sub, id2 = (appendix ? 'app-' : 'sec-') + (sec ? n2.replace('.', '-') : '0-' + sub);
            toc.push({ level: 2, num: n2, title: plain, anchor: id2 });
            out.push('<h3 class="sub" id="' + id2 + '"><span class="num">' + n2 + '</span>' + text + '</h3>');
          } else out.push('<h4 class="minor">' + text + '</h4>');
          if (sideHtml) out.push(sideHtml);
          return;
        }
        if (b.t === 'side') { pendingSide = inline(b.text, ctx, false); return; }
        if (b.t === 'break') { out.push('<div class="pagebreak"></div>'); return; }
        if (b.t === 'visual') { out.push(sideHtml + visualHtml(b.id, appendix, letterNow)); return; }
        if (b.t === 'p') { out.push(sideHtml + '<p>' + inline(b.text, ctx) + '</p>'); return; }
        if (b.t === 'quote') { out.push(sideHtml + '<blockquote>' + inline(b.text, ctx) + '</blockquote>'); return; }
        if (b.t === 'matter') { out.push('<div class="matter"><div class="gut">' + fmtText(clean(m.matterLabel) || 'Why it matters') + '</div><div class="mt">' + paras(b.text) + '</div></div>'); return; }
        if (b.t === 'key') { out.push('<div class="keypoint"><div class="gut">Key point</div><div class="kp">' + inline(b.text, ctx) + '</div></div>'); return; }
        if (b.t === 'ul' || b.t === 'ol') { out.push(sideHtml + '<' + b.t + (b.t === 'ol' && b.start !== 1 ? ' start="' + b.start + '"' : '') + '>' + b.items.map(function (x) { return '<li>' + inline(x, ctx) + '</li>'; }).join('') + '</' + b.t + '>'); return; }
        if (b.t === 'labeled') { out.push(sideHtml + '<div class="labeled">' + b.items.map(function (x) { return '<div class="li"><div class="gut">' + fmtText(x.label) + '</div><div class="lt">' + inline(x.text, ctx) + '</div></div>'; }).join('') + '</div>'); return; }
      });
      if (pendingSide) out.push('<aside class="side">' + pendingSide + '</aside>');
      return out.join('\n');
    }

    function paras(text) { return String(text).split(/\n\n/).map(clean).filter(Boolean).map(function (p) { return '<p>' + inline(p, ctx) + '</p>'; }).join(''); }
    if (brief) return renderBrief();
    if (m.kind === 'book') return renderBook(opts.target === 'epub');

    var title = clean(m.title) || 'Untitled paper', shortTitle = clean(m.shortTitle) || title;
    if (!clean(m.title)) problem('fix', 'The paper has no title yet. Fill it in under Paper.', 'paper');
    var authors = doc.authors.filter(function (a) { return clean(a.name); }), names = authors.map(function (a) { return clean(a.name); });
    if (!authors.length) problem('check', 'No author is given. Add one under Paper.', 'paper');
    if (doc.back.include) authors.forEach(function (a) { if (!clean(a.bio)) problem('note', 'No biography for ' + clean(a.name) + '. Add one under Paper, or leave it: the back page then gives the name alone.', 'paper'); });
    if (doc.authors.some(function (a) { return !clean(a.name) && clean(a.bio); })) problem('check', 'A biography under Paper has no author name with it.', 'paper');
    if (!clean(m.date)) problem('check', 'No date is given for the cover. Fill it in under Paper.', 'paper');
    if (clean(m.title) && words(m.title) > 12) problem('note', 'The template suggests a title of about ten words or fewer.', 'paper');

    // Summary first: its notes and first citations come before the body's.
    var sum = doc.summary, sumHtml = '';
    var findings = lines(sum.findings), recs = lines(sum.recommendations), hasSummary = clean(sum.lead) || findings.length || recs.length;
    if (hasSummary) {
      sumHtml = '<section class="summary' + (m.sectionBreaks ? '' : ' endbreak') + '"><h2 class="front" id="summary" data-run="Executive summary">Executive summary</h2>'
        + (clean(sum.lead) ? String(sum.lead).split(/\n\s*\n/).map(function (p) { return '<p class="lead">' + inline(p.replace(/\n/g, ' '), ctx) + '</p>'; }).join('') : '')
        + (findings.length ? '<h3 class="plain">Key findings</h3><div class="findings">' + findings.map(function (f, i) { return '<div class="finding"><div class="gut">' + pad2(i + 1) + '</div><div class="ft">' + inline(f, ctx) + '</div></div>'; }).join('') + '</div>' : '')
        + (recs.length ? '<h3 class="plain">Recommendations</h3><div class="recs">' + recs.map(function (r, i) { return '<div class="rec"><div class="gut">R' + (i + 1) + '</div><div class="rt">' + inline(r, ctx) + '</div></div>'; }).join('') + '</div>' : '')
        + '</section>';
      if (words(sum.lead) + words(sum.findings) + words(sum.recommendations) > 450) problem('check', 'The executive summary runs past one page (about 300 words is the target).', 'summary');
      if (findings.length > 5) problem('note', 'More than five key findings. Three is the template\'s target.', 'summary');
    } else problem('check', 'The executive summary is empty.', 'summary');

    var bodyHtml = flow(doc.body, false);
    if (!clean(doc.body)) problem('fix', 'The body is empty.', 'body');
    var appHtml = clean(doc.appendix) ? flow(doc.appendix, true) : '';
    doc.visuals.forEach(function (v) { if (!usedVis[v.id]) problem('note', 'The visual [[' + v.id + ']] is not placed in the text yet.', 'visuals'); });

    // Cover.
    var tag = lines(m.tagline).slice(0, 4), mast = clean(m.masthead);
    // The masthead fills the width left by the topic list: Plex Mono is 0.6 em a character, plus tracking.
    var mastSize = Math.max(40, Math.min(168, Math.floor((tag.length ? 500 : 676) / (Math.max(4, mast.length) * 0.62))));
    var dateTxt = clean(m.date), ver = clean(m.version) + (clean(m.versionNote) ? ' · ' + clean(m.versionNote) : '');
    var cover = '<section class="cover">'
      + '<div class="cv-top"><div class="b">' + esc(clean(m.series)) + '</div><div class="r">' + (dateTxt ? '<span>' + esc(dateTxt) + '</span>' : '') + '<span class="tag">WP-' + esc(clean(m.number) || '000') + '</span></div></div>'
      + (mast ? '<div class="cv-mast"><div class="word" style="font-size:' + mastSize + 'px">' + esc(mast) + '</div>' + (tag.length ? '<div class="topics">' + tag.map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>' : '') + '</div>' : '')
      + '<div class="cv-rule"><span></span><i></i></div>'
      + '<div class="cv-no">White paper No. ' + esc(clean(m.number) || '000') + '</div>'
      + '<h1 class="cv-title">' + fmtText(title) + '</h1>'
      + (clean(m.subtitle) ? '<div class="cv-sub">' + fmtText(m.subtitle) + '</div>' : '')
      + '<div class="cv-meta">' + (authors.length ? '<div class="who"><div class="k">' + (authors.length > 1 ? 'Authors' : 'Author') + '</div><div class="v">' + andList(names.map(function (x) { return '<span class="nm">' + fmtText(x) + '</span>'; })) + '</div></div>' : '')
      + (clean(ver) ? '<div><div class="k">Version</div><div class="v">' + esc(ver) + '</div></div>' : '')
      + '<div><div class="k">Length</div><div class="v"><span class="cover-length">—</span> pages</div></div></div>'
      + (m.coverImage && safeImage(m.coverImage) ? '<figure class="cv-img"><img src="' + safeImage(m.coverImage) + '" alt="">' + (clean(m.coverCaption) ? '<figcaption>' + fmtText(m.coverCaption) + '</figcaption>' : '') + '</figure>' : '')
      + '<div class="cv-foot"><div>' + (clean(m.publisher) ? 'Published by <b>' + esc(clean(m.publisher)) + '</b>' : '') + '</div><div>' + esc(clean(m.site)) + '</div></div>'
      + '</section>';

    // Back page.
    var b = doc.back, backHtml = '';
    if (b.include) {
      var hist = lines(b.history).map(function (l) { return l.split('|').map(clean); });
      var ser = lines(b.series).map(function (l) { return l.split('|').map(clean); });
      var cite = (authors.length ? fmtText(citeNames(authors)).replace(/\.$/, '') + '. ' : '') + '“' + fmtText(title) + '.” <i>White Paper</i> No. ' + esc(clean(m.number) || '000') + ', version ' + esc(clean(m.version) || '1.0') + '. '
        + (clean(m.publisher) ? esc(clean(m.publisher)) + ', ' : '') + esc(dateTxt || 'n.d.') + '.' + (safeUrl(m.url) ? ' ' + esc(safeUrl(m.url)) + '.' : (clean(m.site) ? ' ' + esc(clean(m.site)) + '.' : ''));
      backHtml = '<section class="back"><h2 class="front" id="about" data-run="About this paper">About this paper</h2>'
        + (authors.length ? '<div class="brow"><div class="gut">' + (authors.length > 1 ? 'Authors' : 'Author') + '</div><div class="bt">' + authors.map(function (a) {
          return '<div class="au"><b>' + fmtText(clean(a.name)) + '</b>' + (clean(a.bio) ? ' ' + inline(a.bio, ctx, false) : '') + '</div>';
        }).join('') + '</div></div>' : '')
        + '<div class="brow"><div class="gut">Cite as</div><div class="bt">' + cite + '</div></div>'
        + (hist.length ? '<div class="brow"><div class="gut">Version history</div><div class="bt"><table class="dtable"><thead><tr><th>Version</th><th>Date</th><th>Change</th></tr></thead><tbody>' + hist.map(function (r) { return '<tr><td class="code">' + esc(r[0] || '') + '</td><td>' + esc(r[1] || '') + '</td><td>' + fmtText(r[2] || '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '')
        + (ser.length ? '<div class="brow"><div class="gut">In this series</div><div class="bt series">' + ser.map(function (r) { return '<div class="sr"><span class="code">No. ' + esc(r[0] || '') + '</span><span class="st">' + fmtText(r[1] || '') + '</span><span class="sw">' + fmtText(r[2] || '') + '</span></div>'; }).join('') + '</div></div>' : '')
        + '<div class="colophon">' + (clean(m.series) ? '<div class="b">' + esc(clean(m.series)) + '</div>' : '') + (clean(m.publisher) ? '<div>Published by ' + esc(clean(m.publisher)) + '</div>' : '') + (clean(m.site) ? '<div>' + esc(clean(m.site)) + '</div>' : '')
        + (clean(b.license) ? '<div class="lic">' + fmtText(b.license) + '</div>' : '') + '</div>'
        + '</section>';
      toc.push({ level: 0, num: '', title: 'About this paper', anchor: 'about' });
    }

    // Checked after the back page, whose biographies can cite sources too.
    doc.sources.forEach(function (s) { if (!usedKeys[s.key]) problem('note', 'Source @' + s.key + ' is not cited.', 'sources'); });
    // Contents, built last because it needs every heading and figure.
    var tocRows = (hasSummary ? [{ level: 0, num: '', title: 'Executive summary', anchor: 'summary' }] : []).concat(toc);
    var contents = '<section class="contents' + (!hasSummary && !m.sectionBreaks ? ' endbreak' : '') + '"><h2 class="front" id="contents" data-run="Contents">Contents</h2><ol class="toc">'
      + tocRows.map(function (r) { return '<li class="l' + r.level + '"><span class="num">' + esc(r.num) + '</span><a href="#' + r.anchor + '">' + esc(r.title) + '</a></li>'; }).join('') + '</ol>'
      + (figs.length ? '<div class="lof"><div class="gut">Figures and tables</div><ol>' + figs.map(function (f) { return '<li><span class="lab">' + esc(f.label.replace('Figure', 'Fig.')) + '</span><a href="#' + f.anchor + '">' + esc(clean(f.title)) + '</a></li>'; }).join('') + '</ol></div>' : '')
      + (clean(doc.aboutSeries) ? '<div class="series-box"><div class="sb-h">About the series</div>' + String(doc.aboutSeries).split(/\n\s*\n/).map(function (p) { return '<p>' + fmtText(p.replace(/\n/g, ' ')) + '</p>'; }).join('') + '</div>' : '')
      + '</section>';

    var vars = ':root{--wp-accent:' + accent + ';--wp-paper:' + (m.paper === 'white' ? '#FFFFFF' : '#F4F5F2') + ';}';
    // Header and footer: paper number and section above, short title and page count below.
    var box = 'font-family:"Plex Mono",monospace;font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:#15181B;';
    var running = '@page{'
      + '@top-left{content:"' + cssStr('White paper No. ' + (clean(m.number) || '000')) + '";' + box + 'font-weight:700;vertical-align:bottom;padding-bottom:10px;border-bottom:1px solid #15181B;margin-bottom:36px;}'
      + '@top-right{content:string(section);' + box + 'vertical-align:bottom;padding-bottom:10px;border-bottom:1px solid #15181B;margin-bottom:36px;}'
      + '@bottom-left{content:"' + cssStr(shortTitle) + '";' + box + 'color:#565C61;vertical-align:top;padding-top:10px;border-top:1px solid #15181B;margin-top:28px;}'
      + '@bottom-right{content:counter(page, decimal-leading-zero) " / " counter(pages, decimal-leading-zero);' + box + 'vertical-align:top;padding-top:10px;border-top:1px solid #15181B;margin-top:28px;}'
      + '}';

    // ---------------------------------------------------------------- the intelligence brief
    // A photo cover, "In this brief" with the colophon, numbered stories that run on, a
    // why-it-matters box after each, and the sources at the end in order of appearance.
    function renderBrief() {
      ctx.silent = true;
      if (m.citeMarks) {
        // Source numbers go in the text, so notes use symbols: *, †, ‡, §, ‖, ¶, then doubled.
        ctx.mark = function (list) {
          var nums = [];
          list.forEach(function (c) { var at = c.key ? order.indexOf(c.key) : -1; if (at !== -1 && nums.indexOf(at + 1) === -1) nums.push(at + 1); });
          return nums.length ? '<sup class="src-call">' + nums.map(function (n) { return '<a href="#src-' + n + '">' + n + '</a>'; }).join(',') + '</sup>' : '';
        };
        ctx.noteLabel = function (n) { var sy = ['*', '\u2020', '\u2021', '\u00A7', '\u2016', '\u00B6'], k = (n - 1) % 6; return new Array(Math.floor((n - 1) / 6) + 2).join(sy[k]); };
      }
      var name = clean(m.briefName), no = clean(m.number) || '000', dateTxt = clean(m.date), img = safeImage(m.coverImage);
      if (!name) problem('fix', 'The brief has no name yet. Fill it in under Brief.', 'paper');
      if (!dateTxt) problem('check', 'No date is given for the cover. Fill it in under Brief.', 'paper');
      if (!img) problem('note', 'No cover photo yet: the cover prints as a dark panel. Choose one under Brief.', 'paper');
      var stories = [], out = [], story = 0, hasMatter = {};
      blocks(doc.body).forEach(function (b) {
        if (b.t === 'h') {
          var text = inline(b.text, ctx, false);
          if (b.level === 1) {
            story++;
            stories.push({ n: pad2(story), title: plainText(b.text), anchor: 'story-' + story });
            out.push('<div class="st-head' + (story === 1 ? ' first' : '') + '" id="story-' + story + '"><div class="st-num"><span>' + pad2(story) + '</span><i></i></div><h2 class="st-title">' + text + '</h2></div>');
          } else if (b.level === 2) out.push('<h3 class="st-sub">' + text + '</h3>');
          else out.push('<h4 class="minor">' + text + '</h4>');
          return;
        }
        if (b.t === 'p') { out.push('<p>' + inline(b.text, ctx) + '</p>'); return; }
        if (b.t === 'quote') { out.push('<blockquote>' + inline(b.text, ctx) + '</blockquote>'); return; }
        if (b.t === 'matter') { hasMatter[story] = 1; out.push('<div class="matter"><div class="m-label">' + fmtText(clean(m.matterLabel) || 'Why it matters') + '</div>' + paras(b.text) + '</div>'); return; }
        if (b.t === 'key') { out.push('<div class="matter key"><div class="m-label">Key point</div><p>' + inline(b.text, ctx) + '</p></div>'); return; }
        if (b.t === 'side') { out.push('<p class="aside">' + inline(b.text, ctx) + '</p>'); return; }
        if (b.t === 'break') { out.push('<div class="pagebreak"></div>'); return; }
        if (b.t === 'visual') { out.push(visualHtml(b.id, false, '')); return; }
        if (b.t === 'ul' || b.t === 'ol') { out.push('<' + b.t + (b.t === 'ol' && b.start !== 1 ? ' start="' + b.start + '"' : '') + '>' + b.items.map(function (x) { return '<li>' + inline(x, ctx) + '</li>'; }).join('') + '</' + b.t + '>'); return; }
        if (b.t === 'labeled') { out.push('<div class="labeled">' + b.items.map(function (x) { return '<div class="li"><div class="ll">' + fmtText(x.label) + '</div><div class="lt">' + inline(x.text, ctx) + '</div></div>'; }).join('') + '</div>'); return; }
      });
      if (!clean(doc.body)) problem('fix', 'The brief has no stories yet. Start one under Stories with a # heading.', 'body');
      else if (!story) problem('check', 'No story headings yet. Start each story with a # heading so it is numbered and listed.', 'body');
      for (var si = 1; si <= story; si++) if (!hasMatter[si]) problem('note', 'Story ' + pad2(si) + ' has no why-it-matters box (a line starting with ?>).', 'body');
      doc.visuals.forEach(function (v) { if (!usedVis[v.id]) problem('note', 'The visual [[' + v.id + ']] is not placed in the text yet.', 'visuals'); });
      doc.sources.forEach(function (s) { if (!usedKeys[s.key]) problem('note', 'Source @' + s.key + ' is not cited.', 'sources'); });
      if (story && !order.length) problem('check', 'No sources are cited yet. Cite with [@key] where you use a source; it prints in the list at the end.', 'sources');

      var cover = '<section class="bcover' + (img ? '' : ' noimg') + '">' + (img ? '<img class="bc-img" src="' + img + '" alt="">' : '') + '<div class="bc-shade"></div>'
        + '<div class="bc-text"><div class="bc-name" style="font-size:' + Math.max(34, Math.min(72, Math.floor(600 / (Math.max(6, (name || 'Brief').length) * 0.74)))) + 'px">' + esc(name || '[Brief name]') + '</div>'
        + '<div class="bc-line"><span class="bc-no">Brief ' + esc(no) + '</span><i></i><span class="bc-date">' + esc(dateTxt) + '</span></div>'
        + (clean(m.coverCaption) ? '<div class="bc-credit">' + fmtText(m.coverCaption) + '</div>' : '') + '</div></section>';
      var contents = '<section class="bcontents"><div class="blabel"><span>In this brief</span><i></i></div><ol class="btoc">'
        + stories.map(function (s) { return '<li><span class="n">' + s.n + '</span><a href="#' + s.anchor + '">' + esc(s.title) + '</a></li>'; }).join('') + '</ol>'
        + (clean(m.colophon) ? '<div class="bcolo"><div class="blabel2">Colophon</div>' + String(m.colophon).split(/\n\s*\n/).map(function (p) { return '<p>' + fmtText(p.replace(/\n/g, ' ')) + '</p>'; }).join('') + '</div>' : '')
        + '</section>';
      var srcHtml = order.length ? '<section class="bsources" id="sources"><div class="blabel"><span>Bibliography</span><i></i></div><h2 class="bs-title">Sources</h2>'
        + (clean(m.sourcesNote) ? '<p class="bs-note">' + fmtText(m.sourcesNote) + '</p>' : '')
        + '<ol class="bsrc">' + order.map(function (k, i) {
          var s = srcByKey[k], loc = firstLoc[k] || (s.kind === 'osint' ? s.st.locator : '');
          return '<li id="src-' + (i + 1) + '"><span class="n">' + pad2(i + 1) + '</span><div class="se">' + (labelOf[k] ? '<b class="pre">' + fmtText(labelOf[k]) + '</b> ' : '') + citeHtml(s, loc, true) + '</div></li>';
        }).join('') + '</ol></section>' : '';

      var foot = (name ? name + ' · ' : '') + 'Brief ' + no;
      var ink = '#' + accent.slice(1).match(/../g).map(function (h) { return pad2x(Math.round(parseInt(h, 16) * 0.88)); }).join('');
      var vars = ':root{--wp-accent:' + accent + ';--wb-gold:' + ink + ';--wp-paper:#FFFFFF;}';
      var box = 'font-family:"Garamond Body",Garamond,serif;font-size:10.5px;line-height:14px;letter-spacing:0.25em;text-transform:uppercase;color:#A39C8D;vertical-align:top;padding-top:44px;';
      var running = '@page{@bottom-left{content:"' + cssStr(foot) + '";' + box + '}@bottom-right{content:counter(page);' + box + 'letter-spacing:0.1em;}}';
      return {
        html: '<div class="wb">' + cover + contents + '<section class="stories">' + out.join('\n') + '</section>' + srcHtml + '</div>',
        vars: vars + running, problems: problems,
        stats: { notes: notes, words: words(doc.body), figures: figs.length, cited: order.length, stories: story },
        runningLeft: foot, shortTitle: name || 'Brief'
      };
    }
    // ---------------------------------------------------------------- the eBook
    // Cover, half title, title page, copyright page, dedication, epigraph, contents, then
    // parts and chapters, back matter, notes, and the authors. For print, Paged.js lays it
    // out on the chosen page size; for an ePUB (epub true) each part, chapter, and front
    // page is kept apart, with its notes, for epubFiles to write as its own file.
    function renderBook(epub) {
      var B = doc.book, T = TRIMS[B.trim];
      var title = clean(m.title) ? plainText(m.title) : 'Untitled book', sub = clean(m.subtitle) ? plainText(m.subtitle) : '';
      var authors = doc.authors.filter(function (a) { return clean(a.name); }), names = authors.map(function (a) { return clean(a.name); });
      if (!clean(m.title)) problem('fix', 'The book has no title yet. Fill it in under Book.', 'paper');
      if (!authors.length) problem('check', 'No author is given. Add one under Book.', 'paper');
      if (!clean(B.copyright)) problem('check', 'The copyright page has no copyright line. Fill it in under Book.', 'paper');
      if (!clean(B.description)) problem('note', 'No description yet. Reading apps show it with the ePUB; write two or three sentences under Book.', 'paper');
      if (!safeImage(m.coverImage) && B.cover.layout !== 'type') problem('note', 'The cover has no image yet. Choose one under Cover, or pick the type-only layout.', 'cover');
      var units = [], cur = null, part = 0, chap = 0, totalNotes = 0, unitN = 0, partOpen = null;
      var dataRun = function (s) { return esc(s); };

      ctx.note = function (html) {
        totalNotes++; notes++;
        var u = cur || newUnit('plain', '', false), n = u.notes.length + 1, id = u.idx + '-' + n;
        if (epub) { u.notes.push({ n: n, html: html }); return '<sup class="nref"><a epub:type="noteref" role="doc-noteref" id="fnr-' + id + '" href="#fn-' + id + '">' + n + '</a></sup>'; }
        if (B.notes === 'end') { u.notes.push({ n: n, html: html }); return '<sup class="en-call"><a id="enr-' + id + '" href="#en-' + id + '">' + n + '</a></sup>'; }
        u.notes.push({ n: n, html: html });
        return '<span class="fn"><span class="fn-n">' + n + '</span> ' + html + '</span><sup class="fn-call">' + n + '</sup>';
      };
      // A heading's role, from a trailing {-} (unnumbered) or {part}.
      function headKind(text, back) {
        var mm = String(text).match(/\s*\{\s*(-|part|unnumbered)\s*\}\s*$/i);
        var t = mm ? String(text).slice(0, mm.index) : String(text);
        if (back) return { kind: 'back', text: t };
        if (mm && /part/i.test(mm[1])) return { kind: 'part', text: t };
        return { kind: mm ? 'unnumbered' : 'chapter', text: t };
      }
      function newUnit(kind, text, back) {
        unitN++;
        var u = { idx: unitN, kind: kind, back: !!back, id: 'u' + unitN, file: 'u' + pad2(unitN) + '.xhtml', label: '', title: '', plain: '', out: [], notes: [], opened: false, role: '' };
        if (kind === 'chapter') { chap++; u.label = chapterLabel(chap); u.num = chap; }
        if (kind === 'part') { part++; u.label = 'Part ' + (B.numStyle === 'arabic' ? String(part) : B.numStyle === 'roman' ? roman(part) : numberWord(part)); }
        if (text) { u.title = inline(text, ctx, false); u.plain = plainText(text); }
        u.role = semantic(kind, u.plain);
        // Each part and chapter gives its first citation of a source in full again.
        seen = {};
        units.push(u); cur = u;
        if (kind === 'part') partOpen = u; else if (u.back) partOpen = null;
        u.part = kind === 'part' ? null : partOpen;
        return u;
      }
      function chapterLabel(n) {
        if (B.numStyle === 'none') return '';
        var num = B.numStyle === 'arabic' ? String(n) : B.numStyle === 'roman' ? roman(n) : numberWord(n);
        return clean(B.chapterWord) ? clean(B.chapterWord) + ' ' + num : num;
      }
      function unitBlocks(md, back) {
        blocks(md).forEach(function (b) {
          if (b.t === 'h' && b.level === 1) {
            var hk = headKind(b.text, back);
            newUnit(hk.kind, hk.text, back);
            return;
          }
          if (!cur || (back && !cur.back)) newUnit(back ? 'back' : 'plain', '', back);
          var u = cur, o = u.out;
          if (b.t === 'h') { o.push(b.level === 2 ? '<h3 class="bk-sec">' + inline(b.text, ctx, false) + '</h3>' : '<h4 class="minor">' + inline(b.text, ctx, false) + '</h4>'); return; }
          if (b.t === 'p') { o.push('<p' + (!u.opened && B.openers && (u.kind === 'chapter' || u.kind === 'unnumbered' || u.kind === 'back') ? ' class="opener"' : '') + '>' + inline(b.text, ctx) + '</p>'); u.opened = true; return; }
          u.opened = true;
          if (b.t === 'quote') { o.push('<blockquote>' + inline(b.text, ctx) + '</blockquote>'); return; }
          if (b.t === 'scene') { o.push('<p class="scene" role="separator">* * *</p>'); return; }
          if (b.t === 'break') { o.push(epub ? '' : '<div class="pagebreak"></div>'); return; }
          if (b.t === 'matter') { o.push('<aside class="matter"><p class="m-label">' + fmtText(clean(m.matterLabel) || 'Why it matters') + '</p>' + paras(b.text) + '</aside>'); return; }
          if (b.t === 'key') { o.push('<p class="pull">' + inline(b.text, ctx) + '</p>'); return; }
          if (b.t === 'side') { o.push('<p class="aside">' + inline(b.text, ctx) + '</p>'); return; }
          if (b.t === 'visual') {
            // In a book the caption follows the figure, in reading order.
            // The rating key may run over a page, so its caption stays on top, where it cannot be left behind.
            var vh = visualHtml(b.id, false, '');
            o.push(/^<figure[^>]*\brating\b/.test(vh) ? vh : vh.replace(/^(<figure[^>]*>)(<figcaption[\s\S]*?<\/figcaption>)([\s\S]*)(<\/figure>)$/, '$1$3$2$4'));
            return;
          }
          if (b.t === 'ul' || b.t === 'ol') { o.push('<' + b.t + (b.t === 'ol' && b.start !== 1 ? ' start="' + b.start + '"' : '') + '>' + b.items.map(function (x) { return '<li>' + inline(x, ctx) + '</li>'; }).join('') + '</' + b.t + '>'); return; }
          if (b.t === 'labeled') { o.push('<div class="labeled">' + b.items.map(function (x) { return '<div class="li"><div class="ll">' + fmtText(x.label) + '</div><div class="lt">' + inline(x.text, ctx) + '</div></div>'; }).join('') + '</div>'); return; }
        });
      }
      unitBlocks(doc.body, false);
      var bodyCount = units.length;
      if (clean(doc.appendix)) { cur = null; unitBlocks(doc.appendix, true); }
      if (!clean(doc.body)) problem('fix', 'The book has no chapters yet. Start one under Chapters with a # heading.', 'body');
      else if (!chap && !units.some(function (u) { return u.kind === 'unnumbered'; })) problem('check', 'No chapter headings yet. Start each chapter with a # heading so it is numbered and listed in the contents.', 'body');
      doc.visuals.forEach(function (v) { if (!usedVis[v.id]) problem('note', 'The visual [[' + v.id + ']] is not placed in the text yet.', 'visuals'); });
      // Sources cited only in a biography count as cited.
      var aboutHtml = '';
      var bios = authors.filter(function (a) { return clean(a.bio); });
      if (B.aboutAuthors && bios.length) {
        cur = { idx: 'ab', notes: [] }; seen = {};
        aboutHtml = bios.map(function (a) { return '<div class="au"><h3 class="au-name">' + fmtText(clean(a.name)) + '</h3>' + paras(a.bio) + '</div>'; }).join('');
        // Notes in a biography: at the foot of the page in print, otherwise right after the biographies.
        if (cur.notes.length && (epub || B.notes === 'end')) aboutHtml += '<hr class="notes-rule"/>' + cur.notes.map(function (x) {
          var id = 'ab-' + x.n;
          return epub ? '<aside epub:type="footnote" role="doc-footnote" class="fnote" id="fn-' + id + '"><p><a class="nback" href="#fnr-' + id + '">' + x.n + '.</a> ' + x.html + '</p></aside>'
            : '<p class="fnote" id="en-' + id + '"><a class="en-n" href="#enr-' + id + '">' + x.n + '.</a> ' + x.html + '</p>';
        }).join('');
      }
      doc.sources.forEach(function (s) { if (!usedKeys[s.key]) problem('note', 'Source @' + s.key + ' is not cited.', 'sources'); });

      // Front matter, shared by the PDF and the ePUB.
      var series = clean(B.series) ? plainText(B.series) + (clean(B.seriesNo) ? ' · No. ' + clean(B.seriesNo) : '') : '';
      var pub = clean(m.publisher), site = clean(m.site), url = safeUrl(m.url), year = (String(m.date).match(/\b(1[89]|20|21)\d\d\b/) || [String(new Date().getFullYear())])[0];
      var faceNote = B.face === 'plex' ? 'Set in IBM Plex Serif and IBM Plex Sans Condensed.' : 'Set in EB Garamond and Cormorant Garamond.';
      var titlePage = (series ? '<p class="tp-series">' + esc(series) + '</p>' : '')
        + '<h1 class="tp-title">' + fmtText(clean(m.title) ? m.title : 'Untitled book') + '</h1>'
        + (sub ? '<p class="tp-sub">' + fmtText(m.subtitle) + '</p>' : '')
        + '<p class="tp-rule" aria-hidden="true"></p>'
        + (names.length ? '<p class="tp-by">' + andList(names.map(function (x) { return fmtText(x); })) + '</p>' : '')
        + '<div class="tp-foot">' + (pub ? '<p class="tp-pub">' + esc(pub) + '</p>' : '') + (site ? '<p class="tp-site">' + esc(site) + '</p>' : '') + '</div>';
      var credits = lines(B.credits);
      if (clean(m.coverCaption)) credits.push('Cover image: ' + clean(m.coverCaption).replace(/^cover( image)?:\s*/i, ''));
      var copyPage = '<p class="cp-title"><i>' + fmtText(title) + '</i>' + (sub ? ': ' + fmtText(sub) : '') + '</p>'
        + (clean(B.copyright) ? String(B.copyright).split(/\n\s*\n|\n/).map(clean).filter(Boolean).map(function (p) { return '<p>' + fmtText(p) + '</p>'; }).join('') : '')
        + (clean(m.colophon) ? String(m.colophon).split(/\n\s*\n/).map(function (p) { return '<p>' + fmtText(p.replace(/\n/g, ' ')) + '</p>'; }).join('') : '')
        + (clean(B.edition) ? '<p>' + fmtText(B.edition) + '</p>' : '')
        + (clean(B.isbn) ? '<p>ISBN ' + esc(clean(B.isbn).replace(/^ISBN:?\s*/i, '')) + '</p>' : '')
        + (clean(B.issn) ? '<p>ISSN ' + esc(clean(B.issn).replace(/^ISSN:?\s*/i, '')) + '</p>' : '')
        + (credits.length ? '<p class="cp-credits">' + credits.map(fmtText).join('<br>') + '</p>' : '')
        + (B.typeNote ? '<p>' + faceNote + '</p>' : '')
        + (pub || site || url ? '<p class="cp-pub">' + [pub ? esc(pub) : '', url ? '<a href="' + esc(url) + '">' + esc(site || url) + '</a>' : site ? esc(site) : ''].filter(Boolean).join('<br>') + '</p>' : '');
      var dedication = clean(B.dedication) ? String(B.dedication).split(/\n\s*\n/).map(function (p) { return '<p>' + fmtText(p.replace(/\n/g, ' ')) + '</p>'; }).join('') : '';
      var epigraph = clean(B.epigraph) ? '<blockquote class="epi">' + String(B.epigraph).split(/\n\s*\n/).map(function (p) { return '<p>' + fmtText(p.replace(/\n/g, ' ')) + '</p>'; }).join('') + (clean(B.epigraphBy) ? '<p class="epi-by">— ' + fmtText(B.epigraphBy) + '</p>' : '') + '</blockquote>' : '';
      var stats = { notes: totalNotes, words: words(doc.body) + words(doc.appendix), figures: figs.length, cited: Object.keys(usedKeys).length, chapters: chap, parts: part };

      function unitHead(u, tag) {
        if (u.kind === 'plain' || (u.back && !u.title)) return '';
        var t = u.title || '';
        return '<header class="ch-head">' + (u.label ? '<p class="ch-num">' + esc(u.label) + '</p>' : '')
          + (t ? '<' + tag + ' class="ch-title" id="h-' + u.id + '"' + (epub ? '' : ' data-run="' + dataRun(u.plain) + '"') + '>' + t + '</' + tag + '>' : '') + '</header>';
      }

      if (epub) {
        return {
          problems: problems, stats: stats,
          epub: {
            title: title, sub: sub, names: names, authors: authors, series: clean(B.series) ? plainText(B.series) : '', seriesNo: clean(B.seriesNo), pub: pub, site: site, url: url, year: year,
            accent: accent, titlePage: titlePage, copyPage: copyPage, dedication: dedication, epigraph: epigraph, about: aboutHtml, aboutCount: bios.length,
            units: units.map(function (u) {
              var notesHtml = u.notes.length ? '<hr class="notes-rule"/>' + u.notes.map(function (x) {
                var id = u.idx + '-' + x.n;
                return '<aside epub:type="footnote" role="doc-footnote" class="fnote" id="fn-' + id + '"><p><a class="nback" href="#fnr-' + id + '">' + x.n + '.</a> ' + x.html + '</p></aside>';
              }).join('') : '';
              return { id: u.id, file: u.file, kind: u.kind, back: u.back, label: u.label, plain: u.plain, role: u.role, part: u.part ? u.part.id : null, hasTitle: !!u.title,
                html: unitHead(u, 'h1') + u.out.join('\n') + notesHtml };
            })
          }
        };
      }

      // ---- print
      var tocRows = [];
      units.forEach(function (u) {
        if (!u.title && !u.label) return;
        tocRows.push('<li class="t-' + u.kind + (u.part && u.kind !== 'part' ? ' in-part' : '') + '">' + (u.label && u.kind === 'part' ? '<span class="lab">' + esc(u.label) + '</span>' : '')
          + '<a href="#' + u.id + '">' + (u.kind === 'chapter' && u.label ? '<span class="lab">' + esc(u.label) + '</span>' : '') + '<span class="tt">' + esc(u.plain || u.label) + '</span></a></li>');
      });
      var hasEnd = B.notes === 'end' && units.some(function (u) { return u.notes.length; });
      if (hasEnd) tocRows.push('<li class="t-back"><a href="#notes"><span class="tt">Notes</span></a></li>');
      if (aboutHtml) tocRows.push('<li class="t-back"><a href="#about"><span class="tt">About the ' + (bios.length > 1 ? 'authors' : 'author') + '</span></a></li>');

      var svg = coverSvg(doc, { measure: opts.measure || MEASURE, title: 'Cover' });
      var front = '<section class="bk-cover">' + svg + '</section>'
        + (B.halfTitle ? '<section class="fm bk-half"><p class="ht">' + fmtText(clean(m.title) ? m.title : 'Untitled book') + '</p></section>' : '')
        + '<section class="fm bk-titlepage">' + titlePage + '</section>'
        + '<section class="fm bk-copy"><div class="cp">' + copyPage + '</div></section>'
        + (dedication ? '<section class="fm bk-ded"><div class="ded">' + dedication + '</div></section>' : '')
        + (epigraph ? '<section class="fm bk-epi">' + epigraph + '</section>' : '')
        + (tocRows.length ? '<section class="fm bk-toc" id="contents"><h2 class="fm-h">Contents</h2><ol class="ktoc">' + tocRows.join('') + '</ol></section>' : '');
      var body = units.map(function (u) {
        var head = unitHead(u, 'h2');
        var cls = 'bk-unit k-' + u.kind + (u.back ? ' back' : '') + (u.kind === 'plain' && u === units[0] ? '' : '');
        return '<section class="' + cls + '" id="' + u.id + '">' + head + u.out.join('\n') + '</section>';
      }).join('\n');
      var endHtml = hasEnd ? '<section class="bk-unit k-back bk-notes" id="notes"><header class="ch-head"><h2 class="ch-title" data-run="Notes">Notes</h2></header>' + units.filter(function (u) { return u.notes.length; }).map(function (u) {
        return '<h3 class="nt-h">' + esc(u.label && u.plain ? u.label + ': ' + u.plain : u.label || u.plain || 'Opening') + '</h3><ol class="enotes">' + u.notes.map(function (x) {
          var id = u.idx + '-' + x.n;
          return '<li id="en-' + id + '"><a class="en-n" href="#enr-' + id + '">' + x.n + '.</a> ' + x.html + '</li>';
        }).join('') + '</ol>';
      }).join('') + '</section>' : '';
      var about = aboutHtml ? '<section class="bk-unit k-back bk-about" id="about"><header class="ch-head"><h2 class="ch-title" data-run="About the ' + (bios.length > 1 ? 'authors' : 'author') + '">About the ' + (bios.length > 1 ? 'authors' : 'author') + '</h2></header>' + aboutHtml + '</section>' : '';

      var px = function (n) { return Math.round(n) + 'px'; };
      var Wp = Math.round(T.w * 96), Hp = Math.round(T.h * 96), M = T.m;
      var plex = B.face === 'plex';
      var fs = plex ? T.fs - 1 : T.fs, lh = T.lh;
      var vars = ':root{--wp-accent:' + accent + ';--bk-fs:' + fs + 'px;--bk-lh:' + lh + 'px;--bk-w:' + Wp + 'px;--bk-h:' + Hp + 'px;--bk-ch:' + (Hp - M[0] - M[2] - 4) + 'px;}';
      var runBox = 'font-family:' + (plex ? '"Plex Sans Cond",sans-serif;font-weight:600;font-size:10px;letter-spacing:0.12em;' : '"Garamond Body",Garamond,serif;font-size:10.5px;letter-spacing:0.16em;') + 'text-transform:uppercase;color:#5A554D;line-height:14px;';
      var folio = 'font-family:' + (plex ? '"Plex Mono",monospace;font-size:10.5px;' : '"Garamond Body",Garamond,serif;font-size:12px;') + 'color:#2C2A27;line-height:14px;';
      var none = '@top-left{content:none}@top-center{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}';
      var shortT = clean(m.shortTitle) ? plainText(m.shortTitle) : title;
      var running = '@page{size:' + T.w + 'in ' + T.h + 'in;margin:' + px(M[0]) + ' ' + px(M[1]) + ' ' + px(M[2]) + ' ' + px(M[3]) + ';}'
        + '@page :left{margin-left:' + px(M[1]) + ';margin-right:' + px(M[3]) + ';@top-center{content:"' + cssStr(shortT) + '";' + runBox + 'vertical-align:bottom;padding-bottom:' + Math.round(M[0] * 0.35) + 'px;}@bottom-left{content:counter(page);' + folio + 'vertical-align:top;padding-top:' + Math.round(M[2] * 0.3) + 'px;}}'
        + '@page :right{margin-left:' + px(M[3]) + ';margin-right:' + px(M[1]) + ';@top-center{content:string(chapter);' + runBox + 'vertical-align:bottom;padding-bottom:' + Math.round(M[0] * 0.35) + 'px;}@bottom-right{content:counter(page);' + folio + 'vertical-align:top;padding-top:' + Math.round(M[2] * 0.3) + 'px;}}'
        + '@page :first{margin:0;' + none + '}'
        + '@page front{' + none + '}@page part{' + none + '}@page :blank{' + none + '}'
        + '@page chapter:first{@top-left{content:none}@top-center{content:none}@top-right{content:none}}'
        // Notes move to the foot of the page, out of the book's own styles, so their face is set here.
        + (plex ? '.fn{font-family:"Plex Serif",Georgia,serif;font-size:10.5px;line-height:15px;}.fn .fn-n{font-family:"Plex Mono",monospace;font-weight:500;}' : '');
      return {
        html: '<div class="bk face-' + B.face + ' para-' + B.para + (B.recto ? ' recto' : '') + '">' + front + '<div class="bk-main">' + body + endHtml + about + '</div></div>',
        vars: vars + running, problems: problems, stats: stats,
        runningLeft: shortT, shortTitle: shortT, size: { w: Wp, h: Hp }
      };
    }
    var html = '<div class="wp">' + cover + contents + sumHtml + '<section class="wp-body">' + bodyHtml + '</section>' + (appHtml ? '<section class="wp-appendix">' + appHtml + '</section>' : '') + backHtml + '</div>';
    return {
      html: html, vars: vars + running, problems: problems,
      stats: { authors: authors.length, notes: notes, words: words(doc.body) + words(doc.summary.lead) + words(doc.appendix), figures: figs.length, cited: Object.keys(usedKeys).length },
      runningLeft: 'White paper No. ' + (clean(m.number) || '000'), shortTitle: shortTitle
    };
  }
  // A heading as the contents and running head show it: no notes, citations, or markup.
  function plainText(s) {
    var t = String(s || ''), out = '', i = 0;
    while (i < t.length) {
      if ((t[i] === '^' && t[i + 1] === '[') || t[i] === '[') { var e = t[i] === '^' ? matching(t, i + 1) : citeEnd(t, i); if (e > 0) { i = e + 1; continue; } }
      out += t[i++];
    }
    return smart(clean(out.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*|\*/g, '')));
  }
  function pad2x(n) { var h = Math.max(0, Math.min(255, n)).toString(16); return h.length < 2 ? '0' + h : h; }
  function cssStr(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' '); }
  // Jane Doe; Jane Doe and John Roe; Jane Doe, John Roe, and Ann Lee.
  function andList(list) {
    if (list.length < 3) return list.join(' and ');
    return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
  }
  // Authors for "Cite as", in Chicago bibliography form: the first name inverted, the rest as
  // written; more than six authors give the first three and "et al."
  function citeNames(list) {
    var n = list.map(function (a, i) { return i === 0 && !a.org ? invertName(a.name) : clean(a.name); });
    if (n.length > 6) return n.slice(0, 3).join(', ') + ', et al.';
    if (n.length === 1) return n[0];
    return n.slice(0, -1).join(', ') + ', and ' + n[n.length - 1];
  }
  function invertName(name) {
    var n = clean(name);
    if (!n || /[,\[\]&]| and /.test(n)) return n;
    var w = n.split(' ');
    return w.length > 1 ? w[w.length - 1] + ', ' + w.slice(0, -1).join(' ') : n;
  }

  // ------------------------------------------------------------------ eBook helpers
  var ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function numberWord(n) { if (n < 20) return ONES[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); return String(n); }
  function roman(n) {
    var v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], s = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'], out = '';
    for (var i = 0; i < v.length; i++) while (n >= v[i]) { out += s[i]; n -= v[i]; }
    return out;
  }
  // The ePUB structural role of a part, chapter, or back-matter page, from its kind and title.
  var ROLE_WORDS = [[/^preface\b/, 'preface'], [/^foreword\b/, 'foreword'], [/^introduction\b/, 'introduction'], [/^prologue\b/, 'prologue'], [/^epilogue\b/, 'epilogue'],
    [/^afterword\b/, 'afterword'], [/^acknowledge?ments?\b/, 'acknowledgments'], [/^appendix\b/, 'appendix'], [/^glossary\b/, 'glossary'], [/^(bibliography|works cited|further reading)\b/, 'bibliography'], [/^conclusion\b/, 'conclusion']];
  function semantic(kind, plain) {
    if (kind === 'part') return 'part';
    if (kind === 'chapter') return 'chapter';
    var t = clean(plain).toLowerCase();
    for (var i = 0; i < ROLE_WORDS.length; i++) if (ROLE_WORDS[i][0].test(t)) return ROLE_WORDS[i][1];
    return kind === 'back' ? '' : 'chapter';
  }
  // Text measurement for fitting the cover title. The page sets this to a canvas measure
  // once the fonts load; without it, widths are estimated from the face's average letter.
  var MEASURE = null;
  function setMeasure(fn) { MEASURE = typeof fn === 'function' ? fn : null; }

  // ------------------------------------------------------------------ the cover, as one SVG
  // 1600 px wide, as tall as the trim size asks. The same picture is the PDF's first page,
  // the preview under Cover, and (drawn to a canvas by the page) the ePUB's cover image.
  function coverSvg(input, o) {
    o = o || {};
    var doc = normalize(input), m = doc.meta, B = doc.book, C = B.cover, T = TRIMS[B.trim];
    var W = 1600, H = Math.round(W * T.h / T.w), accent = /^#[0-9a-f]{6}$/i.test(m.accent) ? m.accent : BOOK_ACCENT;
    var measure = o.measure || MEASURE, F = COVER_FONTS[C.font], small = F.small, id = o.idPrefix || 'cv';
    var img = safeImage(m.coverImage), layout = C.layout;
    if (layout === 'art' && !img) layout = 'type';
    var mx = Math.round(W * 0.1), maxW = W - 2 * mx, ink = C.ink, defs = [], out = [];
    function width(text, size, fam, weight, italic, ls) {
      var w = null;
      if (measure) { try { w = measure(text, (italic ? 'italic ' : '') + weight + ' ' + size + 'px "' + fam + '"'); } catch (e) { w = null; } }
      if (w === null || !isFinite(w)) w = text.length * size * (fam === F.family ? F.cw : SMALL_CW[fam] || 0.5) * (fam !== 'Plex Mono' && text === text.toUpperCase() && /[A-Z]/.test(text) ? 1.25 : 1);
      return w + Math.max(0, text.length - 1) * (ls || 0) * size;
    }
    function wrap(text, size, fam, weight, italic, ls, max) {
      var ws = clean(text).split(' '), ls2 = [], line = '';
      ws.forEach(function (w) { var t = line ? line + ' ' + w : w; if (line && width(t, size, fam, weight, italic, ls) > max) { ls2.push(line); line = w; } else line = t; });
      if (line) ls2.push(line);
      return ls2;
    }
    // The fewest lines at this size, then the narrowest measure that keeps that many, so lines balance.
    function balanced(text, size, fam, weight, italic, ls, max) {
      var first = wrap(text, size, fam, weight, italic, ls, max), lo = max * 0.45, hi = max;
      if (first.length < 2) return first;
      for (var k = 0; k < 12; k++) { var mid = (lo + hi) / 2; if (wrap(text, size, fam, weight, italic, ls, mid).length <= first.length) hi = mid; else lo = mid; }
      return wrap(text, size, fam, weight, italic, ls, hi);
    }
    var title = clean(m.title) ? plainText(m.title) : 'Untitled book';
    if (C.upper) title = title.toUpperCase();
    var sub = C.showSub && clean(m.subtitle) ? plainText(m.subtitle) : '';
    var names = doc.authors.filter(function (a) { return clean(a.name); }).map(function (a) { return clean(a.name); });
    var who = C.showAuthor && names.length ? andList(names).toUpperCase() : '';
    var pub = C.showPub && clean(m.publisher) ? plainText(m.publisher).toUpperCase() : '';
    var kicker = clean(C.kicker) ? plainText(C.kicker).toUpperCase() : '';
    var smallW = small === 'Plex Mono' ? 500 : 600, italicSub = small === 'Garamond Body';
    // Fit the title: the largest size at which it takes no more lines than the layout allows.
    var maxLines = layout === 'band' ? 3 : 4, tSize = Math.round(W * 0.118 * C.scale / 100), tLines;
    for (; tSize > 44; tSize = Math.round(tSize * 0.95)) {
      tLines = wrap(title, tSize, F.family, F.weight, false, C.upper ? 0.04 : 0, maxW);
      if (tLines.length <= maxLines && tLines.every(function (l) { return width(l, tSize, F.family, F.weight, false, C.upper ? 0.04 : 0) <= maxW; })) break;
    }
    tLines = balanced(title, tSize, F.family, F.weight, false, C.upper ? 0.04 : 0, maxW);
    // Each piece of text as a block: its lines, size, line height, face, and the space above it.
    function blk(lines2, size, lh, fam, css, weight, italic, ls, fill, opacity, gap) { return { lines: lines2, size: size, lh: lh, fam: fam, css: css, weight: weight, italic: italic, ls: ls, fill: fill, opacity: opacity, gap: gap }; }
    var smallCss = SMALL_CSS[small];
    var kick = kicker ? blk(wrap(kicker, 34, small, smallW, false, 0.28, maxW), 34, 48, small, smallCss, smallW, false, 0.28, ink, 0.85, 0) : null;
    var tb = blk(tLines, tSize, Math.round(tSize * F.lh), F.family, F.css, F.weight, false, C.upper ? 0.04 : 0, ink, 1, kick ? 40 : 0);
    var rule = { rule: true, gap: 54, h: 6 };
    var sb = sub ? blk(balanced(sub, 52, small, italicSub ? 400 : 500, italicSub, 0, maxW * 0.92), 52, 68, small, smallCss, italicSub ? 400 : 500, italicSub, 0, ink, 0.92, 48) : null;
    var wb = who ? blk(wrap(who, 42, small, smallW, false, 0.16, maxW), 42, 58, small, smallCss, smallW, false, 0.16, ink, 1, sub ? 56 : 56) : null;
    var pb = pub ? blk([pub], 28, 36, small, smallCss, smallW, false, 0.26, ink, 0.82, 0) : null;
    function height(list) { return list.reduce(function (h, b, i) { return h + (i ? b.gap : 0) + (b.rule ? b.h : b.lines.length * b.lh); }, 0); }
    var tx = C.align === 'left' ? mx : W / 2, anchor = C.align === 'left' ? 'start' : 'middle';
    function draw(list, top) {
      var y = top;
      list.forEach(function (b, i) {
        if (i) y += b.gap;
        if (b.rule) { var rw = 150; out.push('<rect x="' + (C.align === 'left' ? mx : W / 2 - rw / 2) + '" y="' + y + '" width="' + rw + '" height="' + b.h + '" fill="' + accent + '"/>'); y += b.h; return; }
        b.lines.forEach(function (l) {
          var base = y + (b.lh - b.size) / 2 + b.size * 0.8;
          out.push('<text x="' + tx + '" y="' + base.toFixed(1) + '" text-anchor="' + anchor + '" font-family="' + esc(b.css) + '" font-size="' + b.size + '" font-weight="' + b.weight + '"'
            + (b.italic ? ' font-style="italic"' : '') + (b.ls ? ' letter-spacing="' + (b.ls * b.size).toFixed(1) + '"' : '') + ' fill="' + b.fill + '"' + (b.opacity < 1 ? ' fill-opacity="' + b.opacity + '"' : '') + '>' + esc(l) + '</text>');
          y += b.lh;
        });
      });
      return y;
    }
    function picture(x, y, w, h, n) {
      var cid = id + '-clip' + n, href = ' href="' + img + '" xlink:href="' + img + '"';
      defs.push('<clipPath id="' + cid + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>');
      if (C.imgW > 0 && C.imgH > 0) {
        var s = Math.max(w / C.imgW, h / C.imgH) * C.zoom / 100, dw = C.imgW * s, dh = C.imgH * s;
        var ix = x + (w - dw) * C.focusX / 100, iy = y + (h - dh) * C.focusY / 100;
        return '<image clip-path="url(#' + cid + ')" x="' + ix.toFixed(1) + '" y="' + iy.toFixed(1) + '" width="' + dw.toFixed(1) + '" height="' + dh.toFixed(1) + '" preserveAspectRatio="none"' + href + '/>';
      }
      return '<image clip-path="url(#' + cid + ')" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid slice"' + href + '/>';
    }
    var shade = C.shade / 100, main = [kick, tb, rule, sb, wb].filter(Boolean), top, bottomPad = Math.round(H * 0.075);
    out.push('<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>');
    if (layout === 'art') {
      out.push(picture(0, 0, W, H, 1));
    } else if (layout === 'band') {
      var bandY = Math.round(H * 0.56);
      if (img) out.push(picture(0, 0, W, bandY, 1));
      else { defs.push('<linearGradient id="' + id + '-ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="1" stop-color="#000000" stop-opacity="0.25"/></linearGradient>'); out.push('<rect width="' + W + '" height="' + bandY + '" fill="url(#' + id + '-ph)"/>'); }
      out.push('<rect y="' + (bandY - 7) + '" width="' + W + '" height="14" fill="' + accent + '"/>');
      var room = H - bandY - (pb ? pb.lh + bottomPad : bottomPad) - 30, hb = height(main);
      top = bandY + 30 + Math.max(40, (room - hb) / 2);
      draw(main, Math.round(top));
      if (pb) draw([pb], H - bottomPad - pb.lh);
    } else if (layout === 'framed') {
      var upper = [kick, tb, rule, sb].filter(Boolean), lower = [wb, pb].filter(Boolean);
      if (pb && wb) pb.gap = 30;
      var y1 = draw(upper, Math.round(H * 0.075));
      var lh2 = height(lower), y2 = H - bottomPad - lh2;
      var fy = y1 + 70, fh = Math.max(Math.round(H * 0.18), y2 - 70 - fy), fx = mx, fw = W - 2 * mx;
      if (img) out.push(picture(fx, fy, fw, fh, 1));
      else out.push('<rect x="' + fx + '" y="' + fy + '" width="' + fw + '" height="' + fh + '" fill="' + ink + '" fill-opacity="0.08"/>');
      out.push('<rect x="' + fx + '" y="' + fy + '" width="' + fw + '" height="' + fh + '" fill="none" stroke="' + accent + '" stroke-width="5"/>');
      if (lower.length) draw(lower, y2);
    } else {
      if (layout === 'photo') {
        if (img) out.push(picture(0, 0, W, H, 1));
        else { defs.push('<linearGradient id="' + id + '-ph" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/><stop offset="1" stop-color="#000000" stop-opacity="0.35"/></linearGradient>'); out.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-ph)"/>'); }
      } else {
        out.push('<rect x="' + mx + '" y="' + Math.round(H * 0.045) + '" width="' + (W - 2 * mx) + '" height="4" fill="' + accent + '"/>');
        out.push('<rect x="' + mx + '" y="' + (H - Math.round(H * 0.045) - 4) + '" width="' + (W - 2 * mx) + '" height="4" fill="' + accent + '"/>');
      }
      var hMain = height(main), reserve = pb ? pb.lh + 50 : 0;
      top = C.valign === 'top' ? Math.round(H * 0.09) : C.valign === 'middle' ? Math.round((H - hMain) / 2) : H - bottomPad - reserve - hMain;
      if (layout === 'photo' && img && shade > 0) {
        var gid = id + '-shade';
        if (C.valign === 'middle') out.push('<rect width="' + W + '" height="' + H + '" fill="#0C0C0B" fill-opacity="' + (shade * 0.55).toFixed(2) + '"/>');
        else {
          var bottomSide = C.valign === 'bottom', s0 = bottomSide ? Math.max(0, top - Math.round(H * 0.2)) : 0, s1 = bottomSide ? H : Math.min(H, top + hMain + Math.round(H * 0.2));
          defs.push('<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' + (bottomSide
            ? '<stop offset="0" stop-color="#0C0C0B" stop-opacity="0"/><stop offset="0.45" stop-color="#0C0C0B" stop-opacity="' + (shade * 0.75).toFixed(2) + '"/><stop offset="1" stop-color="#0C0C0B" stop-opacity="' + shade.toFixed(2) + '"/>'
            : '<stop offset="0" stop-color="#0C0C0B" stop-opacity="' + shade.toFixed(2) + '"/><stop offset="0.55" stop-color="#0C0C0B" stop-opacity="' + (shade * 0.75).toFixed(2) + '"/><stop offset="1" stop-color="#0C0C0B" stop-opacity="0"/>') + '</linearGradient>');
          out.push('<rect y="' + s0 + '" width="' + W + '" height="' + (s1 - s0) + '" fill="url(#' + gid + ')"/>');
        }
      }
      draw(main, top);
      if (pb) draw([pb], H - bottomPad - pb.lh);
    }
    var size = o.standalone ? ' width="' + W + '" height="' + H + '"' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="cover-svg" viewBox="0 0 ' + W + ' ' + H + '"' + size + ' preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc('Cover: ' + clean(m.title ? plainText(m.title) : 'Untitled book')) + '">'
      + (o.fontCss || defs.length ? '<defs>' + (o.fontCss ? '<style>' + o.fontCss + '<\/style>' : '') + defs.join('') + '</defs>' : '') + out.join('') + '</svg>';
  }
  function coverSize(input) { var T = TRIMS[normalize(input).book.trim]; return { w: 1600, h: Math.round(1600 * T.h / T.w) }; }
  // The faces a cover uses, so the page can embed just those when it draws the cover as an image.
  function coverFamilies(input) { var F = COVER_FONTS[normalize(input).book.cover.font]; return F.family === F.small ? [F.family] : [F.family, F.small]; }

  // ------------------------------------------------------------------ the ePUB
  // An EPUB 3 package, built from the same text as the PDF: one file per part and chapter,
  // notes at the end of each chapter as pop-up footnotes, figures and charts kept with the
  // text, the cover as an image, and the contents for the reading app.
  var CRC_T = null;
  function crc32(b) {
    var n, k, c, i, crc = 0xFFFFFFFF;
    if (!CRC_T) { CRC_T = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); CRC_T[n] = c >>> 0; } }
    for (i = 0; i < b.length; i++) crc = CRC_T[(crc ^ b[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  // A zip with every file stored, not compressed: the EPUB format requires that of the
  // first file (mimetype) and allows it of the rest.
  function zipStore(files) {
    var parts = [], central = [], offset = 0, cdSize = 0, total = 0, pos = 0, out;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = utf8(f.name), data = typeof f.data === 'string' ? utf8(f.data) : f.data, crc = crc32(data), size = data.length;
      var local = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(size), u32(size), u16(name.length), u16(0));
      parts.push(new Uint8Array(local), name, data);
      central.push([new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name]);
      offset += local.length + name.length + size;
    });
    central.forEach(function (c) { parts.push(c[0], c[1]); cdSize += c[0].length + c[1].length; });
    parts.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0))));
    parts.forEach(function (p) { total += p.length; });
    out = new Uint8Array(total);
    parts.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }
  function b64bytes(s) {
    if (typeof atob === 'function') { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }
  // HTML as written for the PDF, made well-formed XHTML: empty elements closed, SVG given its namespace.
  function xhtml(h) {
    return String(h).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/<(img|br|hr|col|wbr|input|source)\b([^>]*?)\s*\/?>/g, '<$1$2/>')
      .replace(/<svg\b(?![^>]*\bxmlns=)/g, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  function w3cDate(s) {
    var t = clean(s), mm;
    if ((mm = t.match(/^(\d{4})(-\d\d(-\d\d)?)?$/))) return t;
    if ((mm = t.match(/^(?:(\d{1,2})\s+)?([A-Za-z]{3,9})\.?\s+(?:(\d{1,2}),?\s+)?(\d{4})$/))) {
      var mi = MONTHS.map(function (x) { return x.slice(0, 3).toLowerCase(); }).indexOf(mm[2].slice(0, 3).toLowerCase());
      if (mi !== -1) { var day = mm[1] || mm[3]; return mm[4] + '-' + pad2(mi + 1) + (day ? '-' + pad2(+day) : ''); }
    }
    if ((mm = t.match(/\b(1[5-9]\d\d|20\d\d|21\d\d)\b/))) return mm[1];
    return '';
  }
  function isoNow(d) { return (d || new Date()).toISOString().replace(/\.\d+Z$/, 'Z'); }
  // A stable identifier for a book with no ISBN and no saved id: a UUID shape from the title and authors.
  function pseudoUuid(s) {
    var h = [crc32(utf8('a' + s)), crc32(utf8('b' + s)), crc32(utf8('c' + s)), crc32(utf8('d' + s))].map(function (n) { return ('00000000' + n.toString(16)).slice(-8); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32);
  }
  function fileAs(name) { return invertName(name); }
  var DPUB_ROLES = { chapter: 1, part: 1, preface: 1, foreword: 1, introduction: 1, prologue: 1, epilogue: 1, afterword: 1, acknowledgments: 1, appendix: 1, glossary: 1, bibliography: 1, conclusion: 1 };

  function epubFiles(input, o) {
    o = o || {};
    var doc = normalize(input);
    doc.meta.kind = 'book';
    var B = doc.book, r = render(doc, { target: 'epub', measure: o.measure }), E = r.epub;
    var lang = clean(B.lang) || 'en', files = [], items = [], spine = [], imgN = 0, seenImg = {};
    var langAttr = ' xml:lang="' + esc(lang) + '" lang="' + esc(lang) + '"';
    function add(name, data, type, id, props, linear) {
      files.push({ name: 'EPUB/' + name, data: data });
      items.push('<item id="' + id + '" href="' + name + '" media-type="' + type + '"' + (props ? ' properties="' + props + '"' : '') + '/>');
      if (linear !== undefined) spine.push('<itemref idref="' + id + '"' + (linear ? '' : ' linear="no"') + '/>');
    }
    function images(html) {
      return html.replace(/(<img\b[^>]*?\ssrc=")data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,([A-Za-z0-9+\/=]+)(")/g, function (all, pre, kind, data, post) {
        var key = data.length + ':' + data.slice(0, 64) + data.slice(-64);
        if (!seenImg[key]) {
          var ext = kind === 'jpeg' ? 'jpg' : kind === 'svg+xml' ? 'svg' : kind, name = 'images/fig-' + (++imgN) + '.' + ext;
          add(name, b64bytes(data), 'image/' + (kind === 'jpg' ? 'jpeg' : kind), 'img' + imgN);
          seenImg[key] = name;
        }
        return pre + '../' + seenImg[key] + post;
      });
    }
    function page(titleText, body, bodyType) {
      return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"' + langAttr + '>\n<head>\n<meta charset="UTF-8"/>\n<title>' + esc(titleText) + '</title>\n<link rel="stylesheet" type="text/css" href="../css/book.css"/>\n</head>\n'
        + '<body' + (bodyType ? ' epub:type="' + bodyType + '"' : '') + ' class="' + 'face-' + B.face + ' para-' + B.para + '">\n' + xhtml(body) + '\n</body>\n</html>\n';
    }
    function textFile(name, id, titleText, body, bodyType) {
      var x = page(titleText, images(body), bodyType);
      add('text/' + name, x, 'application/xhtml+xml', id, /<svg\b/.test(x) ? 'svg' : '', true);
    }

    files.push({ name: 'mimetype', data: 'application/epub+zip' });
    files.push({ name: 'META-INF/container.xml', data: '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n<rootfiles>\n<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>\n</rootfiles>\n</container>\n' });

    // Styles, with the book's accent and, when the page supplies them, its typefaces.
    var fontCss = '';
    (o.fonts || []).forEach(function (f, i) {
      var name = 'fonts/' + slug(f.family) + '-' + f.weight + (f.style === 'italic' ? 'i' : '') + '-' + (i + 1) + '.woff2';
      add(name, f.data, 'font/woff2', 'font' + (i + 1));
      fontCss += '@font-face{font-family:"' + f.family + '";font-style:' + f.style + ';font-weight:' + f.weight + ';src:url(../' + name + ') format("woff2");' + (f.range ? 'unicode-range:' + f.range + ';' : '') + '}\n';
    });
    add('css/book.css', fontCss + String(o.css || 'body{font-family:serif;}').replace(/--ACCENT--/g, E.accent), 'text/css', 'css');

    // The cover: the page's drawing of it when given, otherwise the SVG itself.
    var coverName;
    if (o.cover && o.cover.data) { coverName = 'images/cover.' + (o.cover.type === 'image/png' ? 'png' : 'jpg'); add(coverName, o.cover.data, o.cover.type === 'image/png' ? 'image/png' : 'image/jpeg', 'cover-image', 'cover-image'); }
    else { coverName = 'images/cover.svg'; add(coverName, '<?xml version="1.0" encoding="UTF-8"?>\n' + coverSvg(doc, { standalone: true, measure: o.measure }), 'image/svg+xml', 'cover-image', 'cover-image'); }
    var cs = coverSize(doc);
    textFile('cover.xhtml', 'cover', 'Cover', '<section epub:type="cover" class="cover-page"><img role="doc-cover" src="../' + coverName + '" alt="' + esc('Cover of ' + E.title) + '" width="' + cs.w + '" height="' + cs.h + '"/></section>', 'cover');
    textFile('title.xhtml', 'titlepage', E.title, '<section epub:type="titlepage" class="titlepage">' + E.titlePage + '</section>', 'frontmatter');
    textFile('copyright.xhtml', 'copyright', 'Copyright', '<section epub:type="copyright-page" class="copyright">' + E.copyPage + '</section>', 'frontmatter');
    if (E.dedication) textFile('dedication.xhtml', 'dedication', 'Dedication', '<section epub:type="dedication" role="doc-dedication" class="dedication">' + E.dedication + '</section>', 'frontmatter');
    if (E.epigraph) textFile('epigraph.xhtml', 'epigraph', 'Epigraph', '<section epub:type="epigraph" role="doc-epigraph" class="epigraph">' + E.epigraph + '</section>', 'frontmatter');

    // Contents: parts hold their chapters.
    var listed = E.units.filter(function (u) { return u.hasTitle || u.label; });
    function navText(u) { return u.label && u.plain ? u.label + ': ' + u.plain : u.label || u.plain; }
    var tree = [], partNode = {};
    listed.forEach(function (u) {
      var node = { u: u, kids: [] };
      if (u.kind === 'part') { partNode[u.id] = node; tree.push(node); }
      else if (u.part && partNode[u.part]) partNode[u.part].kids.push(node);
      else tree.push(node);
    });
    function navLi(n) { return '<li><a href="text/' + n.u.file + '">' + esc(navText(n.u)) + '</a>' + (n.kids.length ? '<ol>' + n.kids.map(navLi).join('') + '</ol>' : '') + '</li>'; }
    var navRows = tree.map(navLi).join('') +(E.about ? '<li><a href="text/about.xhtml">About the ' + (E.aboutCount > 1 ? 'Authors' : 'Author') + '</a></li>' : '');
    var firstBody = E.units.filter(function (u) { return !u.back; })[0];
    var nav = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"' + langAttr + '>\n<head>\n<meta charset="UTF-8"/>\n<title>Contents</title>\n<link rel="stylesheet" type="text/css" href="css/book.css"/>\n</head>\n<body epub:type="frontmatter" class="face-' + B.face + '">\n'
      + '<nav epub:type="toc" role="doc-toc" id="toc" class="contents"><h1 class="fm-h">Contents</h1>\n<ol>' + navRows + '</ol></nav>\n'
      + '<nav epub:type="landmarks" id="landmarks" hidden=""><h2>Landmarks</h2><ol><li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li><li><a epub:type="titlepage" href="text/title.xhtml">Title page</a></li><li><a epub:type="toc" href="nav.xhtml#toc">Contents</a></li>'
      + (firstBody ? '<li><a epub:type="bodymatter" href="text/' + firstBody.file + '">Start reading</a></li>' : '') + '</ol></nav>\n</body>\n</html>\n';
    add('nav.xhtml', nav, 'application/xhtml+xml', 'nav', 'nav', true);

    E.units.forEach(function (u) {
      var role = u.role, sem = role ? ' epub:type="' + role + '"' + (DPUB_ROLES[role] ? ' role="doc-' + role + '"' : '') : '';
      var label = u.hasTitle ? ' aria-labelledby="h-' + u.id + '"' : '';
      textFile(u.file, u.id, navText(u) || E.title, '<section' + sem + label + ' class="unit k-' + u.kind + '" id="' + u.id + '">' + u.html + '</section>', u.back ? 'backmatter' : 'bodymatter');
    });
    if (E.about) textFile('about.xhtml', 'about', 'About the ' + (E.aboutCount > 1 ? 'Authors' : 'Author'), '<section class="unit k-back about" aria-labelledby="h-about"><header class="ch-head"><h1 class="ch-title" id="h-about">About the ' + (E.aboutCount > 1 ? 'Authors' : 'Author') + '</h1></header>' + E.about + '</section>', 'backmatter');

    // The older table of contents, for reading apps that still look for one.
    var isbn = clean(B.isbn).replace(/[^0-9Xx]/g, ''), ident = isbn.length === 13 || isbn.length === 10 ? 'urn:isbn:' + isbn : 'urn:uuid:' + (/^[0-9a-f-]{36}$/i.test(clean(B.bookId)) ? clean(B.bookId).toLowerCase() : pseudoUuid(E.title + '|' + E.names.join('|')));
    var playN = 0, ncxRows = listed.map(function (u) { playN++; return '<navPoint id="np' + playN + '" playOrder="' + playN + '"><navLabel><text>' + esc(navText(u)) + '</text></navLabel><content src="text/' + u.file + '"/></navPoint>'; }).join('\n');
    add('toc.ncx', '<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"' + ' xml:lang="' + esc(lang) + '">\n<head><meta name="dtb:uid" content="' + esc(ident) + '"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>\n<docTitle><text>' + esc(E.title) + '</text></docTitle>\n<navMap>\n' + ncxRows + '\n</navMap>\n</ncx>\n', 'application/x-dtbncx+xml', 'ncx');

    // The package: what the book is, what it holds, and the reading order.
    var meta = ['<dc:identifier id="bookid">' + esc(ident) + '</dc:identifier>', '<dc:title id="title">' + esc(E.title) + '</dc:title>', '<meta refines="#title" property="title-type">main</meta>'];
    if (E.sub) meta.push('<dc:title id="subtitle">' + esc(E.sub) + '</dc:title>', '<meta refines="#subtitle" property="title-type">subtitle</meta>');
    E.authors.forEach(function (a, i) {
      meta.push('<dc:creator id="creator' + (i + 1) + '">' + esc(clean(a.name)) + '</dc:creator>', '<meta refines="#creator' + (i + 1) + '" property="role" scheme="marc:relators">aut</meta>',
        '<meta refines="#creator' + (i + 1) + '" property="file-as">' + esc(a.org ? clean(a.name) : fileAs(a.name)) + '</meta>', '<meta refines="#creator' + (i + 1) + '" property="display-seq">' + (i + 1) + '</meta>');
    });
    meta.push('<dc:language>' + esc(lang) + '</dc:language>');
    if (E.pub) meta.push('<dc:publisher>' + esc(E.pub) + '</dc:publisher>');
    var dd = w3cDate(doc.meta.date); if (dd) meta.push('<dc:date>' + dd + '</dc:date>');
    if (clean(B.copyright)) meta.push('<dc:rights>' + esc(lines(B.copyright).join(' ')) + '</dc:rights>');
    if (clean(B.description)) meta.push('<dc:description>' + esc(plainText(String(B.description).replace(/\n+/g, ' '))) + '</dc:description>');
    String(B.subjects || '').split(/[,;\n]/).map(clean).filter(Boolean).forEach(function (s) { meta.push('<dc:subject>' + esc(s) + '</dc:subject>'); });
    if (isbn && ident.indexOf('urn:isbn') === 0 && clean(B.bookId)) meta.push('<dc:identifier id="uuid">urn:uuid:' + esc(clean(B.bookId).toLowerCase()) + '</dc:identifier>');
    if (E.series) {
      meta.push('<meta property="belongs-to-collection" id="series">' + esc(E.series) + '</meta>', '<meta refines="#series" property="collection-type">series</meta>');
      if (/^\d+(\.\d+)?$/.test(E.seriesNo)) meta.push('<meta refines="#series" property="group-position">' + (+E.seriesNo) + '</meta>');
    }
    meta.push('<meta property="dcterms:modified">' + isoNow(o.now) + '</meta>', '<meta name="cover" content="cover-image"/>',
      '<meta property="schema:accessMode">textual</meta>', '<meta property="schema:accessMode">visual</meta>', '<meta property="schema:accessModeSufficient">textual</meta>',
      '<meta property="schema:accessibilityFeature">structuralNavigation</meta>', '<meta property="schema:accessibilityFeature">tableOfContents</meta>', '<meta property="schema:accessibilityFeature">readingOrder</meta>',
      '<meta property="schema:accessibilityHazard">none</meta>', '<meta property="schema:accessibilitySummary">Headings, a table of contents, and linked notes. Charts carry their titles and sources in text.</meta>');
    var opf = '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="' + esc(lang) + '" prefix="schema: http://schema.org/">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' + meta.join('\n') + '\n</metadata>\n<manifest>\n' + items.join('\n') + '\n</manifest>\n<spine toc="ncx">\n' + spine.join('\n') + '\n</spine>\n</package>\n';
    files.push({ name: 'EPUB/package.opf', data: opf });
    return { files: files.map(function (f) { return { name: f.name, data: typeof f.data === 'string' ? utf8(f.data) : f.data }; }), problems: r.problems, stats: r.stats };
  }
  function epub(input, o) { return zipStore(epubFiles(input, o).files); }

  // ------------------------------------------------------------------ editing OSINT sources inside the builder
  // The OSINT Citation Generator's source types: their labels, how a title is set, what the
  // location field holds, and its suggested descriptions (version 3.2.1).
  var OSINT_TYPE_INFO = {"book":{"label":"Book","style":"italics","loc":"Series, if the book belongs to one","picks":["Monograph","Trade Book","Edited Volume","Textbook","Memoir","Official History"]},"journal":{"label":"Journal article","style":"quotes","loc":"Journal","picks":["Peer-Reviewed Article","Journal Article","Review Article","Law Review Article","Preprint Paper","Working Paper","Conference Paper"]},"news":{"label":"News or magazine","style":"quotes","loc":"Outlet","picks":["News Article","News Analysis","Feature Article","Wire Service Report","Investigative Report","Magazine Article","Editorial / Op-Ed","Explainer","State Media Report"]},"chapter":{"label":"Chapter or section","style":"quotes","loc":"Containing volume","picks":["Book Section","Handbook Chapter","Long-Form Publication by Think Tank","Reference Work Entry","Encyclopedia Article"]},"web":{"label":"Website or think tank","style":"quotes","loc":"Site","picks":["Defense Analysis Article","Policy Analysis","Policy Brief","Think Tank Report","Expert Commentary","Blog Post","Web Page","Corporate Press Release"]},"report":{"label":"Report or government document","style":"italics","loc":"Site or series","picks":["Government Report","CRS Report","Think Tank Report","Defense White Paper","National Strategy Document","GAO Report","Whitepaper","Research Report"]},"social":{"label":"Social media post","style":"quotes","loc":"Platform","picks":["Social Media Post","Thread","Channel Post","Video Post","Short-Form Video","Forum Post","Deleted Post (Archived)","Screenshot (Provenance Unverified)"]},"video":{"label":"Video or podcast","style":"quotes","loc":"Platform","picks":["Video","Podcast","Recorded Interview","Lecture (Recorded)","Combat Footage","Livestream Archive"]},"archival":{"label":"Primary or archival","style":"quotes","loc":"Archive","picks":["Archival Material","Primary Source","Declassified Document","Historical Document","FOIA-Released Document","Oral History","Personal Papers"]},"live":{"label":"Live list or tracker","style":"quotes","loc":"Site","picks":["Sanctions List","Flight Tracking Data","Ship Tracking (AIS)","Business Registry Record","Government Dataset","Data Dashboard","Patent Filing"]},"imagery":{"label":"Satellite imagery","style":"quotes","loc":"Platform","picks":["Commercial Satellite Imagery","Synthetic Aperture Radar Imagery","Government Satellite Release","Annotated Satellite Imagery","Drone Footage","Geotagged Photo","CCTV Footage"]},"ai":{"label":"AI model output","style":"quotes","loc":"Platform","picks":["AI Model Output"]}};
  function blankOsint(type) {
    var st = {}; OSINT_KEYS.forEach(function (k) { st[k] = ''; });
    st.type = OSINT_TYPES.indexOf(type) !== -1 ? type : 'web';
    st.titleStyle = OSINT_TYPE_INFO && OSINT_TYPE_INFO[st.type] ? OSINT_TYPE_INFO[st.type].style : 'quotes';
    st.access = []; st.quals = []; st.shortUseTitle = true;
    return st;
  }
  // The full note, the short form, and the generator's own checks for one source as it stands.
  function osintPreview(st) {
    if (!CITER) return { full: '', short: '', checks: [], empty: true };
    var b = CITER.build(Object.assign({}, st, { locator: '' }));
    if (b.empty) return { full: '', short: '', checks: [], empty: true };
    return { full: linkUrls(smartHtml(CITER.toHTML(b.seg))), short: smartHtml(CITER.toHTML(CITER.shortForms(Object.assign({}, st, { locator: '' })).short)), checks: b.checks || [], empty: false };
  }
  function newOsintSource(st, existing) {
    var taken = {}; (existing || []).forEach(function (s) { taken[s.key] = 1; });
    return { key: keyFor(st, taken), kind: 'osint', osintId: 'wpb-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36), st: st };
  }
  // The builder's OSINT sources as a list file the OSINT Citation Generator can open again.
  function osintListFile(sources, name) {
    if (!CITER) return '';
    return CITER.listFile(name || '', (sources || []).filter(function (s) { return s.kind === 'osint'; }).map(function (s) { return { id: s.osintId || 'wpb-' + s.key, st: s.st }; }));
  }

  // ------------------------------------------------------------------ project files
  function projectFile(doc) { return JSON.stringify({ app: 'White Paper Builder', format: 1, savedAt: new Date().toISOString(), paper: normalize(doc) }, null, 1) + '\n'; }
  function parseProject(text) {
    var j;
    try { j = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { error: 'That file is not a White Paper Builder project: it could not be read.' }; }
    if (j && j.app === 'OSINT Citation Generator') return { error: 'That is an OSINT Citation Generator list file. Open it under Sources to cite from it.' };
    if (!j || typeof j !== 'object' || !j.paper || typeof j.paper !== 'object') return { error: 'That file is not a White Paper Builder project.' };
    return { doc: normalize(j.paper) };
  }

  return {
    useCiter: useCiter, defaults: defaults, normalize: normalize, render: render, blocks: blocks, inline: inline, parseData: parseData, parseNumber: parseNumber,
    chartSvg: chartSvg, plainText: plainText, splitLead: splitLead, importOsintList: importOsintList, keyFor: keyFor, sourceLabel: sourceLabel, projectFile: projectFile, parseProject: parseProject,
    andList: andList, citeNames: citeNames, VISUAL_KINDS: VISUAL_KINDS, MONTHS: MONTHS, PAPER_ACCENT: PAPER_ACCENT, BRIEF_ACCENT: BRIEF_ACCENT, SOURCES_NOTE: SOURCES_NOTE, slug: slug, words: words, invertName: invertName,
    BOOK_ACCENT: BOOK_ACCENT, TRIMS: TRIMS, COVER_LAYOUTS: COVER_LAYOUTS, COVER_FONTS: COVER_FONTS, numberWord: numberWord, roman: roman, setMeasure: setMeasure,
    coverSvg: coverSvg, coverSize: coverSize, coverFamilies: coverFamilies, epubFiles: epubFiles, epub: epub, zipStore: zipStore, xhtml: xhtml, w3cDate: w3cDate,
    OSINT_TYPES: OSINT_TYPES, OSINT_KEYS: OSINT_KEYS, OSINT_TYPE_INFO: OSINT_TYPE_INFO, blankOsint: blankOsint, osintPreview: osintPreview, newOsintSource: newOsintSource, osintListFile: osintListFile, sourceKeyFor: keyFor
  };
})();
if (typeof module !== 'undefined') module.exports = WP;
