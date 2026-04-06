let goals = JSON.parse(localStorage.getItem("vaultlyGoals")) || [];
let expenses = JSON.parse(localStorage.getItem("vaultlyExpenses")) || [];
let budget = JSON.parse(localStorage.getItem("vaultlyBudget")) || {
  income: 0,
  needs: 0,
  wants: 0,
  savings: 0
};

function saveGoals() {
  localStorage.setItem("vaultlyGoals", JSON.stringify(goals));
}

function saveExpenses() {
  localStorage.setItem("vaultlyExpenses", JSON.stringify(expenses));
}

function saveBudgetData() {
  localStorage.setItem("vaultlyBudget", JSON.stringify(budget));
}

function formatCurrency(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function getDaysLeft(deadline) {
  if (!deadline) return null;
  const today = new Date();
  const due = new Date(deadline);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = due - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getMilestone(saved, target) {
  const percent = (saved / target) * 100;
  if (percent >= 100) return "100% Complete";
  if (percent >= 75) return "75% Milestone";
  if (percent >= 50) return "50% Milestone";
  if (percent >= 25) return "25% Milestone";
  return "Started";
}

function addGoal() {
  const nameInput = document.getElementById("goalName");
  const amountInput = document.getElementById("goalAmount");
  const startInput = document.getElementById("goalStart");
  const deadlineInput = document.getElementById("goalDeadline");
  const categoryInput = document.getElementById("goalCategory");
  const priorityInput = document.getElementById("goalPriority");
  const recurringInput = document.getElementById("goalRecurring");
  const recurringTypeInput = document.getElementById("goalRecurringType");
  const notesInput = document.getElementById("goalNotes");

  if (!nameInput) return;

  const name = nameInput.value.trim();
  const target = Number(amountInput.value);
  const saved = Number(startInput.value) || 0;
  const deadline = deadlineInput.value;
  const category = categoryInput.value;
  const priority = priorityInput.value;
  const recurring = Number(recurringInput.value) || 0;
  const recurringType = recurringTypeInput.value;
  const notes = notesInput.value.trim();

  if (!name || target <= 0 || saved < 0) {
    alert("Please enter a valid goal.");
    return;
  }

  goals.push({
    id: Date.now(),
    name,
    target,
    saved,
    deadline,
    category,
    priority,
    recurring,
    recurringType,
    notes,
    archived: false,
    history: saved > 0 ? [{ type: "start", amount: saved, date: todayString() }] : []
  });

  nameInput.value = "";
  amountInput.value = "";
  startInput.value = "";
  deadlineInput.value = "";
  recurringInput.value = "";
  notesInput.value = "";

  saveGoals();
  displayGoals();
  updateSavingsStats();
}

function addMoney(index) {
  const amount = Number(prompt("How much do you want to add?"));
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  goals[index].saved += amount;
  goals[index].history.push({
    type: "deposit",
    amount,
    date: todayString()
  });

  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function removeMoney(index) {
  const amount = Number(prompt("How much do you want to remove?"));
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  goals[index].saved = Math.max(0, goals[index].saved - amount);
  goals[index].history.push({
    type: "withdraw",
    amount,
    date: todayString()
  });

  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function editGoal(index) {
  const goal = goals[index];
  const newName = prompt("Edit goal name:", goal.name);
  if (!newName) return;

  const newTarget = Number(prompt("Edit target amount:", goal.target));
  if (isNaN(newTarget) || newTarget <= 0) return;

  goal.name = newName.trim();
  goal.target = newTarget;

  saveGoals();
  displayGoals();
  updateSavingsStats();
}

function archiveGoal(index) {
  goals[index].archived = true;
  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function unarchiveGoal(index) {
  goals[index].archived = false;
  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function deleteGoal(index) {
  goals.splice(index, 1);
  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function clearAllGoals() {
  if (goals.length === 0) return;
  const confirmed = confirm("Delete all goals?");
  if (!confirmed) return;

  goals = [];
  saveGoals();
  displayGoals();
  updateSavingsStats();
  renderDashboard();
}

function displayGoals() {
  const container = document.getElementById("goals");
  if (!container) return;

  const searchValue = (document.getElementById("goalSearch")?.value || "").toLowerCase();
  const categoryFilter = document.getElementById("goalFilterCategory")?.value || "all";
  const statusFilter = document.getElementById("goalFilterStatus")?.value || "active";

  container.innerHTML = "";

  let filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.name.toLowerCase().includes(searchValue);
    const matchesCategory = categoryFilter === "all" || goal.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !goal.archived) ||
      (statusFilter === "archived" && goal.archived);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (filteredGoals.length === 0) {
    container.innerHTML = `<div class="empty-state">No goals found.</div>`;
    return;
  }

  filteredGoals.forEach(goal => {
    const index = goals.findIndex(g => g.id === goal.id);
    const percent = Math.min((goal.saved / goal.target) * 100, 100);
    const remaining = Math.max(0, goal.target - goal.saved);
    const milestone = getMilestone(goal.saved, goal.target);
    const daysLeft = getDaysLeft(goal.deadline);

    let deadlineText = "No deadline set";
    let warningText = "";
    let paceText = "";

    if (goal.deadline) {
      if (daysLeft < 0) deadlineText = "Deadline passed";
      else if (daysLeft === 0) deadlineText = "Deadline is today";
      else deadlineText = `${daysLeft} day(s) left`;

      if (daysLeft > 0) {
        const monthlyNeeded = remaining / (daysLeft / 30.44);
        const weeklyNeeded = remaining / (daysLeft / 7);
        paceText = `
          <p class="goal-meta">Save per month: ${formatCurrency(monthlyNeeded)}</p>
          <p class="goal-meta">Save per week: ${formatCurrency(weeklyNeeded)}</p>
        `;
      }

      if (daysLeft >= 0 && daysLeft <= 14) {
        warningText = `<p class="warning">Deadline is close</p>`;
      }
    }

    const historyHtml = goal.history.slice(-5).reverse().map(item => {
      return `<p class="goal-meta">${item.date}: ${item.type} ${formatCurrency(item.amount)}</p>`;
    }).join("");

    container.innerHTML += `
      <div class="goal">
        <div class="goal-top">
          <div>
            <div class="badge">${goal.category}</div>
            <div class="badge">${goal.priority}</div>
            <div class="badge">${milestone}</div>
            ${goal.archived ? '<div class="badge">Archived</div>' : ''}
            <h3>${goal.name}</h3>
            <p class="goal-meta">Saved: ${formatCurrency(goal.saved)} / ${formatCurrency(goal.target)}</p>
            <p class="goal-meta">Remaining: ${formatCurrency(remaining)}</p>
            <p class="goal-meta">${deadlineText}</p>
            ${goal.recurring > 0 ? `<p class="goal-meta">Recurring: ${formatCurrency(goal.recurring)} ${goal.recurringType}</p>` : ""}
            ${goal.notes ? `<p class="goal-meta">Notes: ${goal.notes}</p>` : ""}
            ${warningText}
            ${paceText}
          </div>
          <strong>${percent.toFixed(1)}%</strong>
        </div>

        <div class="progress-wrap">
          <div class="bar-bg">
            <div class="bar" style="width:${percent}%"></div>
          </div>
        </div>

        <div class="goal-actions">
          <button onclick="addMoney(${index})">Add Money</button>
          <button class="secondary-btn" onclick="removeMoney(${index})">Remove Money</button>
          <button class="secondary-btn" onclick="editGoal(${index})">Edit</button>
          ${goal.archived
            ? `<button class="secondary-btn" onclick="unarchiveGoal(${index})">Unarchive</button>`
            : `<button class="secondary-btn" onclick="archiveGoal(${index})">Archive</button>`
          }
          <button onclick="deleteGoal(${index})">Delete</button>
        </div>

        <div class="result-box">
          <strong>Recent History</strong>
          ${historyHtml || "<p class='goal-meta'>No history yet.</p>"}
        </div>
      </div>
    `;
  });
}

function updateSavingsStats() {
  const totalGoalsEl = document.getElementById("totalGoals");
  const totalSavedEl = document.getElementById("totalSaved");
  const totalRemainingEl = document.getElementById("totalRemaining");
  const completedGoalsEl = document.getElementById("completedGoals");

  if (!totalGoalsEl) return;

  const activeGoals = goals.filter(goal => !goal.archived);
  const totalGoals = activeGoals.length;
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalRemaining = activeGoals.reduce((sum, goal) => sum + Math.max(0, goal.target - goal.saved), 0);
  const completedGoals = activeGoals.filter(goal => goal.saved >= goal.target).length;

  totalGoalsEl.textContent = totalGoals;
  totalSavedEl.textContent = formatCurrency(totalSaved);
  totalRemainingEl.textContent = formatCurrency(totalRemaining);
  completedGoalsEl.textContent = completedGoals;
}

function saveBudget() {
  const income = Number(document.getElementById("monthlyIncome").value) || 0;
  const needs = Number(document.getElementById("budgetNeeds").value) || 0;
  const wants = Number(document.getElementById("budgetWants").value) || 0;
  const savings = Number(document.getElementById("budgetSavings").value) || 0;

  budget = { income, needs, wants, savings };
  saveBudgetData();
  renderBudget();
  renderDashboard();
}

function renderBudget() {
  const result = document.getElementById("budgetResult");
  if (!result) return;

  const totalPlanned = budget.needs + budget.wants + budget.savings;
  const leftover = budget.income - totalPlanned;

  const actualNeeds = expenses.filter(e => e.category === "Needs").reduce((sum, e) => sum + e.amount, 0);
  const actualWants = expenses.filter(e => e.category === "Wants").reduce((sum, e) => sum + e.amount, 0);
  const actualSavings = expenses.filter(e => e.category === "Savings").reduce((sum, e) => sum + e.amount, 0);

  result.innerHTML = `
    <strong>Income:</strong> ${formatCurrency(budget.income)}<br>
    <strong>Planned Needs:</strong> ${formatCurrency(budget.needs)} | Actual: ${formatCurrency(actualNeeds)} ${actualNeeds > budget.needs ? '<span class="warning">(Over budget)</span>' : ''}<br>
    <strong>Planned Wants:</strong> ${formatCurrency(budget.wants)} | Actual: ${formatCurrency(actualWants)} ${actualWants > budget.wants ? '<span class="warning">(Over budget)</span>' : ''}<br>
    <strong>Planned Savings:</strong> ${formatCurrency(budget.savings)} | Actual: ${formatCurrency(actualSavings)}<br>
    <strong>Total Planned:</strong> ${formatCurrency(totalPlanned)}<br>
    <strong>Leftover:</strong> ${formatCurrency(leftover)}
  `;
}

function addExpense() {
  const nameInput = document.getElementById("expenseName");
  const amountInput = document.getElementById("expenseAmount");
  const dateInput = document.getElementById("expenseDate");
  const categoryInput = document.getElementById("expenseCategory");

  if (!nameInput) return;

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value || todayString();
  const category = categoryInput.value;

  if (!name || amount <= 0) {
    alert("Please enter a valid expense.");
    return;
  }

  expenses.push({
    id: Date.now(),
    name,
    amount,
    date,
    category
  });

  nameInput.value = "";
  amountInput.value = "";
  dateInput.value = "";

  saveExpenses();
  renderExpenses();
  renderBudget();
  renderDashboard();
}

function editExpense(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  const newName = prompt("Edit expense name:", expense.name);
  if (!newName) return;

  const newAmount = Number(prompt("Edit amount:", expense.amount));
  if (isNaN(newAmount) || newAmount <= 0) return;

  expense.name = newName.trim();
  expense.amount = newAmount;

  saveExpenses();
  renderExpenses();
  renderBudget();
  renderDashboard();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses();
  renderBudget();
  renderDashboard();
}

function clearExpenses() {
  if (!confirm("Delete all expenses?")) return;
  expenses = [];
  saveExpenses();
  renderExpenses();
  renderBudget();
  renderDashboard();
}

function renderExpenses() {
  const list = document.getElementById("expensesList");
  if (!list) return;

  list.innerHTML = "";

  if (expenses.length === 0) {
    list.innerHTML = `<div class="empty-state">No expenses yet.</div>`;
    return;
  }

  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  const monthlyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  let summaryHtml = `<div class="result-box"><strong>Total Expenses:</strong> ${formatCurrency(monthlyTotal)}<br>`;
  Object.keys(categoryTotals).forEach(cat => {
    summaryHtml += `<strong>${cat}:</strong> ${formatCurrency(categoryTotals[cat])}<br>`;
  });
  summaryHtml += `</div>`;

  list.innerHTML += summaryHtml;

  sorted.forEach(item => {
    list.innerHTML += `
      <div class="expense-item">
        <h3>${item.name}</h3>
        <p class="goal-meta">Amount: ${formatCurrency(item.amount)}</p>
        <p class="goal-meta">Category: ${item.category}</p>
        <p class="goal-meta">Date: ${item.date}</p>

        <div class="goal-actions">
          <button class="secondary-btn" onclick="editExpense(${item.id})">Edit</button>
          <button onclick="deleteExpense(${item.id})">Delete</button>
        </div>
      </div>
    `;
  });
}

function calculateLoanPayment(principal, annualRate, years, paymentsPerYear) {
  const periodicRate = annualRate / 100 / paymentsPerYear;
  const numberOfPayments = years * paymentsPerYear;

  if (periodicRate === 0) return principal / numberOfPayments;

  return (
    (principal * periodicRate * Math.pow(1 + periodicRate, numberOfPayments)) /
    (Math.pow(1 + periodicRate, numberOfPayments) - 1)
  );
}

function calculateLoan() {
  const amountEl = document.getElementById("loanAmount");
  const rateEl = document.getElementById("interestRate");
  const yearsEl = document.getElementById("loanYears");
  const result = document.getElementById("loanResult");
  const table = document.getElementById("loanTable");
  if (!amountEl || !result) return;

  const amount = Number(amountEl.value);
  const rate = Number(rateEl.value);
  const years = Number(yearsEl.value);

  if (amount <= 0 || rate < 0 || years <= 0) {
    result.innerHTML = "Please enter valid loan details.";
    return;
  }

  const monthlyPayment = calculateLoanPayment(amount, rate, years, 12);
  const totalRepayment = monthlyPayment * years * 12;
  const totalInterest = totalRepayment - amount;

  result.innerHTML = `
    <strong>Monthly Payment:</strong> ${formatCurrency(monthlyPayment)}<br>
    <strong>Total Repayment:</strong> ${formatCurrency(totalRepayment)}<br>
    <strong>Total Interest:</strong> ${formatCurrency(totalInterest)}
  `;

  let balance = amount;
  let tableHtml = `<strong>First 12 Months</strong><br>`;
  for (let month = 1; month <= Math.min(12, years * 12); month++) {
    const interestPart = balance * (rate / 100 / 12);
    const principalPart = monthlyPayment - interestPart;
    balance -= principalPart;
    tableHtml += `Month ${month}: Interest ${formatCurrency(interestPart)}, Principal ${formatCurrency(principalPart)}, Balance ${formatCurrency(Math.max(balance, 0))}<br>`;
  }
  table.innerHTML = tableHtml;
}

function calculateMortgage() {
  const amount = Number(document.getElementById("mortgageAmount")?.value);
  const rate = Number(document.getElementById("mortgageRate")?.value);
  const years = Number(document.getElementById("mortgageYears")?.value);
  const deposit = Number(document.getElementById("depositAmount")?.value) || 0;
  const result = document.getElementById("mortgageResult");
  if (!result) return;

  if (amount <= 0 || rate < 0 || years <= 0) {
    result.innerHTML = "Please enter valid mortgage details.";
    return;
  }

  const borrowed = Math.max(0, amount - deposit);
  const monthlyPayment = calculateLoanPayment(borrowed, rate, years, 12);
  const totalRepayment = monthlyPayment * years * 12;

  result.innerHTML = `
    <strong>Borrowed Amount:</strong> ${formatCurrency(borrowed)}<br>
    <strong>Monthly Payment:</strong> ${formatCurrency(monthlyPayment)}<br>
    <strong>Total Repayment:</strong> ${formatCurrency(totalRepayment)}
  `;
}

function calculateAffordability() {
  const income = Number(document.getElementById("affordIncome")?.value);
  const deposit = Number(document.getElementById("affordDeposit")?.value) || 0;
  const result = document.getElementById("affordResult");
  if (!result) return;

  if (income <= 0) {
    result.innerHTML = "Please enter valid affordability details.";
    return;
  }

  const estimatedBorrow = income * 4.5;
  const estimatedProperty = estimatedBorrow + deposit;

  result.innerHTML = `
    <strong>Estimated Borrowing:</strong> ${formatCurrency(estimatedBorrow)}<br>
    <strong>Estimated Property Budget:</strong> ${formatCurrency(estimatedProperty)}
  `;
}

function calculateInterest() {
  const start = Number(document.getElementById("interestStart")?.value) || 0;
  const monthly = Number(document.getElementById("interestMonthly")?.value) || 0;
  const rate = Number(document.getElementById("interestRateCalc")?.value);
  const years = Number(document.getElementById("interestYears")?.value);
  const result = document.getElementById("interestResult");
  if (!result) return;

  if (rate < 0 || years <= 0) {
    result.innerHTML = "Please enter valid savings details.";
    return;
  }

  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  let total = start;

  for (let i = 0; i < months; i++) {
    total = total * (1 + monthlyRate);
    total += monthly;
  }

  const contributed = start + monthly * months;
  const interestEarned = total - contributed;

  result.innerHTML = `
    <strong>Total Contributed:</strong> ${formatCurrency(contributed)}<br>
    <strong>Final Balance:</strong> ${formatCurrency(total)}<br>
    <strong>Interest Earned:</strong> ${formatCurrency(interestEarned)}
  `;
}

function calculateDebtPayoff() {
  const balance = Number(document.getElementById("debtBalance")?.value);
  const rate = Number(document.getElementById("debtRate")?.value);
  const payment = Number(document.getElementById("debtPayment")?.value);
  const result = document.getElementById("debtResult");
  if (!result) return;

  if (balance <= 0 || rate < 0 || payment <= 0) {
    result.innerHTML = "Please enter valid debt details.";
    return;
  }

  let currentBalance = balance;
  let months = 0;
  let totalInterest = 0;
  const monthlyRate = rate / 100 / 12;

  while (currentBalance > 0 && months < 1200) {
    const interest = currentBalance * monthlyRate;
    totalInterest += interest;
    currentBalance += interest;

    if (payment <= interest) {
      result.innerHTML = "Payment is too low to reduce the debt.";
      return;
    }

    currentBalance -= payment;
    months++;
  }

  result.innerHTML = `
    <strong>Estimated Payoff Time:</strong> ${months} month(s)<br>
    <strong>Total Interest:</strong> ${formatCurrency(totalInterest)}<br>
    <strong>Total Paid:</strong> ${formatCurrency(balance + totalInterest)}
  `;
}

function calculateDebtStrategies() {
  const d1 = Number(document.getElementById("snowballDebt1")?.value);
  const r1 = Number(document.getElementById("snowballRate1")?.value);
  const d2 = Number(document.getElementById("snowballDebt2")?.value);
  const r2 = Number(document.getElementById("snowballRate2")?.value);
  const result = document.getElementById("debtStrategyResult");
  if (!result) return;

  if (d1 <= 0 || d2 <= 0 || r1 < 0 || r2 < 0) {
    result.innerHTML = "Please enter valid debt strategy details.";
    return;
  }

  const snowballFirst = d1 < d2 ? "Debt 1 first" : "Debt 2 first";
  const avalancheFirst = r1 > r2 ? "Debt 1 first" : "Debt 2 first";

  result.innerHTML = `
    <strong>Snowball Method:</strong> ${snowballFirst}<br>
    <strong>Avalanche Method:</strong> ${avalancheFirst}<br>
    <strong>Snowball:</strong> focuses on smallest balance first.<br>
    <strong>Avalanche:</strong> focuses on highest interest first.
  `;
}

function calculateEmergencyFund() {
  const monthly = Number(document.getElementById("emergencyMonthly")?.value);
  const months = Number(document.getElementById("emergencyMonths")?.value);
  const result = document.getElementById("emergencyResult");
  if (!result) return;

  if (monthly <= 0 || months <= 0) {
    result.innerHTML = "Please enter valid emergency fund details.";
    return;
  }

  result.innerHTML = `
    <strong>Recommended Emergency Fund:</strong> ${formatCurrency(monthly * months)}
  `;
}

function calculateInflation() {
  const amount = Number(document.getElementById("inflationAmount")?.value);
  const rate = Number(document.getElementById("inflationRate")?.value);
  const years = Number(document.getElementById("inflationYears")?.value);
  const result = document.getElementById("inflationResult");
  if (!result) return;

  if (amount <= 0 || years <= 0) {
    result.innerHTML = "Please enter valid inflation details.";
    return;
  }

  const futureCost = amount * Math.pow(1 + rate / 100, years);

  result.innerHTML = `
    <strong>Amount Today:</strong> ${formatCurrency(amount)}<br>
    <strong>Future Cost:</strong> ${formatCurrency(futureCost)}
  `;
}

function renderDashboard() {
  const totalSavedEl = document.getElementById("dashTotalSaved");
  if (!totalSavedEl) return;

  const activeGoals = goals.filter(goal => !goal.archived);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalRemaining = activeGoals.reduce((sum, goal) => sum + Math.max(0, goal.target - goal.saved), 0);
  const completedGoals = activeGoals.filter(goal => goal.saved >= goal.target).length;

  const now = new Date();
  const thisMonthExpenses = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  document.getElementById("dashTotalSaved").textContent = formatCurrency(totalSaved);
  document.getElementById("dashTotalRemaining").textContent = formatCurrency(totalRemaining);
  document.getElementById("dashCompletedGoals").textContent = completedGoals;
  document.getElementById("dashMonthExpenses").textContent = formatCurrency(thisMonthExpenses);

  const closeGoalsList = document.getElementById("closeGoalsList");
  const urgentGoalsList = document.getElementById("urgentGoalsList");
  const recentTransactions = document.getElementById("recentTransactions");

  const closeGoals = activeGoals.filter(goal => (goal.saved / goal.target) >= 0.8 && goal.saved < goal.target);
  closeGoalsList.innerHTML = closeGoals.length
    ? closeGoals.map(goal => `<div class="dashboard-item">${goal.name} - ${formatCurrency(goal.target - goal.saved)} left</div>`).join("")
    : `<div class="empty-state">No goals close to completion.</div>`;

  const urgentGoals = activeGoals.filter(goal => {
    const days = getDaysLeft(goal.deadline);
    return days !== null && days >= 0 && days <= 14;
  });
  urgentGoalsList.innerHTML = urgentGoals.length
    ? urgentGoals.map(goal => `<div class="dashboard-item">${goal.name} - ${getDaysLeft(goal.deadline)} day(s) left</div>`).join("")
    : `<div class="empty-state">No urgent deadlines.</div>`;

  const transactions = [];
  goals.forEach(goal => {
    goal.history.forEach(item => {
      transactions.push({
        text: `${goal.name}: ${item.type} ${formatCurrency(item.amount)}`,
        date: item.date
      });
    });
  });
  expenses.forEach(expense => {
    transactions.push({
      text: `Expense: ${expense.name} ${formatCurrency(expense.amount)}`,
      date: expense.date
    });
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  recentTransactions.innerHTML = transactions.length
    ? transactions.slice(0, 8).map(t => `<div class="dashboard-item">${t.date} - ${t.text}</div>`).join("")
    : `<div class="empty-state">No recent transactions yet.</div>`;
}

displayGoals();
updateSavingsStats();
renderBudget();
renderExpenses();
renderDashboard();