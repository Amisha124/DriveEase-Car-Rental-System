const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/expenses - Admin fetch all operational expenses
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const expenses = await db.read('expenses');
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses: ' + err.message });
  }
});

// POST /api/expenses - Admin add expense
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { title, category, amount, carId, date } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ error: 'Expense title and amount are required' });
    }

    const newExpense = await db.insert('expenses', {
      title: title.trim(),
      category: category || 'Maintenance',
      amount: Number(amount),
      carId: carId || null,
      date: date || new Date().toISOString().split('T')[0]
    });

    // If linked to car, update car maintenance cost
    if (carId) {
      const car = await db.findOne('cars', { id: carId });
      if (car) {
        await db.updateById('cars', carId, {
          maintenanceCost: (car.maintenanceCost || 0) + Number(amount)
        });
      }
    }

    res.status(201).json({ message: 'Expense recorded successfully', expense: newExpense });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record expense: ' + err.message });
  }
});

// DELETE /api/expenses/:id - Admin delete expense
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await db.removeById('expenses', req.params.id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
  }
});

module.exports = router;
