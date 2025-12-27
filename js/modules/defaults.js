const DEFAULT_SETTINGS = {
    theme: 'light',
    columnOrder: ['match', 'name', 'group', 'ai_value', 'human_value', 'indicators', 'description', 'comments', 'options'],
    columnVisibility: {
        match: true,
        name: true,
        group: true,
        ai_value: true,
        human_value: true,
        indicators: true,
        description: false,
        comments: false,
        type: false,
        options: false
    },
    columnWidths: {
        match: 60,
        name: 2,
        group: 1,
        ai_value: 2,
        human_value: 2,
        indicators: 150,
        options: 1.5,
        description: 3,
        comments: 2,
        type: 1
    },
    filterVisibility: {
        type: true,
        group: true,
        label: true,
        status: true,
        reviewed: true,
        severity: true
    }
};

const FILTER_STATES = ['all', 'true', 'false'];
