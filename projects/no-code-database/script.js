const state = {
    tables: [],
    relations: [],
    selectedTableId: null,
};

const saveStateBadge = document.getElementById('saveState');
const tableNameInput = document.getElementById('tableNameInput');
const addTableBtn = document.getElementById('addTableBtn');
const tableList = document.getElementById('tableList');
const selectedTableLabel = document.getElementById('selectedTableLabel');

const columnNameInput = document.getElementById('columnNameInput');
const columnTypeInput = document.getElementById('columnTypeInput');
const addColumnBtn = document.getElementById('addColumnBtn');
const columnList = document.getElementById('columnList');
const rowForm = document.getElementById('rowForm');
const dataTable = document.getElementById('dataTable');

const fromTable = document.getElementById('fromTable');
const fromColumn = document.getElementById('fromColumn');
const toTable = document.getElementById('toTable');
const toColumn = document.getElementById('toColumn');
const relationLabel = document.getElementById('relationLabel');
const addRelationBtn = document.getElementById('addRelationBtn');
const relationList = document.getElementById('relationList');

function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function selectedTable() {
    return state.tables.find(t => t.id === state.selectedTableId) || null;
}

async function loadWorkspace() {
    const response = await fetch('index.php?api=1');
    const data = await response.json();
    state.tables = Array.isArray(data.tables) ? data.tables : [];
    state.relations = Array.isArray(data.relations) ? data.relations : [];
    if (state.tables.length > 0) {
        state.selectedTableId = state.tables[0].id;
    }
    renderAll();
}

async function persist() {
    saveStateBadge.textContent = 'Saving...';
    const response = await fetch('index.php?api=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: state.tables, relations: state.relations }),
    });
    if (!response.ok) {
        saveStateBadge.textContent = 'Save failed';
        return;
    }
    saveStateBadge.textContent = 'Saved';
    setTimeout(() => {
        saveStateBadge.textContent = 'Ready';
    }, 1200);
}

function renderTablesList() {
    if (state.tables.length === 0) {
        tableList.innerHTML = '<li>No data groups yet.</li>';
        return;
    }

    tableList.innerHTML = state.tables.map(table => `
        <li class="${table.id === state.selectedTableId ? 'active' : ''}">
            <button class="ghost" data-pick-table="${table.id}">${escapeHtml(table.name)}</button>
            <div>
                <button class="ghost" data-rename-table="${table.id}">Rename</button>
                <button class="danger" data-delete-table="${table.id}">Delete</button>
            </div>
        </li>
    `).join('');
}

function renderColumns() {
    const table = selectedTable();
    if (!table) {
        selectedTableLabel.textContent = 'Pick a data group to start.';
        columnList.innerHTML = '<li>No fields yet.</li>';
        rowForm.innerHTML = '';
        dataTable.innerHTML = '';
        return;
    }

    selectedTableLabel.textContent = `You are editing: ${table.name}`;

    if (!table.columns || table.columns.length === 0) {
        columnList.innerHTML = '<li>No fields yet.</li>';
    } else {
        columnList.innerHTML = table.columns.map(column => `
            <li>
                <span>${escapeHtml(column.name)} <small>(${escapeHtml(column.type)})</small></span>
                <button class="danger" data-delete-column="${column.id}">Delete</button>
            </li>
        `).join('');
    }

    renderRowForm(table);
    renderDataTable(table);
}

function renderRowForm(table) {
    if (!table.columns || table.columns.length === 0) {
        rowForm.innerHTML = '<p class="muted">Add fields first before adding records.</p>';
        return;
    }

    const fieldsHtml = table.columns.map(column => {
        if (column.type === 'yesno') {
            return `<label>${escapeHtml(column.name)}<select name="${column.id}"><option value="Yes">Yes</option><option value="No">No</option></select></label>`;
        }
        const typeMap = { number: 'number', date: 'date', text: 'text' };
        const inputType = typeMap[column.type] || 'text';
        return `<label>${escapeHtml(column.name)}<input type="${inputType}" name="${column.id}" /></label>`;
    }).join('');

    rowForm.innerHTML = `${fieldsHtml}<button type="submit">Add record</button>`;
}

function renderDataTable(table) {
    const columns = table.columns || [];
    const rows = table.rows || [];

    if (columns.length === 0) {
        dataTable.innerHTML = '';
        return;
    }

    const head = `<tr>${columns.map(column => `<th>${escapeHtml(column.name)}</th>`).join('')}<th>Actions</th></tr>`;
    const body = rows.length === 0
        ? `<tr><td colspan="${columns.length + 1}">No records yet.</td></tr>`
        : rows.map(row => {
            const cells = columns.map(column => `<td>${escapeHtml(row.values?.[column.id] ?? '')}</td>`).join('');
            return `<tr>${cells}<td><button class="danger" data-delete-row="${row.id}">Delete</button></td></tr>`;
        }).join('');

    dataTable.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

function tableOptionsHtml(selectedId = '') {
    return state.tables.map(table => `<option value="${table.id}" ${table.id === selectedId ? 'selected' : ''}>${escapeHtml(table.name)}</option>`).join('');
}

function columnOptionsHtml(tableId, selectedColId = '') {
    const table = state.tables.find(t => t.id === tableId);
    if (!table || !Array.isArray(table.columns)) {
        return '';
    }
    return table.columns.map(col => `<option value="${col.id}" ${col.id === selectedColId ? 'selected' : ''}>${escapeHtml(col.name)}</option>`).join('');
}

function renderRelations() {
    const firstTableId = state.tables[0]?.id || '';
    const secondTableId = state.tables[1]?.id || firstTableId;

    fromTable.innerHTML = `<option value="">From group</option>${tableOptionsHtml(fromTable.value || firstTableId)}`;
    toTable.innerHTML = `<option value="">To group</option>${tableOptionsHtml(toTable.value || secondTableId)}`;

    fromColumn.innerHTML = `<option value="">From field</option>${columnOptionsHtml(fromTable.value)}`;
    toColumn.innerHTML = `<option value="">To field</option>${columnOptionsHtml(toTable.value)}`;

    if (state.relations.length === 0) {
        relationList.innerHTML = '<li>No connections yet.</li>';
        return;
    }

    relationList.innerHTML = state.relations.map(rel => {
        const aTable = state.tables.find(t => t.id === rel.fromTableId);
        const bTable = state.tables.find(t => t.id === rel.toTableId);
        const aCol = aTable?.columns?.find(c => c.id === rel.fromColumnId);
        const bCol = bTable?.columns?.find(c => c.id === rel.toColumnId);
        return `<li>
            <span>${escapeHtml(rel.label || 'Connection')}: ${escapeHtml(aTable?.name || '?')} / ${escapeHtml(aCol?.name || '?')} → ${escapeHtml(bTable?.name || '?')} / ${escapeHtml(bCol?.name || '?')}</span>
            <button class="danger" data-delete-relation="${rel.id}">Delete</button>
        </li>`;
    }).join('');
}

function renderAll() {
    renderTablesList();
    renderColumns();
    renderRelations();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

addTableBtn.addEventListener('click', async () => {
    const name = tableNameInput.value.trim();
    if (!name) return;
    const table = { id: uid('table'), name, columns: [], rows: [] };
    state.tables.push(table);
    state.selectedTableId = table.id;
    tableNameInput.value = '';
    renderAll();
    await persist();
});

tableList.addEventListener('click', async event => {
    const pick = event.target.closest('[data-pick-table]');
    if (pick) {
        state.selectedTableId = pick.dataset.pickTable;
        renderAll();
        return;
    }

    const rename = event.target.closest('[data-rename-table]');
    if (rename) {
        const table = state.tables.find(t => t.id === rename.dataset.renameTable);
        if (!table) return;
        const next = prompt('New group name:', table.name);
        if (!next) return;
        table.name = next.trim() || table.name;
        renderAll();
        await persist();
        return;
    }

    const del = event.target.closest('[data-delete-table]');
    if (del) {
        const tableId = del.dataset.deleteTable;
        state.tables = state.tables.filter(t => t.id !== tableId);
        state.relations = state.relations.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId);
        if (state.selectedTableId === tableId) {
            state.selectedTableId = state.tables[0]?.id || null;
        }
        renderAll();
        await persist();
    }
});

addColumnBtn.addEventListener('click', async () => {
    const table = selectedTable();
    const name = columnNameInput.value.trim();
    if (!table || !name) return;

    table.columns.push({ id: uid('col'), name, type: columnTypeInput.value });
    columnNameInput.value = '';
    renderAll();
    await persist();
});

columnList.addEventListener('click', async event => {
    const del = event.target.closest('[data-delete-column]');
    if (!del) return;
    const table = selectedTable();
    if (!table) return;

    const colId = del.dataset.deleteColumn;
    table.columns = table.columns.filter(c => c.id !== colId);
    table.rows = table.rows.map(row => {
        const values = { ...(row.values || {}) };
        delete values[colId];
        return { ...row, values };
    });

    state.relations = state.relations.filter(r => r.fromColumnId !== colId && r.toColumnId !== colId);
    renderAll();
    await persist();
});

rowForm.addEventListener('submit', async event => {
    event.preventDefault();
    const table = selectedTable();
    if (!table || !table.columns?.length) return;

    const formData = new FormData(rowForm);
    const values = {};
    for (const col of table.columns) {
        values[col.id] = String(formData.get(col.id) ?? '');
    }

    table.rows.push({ id: uid('row'), values });
    renderAll();
    await persist();
});

dataTable.addEventListener('click', async event => {
    const del = event.target.closest('[data-delete-row]');
    if (!del) return;

    const table = selectedTable();
    if (!table) return;
    const rowId = del.dataset.deleteRow;
    table.rows = table.rows.filter(r => r.id !== rowId);
    renderAll();
    await persist();
});

[fromTable, toTable].forEach(select => {
    select.addEventListener('change', () => {
        renderRelations();
    });
});

addRelationBtn.addEventListener('click', async () => {
    if (!fromTable.value || !toTable.value || !fromColumn.value || !toColumn.value) {
        return;
    }

    state.relations.push({
        id: uid('rel'),
        fromTableId: fromTable.value,
        fromColumnId: fromColumn.value,
        toTableId: toTable.value,
        toColumnId: toColumn.value,
        label: relationLabel.value.trim(),
    });

    relationLabel.value = '';
    renderAll();
    await persist();
});

relationList.addEventListener('click', async event => {
    const del = event.target.closest('[data-delete-relation]');
    if (!del) return;
    const id = del.dataset.deleteRelation;
    state.relations = state.relations.filter(r => r.id !== id);
    renderAll();
    await persist();
});

loadWorkspace();
