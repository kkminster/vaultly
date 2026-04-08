(function () {
  let budgetPieChart = null;

  function readExpenses() {
    try {
      return JSON.parse(localStorage.getItem("vaultlyExpenses")) || [];
    } catch {
      return [];
    }
  }

  function getExpenseCategoryTotals() {
    const expenses = readExpenses();
    const totals = {};

    expenses.forEach(expense => {
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
      budgetPieChart = null;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (labels.length === 0) {
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

  if (typeof originalAddExpense === "function") {
    window.addExpense = function () {
      originalAddExpense();
      renderBudgetPieChart();
    };
  }

  if (typeof originalClearExpenses === "function") {
    window.clearExpenses = function () {
      originalClearExpenses();
      renderBudgetPieChart();
    };
  }

  if (typeof originalRenderExpenses === "function") {
    window.renderExpenses = function () {
      originalRenderExpenses();
      renderBudgetPieChart();
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderBudgetPieChart();
  });
})();
