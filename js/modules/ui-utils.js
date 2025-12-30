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

    showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel', focusCancel = false) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                // Fallback
                resolve(confirm(`${title}\n\n${message}`));
                return;
            }

            titleEl.textContent = title;
            messageEl.textContent = message;
            footerEl.innerHTML = '';

            const cancelBtn = document.createElement('button');
            const confirmBtn = document.createElement('button');

            cancelBtn.textContent = cancelText;
            confirmBtn.textContent = confirmText;

            // Apply styles based on priority
            if (focusCancel) {
                cancelBtn.className = 'btn btn-primary';
                confirmBtn.className = 'btn btn-ghost';
            } else {
                cancelBtn.className = 'btn btn-ghost';
                confirmBtn.className = 'btn btn-primary';
            }

            const cleanup = () => {
                modal.classList.remove('active');
                document.removeEventListener('keydown', handleKey); // Remove ESC listener
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            };

            const handleKey = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleKey);

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(confirmBtn);

            modal.style.display = 'flex';
            // Force reflow
            requestAnimationFrame(() => {
                modal.classList.add('active');
                if (focusCancel) {
                    cancelBtn.focus();
                } else {
                    confirmBtn.focus();
                }
            });
        });
    },

    showAlert(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                alert(`${title}\n\n${message}`);
                resolve();
                return;
            }

            titleEl.textContent = title;
            messageEl.textContent = message;
            footerEl.innerHTML = '';

            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary';
            okBtn.textContent = 'OK';

            const cleanup = () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            };

            okBtn.onclick = () => {
                cleanup();
                resolve();
            };

            footerEl.appendChild(okBtn);

            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
                okBtn.focus();
            });
        });
    },

    showProjectConflictDialog(projectName) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                // Simplified fallback
                const res = prompt(`Project "${projectName}" already exists.\nType 'update' to overwrite, 'copy' to create new, or 'cancel'.`, 'copy');
                resolve(res || 'cancel');
                return;
            }

            titleEl.textContent = 'Project Already Exists';
            messageEl.textContent = `A project named "${projectName}" already exists. What would you like to do?`;
            footerEl.innerHTML = '';

            const updateBtn = document.createElement('button');
            const copyBtn = document.createElement('button');
            const cancelBtn = document.createElement('button');

            updateBtn.className = 'btn btn-secondary';
            updateBtn.textContent = 'Update Existing';
            updateBtn.style.marginRight = '8px';

            copyBtn.className = 'btn btn-primary';
            copyBtn.textContent = 'Create Copy';
            copyBtn.style.marginRight = '8px';

            cancelBtn.className = 'btn btn-ghost';
            cancelBtn.textContent = 'Cancel';

            const cleanup = () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            };

            updateBtn.onclick = () => { cleanup(); resolve('update'); };
            copyBtn.onclick = () => { cleanup(); resolve('copy'); };
            cancelBtn.onclick = () => { cleanup(); resolve('cancel'); };

            // ESC to cancel
            const handleKey = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleKey);
                    resolve('cancel');
                }
            };
            document.addEventListener('keydown', handleKey);

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(updateBtn);
            footerEl.appendChild(copyBtn);

            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
                copyBtn.focus();
            });
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
