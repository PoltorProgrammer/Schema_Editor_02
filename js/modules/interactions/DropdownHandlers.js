/**
 * Dropdown Handlers Mixin
 * Handles opening, closing, and toggling of custom dropdown menus.
 */
Object.assign(SchemaEditor.prototype, {
    toggleDropdown(type) {
        Object.keys(this.dropdowns).forEach(key => {
            if (key !== type) this.closeDropdown(key);
        });
        if (this.dropdowns[type].isOpen) this.closeDropdown(type);
        else this.openDropdown(type);
    },

    openDropdown(type) {
        const el = document.getElementById(`${type}Filter`);
        if (el) el.classList.add('open');
        this.dropdowns[type].isOpen = true;
    },

    closeDropdown(type) {
        const el = document.getElementById(`${type}Filter`);
        if (el) el.classList.remove('open');
        this.dropdowns[type].isOpen = false;
    },

    closeAllDropdowns() {
        Object.keys(this.dropdowns).forEach(key => this.closeDropdown(key));
    }
});
