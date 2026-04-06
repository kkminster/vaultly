(function () {
  function formatCurrencySafe(amount) {
    return typeof formatCurrency === "function"
      ? formatCurrency(amount)
      : `£${Number(amount).toFixed(2)}`;
  }

  function getPriorityRank(priority) {
    if (priority === "High") return 1;
    if (priority === "Medium") return 2;
    if (priority === "Low") return 3;
    return 4;
  }

  function getGoalStatus(goal) {
    const percent = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;

    if (percent >= 100) {
      return { label: "Completed", className: "completed" };
    }

    if (goal.deadline) {
      const daysLeft = typeof getDaysLeft === "function" ? getDaysLeft(goal.deadline) : null;
      if (daysLeft !== null && daysLeft > 0) {
        const remaining = Math.max(0, goal.target - goal.saved);
        const monthlyNeeded = remaining / (daysLeft / 30.44);

        if (monthlyNeeded > 300) {
          return { label: "Behind", className: "behind" };
        }
      }
    }

    return { label: "On Track", className: "track" };
  }

  function sortGoalsList(list) {
    const sortValue = document.getElementById("goalSort")?.value || "default";
    const goalsCopy = [...list];

    if (sortValue === "progressHigh") {
      goalsCopy.sort((a, b) => (b.saved / b.target) - (a.saved / a.target));
    } else if (sortValue === "progressLow") {
      goalsCopy.sort((a, b) => (a.saved / a.target) - (b.saved / b.target));
    } else if (sortValue === "deadlineSoon") {
      goalsCopy.sort((a, b) => {
        const aDays = a.deadline ? getDaysLeft(a.deadline) : 999999;
        const bDays = b.deadline ? getDaysLeft(b.deadline) : 999999;
        return aDays - bDays;
      });
    } else if (sortValue === "targetHigh") {
      goalsCopy.sort((a, b) => b.target - a.target);
    } else if (sortValue === "savedHigh") {
      goalsCopy.sort((a, b) => b.saved - a.saved);
    } else if (sortValue === "priority") {
      goalsCopy.sort((a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority));
    }

    return goalsCopy;
  }

  window.applyRecurringDeposits = function () {
    if (!Array.isArray(window.goals) || window.goals.length === 0) {
      alert("No goals available.");
      return;
    }

    let updated = 0;

    window.goals.forEach(goal => {
      if (!goal.archived && goal.recurring > 0) {
        goal.saved += goal.recurring;
        goal.history = goal.history || [];
        goal.history.push({
          type: `recurring-${goal.recurringType || "monthly"}`,
          amount: goal.recurring,
          date: typeof todayString === "function" ? todayString() : new Date().toISOString().split("T")[0]
        });
        updated++;
      }
    });

    if (typeof saveGoals === "function") saveGoals();
    if (typeof displayGoals === "function") displayGoals();
    if (typeof updateSavingsStats === "function") updateSavingsStats();
    if (typeof renderDashboard === "function") renderDashboard();

    alert(`Applied recurring deposits to ${updated} goal(s).`);
  };

  window.exportGoalsCsv = function () {
    if (!Array.isArray(window.goals) || window.goals.length === 0) {
      alert("No goals to export.");
      return;
    }

    const rows = [
      [
        "Name",
        "Category",
        "Priority",
        "Target",
        "Saved",
        "Remaining",
        "Deadline",
        "Recurring Amount",
        "Recurring Type",
        "Archived",
        "Notes"
      ]
    ];

    window.goals.forEach(goal => {
      rows.push([
        `"${(goal.name || "").replace(/"/g, '""')}"`,
        `"${(goal.category || "").replace(/"/g, '""')}"`,
        `"${(goal.priority || "").replace(/"/g, '""')}"`,
        goal.target || 0,
        goal.saved || 0,
        Math.max(0, (goal.target || 0) - (goal.saved || 0)),
        goal.deadline || "",
        goal.recurring || 0,
        goal.recurringType || "",
        goal.archived ? "Yes" : "No",
        `"${(goal.notes || "").replace(/"/g, '""')}"`
      ]);
    });

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vaultly-goals.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  window.duplicateGoal = function (index) {
    const goal = window.goals[index];
    if (!goal) return;

    const copy = {
      ...goal,
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: `${goal.name} Copy`,
      history: []
    };

    window.goals.push(copy);

    if (typeof saveGoals === "function") saveGoals();
    if (typeof displayGoals === "function") displayGoals();
    if (typeof updateSavingsStats === "function") updateSavingsStats();
  };

  const originalDisplayGoals = window.displayGoals;
  const originalUpdateSavingsStats = window.updateSavingsStats;

  window.displayGoals = function () {
    const container = document.getElementById("goals");
    if (!container || !Array.isArray(window.goals)) {
      if (typeof originalDisplayGoals === "function") originalDisplayGoals();
      return;
    }

    const searchValue = (document.getElementById("goalSearch")?.value || "").toLowerCase();
    const categoryFilter = document.getElementById("goalFilterCategory")?.value || "all";
    const statusFilter = document.getElementById("goalFilterStatus")?.value || "active";

    let filteredGoals = window.goals.filter(goal => {
      const matchesSearch = (goal.name || "").toLowerCase().includes(searchValue);
      const matchesCategory = categoryFilter === "all" || goal.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !goal.archived) ||
        (statusFilter === "archived" && goal.archived);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    filteredGoals = sortGoalsList(filteredGoals);

    container.innerHTML = "";

    if (filteredGoals.length === 0) {
      container.innerHTML = `<div class="empty-state">No goals found.</div>`;
      return;
    }

    filteredGoals.forEach(goal => {
      const index = window.goals.findIndex(g => g.id === goal.id);
      const percent = Math.min((goal.saved / goal.target) * 100, 100);
      const remaining = Math.max(0, goal.target - goal.saved);
      const milestone = typeof getMilestone === "function" ? getMilestone(goal.saved, goal.target) : "Started";
      const daysLeft = goal.deadline && typeof getDaysLeft === "function" ? getDaysLeft(goal.deadline) : null;
      const status = getGoalStatus(goal);

      let deadlineText = "No deadline set";
      let warningText = "";
      let paceText = "";
      let recurringText = "";
      let successBox = "";

      if (goal.deadline) {
        if (daysLeft < 0) deadlineText = "Deadline passed";
        else if (daysLeft === 0) deadlineText = "Deadline is today";
        else deadlineText = `${daysLeft} day(s) left`;

        if (daysLeft > 0) {
          const monthlyNeeded = remaining / (daysLeft / 30.44);
          const weeklyNeeded = remaining / (daysLeft / 7);
          paceText = `
            <p class="goal-soft-note">Needed per month: ${formatCurrencySafe(monthlyNeeded)}</p>
            <p class="goal-soft-note">Needed per week: ${formatCurrencySafe(weeklyNeeded)}</p>
          `;
        }

        if (daysLeft >= 0 && daysLeft <= 14 && percent < 100) {
          warningText = `<p class="warning">Deadline is close</p>`;
        }
      }

      if (goal.recurring > 0) {
        recurringText = `<p class="goal-soft-note">Recurring deposit: ${formatCurrencySafe(goal.recurring)} ${goal.recurringType || "monthly"}</p>`;
      }

      if (percent >= 100) {
        successBox = `<div class="goal-success-box">🎉 Goal reached! Great job.</div>`;
      }

      const historyHtml = (goal.history || []).slice(-5).reverse().map(item => {
        return `<p class="goal-meta">${item.date}: ${item.type} ${formatCurrencySafe(item.amount)}</p>`;
      }).join("");

      container.innerHTML += `
        <div class="goal">
          <div class="goal-top">
            <div>
              <div class="badge">${goal.category || "Other"}</div>
              <div class="badge">${goal.priority || "Medium"}</div>
              <div class="badge">${milestone}</div>
              <span class="goal-status ${status.className}">${status.label}</span>
              ${goal.archived ? '<div class="badge">Archived</div>' : ""}
              <h3>${goal.name}</h3>
              <p class="goal-meta">Saved: ${formatCurrencySafe(goal.saved)} / ${formatCurrencySafe(goal.target)}</p>
              <p class="goal-meta">Remaining: ${formatCurrencySafe(remaining)}</p>
              <p class="goal-meta">${deadlineText}</p>
              ${recurringText}
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

          ${successBox}

          <div class="goal-actions">
            <button onclick="addMoney(${index})">Add Money</button>
            <button class="secondary-btn" onclick="removeMoney(${index})">Remove Money</button>
            <button class="secondary-btn" onclick="editGoal(${index})">Edit</button>
            <button class="secondary-btn" onclick="duplicateGoal(${index})">Duplicate</button>
            ${
              goal.archived
                ? `<button class="secondary-btn" onclick="unarchiveGoal(${index})">Unarchive</button>`
                : `<button class="secondary-btn" onclick="archiveGoal(${index})">Archive</button>`
            }
            <button onclick="deleteGoal(${index})">Delete</button>
          </div>

          <div class="goal-highlight">
            <div class="goal-history-title">Recent History</div>
            ${historyHtml || "<p class='goal-meta'>No history yet.</p>"}
          </div>
        </div>
      `;
    });
  };

  window.updateSavingsStats = function () {
    if (typeof originalUpdateSavingsStats === "function") {
      originalUpdateSavingsStats();
    }

    const avgProgressEl = document.getElementById("avgProgress");
    const dueSoonEl = document.getElementById("dueSoonCount");
    const archivedEl = document.getElementById("archivedCount");
    const recurringTotalEl = document.getElementById("recurringTotal");

    if (!avgProgressEl || !Array.isArray(window.goals)) return;

    const activeGoals = window.goals.filter(goal => !goal.archived);
    const archivedGoals = window.goals.filter(goal => goal.archived);

    const avgProgress = activeGoals.length
      ? activeGoals.reduce((sum, goal) => sum + ((goal.saved / goal.target) * 100), 0) / activeGoals.length
      : 0;

    const dueSoon = activeGoals.filter(goal => {
      if (!goal.deadline || typeof getDaysLeft !== "function") return false;
      const days = getDaysLeft(goal.deadline);
      return days >= 0 && days <= 14;
    }).length;

    const recurringTotal = activeGoals.reduce((sum, goal) => sum + (Number(goal.recurring) || 0), 0);

    avgProgressEl.textContent = `${avgProgress.toFixed(1)}%`;
    dueSoonEl.textContent = dueSoon;
    archivedEl.textContent = archivedGoals.length;
    recurringTotalEl.textContent = formatCurrencySafe(recurringTotal);
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.displayGoals === "function") window.displayGoals();
    if (typeof window.updateSavingsStats === "function") window.updateSavingsStats();
  });
})();