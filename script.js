(function () {
    const selectAll = document.getElementById('select-all');
    const selectNone = document.getElementById('select-none');
    const selectedCount = document.getElementById('selected-count');

    function getCheckboxes() {
        return Array.from(document.querySelectorAll('input[name="selected_files[]"]'));
    }

    function refreshCount() {
        const total = getCheckboxes().length;
        const selected = getCheckboxes().filter(cb => cb.checked).length;
        selectedCount.textContent = `${selected} of ${total} selected`;
    }

    selectAll?.addEventListener('click', function () {
        getCheckboxes().forEach(cb => { cb.checked = true; });
        refreshCount();
    });

    selectNone?.addEventListener('click', function () {
        getCheckboxes().forEach(cb => { cb.checked = false; });
        refreshCount();
    });

    document.addEventListener('change', function (event) {
        if (event.target.matches('input[name="selected_files[]"]')) {
            refreshCount();
        }
    });

    refreshCount();
})();
