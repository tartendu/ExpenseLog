let allExpenses = [];

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    loadExpenses();

    document.getElementById('expenseForm').addEventListener('submit', handleAddExpense);
    document.getElementById('editExpenseForm').addEventListener('submit', handleEditExpense);
    document.getElementById('searchExpenses').addEventListener('input', filterExpenses);
    document.getElementById('filterCategory').addEventListener('change', filterExpenses);

    // Handle custom category selection
    document.getElementById('category').addEventListener('change', function() {
        const customCategoryInput = document.getElementById('customCategory');
        if (this.value === 'custom') {
            customCategoryInput.style.display = 'block';
            customCategoryInput.required = true;
            customCategoryInput.focus();
        } else {
            customCategoryInput.style.display = 'none';
            customCategoryInput.required = false;
            customCategoryInput.value = '';
        }
    });

    document.querySelector('.modal-close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    });
});

async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (data.success) {
            allExpenses = data.expenses;
            displayExpenses(allExpenses);
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showError('Failed to load expenses');
    }
}

function displayExpenses(expenses) {
    const expensesList = document.getElementById('expensesList');

    if (expenses.length === 0) {
        expensesList.innerHTML = '<p class="empty-state">No expenses found. Start by adding your first expense!</p>';
        return;
    }

    expensesList.innerHTML = expenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-header">
                    <span class="expense-icon">${getCategoryIcon(expense.category)}</span>
                    <h4>${expense.category}</h4>
                </div>
                <p class="expense-meta">${formatDate(expense.date)} • ${getPaymentMethodIcon(expense.payment_method)} ${expense.payment_method}</p>
                ${expense.notes ? `<p class="expense-notes"><em>${expense.notes}</em></p>` : ''}
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <div class="expense-actions">
                <button class="btn btn-edit" onclick="openEditModal('${expense.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteExpense('${expense.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterExpenses() {
    const searchTerm = document.getElementById('searchExpenses').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;

    let filtered = allExpenses;

    if (searchTerm) {
        filtered = filtered.filter(expense =>
            expense.category.toLowerCase().includes(searchTerm) ||
            (expense.notes && expense.notes.toLowerCase().includes(searchTerm)) ||
            expense.payment_method.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter) {
        filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    displayExpenses(filtered);
}

async function handleAddExpense(e) {
    e.preventDefault();

    const categorySelect = document.getElementById('category');
    const customCategoryInput = document.getElementById('customCategory');
    let category = categorySelect.value;

    // If custom category is selected, use the custom input value
    if (category === 'custom') {
        category = customCategoryInput.value.trim();
        if (!category) {
            showError('Please enter a custom category name');
            return;
        }
    }

    const formData = {
        amount: document.getElementById('amount').value,
        date: document.getElementById('date').value,
        category: category,
        payment_method: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value
    };

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Expense added successfully!');
            document.getElementById('expenseForm').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            loadExpenses();
        } else {
            showError(data.error || 'Failed to add expense');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        showError('Failed to add expense');
    }
}

function openEditModal(expenseId) {
    const expense = allExpenses.find(exp => exp.id === expenseId);

    if (expense) {
        document.getElementById('editExpenseId').value = expense.id;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editDate').value = expense.date;
        document.getElementById('editCategory').value = expense.category;
        document.getElementById('editPaymentMethod').value = expense.payment_method;
        document.getElementById('editNotes').value = expense.notes || '';

        document.getElementById('editModal').style.display = 'block';
    }
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditExpense(e) {
    e.preventDefault();

    const expenseId = document.getElementById('editExpenseId').value;
    const formData = {
        amount: document.getElementById('editAmount').value,
        date: document.getElementById('editDate').value,
        category: document.getElementById('editCategory').value,
        payment_method: document.getElementById('editPaymentMethod').value,
        notes: document.getElementById('editNotes').value
    };

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Expense updated successfully!');
            closeModal();
            loadExpenses();
        } else {
            showError(data.error || 'Failed to update expense');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showError('Failed to update expense');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Expense deleted successfully!');
            loadExpenses();
        } else {
            showError(data.error || 'Failed to delete expense');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showError('Failed to delete expense');
    }
}
