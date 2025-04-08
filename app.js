// Retrieve transactions from localStorage or initialize an empty array.
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let currentEditId = null; // Tracks transaction being edited

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "symbol",
  signDisplay: "always",
});

// DOM Elements
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const listEl = document.getElementById("transactionList");
const statusEl = document.getElementById("status");
const monthlySummaryListEl = document.getElementById("monthlySummaryList");
const form = document.getElementById("transactionForm");
const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const monthFilterEl = document.getElementById("monthFilter");
const downloadBtn = document.getElementById("downloadBtn");
const notificationEl = document.getElementById("notification");
const themeToggleBtn = document.getElementById("themeToggle");

// Attach event listeners
form.addEventListener("submit", handleFormSubmit);
monthFilterEl.addEventListener("change", renderTransactions);
downloadBtn.addEventListener("click", downloadCSV);
themeToggleBtn.addEventListener("click", toggleTheme);

// Initialize theme based on stored preference
(function initTheme() {
  const storedTheme = localStorage.getItem("theme") || "day";
  if (storedTheme === "night") {
    document.body.classList.add("night-theme");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("night-theme");
    themeToggleBtn.textContent = "🌙";
  }
})();

// Toggle between Day and Night theme.
function toggleTheme() {
  if (document.body.classList.contains("night-theme")) {
    document.body.classList.remove("night-theme");
    themeToggleBtn.textContent = "🌙";
    localStorage.setItem("theme", "day");
  } else {
    document.body.classList.add("night-theme");
    themeToggleBtn.textContent = "☀️";
    localStorage.setItem("theme", "night");
  }
}

// Display a notification
function showNotification(message) {
  notificationEl.textContent = message;
  notificationEl.classList.add("show");
  setTimeout(() => notificationEl.classList.remove("show"), 2500);
}

/**
 * Helper: Format a Date object as "dd-mm-yyyy".
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Helper: Return an object with month details.
 */
function getMonthYearLabel(date) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = date.getMonth();
  const year = date.getFullYear();
  const value = `${year}-${(month + 1).toString().padStart(2, "0")}`;
  const label = `${monthNames[month]} ${year}`;
  return { value, label, fullDate: `${year}-${(month + 1).toString().padStart(2, "0")}-01` };
}

/**
 * Populate the month filter with unique month-year entries.
 */
function populateMonthFilter() {
  const uniqueMonths = {};
  const now = new Date();
  const currentMonthObj = getMonthYearLabel(now);
  uniqueMonths[currentMonthObj.value] = currentMonthObj;

  transactions.forEach((trx) => {
    const trxMonthObj = getMonthYearLabel(new Date(trx.date));
    uniqueMonths[trxMonthObj.value] = trxMonthObj;
  });
  
  const monthArray = Object.values(uniqueMonths).sort(
    (a, b) => new Date(b.fullDate) - new Date(a.fullDate)
  );
  
  monthFilterEl.innerHTML = "";
  monthArray.forEach((monthObj) => {
    const option = document.createElement("option");
    option.value = monthObj.value;
    option.textContent = monthObj.label;
    monthFilterEl.appendChild(option);
  });
}

/**
 * Handle adding or editing a transaction.
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const newTransaction = {
    id:
      currentEditId ||
      (transactions.length ? Math.max(...transactions.map((t) => t.id)) + 1 : 1),
    name: formData.get("name"),
    amount: parseFloat(formData.get("amount")),
    date: new Date(formData.get("date")),
    type: formData.get("type") === "on" ? "income" : "expense"
  };

  if (currentEditId) {
    const index = transactions.findIndex((trx) => trx.id === currentEditId);
    transactions[index] = newTransaction;
    currentEditId = null;
    formTitle.textContent = "Add Transaction";
    submitButton.textContent = "Submit";
    showNotification("Transaction updated successfully!");
  } else {
    transactions.push(newTransaction);
    showNotification("Transaction added successfully!");
  }

  form.reset();
  document.getElementById("type").checked = false;
  updateTotal();
  saveTransactions();
  populateMonthFilter();
  renderTransactions();
  renderMonthlySummary();
}

/**
 * Update total amounts.
 */
function updateTotal() {
  const incomeTotal = transactions
    .filter((trx) => trx.type === "income")
    .reduce((total, trx) => total + trx.amount, 0);
  const expenseTotal = transactions
    .filter((trx) => trx.type === "expense")
    .reduce((total, trx) => total + trx.amount, 0);
  const balanceTotal = incomeTotal - expenseTotal;

  balanceEl.textContent = formatter.format(balanceTotal).replace("+", "");
  incomeEl.textContent = formatter.format(incomeTotal);
  expenseEl.textContent = formatter.format(expenseTotal * -1);
}

/**
 * Save transactions into localStorage.
 */
function saveTransactions() {
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

/**
 * Render transactions based on selected month.
 */
function renderTransactions() {
  listEl.innerHTML = "";
  statusEl.textContent = "";

  const selectedMonth = monthFilterEl.value;
  const filtered = transactions.filter((trx) => {
    const d = new Date(trx.date);
    const trxMonth = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString().padStart(2, "0")}`;
    return trxMonth === selectedMonth;
  });

  if (filtered.length === 0) {
    statusEl.textContent = "No transactions for this month.";
    return;
  }

  filtered.forEach(({ id, name, amount, date, type }) => {
    const sign = type === "income" ? 1 : -1;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="name">
        <h4>${name}</h4>
        <p>${formatDate(date)}</p>
      </div>
      <div class="amount ${type}">
        <span>${formatter.format(amount * sign)}</span>
      </div>
      <div class="action">
        <svg class="edit" xmlns="http://www.w3.org/2000/svg" fill="none" 
             viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" title="Edit">
          <path stroke-linecap="round" stroke-linejoin="round" 
           d="M16.862 3.487a2.062 2.062 0 112.91 2.91l-9.193 9.193a4.5 4.5 0 01-1.897 1.13l-3.737 1.24a.75.75 0 01-.933-.933l1.24-3.737a4.5 4.5 0 011.13-1.897l9.193-9.193z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487L19.5 6.125" />
        </svg>
        <svg class="delete" xmlns="http://www.w3.org/2000/svg" fill="none" 
             viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" title="Delete">
          <path stroke-linecap="round" stroke-linejoin="round" 
           d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    `;
    li.querySelector(".edit").addEventListener("click", () => editTransaction(id));
    li.querySelector(".delete").addEventListener("click", () => deleteTransaction(id));
    listEl.appendChild(li);
  });
}

/**
 * Edit a transaction by loading its data into the form.
 */
function editTransaction(id) {
  const transaction = transactions.find((trx) => trx.id === id);
  if (!transaction) return;

  form.elements["name"].value = transaction.name;
  form.elements["amount"].value = transaction.amount;
  form.elements["date"].value = new Date(transaction.date)
    .toISOString()
    .split("T")[0];
  document.getElementById("type").checked = transaction.type === "income";
  currentEditId = id;
  formTitle.textContent = "Edit Transaction";
  submitButton.textContent = "Update";
}

/**
 * Delete a transaction after a confirmation prompt.
 */
function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;
  const index = transactions.findIndex((trx) => trx.id === id);
  if (index > -1) {
    transactions.splice(index, 1);
    showNotification("Transaction deleted.");
    updateTotal();
    saveTransactions();
    populateMonthFilter();
    renderTransactions();
    renderMonthlySummary();
  }
}

/**
 * Generate and render a monthly summary.
 */
function renderMonthlySummary() {
  const summary = {};
  transactions.forEach((trx) => {
    const dateObj = new Date(trx.date);
    const monthObj = getMonthYearLabel(dateObj);
    const key = monthObj.value;
    if (!summary[key]) {
      summary[key] = { monthLabel: monthObj.label, income: 0, expense: 0 };
    }
    if (trx.type === "income") {
      summary[key].income += trx.amount;
    } else {
      summary[key].expense += trx.amount;
    }
  });
  monthlySummaryListEl.innerHTML = "";
  Object.keys(summary)
    .sort((a, b) => new Date(summary[b].fullDate) - new Date(summary[a].fullDate))
    .forEach((key) => {
      const { monthLabel, income, expense } = summary[key];
      const li = document.createElement("li");
      li.textContent = `${monthLabel} | Income: ${formatter.format(income)} | Expense: ${formatter.format(expense * -1)}`;
      monthlySummaryListEl.appendChild(li);
    });
}

/**
 * Generate and download a CSV file for transactions in the selected month.
 */
function downloadCSV() {
  const selectedMonth = monthFilterEl.value;
  const filtered = transactions.filter((trx) => {
    const d = new Date(trx.date);
    const trxMonth = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString().padStart(2, "0")}`;
    return trxMonth === selectedMonth;
  });
  if (filtered.length === 0) {
    alert("No transactions for the selected month to download.");
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Name,Amount,Type,Date\r\n";
  filtered.forEach(({ id, name, amount, type, date }) => {
    const row = `${id},"${name}",${amount},${type},${formatDate(date)}`;
    csvContent += row + "\r\n";
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `transactions_${selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initial setup and rendering.
populateMonthFilter();
renderTransactions();
updateTotal();
renderMonthlySummary();
