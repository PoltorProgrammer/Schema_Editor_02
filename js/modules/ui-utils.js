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
        // Removed text/HTML changes as per user request
    },

    showDownloadProgressSuccess() {
        // Removed text/HTML changes as per user request
    },

    showSaveSuccess(message = 'Project saved!') {
        const header = document.querySelector('.app-header');
        if (!header) return;

        // Remove existing feedback if any
        const existing = header.querySelector('.save-success-feedback');
        if (existing) existing.remove();

        const feedback = document.createElement('div');
        feedback.className = 'save-success-feedback up-to-date-feedback';
        feedback.style.top = '100px'; // Position it below the header
        feedback.textContent = message;

        document.body.appendChild(feedback);

        // Auto-remove after animation
        setTimeout(() => {
            if (feedback.parentElement) feedback.remove();
        }, 2200);
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

    showNicknamePrompt(title, message, options = ["Milan", "Joan", "Tomás"]) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                resolve(prompt(`${title}\n\n${message}`));
                return;
            }

            titleEl.textContent = title;
            messageEl.innerHTML = `
                <div style="margin-bottom: 1.25rem; color: var(--gray-600);">${message}</div>
                <div class="combobox-container" id="combobox-promptNickname" style="max-width: 100%;">
                    <input type="text" id="promptNickname" class="combobox-input" placeholder="e.g. Joan"
                        autocomplete="off" 
                        onfocus="app.handleNicknameComboboxFocus('promptNickname')"
                        onblur="app.handleNicknameComboboxBlur('promptNickname')"
                        oninput="app.handleNicknameComboboxInput('promptNickname', this.value)"
                        onkeydown="app.handleNicknameComboboxKey('promptNickname', event)">
                    <div class="combobox-dropdown" id="comboboxList-promptNickname"></div>
                </div>
                <div style="height: 0.5rem;"></div>
            `;

            footerEl.innerHTML = '';

            const cancelBtn = document.createElement('button');
            const confirmBtn = document.createElement('button');

            cancelBtn.textContent = 'Cancel';
            confirmBtn.textContent = 'Set Nickname';

            cancelBtn.className = 'btn btn-ghost';
            confirmBtn.className = 'btn btn-primary';

            const cleanup = () => {
                modal.classList.remove('active');
                document.removeEventListener('keydown', handleKeyEsc);
                setTimeout(() => {
                    modal.style.display = 'none';
                    messageEl.innerHTML = ''; // Clear the input
                }, 200);
            };

            const handleKeyEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            };
            document.addEventListener('keydown', handleKeyEsc);

            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };

            confirmBtn.onclick = () => {
                const val = document.getElementById('promptNickname').value.trim();
                if (val) {
                    cleanup();
                    resolve(val);
                }
            };

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(confirmBtn);

            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
                const input = document.getElementById('promptNickname');
                if (input) input.focus();
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

    showToast(message, type = 'info', duration = 5000) {
        // Remove existing feedback if any
        const existing = document.querySelector('.toast-feedback');
        if (existing) existing.remove();

        const feedback = document.createElement('div');
        feedback.className = 'toast-feedback';

        // Premium Toast Styling
        let bgColor = 'var(--primary)';
        let icon = 'ℹ️';

        if (type === 'error') {
            bgColor = 'var(--danger)';
            icon = '🛑';
        } else if (type === 'warning') {
            bgColor = '#f39c12'; // Vibrant Warning Orange
            icon = '⚠️';
        }

        Object.assign(feedback.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-20px)',
            background: bgColor,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '50px',
            fontSize: 'var(--font-sm)',
            fontWeight: '600',
            zIndex: '9999',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: '0',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)'
        });

        feedback.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

        document.body.appendChild(feedback);

        // Animation In
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Auto-remove
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (feedback.parentElement) feedback.remove();
            }, 400);
        }, duration);
    },

    showLoserModal(winnerName, conflicts) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                const vars = Array.isArray(conflicts) ? conflicts.map(c => c.variable_id).join(', ') : 'Unknown';
                alert(`Conflict resolved: Your version was overwritten by ${winnerName}.\nVariables lost: ${vars}`);
                resolve();
                return;
            }

            titleEl.textContent = 'Update Detected - Conflict Resolved';

            // Build Message
            let varsHtml = conflicts.map(c => {
                const label = c.patient_id ? `${c.variable_id} (Patient: ${c.patient_id})` : `${c.variable_id} (Settings)`;
                return `<li style="margin-left: 1rem; margin-bottom: 0.25rem;">${label}</li>`;
            }).join('');

            messageEl.innerHTML = `
                <div style="margin-bottom: 1rem; color: var(--gray-700); line-height: 1.5;">
                    Your changes to the following records were overwritten by a newer save from <strong style="color: var(--primary);">${winnerName}</strong>:
                </div>
                <ul style="margin-bottom: 1.25rem; background: var(--gray-50); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--gray-200); list-style-type: disc; max-height: 180px; overflow-y: auto;">
                    ${varsHtml}
                </ul>
                <div style="margin-bottom: 1.5rem; padding: 0.75rem; background: #fff8f0; border: 1px solid #ffeeba; border-radius: var(--radius); color: #856404; font-size: 0.9rem;">
                    <strong>Note:</strong> All your non-conflicting edits for other patients were successfully merged and saved.
                </div>
                <div style="font-weight: 700; color: var(--danger); text-align: center; font-size: 1.1rem;">
                    Syncing changes in <span id="loserCountdown">7</span> seconds...
                </div>
            `;

            footerEl.innerHTML = '';

            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'btn btn-primary';
            refreshBtn.style.width = '100%';
            refreshBtn.textContent = 'Refresh Now';

            let seconds = 7;
            let interval;

            const cleanup = () => {
                modal.classList.remove('active');
                if (interval) clearInterval(interval);
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            };

            refreshBtn.onclick = () => {
                cleanup();
                location.reload();
                resolve();
            };

            footerEl.appendChild(refreshBtn);

            modal.style.display = 'flex';

            // Critical: Enable bypass flag so standard "Unsaved Changes" browser prompt 
            // doesn't block the mandatory refresh/reload.
            if (window.app) window.app.bypassUnsavedChangesWarning = true;

            requestAnimationFrame(() => {
                modal.classList.add('active');
                refreshBtn.focus();
            });

            // Auto-Countdown
            const countdownEl = document.getElementById('loserCountdown');
            interval = setInterval(() => {
                seconds--;
                if (countdownEl) countdownEl.textContent = seconds;
                if (seconds <= 0) {
                    cleanup();
                    location.reload();
                    resolve();
                }
            }, 1000);
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
