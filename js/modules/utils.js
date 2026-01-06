const AppUtils = {
    formatGroupName(groupId) {
        if (groupId === 'ungrouped') return 'Ungrouped';
        return groupId.replace(/group_/, 'Group ').replace(/_/g, ' ');
    },

    extractTypeValue(fieldDef) {
        let type = fieldDef.type;
        if (Array.isArray(type)) {
            type = type.find(t => t !== 'null') || type[0];
        }
        if (type) return type;

        if (fieldDef.anyOf && Array.isArray(fieldDef.anyOf)) {
            const nonNullType = fieldDef.anyOf.find(t => t.type && t.type !== 'null');
            if (nonNullType) {
                return Array.isArray(nonNullType.type) ? (nonNullType.type.find(t => t !== 'null') || nonNullType.type[0]) : nonNullType.type;
            }
        }
        return 'string';
    },

    extractFormatValue(fieldDef) {
        if (fieldDef.format) return fieldDef.format;
        if (fieldDef.anyOf && Array.isArray(fieldDef.anyOf)) {
            const typeWithFormat = fieldDef.anyOf.find(t => t.format);
            if (typeWithFormat) return typeWithFormat.format;
        }
        return '';
    },

    extractDefaultValue(fieldDef) {
        if (fieldDef.default === null) return 'null';
        if (fieldDef.default !== undefined) {
            return typeof fieldDef.default === 'string' ? fieldDef.default : JSON.stringify(fieldDef.default);
        }
        return '';
    },

    escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/"/g, '&quot;');
    },

    getFieldType(fieldDef) {
        // Preference for explicit medical/schema types we manually set
        if (['boolean', 'enum', 'date', 'comment', 'integer', 'number'].includes(fieldDef.type)) return fieldDef.type;

        // Fallbacks for standard JSON schema
        if (fieldDef.enum || (fieldDef.options && fieldDef.options.length > 0)) return 'enum';
        if (fieldDef.anyOf) {
            const types = fieldDef.anyOf.map(t => t.type || 'unknown').filter(t => t !== 'null');
            if (types.some(t => t === 'enum')) return 'enum';
            return Array.isArray(types) ? types[0] : types;
        }

        let type = fieldDef.type || 'string';
        if (Array.isArray(type)) {
            type = type.find(t => t !== 'null') || type[0];
        }
        return type;
    },

    hasEnumValues(fieldDef) {
        if (fieldDef.options && Array.isArray(fieldDef.options)) return true;
        if (fieldDef.enum && Array.isArray(fieldDef.enum)) return true;
        if (fieldDef.anyOf && Array.isArray(fieldDef.anyOf)) {
            return fieldDef.anyOf.some(t => t.enum && Array.isArray(t.enum));
        }
        return false;
    },

    getTypeColor(type) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const lightColors = {
            'string': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
            'number': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
            'integer': { bg: '#e0e7ff', text: '#4338ca', border: '#6366f1' },
            'boolean': { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
            'array': { bg: '#fce7f3', text: '#be185d', border: '#ec4899' },
            'object': { bg: '#f3e8ff', text: '#7c3aed', border: '#a855f7' },
            'enum': { bg: '#fed7d7', text: '#c53030', border: '#e53e3e' },
            'date': { bg: '#e0f2fe', text: '#0369a1', border: '#3b82f6' },
            'comment': { bg: '#f1f5f9', text: '#475569', border: '#64748b' },
            'unknown': { bg: '#f7fafc', text: '#4a5568', border: '#a0aec0' }
        };

        const darkColors = {
            'string': { bg: '#451a03', text: '#fbbf24', border: '#f59e0b' },
            'number': { bg: '#1e3a8a', text: '#60a5fa', border: '#3b82f6' },
            'integer': { bg: '#312e81', text: '#a78bfa', border: '#6366f1' },
            'boolean': { bg: '#14532d', text: '#4ade80', border: '#22c55e' },
            'array': { bg: '#831843', text: '#f472b6', border: '#ec4899' },
            'object': { bg: '#581c87', text: '#c084fc', border: '#a855f7' },
            'enum': { bg: '#7f1d1d', text: '#f87171', border: '#e53e3e' },
            'date': { bg: '#0c4a6e', text: '#38bdf8', border: '#0ea5e9' },
            'comment': { bg: '#1e293b', text: '#94a3b8', border: '#64748b' },
            'unknown': { bg: '#374151', text: '#9ca3af', border: '#6b7280' }
        };

        const colors = isDark ? darkColors : lightColors;
        return colors[type] || colors['unknown'];
    },

    getGroupColor(group) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const lightColors = [
            { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' }, // Blue
            { bg: '#dcfce7', text: '#166534', border: '#22c55e' }, // Green
            { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' }, // Yellow
            { bg: '#fce7f3', text: '#be185d', border: '#ec4899' }, // Pink
            { bg: '#f3e8ff', text: '#7c3aed', border: '#a855f7' }, // Purple
            { bg: '#fed7d7', text: '#c53030', border: '#e53e3e' }, // Red
            { bg: '#e0f2fe', text: '#0c4a6e', border: '#0891b2' }, // Cyan
            { bg: '#ecfdf5', text: '#064e3b', border: '#059669' }, // Emerald
            { bg: '#fdf4ff', text: '#86198f', border: '#d946ef' }, // Fuchsia
            { bg: '#fff7ed', text: '#9a3412', border: '#ea580c' }  // Orange
        ];

        const darkColors = [
            { bg: '#1e3a8a', text: '#60a5fa', border: '#3b82f6' }, // Blue
            { bg: '#14532d', text: '#4ade80', border: '#22c55e' }, // Green
            { bg: '#451a03', text: '#fbbf24', border: '#f59e0b' }, // Yellow
            { bg: '#831843', text: '#f472b6', border: '#ec4899' }, // Pink
            { bg: '#581c87', text: '#c084fc', border: '#a855f7' }, // Purple
            { bg: '#7f1d1d', text: '#f87171', border: '#e53e3e' }, // Red
            { bg: '#0c4a6e', text: '#0891b2', border: '#0891b2' }, // Cyan
            { bg: '#064e3b', text: '#10b981', border: '#059669' }, // Emerald
            { bg: '#86198f', text: '#d946ef', border: '#d946ef' }, // Fuchsia
            { bg: '#9a3412', text: '#fb923c', border: '#ea580c' }  // Orange
        ];

        let hash = 0;
        for (let i = 0; i < group.length; i++) {
            hash = ((hash << 5) - hash + group.charCodeAt(i)) & 0x7fffffff;
        }

        const colors = isDark ? darkColors : lightColors;
        return colors[hash % colors.length];
    },

    normalizeValue(val) {
        if (val === null || val === undefined) return 'null';
        const strVal = String(val).trim();
        if (strVal === '') return 'empty';
        return strVal;
    },

    getMostCommonValue(outputs) {
        if (!outputs || !Array.isArray(outputs) || outputs.length === 0) return null;
        return outputs.reduce((prev, current) => {
            return (Number(prev.count || 0) >= Number(current.count || 0)) ? prev : current;
        }).value;
    },

    formatValueWithLabel(value, fieldDef) {
        if (value === '--') return '--';

        const normalized = this.normalizeValue(value);
        if (normalized === 'null') return 'null';
        if (normalized === 'empty') return 'empty';

        let label = null;
        if (fieldDef.options && Array.isArray(fieldDef.options)) {
            const opt = fieldDef.options.find(o => String(o.value) === String(value));
            if (opt) label = opt.label;
        }

        return label ? `(${value}) ${label}` : value;
    },

    getTimestamp() {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Berlin',
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
        const parts = formatter.formatToParts(new Date());
        const getPart = (type) => parts.find(p => p.type === type).value;
        const yy = getPart('year');
        const mm = getPart('month');
        const dd = getPart('day');
        const h = getPart('hour');
        const m = getPart('minute');
        const s = getPart('second');
        return `${yy}${mm}${dd}${h}${m}${s}`;
    },

    getTimeAgo(dateInput) {
        if (!dateInput) return 'Never';
        const date = new Date(dateInput);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

        const years = Math.floor(months / 12);
        return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
};
