from firebase_config import db
from datetime import datetime
from google.cloud.firestore_v1 import FieldFilter

class ExpenseDB:
    """Database operations for expenses"""

    @staticmethod
    def add_expense(user_id, expense_data):
        """Add a new expense"""
        try:
            expense_data['user_id'] = user_id
            expense_data['created_at'] = datetime.now()

            doc_ref = db.collection('expenses').document()
            doc_ref.set(expense_data)
            return {'success': True, 'id': doc_ref.id}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_user_expenses(user_id, limit=None):
        """Get all expenses for a user"""
        try:
            query = db.collection('expenses').where(filter=FieldFilter('user_id', '==', user_id)).order_by('created_at', direction='DESCENDING')

            if limit:
                query = query.limit(limit)

            expenses = []
            for doc in query.stream():
                expense = doc.to_dict()
                expense['id'] = doc.id
                expenses.append(expense)

            return expenses
        except Exception as e:
            print(f"Error fetching expenses: {e}")
            return []

    @staticmethod
    def get_expense_by_id(expense_id, user_id):
        """Get a specific expense"""
        try:
            doc = db.collection('expenses').document(expense_id).get()
            if doc.exists:
                expense = doc.to_dict()
                if expense['user_id'] == user_id:
                    expense['id'] = doc.id
                    return expense
            return None
        except Exception as e:
            print(f"Error fetching expense: {e}")
            return None

    @staticmethod
    def update_expense(expense_id, user_id, update_data):
        """Update an expense"""
        try:
            doc_ref = db.collection('expenses').document(expense_id)
            doc = doc_ref.get()

            if doc.exists and doc.to_dict()['user_id'] == user_id:
                update_data['updated_at'] = datetime.now()
                doc_ref.update(update_data)
                return {'success': True}
            return {'success': False, 'error': 'Expense not found or unauthorized'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def delete_expense(expense_id, user_id):
        """Delete an expense"""
        try:
            doc_ref = db.collection('expenses').document(expense_id)
            doc = doc_ref.get()

            if doc.exists and doc.to_dict()['user_id'] == user_id:
                doc_ref.delete()
                return {'success': True}
            return {'success': False, 'error': 'Expense not found or unauthorized'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_expenses_by_date_range(user_id, start_date, end_date):
        """Get expenses within a date range"""
        try:
            query = db.collection('expenses').where(filter=FieldFilter('user_id', '==', user_id))

            expenses = []
            for doc in query.stream():
                expense = doc.to_dict()
                expense_date = expense.get('date')
                if start_date <= expense_date <= end_date:
                    expense['id'] = doc.id
                    expenses.append(expense)

            return sorted(expenses, key=lambda x: x['date'], reverse=True)
        except Exception as e:
            print(f"Error fetching expenses by date range: {e}")
            return []

    @staticmethod
    def get_expenses_by_category(user_id, category):
        """Get expenses by category"""
        try:
            query = db.collection('expenses').where(filter=FieldFilter('user_id', '==', user_id)).where(filter=FieldFilter('category', '==', category))

            expenses = []
            for doc in query.stream():
                expense = doc.to_dict()
                expense['id'] = doc.id
                expenses.append(expense)

            return expenses
        except Exception as e:
            print(f"Error fetching expenses by category: {e}")
            return []

class BudgetDB:
    """Database operations for budgets"""

    @staticmethod
    def set_budget(user_id, category, amount, period='monthly'):
        """Set or update budget for a category (use 'Overall' for total budget)"""
        try:
            budget_data = {
                'user_id': user_id,
                'category': category,
                'amount': float(amount),
                'period': period,
                'updated_at': datetime.now()
            }

            query = db.collection('budgets').where(filter=FieldFilter('user_id', '==', user_id)).where(filter=FieldFilter('category', '==', category))
            existing = list(query.stream())

            if existing:
                existing[0].reference.update(budget_data)
            else:
                budget_data['created_at'] = datetime.now()
                db.collection('budgets').document().set(budget_data)

            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_user_budgets(user_id):
        """Get all budgets for a user"""
        try:
            query = db.collection('budgets').where(filter=FieldFilter('user_id', '==', user_id))

            budgets = []
            for doc in query.stream():
                budget = doc.to_dict()
                budget['id'] = doc.id
                budgets.append(budget)

            return budgets
        except Exception as e:
            print(f"Error fetching budgets: {e}")
            return []

    @staticmethod
    def delete_budget(budget_id, user_id):
        """Delete a budget"""
        try:
            doc_ref = db.collection('budgets').document(budget_id)
            doc = doc_ref.get()

            if doc.exists and doc.to_dict()['user_id'] == user_id:
                doc_ref.delete()
                return {'success': True}
            return {'success': False, 'error': 'Budget not found or unauthorized'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
