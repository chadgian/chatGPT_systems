const state = {
    tables: [],
    selectedTableId: null,
    editingRowId: null,
};

const saveStateBadge = document.getElementById('saveState');
const homePage = document.getElementById('homePage');
const tablePage = document.getElementById('tablePage');
const homeTableList = document.getElementById('homeTableList');
const tableTitle = document.getElementById('tableTitle');
const backToHomeBtn = document.getElementById('backToHomeBtn');

const openCreateTableModalBtn = document.getElementById('openCreateTableModalBtn');
const createTableModal = document.getElementById('createTableModal');
const newTableNameInput = document.getElementById('newTableNameInput');
const confirmCreateTableBtn = document.getElementById('confirmCreateTableBtn');

const columnNameInput = document.getElementById('columnNameInput');
const columnTypeInput = document.getElementById('columnTypeInput');
const addColumnBtn = document.getElementById('addColumnBtn');
const dropdownOptionsRow = document.getElementById('dropdownOptionsRow');
const dropdownOptionsInput = document.getElementById('dropdownOptionsInput');
const relationOptionsRow = document.getElementById('relationOptionsRow');
const relationTableInput = document.getElementById('relationTableInput');
const relationColumnInput = document.getElementById('relationColumnInput');
const columnList = document.getElementById('columnList');
const dataTable = document.getElementById('dataTable');

const openAddRowModalBtn = document.getElementById('openAddRowModalBtn');
const rowModal = document.getElementById('rowModal');
const rowModalTitle = document.getElementById('rowModalTitle');
const rowModalFormFields = document.getElementById('rowModalFormFields');
const saveRowBtn = document.getElementById('saveRowBtn');

const openMergeModalBtn = document.getElementById('openMergeModalBtn');
const mergeModal = document.getElementById('mergeModal');
const mergeRelationColumn = document.getElementById('mergeRelationColumn');
const mergeColumnChoices = document.getElementById('mergeColumnChoices');
const applyMergeBtn = document.getElementById('applyMergeBtn');
const mergeResultSection = document.getElementById('mergeResultSection');
const mergeTable = document.getElementById('mergeTable');

function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function selectedTable() {
    return state.tables.find(t => t.id === state.selectedTableId) || null;
}

function getTableById(id) {
    return state.tables.find(t => t.id === id) || null;
}

function getColumnById(table, columnId) {
    return table?.columns?.find(c => c.id === columnId) || null;
}

function tableFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('table');
}

function setTableInUrl(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('table', id);
    else url.searchParams.delete('table');
    window.history.replaceState({}, '', url);
}

async function loadWorkspace() {
    const response = await fetch('index.php?api=1');
    const data = await response.json();
    state.tables = Array.isArray(data.tables) ? data.tables : [];
    state.selectedTableId = tableFromUrl();
    if (state.selectedTableId && !getTableById(state.selectedTableId)) {
        state.selectedTableId = null;
        setTableInUrl(null);
    }
    renderAll();
}

async function persist() {
    saveStateBadge.textContent = 'Saving...';
    const response = await fetch('index.php?api=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: state.tables, relations: [] }),
    });
    saveStateBadge.textContent = response.ok ? 'Saved' : 'Save failed';
    if (response.ok) setTimeout(() => { saveStateBadge.textContent = 'Ready'; }, 1000);
}

function renderHome() {
    if (state.tables.length === 0) {
        homeTableList.innerHTML = '<li>No tables yet. Click “Create New Table”.</li>';
        return;
    }

    homeTableList.innerHTML = state.tables.map(table => `
        <li>
            <span>${escapeHtml(table.name)}</span>
            <a class="ghost link-btn" href="?table=${encodeURIComponent(table.id)}" data-open-table="${table.id}">Open</a>
        </li>
    `).join('');
}

function syncColumnTypeUi() {
    const type = columnTypeInput.value;
    dropdownOptionsRow.style.display = type === 'dropdown' ? 'flex' : 'none';
    relationOptionsRow.style.display = type === 'relation' ? 'flex' : 'none';

    if (type !== 'relation') {
        relationTableInput.innerHTML = '<option value="">Select linked table</option>';
        relationColumnInput.innerHTML = '<option value="">Select linked column</option>';
    }
}

function renderRelationSelectors() {
    const opts = state.tables.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    relationTableInput.innerHTML = `<option value="">Select linked table</option>${opts}`;
    relationColumnInput.innerHTML = '<option value="">Select linked column</option>';
}

function renderTablePage() {
    const table = selectedTable();
    if (!table) return;

    tableTitle.textContent = table.name;
    renderRelationSelectors();

    columnList.innerHTML = (table.columns || []).length
        ? table.columns.map(col => `<li><span>${escapeHtml(col.name)} <small>(${escapeHtml(col.type)})</small></span><button class="danger" data-delete-column="${col.id}">Delete</button></li>`).join('')
        : '<li>No columns yet.</li>';

    renderDataTable();
}

function displayValue(column, value) {
    if (column?.type !== 'relation') return String(value ?? '');
    const targetTable = getTableById(column.relation?.tableId);
    const targetColumn = getColumnById(targetTable, column.relation?.columnId);
    const targetRow = (targetTable?.rows || []).find(r => r.id === value);
    return String(targetRow?.values?.[targetColumn?.id] ?? '');
}

function renderDataTable() {
    const table = selectedTable();
    if (!table || !(table.columns || []).length) {
        dataTable.innerHTML = '';
        return;
    }

    const head = `<tr>${table.columns.map(c => `<th>${escapeHtml(c.name)}</th>`).join('')}<th>Actions</th></tr>`;
    const body = (table.rows || []).length
        ? table.rows.map(row => {
            const cells = table.columns.map(col => `<td>${escapeHtml(displayValue(col, row.values?.[col.id] ?? ''))}</td>`).join('');
            return `<tr>${cells}<td><button class="ghost" data-edit-row="${row.id}">Edit</button><button class="danger" data-delete-row="${row.id}">Delete</button></td></tr>`;
        }).join('')
        : `<tr><td colspan="${table.columns.length + 1}">No rows yet.</td></tr>`;

    dataTable.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

function renderRowModalForm() {
    const table = selectedTable();
    if (!table) return;
    const editing = (table.rows || []).find(r => r.id === state.editingRowId) || null;
    rowModalTitle.textContent = editing ? 'Edit Row / Data' : 'Add Row / Data';

    rowModalFormFields.innerHTML = (table.columns || []).map(col => {
        const current = editing?.values?.[col.id] ?? '';

        if (col.type === 'yesno') {
            return `<label>${escapeHtml(col.name)}<select name="${col.id}"><option value="Yes" ${current === 'Yes' ? 'selected' : ''}>Yes</option><option value="No" ${current === 'No' ? 'selected' : ''}>No</option></select></label>`;
        }

        if (col.type === 'dropdown') {
            const options = (col.options || []).map(opt => `<option value="${escapeHtml(opt)}" ${opt === current ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
            return `<label>${escapeHtml(col.name)}<select name="${col.id}">${options}</select></label>`;
        }

        if (col.type === 'relation') {
            const targetTable = getTableById(col.relation?.tableId);
            const targetCol = getColumnById(targetTable, col.relation?.columnId);
            const options = (targetTable?.rows || []).map(row => {
                const label = targetCol ? row.values?.[targetCol.id] : row.id;
                return `<option value="${row.id}" ${row.id === current ? 'selected' : ''}>${escapeHtml(String(label ?? '(empty)'))}</option>`;
            }).join('');
            return `<label>${escapeHtml(col.name)}<select name="${col.id}"><option value="">Select linked record</option>${options}</select></label>`;
        }

        const typeMap = { text: 'text', number: 'number', date: 'date' };
        return `<label>${escapeHtml(col.name)}<input type="${typeMap[col.type] || 'text'}" name="${col.id}" value="${escapeHtml(String(current))}" /></label>`;
    }).join('');
}

function renderMergeModalOptions() {
    const table = selectedTable();
    if (!table) return;

    const relationCols = (table.columns || []).filter(c => c.type === 'relation');
    mergeRelationColumn.innerHTML = relationCols.length
        ? relationCols.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
        : '<option value="">No relation columns found</option>';

    renderMergeColumnChoices();
}

function renderMergeColumnChoices() {
    const table = selectedTable();
    if (!table) return;

    const relCol = getColumnById(table, mergeRelationColumn.value);
    const targetTable = getTableById(relCol?.relation?.tableId);

    if (!targetTable) {
        mergeColumnChoices.innerHTML = '<p class="muted">No related table found.</p>';
        return;
    }

    mergeColumnChoices.innerHTML = (targetTable.columns || []).map((col, idx) => `
        <label class="chip-option">
            <input type="checkbox" value="${col.id}" ${idx < 3 ? 'checked' : ''}>
            ${escapeHtml(col.name)}
        </label>
    `).join('');
}

function renderMergedTable() {
    const table = selectedTable();
    const relCol = getColumnById(table, mergeRelationColumn.value);
    const targetTable = getTableById(relCol?.relation?.tableId);
    const checked = Array.from(mergeColumnChoices.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
    if (!table || !relCol || !targetTable || !checked.length) return;

    const headers = [table.name, ...checked.map(id => getColumnById(targetTable, id)?.name || '?')];
    const head = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;

    const rows = (table.rows || []).map(row => {
        const linkedRow = (targetTable.rows || []).find(r => r.id === row.values?.[relCol.id]);
        const firstCol = `<td>${escapeHtml(displayValue(getColumnById(table, relCol.id), row.values?.[relCol.id] ?? ''))}</td>`;
        const rest = checked.map(id => `<td>${escapeHtml(String(linkedRow?.values?.[id] ?? ''))}</td>`).join('');
        return `<tr>${firstCol}${rest}</tr>`;
    }).join('');

    mergeTable.innerHTML = `<thead>${head}</thead><tbody>${rows || `<tr><td colspan="${headers.length}">No rows to show.</td></tr>`}</tbody>`;
    mergeResultSection.style.display = 'block';
}

function renderAll() {
    const table = selectedTable();
    const onHome = !table;

    homePage.style.display = onHome ? 'block' : 'none';
    tablePage.style.display = onHome ? 'none' : 'block';

    renderHome();
    if (!onHome) renderTablePage();
}

openCreateTableModalBtn.addEventListener('click', () => {
    newTableNameInput.value = '';
    createTableModal.showModal();
});

confirmCreateTableBtn.addEventListener('click', async event => {
    event.preventDefault();
    const name = newTableNameInput.value.trim();
    if (!name) return;

    const table = { id: uid('table'), name, columns: [], rows: [] };
    state.tables.push(table);
    state.selectedTableId = table.id;
    setTableInUrl(table.id);
    createTableModal.close();
    renderAll();
    await persist();
});

backToHomeBtn.addEventListener('click', () => {
    state.selectedTableId = null;
    state.editingRowId = null;
    setTableInUrl(null);
    renderAll();
});

homeTableList.addEventListener('click', event => {
    const open = event.target.closest('[data-open-table]');
    if (!open) return;
    event.preventDefault();
    state.selectedTableId = open.dataset.openTable;
    setTableInUrl(state.selectedTableId);
    renderAll();
});

columnTypeInput.addEventListener('change', syncColumnTypeUi);
relationTableInput.addEventListener('change', () => {
    relationColumnInput.innerHTML = relationColumnOptions(relationTableInput.value, '');
});

addColumnBtn.addEventListener('click', async () => {
    const table = selectedTable();
    const name = columnNameInput.value.trim();
    if (!table || !name) return;

    const column = { id: uid('col'), name, type: columnTypeInput.value };

    if (column.type === 'dropdown') {
        const options = parseDropdownOptions(dropdownOptionsInput.value);
        if (!options.length) return alert('Please add dropdown choices.');
        column.options = options;
    }

    if (column.type === 'relation') {
        if (!relationTableInput.value || !relationColumnInput.value) return alert('Please select relation table and column.');
        column.relation = { tableId: relationTableInput.value, columnId: relationColumnInput.value };
    }

    table.columns.push(column);
    columnNameInput.value = '';
    dropdownOptionsInput.value = '';
    syncColumnTypeUi();
    renderAll();
    await persist();
});

columnList.addEventListener('click', async event => {
    const del = event.target.closest('[data-delete-column]');
    if (!del) return;
    const table = selectedTable();
    if (!table) return;

    const colId = del.dataset.deleteColumn;
    table.columns = (table.columns || []).filter(c => c.id !== colId);
    table.rows = (table.rows || []).map(row => {
        const values = { ...(row.values || {}) };
        delete values[colId];
        return { ...row, values };
    });

    renderAll();
    await persist();
});

openAddRowModalBtn.addEventListener('click', () => {
    state.editingRowId = null;
    renderRowModalForm();
    rowModal.showModal();
});

saveRowBtn.addEventListener('click', async event => {
    event.preventDefault();
    const table = selectedTable();
    if (!table || !(table.columns || []).length) return;

    const formEl = document.getElementById('rowModalFormWrap');
    const formData = new FormData(formEl);
    const values = {};
    for (const col of table.columns) values[col.id] = String(formData.get(col.id) ?? '');

    if (state.editingRowId) {
        const existing = (table.rows || []).find(r => r.id === state.editingRowId);
        if (existing) existing.values = values;
        state.editingRowId = null;
    } else {
        table.rows.push({ id: uid('row'), values });
    }

    rowModal.close();
    renderAll();
    await persist();
});

dataTable.addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-row]');
    if (edit) {
        state.editingRowId = edit.dataset.editRow;
        renderRowModalForm();
        rowModal.showModal();
        return;
    }

    const del = event.target.closest('[data-delete-row]');
    if (!del) return;
    const table = selectedTable();
    if (!table) return;

    table.rows = (table.rows || []).filter(r => r.id !== del.dataset.deleteRow);
    renderAll();
    await persist();
});

openMergeModalBtn.addEventListener('click', () => {
    renderMergeModalOptions();
    mergeModal.showModal();
});

mergeRelationColumn.addEventListener('change', renderMergeColumnChoices);

applyMergeBtn.addEventListener('click', event => {
    event.preventDefault();
    renderMergedTable();
    mergeModal.close();
});

syncColumnTypeUi();
loadWorkspace();
