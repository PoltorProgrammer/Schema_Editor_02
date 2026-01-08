const DEFAULT_SETTINGS = {
    theme: 'light',
    columnOrder: ['match', 'name', 'ai_value', 'human_value', 'description', 'patient_comments', 'reviewer_comments', 'comments', 'reviewer_notes', 'group', 'indicators', 'type', 'options'],
    columnVisibility: {
        match: true,
        name: true,
        ai_value: true,
        human_value: true,
        description: true,
        patient_comments: true,
        reviewer_comments: true,
        comments: false,
        group: false,
        indicators: false,
        reviewer_notes: false,
        type: false,
        options: false
    },
    columnWidths: {
        match: 60,
        name: 2,
        group: 1,
        ai_value: 2,
        human_value: 2,
        patient_comments: 2,
        reviewer_comments: 2,
        indicators: 150,
        options: 1.5,
        description: 3,
        comments: 2,
        reviewer_notes: 2,
        type: 1
    },
    filterVisibility: {
        type: false,
        group: false,
        label: false,
        status: true,
        reviewed: true,
        severity: true,
        reviewerNoteUser: true,
        reviewerCommentUser: true
    },
    panelWidth: '60vw',
    username: '',
    knownNicknames: []
};

const FILTER_STATES = ['all', 'true', 'false'];
