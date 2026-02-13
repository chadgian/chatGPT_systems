<?php
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'pdfs';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

$messages = [];
$errors = [];

function safeFileName(string $name): string
{
    $baseName = basename($name);
    return preg_replace('/[^A-Za-z0-9._-]/', '_', $baseName) ?? 'file.pdf';
}

function countPdfPages(string $filePath): int
{
    $escaped = escapeshellarg($filePath);
    $command = "pdfinfo $escaped 2>/dev/null";
    $output = shell_exec($command);

    if (is_string($output) && preg_match('/^Pages:\s+(\d+)/mi', $output, $matches)) {
        return (int) $matches[1];
    }

    $contents = @file_get_contents($filePath);
    if ($contents === false) {
        return 0;
    }

    if (preg_match_all('/\/Type\s*\/Page\b/', $contents, $matches)) {
        return count($matches[0]);
    }

    return 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['new_pdfs'])) {
    $tmpNames = $_FILES['new_pdfs']['tmp_name'] ?? [];
    $originalNames = $_FILES['new_pdfs']['name'] ?? [];
    $uploadErrors = $_FILES['new_pdfs']['error'] ?? [];

    foreach ($tmpNames as $index => $tmpName) {
        if (($uploadErrors[$index] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if (($uploadErrors[$index] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            $errors[] = "Failed to upload {$originalNames[$index]} (error code {$uploadErrors[$index]}).";
            continue;
        }

        $safeName = safeFileName((string) ($originalNames[$index] ?? 'uploaded.pdf'));
        $extension = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
        if ($extension !== 'pdf') {
            $errors[] = "$safeName was skipped because it is not a PDF file.";
            continue;
        }

        $destination = $uploadDir . DIRECTORY_SEPARATOR . $safeName;

        if (!move_uploaded_file($tmpName, $destination)) {
            $errors[] = "Could not move uploaded file $safeName.";
            continue;
        }

        $messages[] = "$safeName uploaded successfully.";
    }
}

$pdfFiles = glob($uploadDir . DIRECTORY_SEPARATOR . '*.pdf') ?: [];
sort($pdfFiles);

$allFileNames = array_map(static fn(string $path): string => basename($path), $pdfFiles);
$selectedFiles = $_POST['selected_files'] ?? $allFileNames;
$selectedLookup = array_flip($selectedFiles);

$allSummary = [
    'file_count' => 0,
    'page_count' => 0,
    'total_size' => 0,
];

$selectedSummary = [
    'file_count' => 0,
    'page_count' => 0,
    'total_size' => 0,
    'rows' => [],
];

foreach ($pdfFiles as $filePath) {
    $fileName = basename($filePath);
    $pages = countPdfPages($filePath);
    $size = filesize($filePath) ?: 0;

    $allSummary['file_count']++;
    $allSummary['page_count'] += $pages;
    $allSummary['total_size'] += $size;

    if (!isset($selectedLookup[$fileName])) {
        continue;
    }

    $selectedSummary['file_count']++;
    $selectedSummary['page_count'] += $pages;
    $selectedSummary['total_size'] += $size;
    $selectedSummary['rows'][] = [
        'name' => $fileName,
        'pages' => $pages,
        'size_kb' => number_format($size / 1024, 2),
        'modified' => date('Y-m-d H:i:s', filemtime($filePath) ?: time()),
    ];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Folder Summary</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="container">
    <h1>PDF Folder Scanner</h1>
    <p class="subtitle">Scans all PDF files in <code>pdfs/</code>, summarizes totals, and lets you upload new PDFs.</p>

    <?php foreach ($messages as $message): ?>
        <div class="alert success"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endforeach; ?>

    <?php foreach ($errors as $error): ?>
        <div class="alert error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endforeach; ?>

    <form method="post" enctype="multipart/form-data" id="scanner-form">
        <section class="panel">
            <h2>Upload Additional PDFs</h2>
            <input type="file" name="new_pdfs[]" accept="application/pdf,.pdf" multiple>
        </section>

        <section class="panel">
            <h2>Select PDFs to Include in Detailed Summary</h2>
            <div class="actions">
                <button type="button" id="select-all">Select all</button>
                <button type="button" id="select-none">Clear all</button>
                <span id="selected-count"></span>
            </div>
            <div class="file-grid">
                <?php if (empty($allFileNames)): ?>
                    <p>No PDF files found. Upload files to start.</p>
                <?php endif; ?>

                <?php foreach ($allFileNames as $name): ?>
                    <label>
                        <input
                            type="checkbox"
                            name="selected_files[]"
                            value="<?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?>"
                            <?= in_array($name, $selectedFiles, true) ? 'checked' : '' ?>
                        >
                        <?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </section>

        <button class="primary" type="submit">Scan & Generate Summary</button>
    </form>

    <section class="panel stats">
        <h2>Folder Totals (All PDFs)</h2>
        <ul>
            <li>Total files: <strong><?= $allSummary['file_count'] ?></strong></li>
            <li>Total pages: <strong><?= $allSummary['page_count'] ?></strong></li>
            <li>Total size: <strong><?= number_format($allSummary['total_size'] / 1024, 2) ?> KB</strong></li>
        </ul>
    </section>

    <section class="panel stats">
        <h2>Selected Files Summary</h2>
        <ul>
            <li>Selected files: <strong><?= $selectedSummary['file_count'] ?></strong></li>
            <li>Selected pages: <strong><?= $selectedSummary['page_count'] ?></strong></li>
            <li>Selected size: <strong><?= number_format($selectedSummary['total_size'] / 1024, 2) ?> KB</strong></li>
        </ul>

        <div class="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>File Name</th>
                    <th>Pages</th>
                    <th>Size (KB)</th>
                    <th>Last Modified</th>
                </tr>
                </thead>
                <tbody>
                <?php if (empty($selectedSummary['rows'])): ?>
                    <tr>
                        <td colspan="4">No selected PDF files to display.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($selectedSummary['rows'] as $row): ?>
                        <tr>
                            <td><?= htmlspecialchars($row['name'], ENT_QUOTES, 'UTF-8') ?></td>
                            <td><?= $row['pages'] ?></td>
                            <td><?= $row['size_kb'] ?></td>
                            <td><?= htmlspecialchars($row['modified'], ENT_QUOTES, 'UTF-8') ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
    </section>
</div>
<script src="script.js"></script>
</body>
</html>
