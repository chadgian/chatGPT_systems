import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.mjs';

const folderInput = document.getElementById('folderInput');
const extraInput = document.getElementById('extraInput');
const scanBtn = document.getElementById('scanBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectNoneBtn = document.getElementById('selectNoneBtn');
const resetBtn = document.getElementById('resetBtn');
const searchInput = document.getElementById('searchInput');
const statusText = document.getElementById('statusText');
const tableBody = document.getElementById('fileTableBody');
const selectedFolders = document.getElementById('selectedFolders');
const selectedFilesList = document.getElementById('selectedFilesList');

const totalFilesEl = document.getElementById('totalFiles');
const totalPagesEl = document.getElementById('totalPages');
const totalSizeEl = document.getElementById('totalSize');
const selectedFilesEl = document.getElementById('selectedFiles');
const selectedPagesEl = document.getElementById('selectedPages');
const selectedSizeEl = document.getElementById('selectedSize');
const selectedCountLabel = document.getElementById('selectedCountLabel');

let folderFiles = [];
let extraFiles = [];
let scannedRows = [];

function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
}

function formatKB(bytes) {
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function getTopFolder(file) {
    const rel = file.webkitRelativePath || '';
    return rel.includes('/') ? rel.split('/')[0] : '(selected folder)';
}

function toPdfFiles(list) {
    return Array.from(list || []).filter(file => file.name.toLowerCase().endsWith('.pdf'));
}

function invalidateScan(message) {
    scannedRows = [];
    tableBody.innerHTML = '<tr><td colspan="6" class="empty">Choose files and click “Scan & Build Summary”.</td></tr>';
    updateMetrics();
    if (message) {
        statusText.textContent = message;
    }
}

function renderSelectedFolders() {
    const folderNames = [...new Set(folderFiles.map(getTopFolder))];
    if (folderNames.length === 0) {
        selectedFolders.innerHTML = '<span class="placeholder">No folder selected.</span>';
        return;
    }

    selectedFolders.innerHTML = folderNames.map(name => `
        <span class="tag">
            ${escapeHtml(name)}
            <button type="button" class="mini-remove" data-remove-folder="${escapeHtml(name)}" aria-label="Remove folder ${escapeHtml(name)}">×</button>
        </span>
    `).join('');
}

function renderSelectedFiles() {
    const rows = [
        ...folderFiles.map(file => ({ file, source: 'Folder' })),
        ...extraFiles.map(file => ({ file, source: 'Extra' })),
    ];

    if (rows.length === 0) {
        selectedFilesList.innerHTML = '<li class="placeholder">No files selected yet.</li>';
        return;
    }

    selectedFilesList.innerHTML = rows.map(({ file, source }) => {
        const key = fileKey(file);
        const path = file.webkitRelativePath || file.name;
        return `
            <li>
                <span><strong>${escapeHtml(file.name)}</strong> <em>(${source})</em><br><small>${escapeHtml(path)}</small></span>
                <button type="button" class="mini-remove" data-remove-file="${escapeHtml(key)}" data-source="${source}" aria-label="Remove ${escapeHtml(file.name)}">×</button>
            </li>
        `;
    }).join('');
}

function refreshSelectionPreview() {
    renderSelectedFolders();
    renderSelectedFiles();
}

async function getPageCount(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages = pdf.numPages || 0;
    pdf.destroy();
    return pages;
}

async function scanFiles() {
    if (folderFiles.length === 0 && extraFiles.length === 0) {
        statusText.textContent = 'No PDF files selected. Pick a folder and/or add extra PDFs.';
        return;
    }

    statusText.textContent = 'Scanning PDFs and counting pages...';
    scanBtn.disabled = true;

    const merged = new Map();
    for (const file of folderFiles) {
        merged.set(fileKey(file), { file, source: 'Folder' });
    }
    for (const file of extraFiles) {
        const key = fileKey(file);
        if (merged.has(key)) {
            merged.set(key, { file, source: 'Folder + Extra' });
        } else {
            merged.set(key, { file, source: 'Extra' });
        }
    }

    const all = Array.from(merged.values());
    const rows = [];

    for (let i = 0; i < all.length; i += 1) {
        const { file, source } = all[i];
        let pages = 0;
        try {
            pages = await getPageCount(file);
        } catch {
            pages = 0;
        }

        rows.push({
            id: `row-${i}`,
            key: fileKey(file),
            include: true,
            name: file.name,
            source,
            size: file.size,
            pages,
            path: file.webkitRelativePath || '(extra file)',
        });

        statusText.textContent = `Processed ${i + 1}/${all.length}: ${file.name}`;
    }

    scannedRows = rows;
    renderTable();
    updateMetrics();
    statusText.textContent = `Scan complete. ${rows.length} PDF file(s) ready.`;
    scanBtn.disabled = false;
}

function renderTable() {
    const term = searchInput.value.toLowerCase().trim();
    const visible = scannedRows.filter(row => !term || [row.name, row.path, row.source].join(' ').toLowerCase().includes(term));

    if (visible.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty">No files match your search.</td></tr>';
        return;
    }

    tableBody.innerHTML = visible.map(row => `
        <tr>
            <td><input type="checkbox" data-id="${row.id}" ${row.include ? 'checked' : ''}></td>
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

folderInput.addEventListener('change', () => {
    folderFiles = toPdfFiles(folderInput.files);
    refreshSelectionPreview();
    invalidateScan(folderFiles.length > 0
        ? `Folder selected with ${folderFiles.length} PDF file(s). Click “Scan & Build Summary”.`
        : 'No folder selected yet.');
});

extraInput.addEventListener('change', () => {
    const newlySelected = toPdfFiles(extraInput.files);
    if (newlySelected.length === 0) {
        return;
    }

    const seen = new Set(extraFiles.map(fileKey));
    for (const file of newlySelected) {
        const key = fileKey(file);
        if (!seen.has(key)) {
            extraFiles.push(file);
            seen.add(key);
        }
    }

    extraInput.value = '';
    refreshSelectionPreview();
    invalidateScan(`${extraFiles.length} extra PDF file(s) currently selected (appended). Click “Scan & Build Summary”.`);
});

selectedFolders.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-folder]');
    if (!button) return;
    const folderName = button.dataset.removeFolder;
    folderFiles = folderFiles.filter(file => getTopFolder(file) !== folderName);
    refreshSelectionPreview();
    invalidateScan(`Removed folder: ${folderName}. Re-scan when ready.`);
});

selectedFilesList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-file]');
    if (!button) return;

    const key = button.dataset.removeFile;
    const source = button.dataset.source;

    if (source === 'Folder') {
        folderFiles = folderFiles.filter(file => fileKey(file) !== key);
    } else {
        extraFiles = extraFiles.filter(file => fileKey(file) !== key);
    }

    refreshSelectionPreview();
    invalidateScan('Selection updated. Re-scan to refresh summary.');
});

scanBtn.addEventListener('click', scanFiles);
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
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const id = target.dataset.id;
    scannedRows = scannedRows.map(row => row.id === id ? { ...row, include: target.checked } : row);
    updateMetrics();
});

resetBtn.addEventListener('click', () => {
    folderInput.value = '';
    extraInput.value = '';
    searchInput.value = '';
    folderFiles = [];
    extraFiles = [];
    refreshSelectionPreview();
    invalidateScan('Selections reset. Choose a new folder and/or extra files.');
});

refreshSelectionPreview();
updateMetrics();
