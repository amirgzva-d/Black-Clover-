# MARIA 0.7.4 — Accurate Dated Accounting Ledger Scanner

Date: 2026-10-11

## Critical fixes

### Real XLSX parser fix
- XLSX can represent an empty cell as `<c r="D25" s="21"/>`. The former `parseCells` regex treated that self-closing cell as an opening tag, consumed E25's value, and silently misclassified plate rows. The parser now handles self-closing and normal `<c>...</c>` cells independently.
- No workbook is modified in place. All scans operate on a disk snapshot.

### Correct record model
- Beginning at Excel row **14**, count records **only when B contains an Excel date**.
- **C:** plate / receipt tracking identifier (must exist).
- **D:** receipt amount; plate rows may also contain an amount or a copy of the weight.
- **E:** plate weight **when a plausible weight value (up to 1,000,000 kg)**. In some invoices, E instead contains a very large rolling *account balance* in receipt rows. Hence "E is filled" alone is not proof of plate.
- Each receipt needs **one verified photo link** and each plate needs **two distinct verified photo links**. A plate's second link can live on C.
- Photo columns are detected per sheet and per record type: normally H/I/J, and G if actual hyperlink relationships show G is the image column. Do not interpret financial flags/balances as photo IDs.
- Any photo number without a hyperlink, a link with missing value, or a hyperlink to an unavailable destination is reported as a specific issue. An external web resource whose target cannot be locally verified remains *unverified*, not automatically counted as valid.
- The sheet-level and workbook-level report includes linked/verified photos, receipts, plates, dated total, missing IDs, broken/unverified photos and row-specific problems.

### Sheet selection and compact UI
- Auto-select up to **two named invoice sheets**, leaving generic support sheets like Sheet1/Sheet2 unselected unless there are no named sheets.
- Each monitor's existing action row has a compact **Settings** button. It lists **every workbook sheet**, its name and the count of dated rows from 14 onwards.
- Default mode automatically chooses two invoice sheets. Manual mode lets the user select any combination, including more than two, and persists the choice in the original monitor profile.
- No changes to the mini avatar capsule, rectangular Top Island header or main character visuals. CSS additions apply only to sheet settings in the expanded reports panel.

## Reality checks (no private customer file committed)
- A workbook already connected to MARIA on the authorized Windows PC has **4 sheets**, with the two named invoice sheets containing **21 dated records each**. Manual code inspection and read-only scans confirm **42 total = 22 receipts + 20 plate rows**. Two generic helper sheets are excluded in auto mode.
- Its receipt photo column differs between the two invoice sheets (J vs I); plate photos use I/J depending on row and sheet.
- This local workbook currently references photos using external relative paths, many of which are unavailable from its current location. The scanner correctly does not count those links as physically verified merely because a photo number is visible.
- The separate uploaded workbook also has 4 sheets, two named main sheets plus two generic helpers. Its named sheets hold **54 and 37** dated rows, with receipt photo links mainly H and G respectively and occasional plate photos linked on C. That sample's original photos were not uploaded. It was analyzed read-only; no customer details, actual workbooks, or their financial data were added to GitHub.
- A synthetic four-sheet XLSX regression test verifies: 21 dated rows per named sheet, 42 totals, one versus two required photos, H/G/I/J and C links, missing photo number, number without link, missing target, manual selection, and the self-closing XLSX cell parser fix.
- Older invoice monitors migrate to the v2 profile with a **separate pre-v2 JSON backup**; existing manually selected sheets and evidence root are preserved.

## Backward compatibility & deployment
- Legacy accounting profiles still use the former configurable scanner rather than silently changing custom business rules.
- Transport-monitor configuration is unchanged pending an example of a transport workbook.
- User XLSX files, pictures, past scan history, reminder data, and shortcuts must not be changed or deleted.
- Use isolated Git worktree; check full Node tests and Vite build before pushing. Merge onto the original Windows checkout via per-file three-way merge with backups because the user has independent uncommitted edits.
- Explicitly do not force-clean, reset, or overwrite the user's MARIA files. Install version 0.7.4 over the existing installation only after making a safe application binary/data backup.
