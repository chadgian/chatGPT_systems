<?php
$storageFile = __DIR__ . '/data/workspace.json';
$defaultData = [
    'tables' => [],
    'relations' => [],
    'updated_at' => date('c'),
];

if (isset($_GET['api']) && $_GET['api'] === '1') {
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!is_file($storageFile)) {
            echo json_encode($defaultData);
            exit;
        }

        $raw = file_get_contents($storageFile);
        $decoded = json_decode($raw ?: '', true);
        echo json_encode(is_array($decoded) ? $decoded : $defaultData);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '', true);

        if (!is_array($decoded) || !isset($decoded['tables']) || !isset($decoded['relations'])) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => 'Invalid data format.']);
            exit;
        }

        $sanitized = [
            'tables' => is_array($decoded['tables']) ? $decoded['tables'] : [],
            'relations' => is_array($decoded['relations']) ? $decoded['relations'] : [],
            'updated_at' => date('c'),
        ];

        if (!is_dir(dirname($storageFile))) {
            mkdir(dirname($storageFile), 0775, true);
        }

        file_put_contents($storageFile, json_encode($sanitized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['ok' => true, 'updated_at' => $sanitized['updated_at']]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No-Code Data Builder</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<main class="layout">
    <header class="hero card">
        <div>
            <p class="eyebrow">NO-CODE DATA BUILDER</p>
            <h1>Manage your tables with a simple interface</h1>
            <p>Create tables, open a table page to view its content, and add rows in easy pop-up forms.</p>
        </div>
        <div class="badge" id="saveState">Ready</div>
    </header>

    <section id="homePage" class="card">
        <div class="row space-between">
            <h2>Tables</h2>
            <button id="openCreateTableModalBtn">Create New Table</button>
        </div>
        <p class="muted">Click a table to open and manage its content.</p>
        <ul id="homeTableList" class="list"></ul>
    </section>

    <section id="tablePage" class="card" style="display:none;">
        <div class="row space-between">
            <div>
                <button id="backToHomeBtn" class="ghost">← Back to table list</button>
                <h2 id="tableTitle">Table</h2>
            </div>
            <button id="openAddRowModalBtn">Add Row / Data</button>
        </div>

        <h3>Columns</h3>
        <div class="row wrap-row">
            <input id="columnNameInput" type="text" placeholder="Column name">
            <select id="columnTypeInput">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="yesno">Yes / No</option>
                <option value="dropdown">Dropdown list</option>
                <option value="relation">Linked record (relation)</option>
            </select>
            <button id="addColumnBtn">Add Column</button>
        </div>
        <div class="row" id="dropdownOptionsRow" style="display:none;">
            <input id="dropdownOptionsInput" type="text" placeholder="Dropdown choices (comma-separated)">
        </div>
        <div class="row wrap-row" id="relationOptionsRow" style="display:none;">
            <select id="relationTableInput"></select>
            <select id="relationColumnInput"></select>
        </div>
        <ul id="columnList" class="list"></ul>

        <div class="row space-between top-gap">
            <h3>Table Content</h3>
            <button id="openMergeModalBtn" class="ghost">Merge Related Table</button>
        </div>
        <div class="table-wrap">
            <table id="dataTable"></table>
        </div>

        <div id="mergeResultSection" style="display:none;" class="top-gap">
            <h3>Merged View</h3>
            <div class="table-wrap">
                <table id="mergeTable"></table>
            </div>
        </div>
    </section>
</main>

<dialog id="createTableModal" class="modal">
    <form method="dialog" class="modal-body">
        <h3>Create New Table</h3>
        <input id="newTableNameInput" type="text" placeholder="Example: Orders">
        <div class="row">
            <button id="confirmCreateTableBtn" value="default">Create</button>
            <button class="ghost" value="cancel">Cancel</button>
        </div>
    </form>
</dialog>

<dialog id="rowModal" class="modal">
    <form method="dialog" class="modal-body" id="rowModalFormWrap">
        <h3 id="rowModalTitle">Add Row</h3>
        <div id="rowModalFormFields" class="row-form"></div>
        <div class="row">
            <button id="saveRowBtn" value="default">Save</button>
            <button id="cancelRowBtn" class="ghost" value="cancel">Cancel</button>
        </div>
    </form>
</dialog>

<dialog id="mergeModal" class="modal">
    <form method="dialog" class="modal-body">
        <h3>Merge Related Table</h3>
        <p class="muted">Pick a relation column, then select which related columns to show.</p>
        <select id="mergeRelationColumn"></select>
        <div id="mergeColumnChoices" class="merge-columns"></div>
        <div class="row">
            <button id="applyMergeBtn" value="default">Apply Merge</button>
            <button class="ghost" value="cancel">Cancel</button>
        </div>
    </form>
</dialog>

<script src="script.js"></script>
</body>
</html>
