// Common utility functions used across the application

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'danger');
}

function showNotification(message, type) {
    const flashContainer = document.querySelector('.flash-messages') || createFlashContainer();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    flashContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.body.appendChild(container);
    return container;
}

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍽️',
        'Transportation': '🚗',
        'Petrol': '⛽',
        'Shopping': '🛍️',
        'Entertainment': '🎬',
        'Bills': '📄',
        'Healthcare': '🏥',
        'Education': '📚',
        'Other': '📌'
    };
    return icons[category] || '📌';
}

function getPaymentMethodIcon(method) {
    const icons = {
        'Cash': '💵',
        'Credit Card': '💳',
        'Debit Card': '💳',
        'UPI': '📱',
        'Bank Transfer': '🏦'
    };
    return icons[method] || '💰';
}

// Set minimum date for date inputs (prevent future dates)
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.hasAttribute('max')) {
            input.setAttribute('max', today);
        }
    });
});
