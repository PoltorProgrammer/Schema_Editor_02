/**
 * Presence Manager Mixin for SchemaEditor
 * Handles real-time user presence using a hidden .presence folder within the project.
 */

Object.assign(SchemaEditor.prototype, {
    presenceTimers: null,

    async initPresence() {
        if (!this.currentProject || !this.currentProject.handle) return;

        // Stop any existing presence tracking
        this.stopPresence();

        this.presenceTimers = {
            heartbeat: null,
            scanner: null,
            metadataRefresh: null
        };

        const username = this.settings.username || 'Anonymous';

        try {
            // 1. Ensure .presence directory exists
            const presenceDir = await this.currentProject.handle.getDirectoryHandle('.presence', { create: true });

            // 2. Start heartbeat (update our presence file)
            const updateHeartbeat = async () => {
                const currentUsername = this.settings.username || 'Anonymous';
                try {
                    const fileHandle = await presenceDir.getFileHandle(`${currentUsername}.presence`, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify({
                        username: currentUsername,
                        lastActive: Date.now()
                    }));
                    await writable.close();
                } catch (e) {
                    console.warn("Presence heartbeat failed:", e);
                }
            };

            await updateHeartbeat();
            this.presenceTimers.heartbeat = setInterval(updateHeartbeat, 30000); // Every 30s

            // 3. Start scanner (see who else is around)
            const scanPresence = async () => {
                try {
                    const activeUsers = new Set();
                    const now = Date.now();
                    const staleThreshold = 90000; // 90 seconds (3 missed heartbeats)

                    for await (const [name, handle] of presenceDir.entries()) {
                        if (name.endsWith('.presence')) {
                            try {
                                const file = await handle.getFile();
                                // Using lastModified as the truth for freshness
                                if (now - file.lastModified < staleThreshold) {
                                    const user = name.replace('.presence', '');
                                    activeUsers.add(user);
                                }
                            } catch (e) { }
                        }
                    }
                    this.renderActiveUsers(Array.from(activeUsers));
                } catch (e) {
                    console.warn("Presence scan failed:", e);
                }
            };

            const refreshTimeLabels = () => {
                this.updateHeaderMetadata();
            };

            await scanPresence();
            this.presenceTimers.scanner = setInterval(scanPresence, 15000); // Every 15s
            this.presenceTimers.metadataRefresh = setInterval(refreshTimeLabels, 60000); // Every minute

        } catch (error) {
            console.error("Could not initialize presence:", error);
        }
    },

    stopPresence() {
        if (this.presenceTimers) {
            clearInterval(this.presenceTimers.heartbeat);
            clearInterval(this.presenceTimers.scanner);
            clearInterval(this.presenceTimers.metadataRefresh);
            this.presenceTimers = null;
        }

        const activeUsersEl = document.getElementById('activeUsers');
        if (activeUsersEl) activeUsersEl.style.display = 'none';
    },

    renderActiveUsers(users) {
        const container = document.getElementById('activeUsers');
        const list = document.getElementById('activeUsersList');
        if (!container || !list) return;

        if (users.length <= 1) { // Only self or nobody
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        list.innerHTML = '';

        // Add a "People" icon or text
        const label = document.createElement('span');
        label.className = 'active-users-label';
        label.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; vertical-align: middle;"><path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>Active: `;
        list.appendChild(label);

        users.forEach((user, index) => {
            const userChip = document.createElement('span');
            userChip.className = 'user-presence-chip';
            if (user === (this.settings.username || 'Anonymous')) {
                userChip.classList.add('is-me');
                userChip.textContent = 'You';
            } else {
                userChip.textContent = user;
            }

            list.appendChild(userChip);

            if (index < users.length - 1) {
                const separator = document.createTextNode(', ');
                list.appendChild(separator);
            }
        });
    }
});
