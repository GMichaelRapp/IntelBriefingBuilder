# eBook Builder

Build an eBook for your readers to download and read offline, and save it two ways: as a **PDF**, laid out as book pages, and as an **ePUB**, the reflowable format reading apps use (Apple Books, Kobo, Google Play Books, Thorium, and Kindle through Send to Kindle). You fill in the details and write the text with light markup; the tool sets the pages.

The switch at the top chooses what you are making: **eBook**, **White paper**, or **Intelligence brief**. All three share the same sources, notes, visuals, and markup. This is version 2 of the White Paper Builder; papers and briefs work exactly as before, and are described further down.

It is one web page. There is nothing to install, no account, and nothing is sent anywhere.

## eBooks

A finished eBook has these parts, in this order:

- a cover, designed under **Cover**
- a half-title page (optional) and a title page
- a copyright page with the colophon, edition, ISBN or ISSN, and credits, set small at the foot of the page
- a dedication and an epigraph (both optional)
- contents, with page numbers in the PDF
- parts and chapters, each starting a new page
- back matter: acknowledgments, appendices, a note on sources
- notes at the back of the book (if you choose that)
- an "About the author" page from the biographies

In the PDF, left-hand pages carry the book's short title at the top and right-hand pages the chapter's title; page numbers sit at the outer corner. Front matter, part pages, and chapter openings carry no running heads.

### The tabs

| Tab | What goes there |
|---|---|
| **Book** | Title, subtitle, authors and biographies, date, series, language, front matter, the copyright page and colophon, the description and subjects reading apps show, and the layout: page size, typeface, chapter numbering, paragraph style, where notes go, accent color |
| **Cover** | The cover designer, with a live preview |
| **Chapters** | The book itself |
| **Visuals** | Charts, tables, timelines, key numbers, and images, as in the white paper |
| **Back matter** | Acknowledgments, appendices, a glossary: anything after the last chapter |
| **Sources** | Your OSINT sources: open a list file, add or edit sources, cite them |

### Writing the chapters

| Type this | To get |
|---|---|
| `# Title` | A numbered chapter: Chapter One, Two, Three. Each starts a new page and is listed in the contents. |
| `# Title {-}` | An unnumbered chapter: an introduction, preface, foreword, prologue, or epilogue |
| `# Title {part}` | A part on a page of its own: Part One. The chapters after it belong to it in the contents. |
| `## Title` | A section heading inside a chapter |
| `### Title` | A small heading, in italics |
| a blank line | A new paragraph. Paragraphs after the first are indented, as in a printed book, unless you choose spaced paragraphs. |
| `* * *` | A scene break |
| `^[note text]` | A note |
| `[@key, p. 45]` | A cited source, in a note |
| `> text` | A block quotation |
| `!> text` | A pull quote, set large between rules |
| `?> text` | A boxed aside, with the heading set under Book |
| `>> text` | A short aside in italics |
| `- item`, `1. item`, `{Label} text` | Lists and labeled rows |
| `[[name]]` | A chart, table, or image from Visuals |
| `---` | A new page in the PDF (the ePUB ignores it) |

Italic, bold, and links work as everywhere else. Chapter numbers can be words (Chapter One), figures (Chapter 1), or roman (Chapter I), with any word before them, or none.

Notes are numbered afresh in each chapter, and each chapter gives its first citation of a source in full, later ones in short form, so a reader who opens the book in the middle still finds full citations. In the PDF, notes print at the foot of the page or, if you choose, at the back of the book under each chapter's name, linked both ways. In the ePUB they go at the end of each chapter, marked so that reading apps that support it show them as pop-ups.

### The cover

Under **Cover**, choose a layout:

- **Photo to every edge**, with the text on a dark fade. Place it low, in the middle, or high.
- **Photo above, text on a band of color** below.
- **Framed photo** between the title and the author.
- **Type only**, on a background color.
- **Finished artwork**: an image you designed elsewhere is the whole cover, with no text over it.

Choose the image, then move it with **Across**, **Up and down**, and **Zoom**, and set how dark the fade is. You can change the title's face (Cormorant Garamond, EB Garamond, Plex Sans Condensed, or Plex Mono) and size, set it in capitals, align the text left or centered, set the background, text, and accent colors, add a line above the title (such as "A Global Warning Book"), and show or hide the subtitle, authors, and publisher. The title shrinks and wraps to fit.

The cover is the first page of the PDF and the cover image of the ePUB. **Save the cover as an image** gives you a 1600-pixel-wide JPEG for a Substack post or a store listing.

### Saving the PDF

As for a white paper: **Print or save as PDF**, then **Save as PDF** in the print dialog. The page size comes from the book (6 × 9 in by default; also 5.5 × 8.5 in, A5, or US Letter for easy printing at home), so leave the paper size and margins at their defaults. The file is named after the book's title.

Page numbers count from the cover, so the number printed on a page matches the page number your PDF reader shows.

### Saving the ePUB

Click **Save ePUB**. The file is an EPUB 3 package that passes the W3C's EPUBCheck with no errors or warnings. It holds:

- the cover, drawn as a JPEG
- the title page, copyright page, dedication, and epigraph
- the contents, with parts holding their chapters, and the landmarks reading apps use for "Go to cover" and "Start reading"
- each part, chapter, and back-matter page as its own file, marked as a chapter, part, preface, acknowledgments, appendix, and so on
- charts, as drawings that stay sharp at any size, and images as files of their own
- the book's typefaces (EB Garamond and Cormorant Garamond, or IBM Plex), which readers can turn off in their app's settings
- the title, subtitle, authors, publisher, date, language, description, subjects, series, and an identifier: the ISBN if you give one, otherwise an ID the tool makes once and keeps with the project

The layout reflows: text size, margins, and night mode stay under the reader's control.

## Editing sources

Under **Sources**, every source has an **Edit** button. For a source from an OSINT Citation Generator list, it opens that tool's fields here: the kind of source, authors, title and how it is set, location, description, details, reliability and credibility, publisher, dates, web address, locator, commentary, and, under **More**, editors, translators, contributors, translation, access, qualifiers, the archive link, and the short form. The full note, the short form, and the generator's own checks update as you type, and every note that cites the source follows. **Undo these changes** puts the source back as it was when you opened it.

**New OSINT source** adds a source from scratch, in the same fields. Its key is made from its author and title when you click Done.

**Save these sources as an OSINT list file** writes your sources, edits included, to a file the OSINT Citation Generator opens, so the generator and the builder stay in step.

This works the same way in white papers and briefs.

## White papers

A finished paper has these parts:

- a cover
- a contents page with page numbers
- a one-page executive summary
- numbered sections, each starting on a new page
- footnotes at the foot of each page
- charts and tables
- lettered appendices
- an "About this paper" back page

Every page carries a running header and a page number.

It is one web page. There is nothing to install, no account, and nothing is sent anywhere.

## Using it

Open `index.html` in Chrome or Edge, or use the hosted copy linked in this repository's About box. Other browsers work for writing, but Chrome and Edge print the pages most faithfully.

The tabs on the left hold the paper. The pages on the right update as you type.

| Tab | What goes there |
|---|---|
| **Paper** | Title, subtitle, authors and their biographies, date, paper number, version, short title for the footers, cover image, series and publisher details, the "About the series" box, accent color, and page color |
| **Summary** | The problem in brief, key findings (one per line), and recommendations (one per line) |
| **Body** | The paper itself |
| **Visuals** | Charts, tables, timelines, key numbers, and images |
| **Appendix** | Appendices, with the same markup as the body |
| **Sources** | Sources opened from OSINT Citation Generator list files |
| **Back page** | Version history, the series list, and licensing terms |

The panel above the pages lists anything to **fix**, **check**, or **note**. Click a line to go to the tab it concerns.

A new paper starts from the template. Its guidance is in [square brackets]; replace it as you write.

### Authors

Under **Paper**, add each author with **+ Add an author**: a name and a short biography. Use the arrows to set the order. The order carries through to the cover, the "Cite as" line, and the "About this paper" page.

- The cover lists every author: Jane Doe and John Roe; Jane Doe, John Roe, and Ann Lee.
- "Cite as" follows Chicago bibliography form. Only the first name is inverted (Doe, Jane, John Roe, and Ann Lee). With more than six authors, it gives the first three and "et al."
- Tick **An organization** for an author such as RAND Corporation, so its name is not inverted.
- Each biography prints on the "About this paper" page under the author's name. Notes and citations work in biographies too.

A paper saved before version 1.3 opens with its one author and biography already in the list.

### Writing the body

| Type this | To get |
|---|---|
| `# Title` | A numbered section, starting a new page. You can turn the new pages off under Paper. |
| `## Title` | A numbered subsection: 3.1, 3.2 |
| `### Title` | A small heading, not numbered |
| a blank line | A new paragraph |
| `*italic*`, `**bold**`, `[text](https://...)` | Italic, bold, and a link |
| `^[note text]` | A footnote |
| `[@key, p. 45]` | A cited source, in a footnote |
| `!> text` | A key point, set large |
| `>> text` | A margin note beside the next paragraph |
| `> text` | A block quotation |
| `- item`, `1. item` | Lists |
| `{R1} text` | A row with a label in the margin, for recommendations and indicators |
| `[[name]]` | The chart, table, or image with that name |
| `---` | A new page |

The toolbar above the text inserts the most-used of these: sections, notes, bold and italic, citations, key points, margin notes, quotations, lists, labeled rows, visuals, and page breaks.

### Citing sources

1. In the [OSINT Citation Generator](https://gmichaelrapp.github.io/OSINT_Cites/), save your source list to a file.
2. Under **Sources**, open that file. Each source gets a short key, such as `beckley-unrivaled`.
3. Click **Cite** to put `[@beckley-unrivaled]` where your cursor was. Add a page inside the brackets: `[@beckley-unrivaled, p. 45]`.

The first time a source is cited, its footnote is the full OSINT Style Guide citation. Every later citation is the short form, as the guide prefers to "Ibid." You can use more than one list file, and you can rename a key; the text follows the change.

Web addresses in the notes are links in the PDF, so a reader can open the source.

Two sources in one footnote go in the same brackets: `[@one, p. 4; @two]`. Inside a footnote you write yourself, a citation prints in the note's own text: `^[On sea days, see [@two].]`.

You can also add a source by hand, with its full and short forms.

### Visuals

Add a visual under **Visuals**, give it a name, and place it in the text with `[[name]]` on a line of its own.

Each takes a title and a source line. Charts, tables, timelines, and images can also have a reading note, which prints in the margin. Figures and tables are numbered in the order they appear and listed on the contents page. In an appendix they are numbered by appendix: Table A1, Figure B1.

| Kind | What it needs |
|---|---|
| Column chart, bar chart, line chart | Data pasted from a spreadsheet, typed with commas, or given as a Markdown table. A header row names the series. When you type with commas, write 1200 rather than 1,200, or paste from a spreadsheet. You can highlight one label in the accent color. |
| Table | The same kinds of data. The first row is the header unless you untick that. Put a cell that contains a comma in "quotation marks". You can highlight a row. |
| Timeline | One event per line: a date, a comma, then what happened. Dates such as March 3, 2022 keep their own comma. |
| Key numbers | Up to four lines: the number, a comma, then what it measures. Numbers such as 1,200 keep their own comma. |
| Image or map | A PNG, JPEG, GIF, WebP, or SVG file. Large photos are scaled down to keep the project small. |

`[[rating-key]]` adds the Admiralty source rating key used in the OSINT Style Guide as a table.

### Saving the PDF

1. Click **Print or save as PDF**.
2. In the print dialog, choose **Save as PDF** as the destination. Leave the paper size and margins at their defaults; the paper sets them.
3. If the off-white page color is missing, turn on **Background graphics**. To save ink, choose a white page under **Paper** instead.

Printing needs the page open in its own browser tab. Previews embedded inside other apps may block the print dialog.

### Saving your work

The project is kept in this browser as you work, separately from the White Paper and Intel Briefing builders, so having all of them on one site does not mix up their work. To keep a copy, or to move to another computer, use **Save project**. It saves a `.json` file with everything in it, images included; **Open project** brings it back.

Clearing your browser's site data clears the paper in progress.

## Intelligence briefs

Choose **Intelligence brief** at the top. The brief is a short companion publication with its own design, set in EB Garamond and Cormorant Garamond with a gold accent. It has these parts:

- a cover photo running to every edge, with the brief's name, number, and date on a dark fade
- an "In this brief" page listing the stories, with the colophon below
- numbered stories that run on, one after another, each ending in a "So, why does this matter?" box
- a Sources page at the end, numbered in the order the sources are first cited, with a small matching number in the text wherever a source is cited

Every page after the cover carries the brief's name and number at the foot, with the page number.

In brief mode the tabs are **Brief** (name, number, date, cover photo and credit, colophon, the heading of the why-it-matters box, the note under Sources, and accent color), **Stories**, **Visuals**, and **Sources**. The Summary, Appendix, and Back page tabs belong to the white paper and are hidden.

### Writing the stories

| Type this | To get |
|---|---|
| `# Title` | A numbered story: 01, 02, 03, listed under "In this brief" |
| `## Title` | A subheading inside a story |
| `> text` | A quotation, indented and set smaller |
| `?> text` | The "So, why does this matter?" box. A line with only `?>` starts a new paragraph inside it. |
| `[@key]` | Prints the source's number, raised, where you cite it, and adds the source to the numbered list on the Sources page |
| `[@one; @two]` | Both numbers, as in ³,⁵ |
| `[ORIGINAL STORY: @key]` | The same, with that label in bold before the source's entry |
| `^[note text]` | A footnote, when a story needs one. Notes are marked \*, †, ‡ so they are not confused with source numbers. |

Italic, bold, links, lists, visuals (`[[name]]`), and page breaks (`---`) work as in the white paper. Each source appears once on the Sources page, as its full OSINT Style Guide citation, and keeps the same number every time it is cited; a page given in its first citation, as in `[@key, p. 4]`, is kept.

In the PDF, each number in the text is a link to its source's entry, and each web address on the Sources page is a link to the source itself. The stories listed under "In this brief" link to their pages too. To print the brief without the numbers in the text, untick **Show each citation's source number in the text** under Brief; notes are then numbered 1, 2, 3 again.

`?>` also works in a white paper, where it prints as a box with the heading in the margin.

Switching between the two keeps everything you have written. A template you have not touched yet is swapped for the other format's template.

## Your data

The page runs entirely in your browser and makes no network requests. The fonts are built into the page, Cyrillic included, so the PDF looks the same on any computer.

## Known limits

- A table that runs onto a second page does not repeat its header row there.
- Printing is most faithful in Chrome and Edge. Drawing the cover as an image for the ePUB also works best there; in a browser that refuses, the ePUB carries the cover as a drawing (SVG) instead.
- Kindle does not open ePUB files directly; send the ePUB with Amazon's Send to Kindle, which converts it.
- In the PDF, page numbers count from the cover rather than restarting at the first chapter.

## For maintainers

`index.html` is built from the files in `src/`:

- `src/core.js` turns a paper, a brief, or a book into HTML: notes, citations, numbering, charts, and the contents. It also draws the book cover as SVG, writes the ePUB package (zip, package document, navigation, XHTML), and previews and saves edited OSINT sources. It has no page and no browser code, so the tests run it directly.
- `src/paper.css` is the printed design of the white paper: page size and margins, the margin column, headings, footnotes, figures, cover, and back page. Paged.js reads it to lay out the pages.
- `src/brief.css` is the printed design of the intelligence brief, used instead of `paper.css` for a brief.
- `src/book.css` is the printed design of the eBook. The page size, margins, and running heads come from `core.js`, which knows the trim size.
- `src/epub.css` is the ePUB's stylesheet. `--ACCENT--` in it is replaced with the book's accent color.
- `src/ui.js` is the editor: tabs, toolbar, visuals, sources and the source editor, the cover designer, preview, files, printing, and the ePUB (it draws the cover to a canvas and hands the core the font files).
- `src/page.html` holds the editor's markup and styles.
- `src/vendor/` holds Paged.js, the OSINT Citation Generator core, and the fonts (IBM Plex, EB Garamond, and Cormorant Garamond), unmodified.

After any change, rebuild and test:

```
python3 src/build.py
node Tests/run.js
```

Both need nothing beyond Python 3 and Node 18 or later. To check an ePUB against the standard, run the W3C's EPUBCheck on it: `java -jar epubcheck.jar book.epub`. The tests also run on GitHub whenever a change is pushed.

To pick up a newer OSINT Citation Generator, copy the contents of its `<script id="core">` block into `src/vendor/osint-core.js`, rebuild, and run the tests.

## License

© 2026 G. Michael Rapp. MIT License; see `LICENSE`. The page includes Paged.js (MIT) and the IBM Plex, EB Garamond, and Cormorant Garamond fonts (SIL Open Font License 1.1). See `NOTICE.md`.
