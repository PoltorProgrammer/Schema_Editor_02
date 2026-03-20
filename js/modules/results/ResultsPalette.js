/**
 * Results Palette Mixin
 * Centralized color definitions for the Results Page
 */
Object.assign(SchemaEditor.prototype, {
    getChartPalette() {
        const palette = this.settings.palette || 'default';
        if (palette === 'eupsa') {
            return {
                manual: { 
                    main: '#CC79A7', 
                    sub: ['#e0a3c2', '#cc79a7', '#b5588c', '#a03d75'] 
                },
                correct: { 
                    main: '#013476', 
                    sub: ['#345c91', '#013476', '#012b62', '#01224d', '#001939', '#001126'] 
                },
                attention: { 
                    main: '#D65D00', 
                    sub: ['#f4781e', '#d65d00', '#b85000', '#9a4300', '#7d3600'] 
                },
                personal: { 
                    main: '#A3D8F7', 
                    sub: ['#bce5f9', '#a3d8f7', '#8bbcd3', '#72a0b0', '#5a848d'] 
                },
                comparison: {
                    correct: '#013476',
                    error: '#D65D00',
                    gray: '#A5A5A5'
                },
                improvements: ['#345c91', '#013476', '#012b62', '#01224d'],
                issues: ['#f4781e', '#d65d00', '#b85000', '#9a4300']
            };
        }
        // Default palette
        return {
            manual: { 
                main: '#8b5cf6', 
                sub: ['#7c3aed'] 
            },
            correct: { 
                main: '#22c55e', 
                sub: ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#10b981', '#059669', '#047857'] 
            },
            attention: { 
                main: '#f97316', 
                sub: ['#fb923c', '#f97316', '#ea580c', '#c2410c'] 
            },
            personal: { 
                main: '#3b82f6', 
                sub: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] 
            },
            comparison: {
                correct: '#22c55e',
                error: '#ef4444',
                gray: '#94a3b8'
            },
            improvements: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
            issues: ['#f87171', '#ef4444', '#dc2626', '#b91c1c']
        };
    }
});
