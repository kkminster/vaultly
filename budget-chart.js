(function () {
  let budgetPieChart = null;

  function getExpenseCategoryTotals() {
    if (!Array.isArray(window.expenses)) return {};

    const totals = {};
    window.expenses.forEach(expense => {
      const category = expense.category || "Other";
      totals[category] = (totals[category] || 0) + Number(expense.amount || 0);
    });

    return totals;
  }

  function renderBudgetPieChart() {
    const canvas = document.getElementById("budgetPieChart");
    if (!canvas) return;

    const totals = getExpenseCategoryTotals();
    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (budgetPieChart) {
      budgetPieChart.destroy();
    }

    if (labels.length === 0) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    budgetPieChart = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  const originalAddExpense = window.addExpense;
  const originalClearExpenses = window.clearExpenses;
  const originalRenderExpenses = window.renderExpenses;

  window.addExpense = function () {
    if (typeof originalAddExpense === "function") {
      originalAddExpense();
    }
    renderBudgetPieChart();
  };

  window.clearExpenses = function () {
    if (typeof originalClearExpenses === "function") {
      originalClearExpenses();
    }
    renderBudgetPieChart();
  };

  window.renderExpenses = function () {
    if (typeof originalRenderExpenses === "function") {
      originalRenderExpenses();
    }
    renderBudgetPieChart();
  };

  document.addEventListener("DOMContentLoaded", function () {
    renderBudgetPieChart();
  });
})();
