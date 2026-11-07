#!/usr/bin/env node
/*
 * Tests for White Paper Builder. Run from the repository root:  node Tests/run.js
 * Needs Node 18 or later and nothing else. It loads index.html, runs the embedded OSINT
 * citation core and the page's own core, and checks what the paper is built from.
 * Page layout itself (Paged.js) needs a browser and is not tested here.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (id) => { const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>')); if (!m) throw new Error('No <script id="' + id + '"> in index.html'); return m[1]; };
const OSINT = new Function(grab('osint') + ';return OSINT;')();
const WP = new Function('OSINT', grab('core') + ';return WP;')(OSINT);
WP.useCiter(OSINT);

let failed = 0, passed = 0;
function eq(got, want, label) {
  if (got === want) { passed++; return; }
  failed++; console.log('FAIL  ' + label + '\n  got : ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const notesOf = (h) => (h.match(/<span class="fn">[\s\S]*?<\/span><sup class="fn-call[^"]*">/g) || []).map((x) => strip(x.replace(/<sup[\s\S]*$/, '')).trim());

// ---- 1. Blocks ----
const bs = WP.blocks('# One\n\nPara line one\nline two.\n\n## Sub\n\n- a\n- b\ncontinued\n\n1. x\n2. y\n\n> quote\n> more\n\n!> key\n\n>> side\n\n{R1} do this\n{R2} do that\n\n[[fig-1]]\n\n---\n\n### Minor');
eq(bs.map((b) => b.t + (b.level || '')).join(' '), 'h1 p h2 ul ol quote key side labeled visual break h3', 'blocks: every kind is recognized');
eq(bs[1].text, 'Para line one line two.', 'blocks: lines of a paragraph join');
eq(bs[3].items.join('|'), 'a|b continued', 'blocks: a line after a list item continues it');
eq(bs[5].text, 'quote more', 'blocks: consecutive quote lines join');
eq(bs[8].items.map((x) => x.label + ':' + x.text).join('|'), 'R1:do this|R2:do that', 'blocks: labeled items group');

// ---- 2. Notes and citations ----
const list = JSON.stringify({ app: 'OSINT Citation Generator', format: 2, sources: [
  { id: 'a1', fields: { type: 'book', authors: 'Michael Beckley', title: "Unrivaled: Why America Will Remain the World's Sole Superpower", titleStyle: 'italics', descType: 'Monograph', publisher: 'Cornell University Press', date: '2018', locator: '99' } },
  { id: 'a2', fields: { type: 'news', authors: 'Jane Doe', title: 'Drones Over the Front', location: 'Example Times', date: '2024-05-01', url: 'https://example.com/x', rating: 'B2' } }] });
const imp = WP.importOsintList(list, []);
eq(imp.sources.map((s) => s.key).join(','), 'beckley-unrivaled,doe-drones', 'sources: keys from author and first title word');
eq(WP.importOsintList(list, imp.sources).sources.length + ':' + WP.importOsintList(list, imp.sources).skipped, '0:2', 'sources: opening the same list again adds nothing');
eq(!!WP.importOsintList('{"x":1}', []).error, true, 'sources: refuses a file that is not a list');

function paper(over) {
  const d = WP.defaults();
  Object.assign(d.meta, { title: 'Test Paper', author: 'Jane Doe', date: 'October 2026', number: '007', publisher: 'Example Press', site: 'example.org' });
  d.summary.lead = 'Lead.';
  d.sources = imp.sources.concat([{ key: 'typed', kind: 'typed', full: 'Example Agency, *Annual Report* (2024).', short: 'Example Agency, *Annual Report*.' }]);
  return Object.assign(d, over || {});
}
let r = WP.render(paper({ body: '# Intro\n\nFirst claim [@beckley-unrivaled, 25-27].\n\nAgain [@beckley-unrivaled, 45]. Both [@doe-drones; @typed, 4]. A plain note ^[With an inline cite to [@typed].]' }));
const n = notesOf(r.html);
eq(n[0], '1 Michael Beckley, Unrivaled: Why America Will Remain the World’s Sole Superpower [Monograph] (Cornell University Press: 2018): pp. 25–27.', 'citation: first use is the full OSINT footnote, with the cited pages');
eq(n[1], '2 Beckley, Unrivaled, p. 45.', 'citation: later uses are the short form');
eq(n[2], '3 Jane Doe, “Drones Over the Front,” Example Times [B2] (01 May 2024) https://example.com/x; Example Agency, Annual Report (2024), p. 4.', 'citation: two sources in one note, separated by a semicolon');
eq(n[3], '4 With an inline cite to Example Agency, Annual Report.', 'citation: inside a note, a citation prints inline in short form');
eq(/Again<span class="fn">/.test(r.html.replace(/<sup[^>]*>\d+<\/sup>/g, '')) || /claim<span class="fn">/.test(r.html), true, 'notes: a space before a note call is dropped');
eq(r.stats.notes + ':' + r.stats.cited, '4:3', 'stats: notes and sources cited');
r = WP.render(paper({ body: '# Intro\n\nText [@nobody].' }));
eq(r.problems.some((p) => p.level === 'fix' && /@nobody/.test(p.msg)), true, 'checks: an unknown key is flagged');
eq(r.problems.some((p) => /@doe-drones is not cited/.test(p.msg)), true, 'checks: an uncited source is noted');
eq(strip(WP.inline('She said "yes" and it\'s **bold**, *italic*, [a link](https://example.org).', { note: (h) => h, cite: () => '' })), 'She said “yes” and it’s bold, italic, a link.', 'inline: typographic quotes, bold, italics, links');
eq(/<a href="https:\/\/example.org">a link<\/a>/.test(WP.inline('[a link](https://example.org)', { note: (h) => h, cite: () => '' })), true, 'inline: links keep their address');
eq(/<script/.test(WP.render(paper({ body: '# A\n\n<script>alert(1)</script>' })).html), false, 'inline: typed HTML is escaped');

// ---- 3. Numbering, contents, visuals ----
const vis = [
  { id: 'fig-a', kind: 'bar', title: 'Up', source: 'Data', data: 'Year,Value\n2020,1\n2021,3' },
  { id: 'tab-a', kind: 'table', title: 'Compare', source: 'Data', data: 'Name,Count\nA,1\nB,2', highlight: 'B' },
  { id: 'nums', kind: 'stats', data: '41%, share of something' },
  { id: 'unused', kind: 'line', title: 'Never placed', source: 'x', data: 'a,1\nb,2' },
  { id: 'app-t', kind: 'table', title: 'In the appendix', source: 'Data', data: 'a,b\n1,2' }];
r = WP.render(paper({ visuals: vis, body: '# Intro\n\n[[fig-a]]\n\n## First\n\nText.\n\n## Second\n\n[[tab-a]]\n\n[[nums]]\n\n# Next\n\nMore.', appendix: '# Method\n\n## How\n\n[[app-t]]\n\n[[rating-key]]' }));
eq(['id="sec-1"', 'id="sec-1-1"', 'id="sec-1-2"', 'id="sec-2"', 'id="app-A"', 'id="app-A-1"'].every((s) => r.html.includes(s)), true, 'numbering: sections 1, 1.1, 1.2, 2 and appendix A, A.1');
eq((r.html.match(/<li class="l[012]">/g) || []).length, 8, 'contents: summary, four body headings, two appendix headings, about page');
eq(['Figure 1', 'Table 1', 'Table A1', 'Table A2'].every((s) => r.html.includes('<div class="vlabel">' + s + '</div>')), true, 'visuals: Figure 1, Table 1, and appendix tables A1 and A2');
eq(/class="lab">Fig\. 1<\/span><a href="#v-fig-a">Up<\/a>/.test(r.html), true, 'contents: list of figures and tables links to each');
eq(/<tr class="hot">/.test(r.html), true, 'visuals: a highlighted table row');
eq(/class="vis stats-wrap"/.test(r.html) && !/vlabel">Figure 2/.test(r.html), true, 'visuals: key numbers are not numbered as a figure');
eq(r.problems.some((p) => /\[\[unused\]\] is not placed/.test(p.msg)), true, 'checks: a visual not placed is noted');
eq(WP.render(paper({ body: '# A\n\n[[nothing]]' })).problems.some((p) => p.level === 'fix' && /\[\[nothing\]\]/.test(p.msg)), true, 'checks: a missing visual is flagged');
eq(WP.render(paper({ visuals: [{ id: 'f', kind: 'bar', title: 'T', data: 'a,1' }], body: '# A\n\n[[f]]' })).problems.some((p) => /has no source line/.test(p.msg)), true, 'checks: a figure with no source is flagged');

// ---- 3b. Fixes found in review ----
r = WP.render(paper({ visuals: [{ id: 't1', kind: 'table', title: 'One', source: 'S', data: 'a,b\n1,2' }, { id: 't2', kind: 'table', title: 'Two', source: 'S', data: 'a,b\n1,2' }, { id: 'f1', kind: 'bar', title: 'Fig', source: 'S', data: 'a,1' }],
  body: '## Early\n\n# One\n\nText.', appendix: '# First\n\n[[t1]]\n\n# Second\n\n[[t2]]\n\n[[f1]]' }));
eq(['Table A1', 'Table B1', 'Figure B1'].every((x) => r.html.includes('<div class="vlabel">' + x + '</div>')), true, 'appendix: tables and figures numbered afresh in each appendix');
eq(r.html.includes('id="sec-0-1"') && (r.html.match(/id="sec-1"/g) || []).length === 1, true, 'numbering: a subsection before the first section gets its own anchor');
eq(notesOf(WP.render(paper({ body: '# A\n\nText.^[See [@doe-drones].]' })).html)[0], '1 See Jane Doe, \u201CDrones Over the Front,\u201D Example Times [B2] (01 May 2024) https://example.com/x.', 'citation: no doubled period inside a note');
eq(notesOf(WP.render(paper({ sources: [{ key: 'q', kind: 'typed', full: 'Ann Lee, "A Title."' }], body: '# A\n\nText [@q, p. 3].' })).html)[0], '1 Ann Lee, \u201CA Title,\u201D p. 3.', 'citation: a page after a title ending in a period and quotation mark');
eq(WP.splitLead('1,200, Sea days in 2023', 'stats').join('|') + ' / ' + WP.splitLead('March 3, 2022, The exercise began', 'timeline').join('|'), '1,200|Sea days in 2023 / March 3, 2022|The exercise began', 'data: numbers and dates keep their own commas');
eq(/<thead>/.test(WP.render(paper({ visuals: [{ id: 'w', kind: 'table', title: 'Words', source: 'S', data: 'Approach,Strength\nA,Cheap' }], body: '# A\n\n[[w]]' })).html), true, 'tables: the first row is the header, even with no numbers');
eq(WP.plainText('The **Real** Question^[note] [@doe-drones]'), 'The Real Question', 'contents: headings show without notes, citations, or markup');

// ---- 4. Data and charts ----
eq(JSON.stringify(WP.parseData('Year,Value\n2020,"1,200"\n2021,45%')), '{"head":["Year","Value"],"rows":[["2020","1,200"],["2021","45%"]]}', 'data: CSV with a header and quoted numbers');
eq(JSON.stringify(WP.parseData('a\t1\nb\t2').rows), '[["a","1"],["b","2"]]', 'data: pasted from a spreadsheet (tabs)');
eq(JSON.stringify(WP.parseData('| x | y |\n|---|---|\n| a | 1 |')), '{"head":["x","y"],"rows":[["a","1"]]}', 'data: a Markdown table');
eq(WP.parseNumber('1,200') + ':' + WP.parseNumber('45%') + ':' + WP.parseNumber('−3') + ':' + WP.parseNumber('n/a'), '1200:45:-3:null', 'data: numbers with commas, percent, and a minus sign');
['bar', 'hbar', 'line'].forEach((k) => eq(/^<svg class="chart"[\s\S]*<\/svg>$/.test(WP.chartSvg({ kind: k, title: 't', data: 'Year,A,B\n2020,1,2\n2021,3,-1' }, '#C42A14')), true, 'chart: ' + k + ' draws an SVG'));
eq(/vempty/.test(WP.chartSvg({ kind: 'bar', data: '' }, '#C42A14')), true, 'chart: no data shows a prompt instead');

// ---- 5. Cover, back page, page furniture ----
r = WP.render(paper({ body: '# A\n\nText.', back: { include: true, bio: 'Bio.', history: '1.0 | October 13, 2026 | First publication', series: '007 | Test Paper | This paper', license: 'CC BY 4.0' } }));
eq(strip((r.html.match(/Cite as<\/div><div class="bt">([\s\S]*?)<\/div>/) || [])[1] || ''), 'Doe, Jane. “Test Paper.” White Paper No. 007, version 1.0. Example Press, October 2026. example.org.', 'back page: cite as');
eq(/@top-left\{content:"White paper No\. 007"/.test(r.vars) && /@bottom-left\{content:"Test Paper"/.test(r.vars), true, 'pages: header shows the paper number and footer the short title');
eq(/@bottom-left\{content:"Say \\"hi\\""/.test(WP.render(paper({ meta: Object.assign(WP.defaults().meta, { title: 'T', shortTitle: 'Say "hi"' }) })).vars), true, 'pages: quotation marks in the short title are escaped');
eq(WP.invertName('Jane Q. Doe') + '|' + WP.invertName('Doe, Jane') + '|' + WP.invertName('[Author name]'), 'Doe, Jane Q.|Doe, Jane|[Author name]', 'back page: author name inverted for the citation');

eq(['Highly Reliable', 'Not Usually Reliable', 'Unknown', 'Confirmed', 'Probable', 'Possible', 'No basis for judging the claim either way.'].every((x) => WP.render(paper({ appendix: '# M\n\n[[rating-key]]' })).html.includes(x)), true, 'rating key: uses the OSINT Style Guide\'s grades and wording');
eq(/Published by/.test(WP.render(Object.assign(paper(), { meta: Object.assign(WP.defaults().meta, { title: 'T' }) })).html), false, 'cover: no publisher line unless one is given');

// ---- 5b. Several authors ----
const three = [{ name: 'Jane Doe', bio: 'Jane writes on navies [@typed].' }, { name: 'John Roe', bio: 'John studies logistics.' }, { name: 'RAND Corporation', bio: '', org: true }];
r = WP.render(paper({ authors: three, body: '# A\n\nText.', back: { include: true, history: '', series: '', license: '' } }));
eq(strip((r.html.match(/<div class="who">([\s\S]*?)<\/div><\/div>/) || ['', ''])[1]), 'AuthorsJane Doe, John Roe, and RAND Corporation', 'authors: the cover lists every author, joined with "and"');
eq(strip((r.html.match(/Cite as<\/div><div class="bt">([\s\S]*?)<\/div>/) || [])[1] || '').startsWith('Doe, Jane, John Roe, and RAND Corporation. “Test Paper.”'), true, 'authors: cite as inverts only the first name, and never an organization');
const aus = (r.html.match(/<div class="au">[\s\S]*?<\/div>/g) || []).map(strip);
eq(aus.length + '|' + aus[1] + '|' + aus[2], '3|John Roe John studies logistics.|RAND Corporation', 'authors: each name and biography on the back page, in order');
eq(/navies<span class="fn">/.test(r.html), true, 'authors: a citation in a biography becomes a footnote');
eq(r.problems.some((p) => /@typed is not cited/.test(p.msg)), false, 'authors: a source cited only in a biography counts as cited');
eq(r.problems.some((p) => p.level === 'note' && /No biography for RAND Corporation/.test(p.msg)), true, 'authors: a missing biography is noted');
eq(WP.citeNames([{ name: 'Jane Doe' }, { name: 'John Roe' }]), 'Doe, Jane, and John Roe', 'authors: two authors for cite as');
eq(WP.citeNames('ABCDEFG'.split('').map((c) => ({ name: c + ' Smith' }))), 'Smith, A, B Smith, C Smith, et al.', 'authors: more than six give the first three and et al.');
eq(strip((WP.render(paper({ authors: [{ name: 'Jane Doe', bio: '' }], body: '# A' })).html.match(/<div class="who">([\s\S]*?)<\/div><\/div>/) || ['', ''])[1]), 'AuthorJane Doe', 'authors: one author is labeled Author');
eq(WP.render(paper({ authors: [], meta: Object.assign(WP.defaults().meta, { title: 'T' }), body: '# A' })).problems.some((p) => /No author is given/.test(p.msg)), true, 'authors: no author is flagged');
const old = WP.normalize({ meta: { title: 'Old', author: 'Jane Doe' }, back: { bio: 'Old bio.' } });
eq(JSON.stringify(old.authors), '[{"name":"Jane Doe","bio":"Old bio.","org":false}]', 'project file: a paper from before 1.3 keeps its author and biography');
eq(WP.parseProject(WP.projectFile(paper({ authors: three }))).doc.authors.map((a) => a.name + (a.org ? '*' : '')).join('|'), 'Jane Doe|John Roe|RAND Corporation*', 'project file: authors save and reopen in order');

// ---- 6. Project files ----
const d0 = paper({ body: '# A\n\nText.', visuals: [{ id: 'img', kind: 'image', image: 'data:image/png;base64,iVBORw0KGgo=' }, { id: 'bad', kind: 'image', image: 'javascript:alert(1)' }] });
const back = WP.parseProject(WP.projectFile(d0));
eq(back.doc.meta.title + '|' + back.doc.sources.length + '|' + back.doc.visuals.map((v) => v.image ? 'img' : 'none').join(','), 'Test Paper|3|img,none', 'project file: saves and reopens; unsafe image data is dropped');
eq(!!WP.parseProject('not json').error && !!WP.parseProject(list).error, true, 'project file: refuses other files, including OSINT lists');
eq(/Open it under Sources/.test(WP.parseProject(list).error), true, 'project file: says what an OSINT list file is for');

eq(/<a class="url" href="https:\/\/example\.com\/x">https:\/\/example\.com\/x<\/a>\./.test(WP.render(paper({ body: '# A\n\nText [@doe-drones].' })).html), true, 'citation: a web address is a link, with the closing period outside it');

// ---- 7. The intelligence brief ----
const mb = WP.blocks('?> One\n?> more\n?>\n?> Two');
eq(mb.length + ':' + mb[0].t + ':' + JSON.stringify(mb[0].text), '1:matter:"One more\\n\\nTwo"', 'blocks: ?> lines join, and a bare ?> starts a new paragraph');
function brief(body, over) {
  const d = paper({ body: body });
  Object.assign(d.meta, { kind: 'brief', briefName: 'Global Warning', number: '030', date: 'September 2026', colophon: 'Colophon text.' }, over || {});
  return WP.render(d);
}
r = brief('# First story\n\nSaid so [@doe-drones]. More [@beckley-unrivaled, 12].\n\n?> Why.\n?>\n?> Second.\n\n# Second story\n\nAgain [@doe-drones]; then [ORIGINAL STORY: @typed]. A note.^[Only a note.]');
eq(/class="bcover/.test(r.html) && !/class="wp"/.test(r.html), true, 'brief: its own cover, not the white paper');
eq((r.html.match(/<li><span class="n">0[12]<\/span><a href="#story-[12]">/g) || []).length, 2, 'brief: stories numbered 01, 02 and listed under In this brief');
eq(strip((r.html.match(/<section class="stories">[\s\S]*?<\/section>/) || [''])[0]).includes('Jane Doe'), false, 'brief: citations print nothing in the stories');
eq(/Said so<sup class="src-call"><a href="#src-1">1<\/a><\/sup>\. More<sup class="src-call"><a href="#src-2">2<\/a><\/sup>\./.test(r.html), true, 'brief: each citation prints its source number in the text, linked to the entry');
eq(/Again<sup class="src-call"><a href="#src-1">1<\/a><\/sup>; then<sup class="src-call"><a href="#src-3">3<\/a><\/sup>/.test(r.html), true, 'brief: a source cited again keeps its first number');
eq(/<li id="src-1"><span class="n">01<\/span>/.test(r.html), true, 'brief: each source entry is the target of its numbers');
eq(/<sup class="src-call"><a href="#src-1">1<\/a>,<a href="#src-2">2<\/a><\/sup>/.test(brief('# A\n\nTwo at once [@doe-drones; @beckley-unrivaled].').html), true, 'brief: two sources in one citation print both numbers');
const off = brief('# A\n\nSaid so [@doe-drones]. A note.^[Only a note.]', { citeMarks: false });
eq(/Said so\. A note\./.test(strip(off.html)) && notesOf(off.html)[0] === '1 Only a note.', true, 'brief: with the numbers turned off, citations print nothing and notes are numbered');
const srcs = (r.html.match(/<ol class="bsrc">([\s\S]*?)<\/ol>/) || ['', ''])[1].split('</li>').filter(Boolean).map((x) => strip(x));
eq(srcs.length, 3, 'brief: each source listed once');
eq(srcs[0].startsWith('01Jane Doe, “Drones Over the Front,”') && srcs[1].startsWith('02Michael Beckley') && srcs[2].startsWith('03ORIGINAL STORY: Example Agency'), true, 'brief: sources in order of first citation, with their labels');
eq(/: p\. 12\.$/.test(srcs[1]), true, 'brief: the first citation\'s page is kept in the entry');
eq(notesOf(r.html)[0], '* Only a note.', 'brief: written notes print as footnotes, marked with symbols so they are not confused with source numbers');
eq((r.html.match(/<div class="matter">[\s\S]*?<\/div><\/div>|<div class="matter">[\s\S]*?<p>Second\.<\/p><\/div>/) || [''])[0].split('<p>').length - 1, 2, 'brief: why-it-matters box with two paragraphs');
eq(/@bottom-left\{content:"Global Warning · Brief 030"/.test(r.vars) && /--wp-accent:#D9B063/.test(r.vars), true, 'brief: footer reads name and number; gold accent by default');
eq(/Formatted to the OSINT Style Guide v1\.5/.test(r.html) && /Colophon text\./.test(r.html), true, 'brief: sources note and colophon');
eq(brief('# A\n\nText.', { briefName: '' }).problems.some((p) => p.level === 'fix' && /no name/.test(p.msg)), true, 'brief checks: a missing name is flagged');
eq(brief('# A\n\nText.').problems.some((p) => /Story 01 has no why-it-matters box/.test(p.msg)), true, 'brief checks: a story with no why-it-matters box is noted');
eq(r.stats.stories + ':' + r.stats.cited, '2:3', 'brief: stats count stories and sources');
eq(WP.normalize({ meta: { kind: 'zine' } }).meta.kind, 'paper', 'project file: an unknown kind opens as a white paper');
eq(WP.parseProject(WP.projectFile(Object.assign(paper(), { meta: Object.assign(WP.defaults().meta, { kind: 'brief', briefName: 'GW' }) }))).doc.meta.kind, 'brief', 'project file: a brief reopens as a brief');
eq(notesOf(WP.render(paper({ body: '# A\n\nText [see @typed].' })).html)[0], '1 see Example Agency, Annual Report (2024).', 'citation: a lead-in word such as see is kept in the note');
eq(WP.plainText('A story [ORIGINAL STORY: @typed]') + '|' + strip(WP.inline('[Margin: not a cite] and [handle @user]', { note: (h) => h, cite: () => 'X' })), 'A story|[Margin: not a cite] and [handle @user]', 'citation: other bracketed text with @ is left alone');
eq(WP.keyFor({ authors: 'The Economist Staff', title: "Russia's grey-zone attacks" }, {}), 'economist-russias', 'sources: a leading article is skipped and apostrophes dropped in keys');
eq(/font-family="Plex Mono, monospace"/.test(WP.chartSvg({ kind: 'bar', data: 'a,1\nb,2' }, '#C42A14')), true, 'chart: labels use the embedded Plex fonts');

// ---- 8. The eBook ----
eq(WP.blocks('* * *\n\n***').map((b) => b.t).join(' '), 'scene scene', 'blocks: three asterisks are a scene break, not a list');
eq([WP.numberWord(1), WP.numberWord(12), WP.numberWord(21), WP.roman(14)].join(','), 'One,Twelve,Twenty-One,XIV', 'book: chapter numbers in words and roman');
function book(over, bookOver) {
  const d = paper(over);
  d.meta.kind = 'book'; d.meta.subtitle = 'A Subtitle'; d.meta.colophon = 'An official product of Example Press.';
  d.authors = [{ name: 'Jane Doe', bio: 'Writes books. See [@typed].', org: false }];
  Object.assign(d.book, { copyright: '© 2026 Example Press. All rights reserved.', isbn: '978-0-00-000000-2', edition: 'First edition', description: 'About the book.', bookId: '0b7c2a8e-1f7d-4c3a-9a51-2a3c4d5e6f70', series: 'Global Warning Books', seriesNo: '3' }, bookOver || {});
  d.appendix = '# Acknowledgments\n\nThanks.';
  return d;
}
const bookBody = 'Opening.\n\n# Preface {-}\n\nWhy.^[A note.]\n\n# The Rise {part}\n\n# First\n\nClaim [@beckley-unrivaled, 25]. Again [@beckley-unrivaled, 30].\n\nSecond paragraph.\n\n* * *\n\nAfter.\n\n# Second\n\nOnce more [@beckley-unrivaled, 40].\n\n!> Pull.\n\n?> Box.';
r = WP.render(book({ body: bookBody }));
eq(/class="bk-cover"><svg/.test(r.html) && /class="fm bk-titlepage"/.test(r.html) && /class="fm bk-copy"/.test(r.html) && /class="fm bk-toc"/.test(r.html), true, 'book: cover, title page, copyright page, and contents');
eq((r.html.match(/<p class="ch-num">([^<]+)<\/p>/g) || []).map(strip).join(','), 'Part One,Chapter One,Chapter Two', 'book: parts and chapters numbered in words; {-} leaves a chapter unnumbered');
eq(/<li class="t-chapter in-part"><a href="#u4"><span class="lab">Chapter One<\/span><span class="tt">First<\/span><\/a><\/li>/.test(r.html), true, 'book: the contents lists chapters under their part, linked for page numbers');
const bn = notesOf(r.html);
eq(bn.join(' | '), '1 A note. | 1 Michael Beckley, Unrivaled: Why America Will Remain the World’s Sole Superpower [Monograph] (Cornell University Press: 2018): p. 25. | 2 Beckley, Unrivaled, p. 30. | 1 Michael Beckley, Unrivaled: Why America Will Remain the World’s Sole Superpower [Monograph] (Cornell University Press: 2018): p. 40. | 1 Example Agency, Annual Report (2024).',
  'book: notes numbered afresh in each chapter, each chapter citing a source in full first');
eq(/<p class="opener">Claim/.test(r.html) && /<p class="scene" role="separator">/.test(r.html) && /<p class="pull">Pull\.<\/p>/.test(r.html) && /<aside class="matter">/.test(r.html), true, 'book: opener, scene break, pull quote, and box');
eq(/ISBN 978-0-00-000000-2/.test(r.html) && /© 2026 Example Press/.test(r.html) && /An official product of Example Press\./.test(r.html) && /Set in EB Garamond/.test(r.html), true, 'book: copyright page carries the copyright line, colophon, ISBN, and type note');
eq(/@page\{size:6in 9in;/.test(r.vars) && /@top-center\{content:string\(chapter\)/.test(r.vars) && /@page front\{@top-left\{content:none\}/.test(r.vars), true, 'book: 6 x 9 pages, the chapter title as the running head, none on front matter');
eq(/size:8\.5in 11in/.test(WP.render(book({ body: bookBody }, { trim: 'letter' })).vars), true, 'book: page size follows the trim');
eq(/class="bk-unit k-back back" id="u6"><header class="ch-head"><h2 class="ch-title" id="h-u6" data-run="Acknowledgments">Acknowledgments<\/h2>/.test(r.html) && /id="about"/.test(r.html), true, 'book: back matter and the About the author page');
eq(r.stats.chapters + ':' + r.stats.parts, '2:1', 'book: stats count chapters and parts');
const endR = WP.render(book({ body: bookBody }, { notes: 'end' }));
eq(/<section class="bk-unit k-back bk-notes" id="notes">/.test(endR.html) && /<h3 class="nt-h">Chapter One: First<\/h3>/.test(endR.html) && /<sup class="en-call"><a id="enr-4-1" href="#en-4-1">1<\/a><\/sup>/.test(endR.html) && !/<span class="fn">/.test(endR.html.replace(/bk-about[\s\S]*$/, '')), true, 'book: notes can go at the back, grouped by chapter and linked both ways');
eq(WP.render(book({ body: '' })).problems.some((p) => p.level === 'fix' && /no chapters/.test(p.msg)), true, 'book checks: an empty book is flagged');
eq(WP.normalize({ meta: { kind: 'book' }, book: { trim: 'huge', cover: { layout: 'odd', zoom: '250', bg: 'red' } } }).book.trim + ':' + WP.normalize({ book: { cover: { layout: 'odd', zoom: '250', bg: 'red' } } }).book.cover.layout + ':' + WP.normalize({ book: { cover: { zoom: '250' } } }).book.cover.zoom + ':' + WP.normalize({ book: { cover: { bg: 'red' } } }).book.cover.bg,
  '6x9:photo:250:#1F2124', 'project file: book settings are checked when opened');
eq(WP.parseProject(WP.projectFile(book({ body: bookBody }))).doc.book.isbn, '978-0-00-000000-2', 'project file: a book reopens with its details');

// The cover.
const cv = WP.coverSvg(book({ body: bookBody }));
eq(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 1600 2400"/.test(cv) && />TEST PAPER<|>Test Paper</.test(cv) && />JANE DOE</.test(cv) && />EXAMPLE PRESS</.test(cv), true, 'cover: one SVG at the trim\'s proportions, with title, author, and publisher');
['photo', 'band', 'framed', 'type', 'art'].forEach((L) => {
  const d = book({ body: bookBody }); d.book.cover.layout = L; d.meta.coverImage = 'data:image/png;base64,iVBORw0KGgo='; d.book.cover.imgW = 2400; d.book.cover.imgH = 1600;
  const s = WP.coverSvg(d);
  eq(L === 'type' ? !/<image /.test(s) && />Test Paper</.test(s) : /<image /.test(s) && (L === 'art' ? !/<text/.test(s) : />Test Paper</.test(s)), true, 'cover: the ' + L + ' layout ' + (L === 'type' ? 'sets type alone' : 'draws the image' + (L === 'art' ? ' alone' : ' and the text')));
});
const longT = book({ body: '' }); longT.meta.title = 'A Very Long Title That Has To Wrap Across Several Lines On The Cover';
eq((WP.coverSvg(longT).match(/font-size="(\d+)"/) || [])[1] < 188 && (WP.coverSvg(longT).match(/<text/g) || []).length > 4, true, 'cover: a long title shrinks and wraps');

// The ePUB.
const td = new TextDecoder();
const epB = book({ body: bookBody, visuals: [{ id: 'img', kind: 'image', title: 'A map', image: 'data:image/png;base64,iVBORw0KGgo=' }, { id: 'ch', kind: 'bar', title: 'Up', source: 'Data', data: 'a,1\nb,2' }] });
epB.body += '\n\n[[img]]\n\n[[ch]]';
const ef = WP.epubFiles(epB, { css: 'body{color:--ACCENT--}', now: new Date('2026-11-06T12:00:00Z') });
const fileOf = (n) => { const f = ef.files.find((x) => x.name === n); return f ? td.decode(f.data) : null; };
eq(ef.files[0].name + ':' + fileOf('mimetype'), 'mimetype:application/epub+zip', 'epub: mimetype comes first');
const zip = WP.zipStore(ef.files);
eq(td.decode(zip.slice(30, 38)) + ':' + (zip[8] | (zip[9] << 8)), 'mimetype:0', 'epub: the zip stores mimetype first, uncompressed');
const opf = fileOf('EPUB/package.opf');
eq(/<dc:identifier id="bookid">urn:isbn:9780000000002<\/dc:identifier>/.test(opf) && /<dc:title id="subtitle">A Subtitle<\/dc:title>/.test(opf) && /<dc:creator id="creator1">Jane Doe<\/dc:creator>/.test(opf) && /property="file-as">Doe, Jane</.test(opf), true, 'epub: identifier from the ISBN, title, subtitle, and author');
eq(/<meta property="dcterms:modified">2026-11-06T12:00:00Z<\/meta>/.test(opf) && /<dc:date>2026-10<\/dc:date>/.test(opf) && /group-position">3</.test(opf) && /<dc:description>About the book\.<\/dc:description>/.test(opf), true, 'epub: modified date, publication date, series, and description');
const manifestHrefs = (opf.match(/href="([^"]+)"/g) || []).map((h) => 'EPUB/' + h.slice(6, -1));
eq(manifestHrefs.every((h) => ef.files.some((f) => f.name === h)) && ef.files.filter((f) => /^EPUB\/(?!package\.opf)/.test(f.name)).every((f) => manifestHrefs.indexOf(f.name) !== -1), true, 'epub: every file is in the manifest, and every manifest entry exists');
eq(/<item id="cover-image" href="images\/cover\.svg" media-type="image\/svg\+xml" properties="cover-image"\/>/.test(opf) && /<item id="nav" href="nav\.xhtml"[^>]*properties="nav"/.test(opf), true, 'epub: a cover image (SVG when the page gives no JPEG) and the navigation document');
eq(/id="img1" href="images\/fig-1\.png"/.test(opf) && /src="\.\.\/images\/fig-1\.png"/.test(fileOf('EPUB/text/u05.xhtml')), true, 'epub: pictures are moved out of the text into image files');
eq(/properties="svg"/.test((opf.match(/<item id="u5"[^>]*>/) || [''])[0]) && /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="chart"/.test(fileOf('EPUB/text/u05.xhtml')), true, 'epub: a chapter with a chart is marked as holding SVG, with its namespace');
const ch1 = fileOf('EPUB/text/u04.xhtml');
eq(/<section epub:type="chapter" role="doc-chapter" aria-labelledby="h-u4" class="unit k-chapter" id="u4">/.test(ch1) && /<a epub:type="noteref" role="doc-noteref" id="fnr-4-1" href="#fn-4-1">1<\/a>/.test(ch1) && /<aside epub:type="footnote" role="doc-footnote" class="fnote" id="fn-4-1">/.test(ch1), true, 'epub: chapters marked up as chapters, with pop-up notes at the end');
eq(/epub:type="preface" role="doc-preface"/.test(fileOf('EPUB/text/u02.xhtml')) && /epub:type="part" role="doc-part"/.test(fileOf('EPUB/text/u03.xhtml')) && /epub:type="acknowledgments"/.test(fileOf('EPUB/text/u06.xhtml')), true, 'epub: preface, part, and acknowledgments carry their roles');
const nav = fileOf('EPUB/nav.xhtml');
eq(/<li><a href="text\/u03\.xhtml">Part One: The Rise<\/a><ol><li><a href="text\/u04\.xhtml">Chapter One: First<\/a><\/li><li><a href="text\/u05\.xhtml">Chapter Two: Second<\/a><\/li><\/ol><\/li>/.test(nav) && /epub:type="landmarks"/.test(nav), true, 'epub: contents nest chapters under their part, with landmarks');
eq(fileOf('EPUB/css/book.css').indexOf('color:#9E3B22') !== -1, true, 'epub: the stylesheet takes the book\'s accent');
// Every XHTML file is well formed: tags open and close in order.
function wellFormed(x) {
  const body = x.replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/g, ''), stack = [], re = /<(\/?)([A-Za-z][\w:.-]*)\b[^>]*?(\/?)>/g; let mm;
  while ((mm = re.exec(body))) { if (mm[3]) continue; if (mm[1]) { if (stack.pop() !== mm[2]) return false; } else stack.push(mm[2]); }
  return stack.length === 0 && !/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(body);
}
eq(ef.files.filter((f) => /\.(xhtml|opf|ncx|xml)$/.test(f.name)).every((f) => wellFormed(td.decode(f.data))), true, 'epub: every XHTML and XML file is well formed');
eq(WP.w3cDate('November 6, 2026') + ',' + WP.w3cDate('6 November 2026') + ',' + WP.w3cDate('2026') + ',' + WP.w3cDate('Fall 2026'), '2026-11-06,2026-11-06,2026,2026', 'epub: dates become W3C dates');

// Editing sources inside the builder.
const st = WP.blankOsint('news');
Object.assign(st, { authors: 'Jane Doe', title: 'Drones Over the Eastern Front', location: 'Example Times', date: '2024-05-01' });
const pv = WP.osintPreview(st);
eq(strip(pv.full) + ' | ' + strip(pv.short), 'Jane Doe, “Drones Over the Eastern Front,” Example Times (01 May 2024). | Doe, “Drones Over the Eastern Front.”', 'sources: an edited source previews its full and short notes');
eq(WP.newOsintSource(st, imp.sources).key, 'doe-drones-2', 'sources: a new source gets a key that is not taken');
const lf = JSON.parse(WP.osintListFile(imp.sources.concat([{ key: 'typed', kind: 'typed', full: 'X' }]), 'Mine'));
eq(lf.app + ':' + lf.sources.length + ':' + WP.importOsintList(JSON.stringify(lf), []).sources.length, 'OSINT Citation Generator:2:2', 'sources: OSINT sources save as a list file the generator and this page can open');

console.log(failed ? `\n${failed} failed, ${passed} passed` : `All ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
