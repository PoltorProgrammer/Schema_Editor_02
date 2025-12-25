const AppUI = {
    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('schemaEditor').style.display = 'none';
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
        document.getElementById('downloadFilteredBtn').style.display = 'none';
    },

    showLoading(message = 'Loading...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingIndicator').style.display = 'flex';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('schemaEditor').style.display = 'none';
    },

    hideLoading() {
        document.getElementById('loadingIndicator').style.display = 'none';
    },

    showError(message) {
        console.error("App Error:", message);
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        // Only alert for really critical stuff if needed, otherwise rely on localized UI feedback
    },

    showInfo(message) {
        console.log("App Info:", message);
        // Rely on new localized animations (e.g. up-to-date popups)
    },

    showDownloadSuccess() {
        const downloadBtn = document.getElementById('downloadFilteredBtn');
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
        </svg> Downloaded!`;
        const originalBg = downloadBtn.style.background;
        downloadBtn.style.background = 'var(--success)';

        setTimeout(() => {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.style.background = originalBg;
        }, 2000);
    },

    showSaveSuccess(message) {
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
        </svg> ${message}`;
        const originalBg = saveBtn.style.background;
        saveBtn.style.background = 'var(--success)';

        setTimeout(() => {
            saveBtn.innerHTML = originalHTML;
            saveBtn.style.background = originalBg;
        }, 2000);
    },

    showProcessing(message = 'Processing...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingIndicator').style.display = 'flex';
    },

    hideProcessing() {
        document.getElementById('loadingIndicator').style.display = 'none';
    },

    showConfirm(title, message) {
        return new Promise((resolve) => {
            if (confirm(`${title}\n\n${message}`)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },

    autoResizeTextarea(textarea) {
        if (textarea.offsetHeight === 0) return;
        const scrollTop = textarea.scrollTop;
        textarea.style.height = 'auto';
        const isSchemaEditor = textarea.classList.contains('schema-json-editor');
        const maxHeight = isSchemaEditor ? 400 : 300;
        const minHeight = isSchemaEditor ? 120 : 60;
        const newHeight = Math.min(Math.max(textarea.scrollHeight + 2, minHeight), maxHeight);
        textarea.style.height = newHeight + 'px';
        textarea.style.overflowY = textarea.scrollHeight > (maxHeight - 2) ? 'auto' : 'hidden';
        textarea.scrollTop = scrollTop;
    }
};
