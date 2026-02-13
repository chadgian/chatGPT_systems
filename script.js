import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.mjs';

const folderInput = document.getElementById('folderInput');
const extraInput = document.getElementById('extraInput');
const scanBtn = document.getElementById('scanBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectNoneBtn = document.getElementById('selectNoneBtn');
const searchInput = document.getElementById('searchInput');
const statusText = document.getElementById('statusText');
const tableBody = document.getElementById('fileTableBody');

const totalFilesEl = document.getElementById('totalFiles');
const totalPagesEl = document.getElementById('totalPages');
const totalSizeEl = document.getElementById('totalSize');
const selectedFilesEl = document.getElementById('selectedFiles');
const selectedPagesEl = document.getElementById('selectedPages');
const selectedSizeEl = document.getElementById('selectedSize');
const selectedCountLabel = document.getElementById('selectedCountLabel');

let scannedRows = [];

function formatKB(bytes) {
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
}

async function getPageCount(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages = pdf.numPages || 0;
    pdf.destroy();
    return pages;
}

async function scanFiles() {
    const folderFiles = Array.from(folderInput.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const extraFiles = Array.from(extraInput.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));

    if (folderFiles.length === 0 && extraFiles.length === 0) {
        statusText.textContent = 'No PDF files found. Select a folder and/or additional PDF files.';
        return;
    }

    statusText.textContent = 'Scanning PDFs and counting pages...';
    scanBtn.disabled = true;

    const merged = new Map();
    for (const file of [...folderFiles, ...extraFiles]) {
        merged.set(fileKey(file), file);
    }

    const allFiles = Array.from(merged.values());
    const rows = [];

    for (let i = 0; i < allFiles.length; i += 1) {
        const file = allFiles[i];
        let pages = 0;

        try {
            pages = await getPageCount(file);
        } catch (err) {
            pages = 0;
        }

        const source = folderFiles.some(f => fileKey(f) === fileKey(file)) ? (extraFiles.some(f => fileKey(f) === fileKey(file)) ? 'Folder + Extra' : 'Folder') : 'Extra';

        rows.push({
            id: `row-${i}`,
            include: true,
            name: file.name,
            source,
            size: file.size,
            pages,
            path: file.webkitRelativePath || '(extra file)',
        });

        statusText.textContent = `Processed ${i + 1}/${allFiles.length}: ${file.name}`;
    }

    scannedRows = rows;
    statusText.textContent = `Scan complete. ${rows.length} PDF file(s) ready.`;
    scanBtn.disabled = false;

    renderTable();
    updateMetrics();
}

function renderTable() {
    const term = (searchInput.value || '').toLowerCase().trim();
    const visibleRows = scannedRows.filter(row => {
        if (!term) return true;
        return [row.name, row.path, row.source].join(' ').toLowerCase().includes(term);
    });

    if (visibleRows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty">No files match your search.</td></tr>';
        return;
    }

    tableBody.innerHTML = visibleRows.map(row => `
        <tr>
            <td>
                <input type="checkbox" data-id="${row.id}" ${row.include ? 'checked' : ''}>
            </td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.source)}</td>
            <td>${row.pages}</td>
            <td>${formatKB(row.size)}</td>
            <td>${escapeHtml(row.path)}</td>
        </tr>
    `).join('');
}

function updateMetrics() {
    const totalFiles = scannedRows.length;
    const totalPages = scannedRows.reduce((sum, row) => sum + row.pages, 0);
    const totalSize = scannedRows.reduce((sum, row) => sum + row.size, 0);

    const selected = scannedRows.filter(row => row.include);
    const selectedPages = selected.reduce((sum, row) => sum + row.pages, 0);
    const selectedSize = selected.reduce((sum, row) => sum + row.size, 0);

    totalFilesEl.textContent = `${totalFiles}`;
    totalPagesEl.textContent = `${totalPages}`;
    totalSizeEl.textContent = formatKB(totalSize);

    selectedFilesEl.textContent = `${selected.length}`;
    selectedPagesEl.textContent = `${selectedPages}`;
    selectedSizeEl.textContent = formatKB(selectedSize);
    selectedCountLabel.textContent = `${selected.length} of ${totalFiles} selected`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

scanBtn.addEventListener('click', scanFiles);

folderInput.addEventListener('change', () => {
    const fileCount = Array.from(folderInput.files || []).length;
    statusText.textContent = fileCount > 0
        ? `Folder selected with ${fileCount} file(s). Click “Scan & Build Summary”.`
        : 'No folder selected yet.';
});

extraInput.addEventListener('change', () => {
    const fileCount = Array.from(extraInput.files || []).length;
    if (fileCount > 0) {
        statusText.textContent = `${fileCount} extra file(s) selected. Click “Scan & Build Summary”.`;
    }
});

selectAllBtn.addEventListener('click', () => {
    scannedRows = scannedRows.map(row => ({ ...row, include: true }));
    renderTable();
    updateMetrics();
});

selectNoneBtn.addEventListener('click', () => {
    scannedRows = scannedRows.map(row => ({ ...row, include: false }));
    renderTable();
    updateMetrics();
});

searchInput.addEventListener('input', renderTable);

tableBody.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
        return;
    }

    const id = target.dataset.id;
    scannedRows = scannedRows.map(row => row.id === id ? { ...row, include: target.checked } : row);
    updateMetrics();
});
