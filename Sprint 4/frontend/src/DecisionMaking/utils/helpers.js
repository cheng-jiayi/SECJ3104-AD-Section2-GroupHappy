// Format numbers with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format percentage
export const formatPercentage = (num, decimals = 1) => {
  if (num === null || num === undefined) return '0%';
  const value = parseFloat(num);
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// Get status color based on value
export const getStatusColor = (value, type = 'participation') => {
  if (type === 'participation') {
    if (value >= 70) return '#4CAF50'; // Green
    if (value >= 50) return '#FF9800'; // Orange
    if (value >= 30) return '#FF5722'; // Deep Orange
    return '#D32F2F'; // Red
  }
  
  if (type === 'priority') {
    if (value === 'High') return '#D32F2F';
    if (value === 'Medium') return '#FF9800';
    return '#4CAF50';
  }
  
  return '#666666'; // Gray
};

// Format date
export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

// Get faculty abbreviations
export const getFacultyAbbr = (faculty) => {
  const facultyMap = {
    'FABU': 'Built Environment',
    'FS': 'Science',
    'FKT': 'Technical Education',
    'FKE': 'Electrical Engineering',
    'FK': 'Computing',
    'FKM': 'Management',
    'FSSH': 'Social Sciences & Humanities',
    'FEST': 'Education',
    'FM': 'Medicine',
    'SPACE': 'Professional & Continuing Education'
  };
  return facultyMap[faculty] || faculty;
};

// Extract numeric value from string
export const extractNumber = (str) => {
  if (!str) return 0;
  const match = str.match(/([\d,.]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};