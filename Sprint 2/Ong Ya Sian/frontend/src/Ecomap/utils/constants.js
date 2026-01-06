export const BIN_TYPES = [
    { id: 1, name: 'Plastic', icon: 'recycle', color: '#2196F3' },
    { id: 2, name: 'Paper', icon: 'file-document', color: '#4CAF50' },
    { id: 3, name: 'Glass', icon: 'glass-mug', color: '#FF9800' },
    { id: 4, name: 'Metal', icon: 'cog', color: '#795548' },
    { id: 5, name: 'Tyre', icon: 'tyre', color: '#9C27B0' },
];

export const ISSUE_TYPES = [
    { id: 1, name: 'Full', icon: 'alert-circle', color: '#F44336' },
    { id: 2, name: 'Damaged', icon: 'wrench', color: '#FF9800' },
    { id: 3, name: 'Misplaced', icon: 'map-marker-off', color: '#9C27B0' },
    { id: 4, name: 'Inaccessible', icon: 'block-helper', color: '#607D8B' },
    { id: 5, name: 'Other', icon: 'alert', color: '#795548' },
];

export const BIN_STATUS = {
    ACTIVE: 'Active',
    FULL: 'Full',
    UNDER_MAINTENANCE: 'Under Maintenance'
};

export const BIN_STATUS_COLORS = {
    'Active': '#4CAF50',
    'Full': '#F44336',
    'Under Maintenance': '#FF9800'
};

export const ISSUE_STATUS = {
    PENDING: 'Pending',
    RESOLVED: 'Resolved',
    IGNORED: 'Ignored'
};