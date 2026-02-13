<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Folder Summary Studio</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<main class="app-shell">
    <header class="hero">
        <div>
            <p class="eyebrow">PDF SUMMARY STUDIO</p>
            <h1>Scan a folder, then optionally add extra PDF files</h1>
            <p class="subtitle">
                Choose a local folder from your device, automatically discover all PDFs, and generate folder-wide metrics
                like total files, total pages, and total size. You can then attach more PDFs to include in the same report.
            </p>
        </div>
        <div class="hero-badge">No server upload required for scanning</div>
    </header>

    <section class="panel controls">
        <h2>1) Choose files</h2>
        <div class="input-grid">
            <label class="file-card">
                <span class="file-card-title">Select a folder</span>
                <span class="file-card-desc">All PDFs from this folder are included automatically.</span>
                <input id="folderInput" type="file" webkitdirectory directory multiple>
            </label>

            <label class="file-card">
                <span class="file-card-title">Add extra PDFs (optional)</span>
                <span class="file-card-desc">Use this to include PDFs outside the selected folder.</span>
                <input id="extraInput" type="file" accept="application/pdf,.pdf" multiple>
            </label>
        </div>

        <div class="toolbar">
            <button type="button" id="scanBtn" class="primary">Scan & Build Summary</button>
            <button type="button" id="selectAllBtn">Select all</button>
            <button type="button" id="selectNoneBtn">Clear all</button>
            <input id="searchInput" type="search" placeholder="Search files...">
        </div>
        <p id="statusText" class="status-text">No folder selected yet.</p>
    </section>

    <section class="panel metrics" aria-live="polite">
        <h2>2) Summary</h2>
        <div class="metric-grid">
            <article class="metric">
                <p>All discovered PDFs</p>
                <strong id="totalFiles">0</strong>
            </article>
            <article class="metric">
                <p>Total pages (all)</p>
                <strong id="totalPages">0</strong>
            </article>
            <article class="metric">
                <p>Total size (all)</p>
                <strong id="totalSize">0 KB</strong>
            </article>
            <article class="metric">
                <p>Selected PDFs</p>
                <strong id="selectedFiles">0</strong>
            </article>
            <article class="metric">
                <p>Selected pages</p>
                <strong id="selectedPages">0</strong>
            </article>
            <article class="metric">
                <p>Selected size</p>
                <strong id="selectedSize">0 KB</strong>
            </article>
        </div>
    </section>

    <section class="panel table-panel">
        <div class="table-head">
            <h2>3) File details</h2>
            <span id="selectedCountLabel">0 of 0 selected</span>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>Include</th>
                    <th>File</th>
                    <th>Source</th>
                    <th>Pages</th>
                    <th>Size</th>
                    <th>Path</th>
                </tr>
                </thead>
                <tbody id="fileTableBody">
                <tr>
                    <td colspan="6" class="empty">Choose a folder and click “Scan & Build Summary”.</td>
                </tr>
                </tbody>
            </table>
        </div>
    </section>
</main>

<script type="module" src="script.js"></script>
</body>
</html>
