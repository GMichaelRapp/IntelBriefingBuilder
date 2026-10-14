# Changelog

## 1.1 — October 2026

- **Intelligence briefs.** A switch at the top now chooses between a white paper and an intelligence brief. The brief has its own design:
  - a full-bleed cover photo with the brief's name, number, and date
  - an "In this brief" page with the colophon
  - numbered stories that run on, each with a "So, why does this matter?" box (`?>`)
  - a Sources page, numbered in order of first citation
- In a brief, `[@key]` prints nothing in the text and adds the source to the Sources page. `[ORIGINAL STORY: @key]` labels the entry.
- Citations can now start with a label or a lead-in word: `[ORIGINAL STORY: @key]`, `[see @key]`. In a white paper, the lead-in prints in the footnote.
- `?>` boxes also work in white papers.
- Chart labels now use the built-in Plex fonts. Before, they asked for a font name the page does not define and fell back to the browser's default.
- Source keys skip a leading "The" in an organization's name and drop apostrophes, so The Economist Staff on "Russia's grey zone" becomes `economist-russias`.
- EB Garamond and Cormorant Garamond are built into the page for the brief: Latin, Latin Extended, and Cyrillic.

## 1.0 — October 2026

First release.

- A white paper built from what you type, as US Letter pages, saved as a PDF through the browser's print dialog. The paper has these parts:
  - a cover with masthead, paper number, title, author, version, page count, and an optional cover image
  - a contents page with page numbers, a list of figures and tables, and an "About the series" box
  - a one-page executive summary with numbered key findings and recommendations
  - numbered sections and subsections, each section starting a new page
  - footnotes at the foot of each page, numbered through the whole paper
  - appendices lettered A, B, C, with the Admiralty source rating key available as a table
  - an "About this paper" page with the author, a "Cite as" line, version history, and the series list
- Running headers with the paper number and section, and footers with the short title and page number.
- Citations from OSINT Citation Generator list files: [@key, p. 45] gives the full footnote the first time and the short form after that.
- Column, bar, and line charts drawn from pasted data, plus tables, timelines, key numbers, and images, all numbered and captioned with their sources.
- Key points, margin notes, labeled rows for recommendations and indicators, block quotes, and lists.
- Checks for missing titles, unknown source keys, figures without sources, unplaced visuals, and uncited sources.
- Projects save to a file and reopen on any computer. Work in progress is kept in the browser.
- Runs entirely in the browser, and nothing is sent anywhere. Fonts are built in, so the PDF looks the same on every computer.
