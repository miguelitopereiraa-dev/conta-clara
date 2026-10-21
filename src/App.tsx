

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

type TransactionType = 'receita' | 'despesa';
type TransactionTypeFilter = 'todos' | TransactionType;

type Transaction = {
  id: number;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
};

type PeriodType = 'month' | 'year' | 'custom';

const transactionCategories: Record<TransactionType, string[]> = {
  receita: ['Trabalho', 'Investimentos', 'Outros'],
  despesa: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Outros'],
};

const initialTransactions: Transaction[] = [
  {
    id: 1,
    description: 'Salário',
    amount: 5000,
    category: 'Trabalho',
    type: 'receita',
    date: '2026-10-12',
  },
  {
    id: 2,
    description: 'Freelance',
    amount: 800,
    category: 'Trabalho',
    type: 'receita',
    date: '2026-10-12',
  },
  {
    id: 3,
    description: 'Alimentação',
    amount: 350,
    category: 'Alimentação',
    type: 'despesa',
    date: '2026-10-12',
  },
  {
    id: 4,
    description: 'Internet',
    amount: 100,
    category: 'Moradia',
    type: 'despesa',
    date: '2026-10-12',
  },
  {
    id: 5,
    description: 'Aluguel',
    amount: 1100,
    category: 'Moradia',
    type: 'despesa',
    date: '2026-10-12',
  },
];

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const storageKey = 'violetfinance-transactions';
const budgetStorageKey = 'contaclara-monthly-budgets';

function getLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateToIso(date: string): string | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const brazilianMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const year = Number(isoMatch?.[1] ?? brazilianMatch?.[3]);
  const month = Number(isoMatch?.[2] ?? brazilianMatch?.[2]);
  const day = Number(isoMatch?.[3] ?? brazilianMatch?.[1]);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatTransactionDate(date: string): string {
  const normalizedDate = dateToIso(date);
  return normalizedDate ? normalizedDate.split('-').reverse().join('/') : date;
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const transaction = value as Record<string, unknown>;

  return (
    typeof transaction.id === 'number' &&
    typeof transaction.description === 'string' &&
    typeof transaction.amount === 'number' &&
    Number.isFinite(transaction.amount) &&
    typeof transaction.category === 'string' &&
    (transaction.type === 'receita' || transaction.type === 'despesa') &&
    typeof transaction.date === 'string'
  );
}

function isValidBackup(value: unknown): value is Transaction[] {
  if (!Array.isArray(value) || !value.every(isTransaction)) {
    return false;
  }

  const ids = new Set<number>();
  return value.every((transaction) => {
    if (
      !transaction.description.trim() ||
      !transaction.category.trim() ||
      transaction.amount <= 0 ||
      !dateToIso(transaction.date) ||
      ids.has(transaction.id)
    ) {
      return false;
    }

    ids.add(transaction.id);
    return true;
  });
}

function isValidBudgets(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([category, amount]) =>
      category.trim().length > 0 &&
      typeof amount === 'number' &&
      Number.isFinite(amount) &&
      amount > 0
  );
}

function loadBudgets(): Record<string, number> {
  try {
    const storedBudgets = localStorage.getItem(budgetStorageKey);
    if (!storedBudgets) {
      return {};
    }

    const parsedBudgets: unknown = JSON.parse(storedBudgets);
    return isValidBudgets(parsedBudgets) ? parsedBudgets : {};
  } catch {
    return {};
  }
}

function loadTransactions(): Transaction[] {
  try {
    const storedTransactions = localStorage.getItem(storageKey);
    if (!storedTransactions) {
      return initialTransactions;
    }

    const parsedTransactions: unknown = JSON.parse(storedTransactions);
    return Array.isArray(parsedTransactions) && parsedTransactions.every(isTransaction)
      ? parsedTransactions.map((transaction) => ({
          ...transaction,
          date: dateToIso(transaction.date) ?? transaction.date,
        }))
      : initialTransactions;
  } catch {
    return initialTransactions;
  }
}

function App() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(loadTransactions);
  const [budgets, setBudgets] = useState<Record<string, number>>(loadBudgets);
  const today = getLocalDateValue(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today.slice(0, 4));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [transactionDate, setTransactionDate] = useState(today);
  const [type, setType] = useState<TransactionType>('despesa');
  const [category, setCategory] = useState('Alimentação');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [budgetMessage, setBudgetMessage] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [storageError, setStorageError] = useState('');
  const backupInputRef = useRef<HTMLInputElement>(null);

  const years = Array.from(
    new Set([
      today.slice(0, 4),
      ...transactions.flatMap((transaction) => {
        const date = dateToIso(transaction.date);
        return date ? [date.slice(0, 4)] : [];
      }),
    ])
  ).sort((first, second) => second.localeCompare(first));

  const filteredTransactions = transactions.filter((transaction) => {
    const date = dateToIso(transaction.date);
    if (!date) {
      return false;
    }

    if (periodType === 'month') {
      return Boolean(selectedMonth) && date.startsWith(selectedMonth);
    }

    if (periodType === 'year') {
      return date.startsWith(selectedYear);
    }

    if (!startDate || !endDate || startDate > endDate) {
      return false;
    }

    return date >= startDate && date <= endDate;
  });
  const sortedFilteredTransactions = [...filteredTransactions].sort((first, second) => {
    const firstDate = dateToIso(first.date) ?? '';
    const secondDate = dateToIso(second.date) ?? '';
    return secondDate.localeCompare(firstDate) || second.id - first.id;
  });
  const availableCategories = Array.from(
    new Set(transactions.map((transaction) => transaction.category))
  ).sort((first, second) => first.localeCompare(second, 'pt-BR'));
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const displayedTransactions = sortedFilteredTransactions.filter((transaction) => {
    const matchesSearch = transaction.description
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearchTerm);
    const matchesType = typeFilter === 'todos' || transaction.type === typeFilter;
    const matchesCategory =
      categoryFilter === 'todas' || transaction.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const income = filteredTransactions
    .filter((transaction) => transaction.type === 'receita')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenses = filteredTransactions
    .filter((transaction) => transaction.type === 'despesa')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const balance = income - expenses;
  const categoryTotals = filteredTransactions.reduce<
    Record<string, { income: number; expenses: number }>
  >((totals, transaction) => {
    const categoryTotal = totals[transaction.category] ?? {
      income: 0,
      expenses: 0,
    };

    if (transaction.type === 'receita') {
      categoryTotal.income += transaction.amount;
    } else {
      categoryTotal.expenses += transaction.amount;
    }

    totals[transaction.category] = categoryTotal;
    return totals;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort(([first], [second]) =>
    first.localeCompare(second, 'pt-BR')
  );
  const budgetMonth = periodType === 'month' && selectedMonth
    ? selectedMonth
    : today.slice(0, 7);
  const monthlyExpenseTotals = transactions.reduce<Record<string, number>>(
    (totals, transaction) => {
      const date = dateToIso(transaction.date);
      if (
        transaction.type === 'despesa' &&
        date?.startsWith(budgetMonth)
      ) {
        totals[transaction.category] = (totals[transaction.category] ?? 0) + transaction.amount;
      }

      return totals;
    },
    {}
  );
  const budgetCategories = Array.from(
    new Set([
      ...transactionCategories.despesa,
      ...Object.keys(monthlyExpenseTotals),
      ...Object.keys(budgets),
    ])
  ).sort((first, second) => first.localeCompare(second, 'pt-BR'));

  function saveTransactions(nextTransactions: Transaction[]): boolean {
    setTransactions(nextTransactions);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextTransactions));
      setStorageError('');
      return true;
    } catch {
      setStorageError(
        'Não foi possível salvar os dados neste navegador. Exporte um backup para não perder as alterações.'
      );
      return false;
    }
  }

  function saveBudgets(nextBudgets: Record<string, number>): boolean {
    setBudgets(nextBudgets);
    try {
      localStorage.setItem(budgetStorageKey, JSON.stringify(nextBudgets));
      setStorageError('');
      return true;
    } catch {
      setStorageError(
        'Não foi possível salvar os dados neste navegador. Exporte um backup para não perder as alterações.'
      );
      return false;
    }
  }

  function saveBudget(categoryName: string) {
    const normalizedAmount = (budgetInputs[categoryName] ?? '')
      .trim()
      .replace(/\s/g, '');
    const numericAmount = Number(
      normalizedAmount.includes(',')
        ? normalizedAmount.replace(/\./g, '').replace(',', '.')
        : normalizedAmount
    );

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setBudgetMessage('Informe um limite mensal maior que zero.');
      return;
    }

    const nextBudgets = { ...budgets, [categoryName]: numericAmount };
    if (saveBudgets(nextBudgets)) {
      setBudgetInputs((current) => ({ ...current, [categoryName]: '' }));
      setBudgetMessage(`Limite mensal de ${categoryName} salvo.`);
    }
  }

  function deleteBudget(categoryName: string) {
    const nextBudgets = { ...budgets };
    delete nextBudgets[categoryName];
    if (saveBudgets(nextBudgets)) {
      setBudgetInputs((current) => {
        const nextInputs = { ...current };
        delete nextInputs[categoryName];
        return nextInputs;
      });
    }
  }

  function exportBackup() {
    try {
      const backup = new Blob([
        JSON.stringify({ version: 1, transactions, budgets }, null, 2),
      ], {
        type: 'application/json',
      });
      const downloadUrl = URL.createObjectURL(backup);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `contaclara-backup-${today}.json`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setBackupMessage('Backup exportado com sucesso.');
    } catch {
      setBackupMessage('Não foi possível exportar o backup. Tente novamente.');
    }
  }

  async function importBackup(file: File) {
    try {
      const parsedBackup: unknown = JSON.parse(await file.text());
      const isLegacyBackup = Array.isArray(parsedBackup);
      const backupTransactions = isLegacyBackup
        ? parsedBackup
        : typeof parsedBackup === 'object' && parsedBackup !== null
          ? (parsedBackup as Record<string, unknown>).transactions
          : null;
      const backupBudgets = isLegacyBackup
        ? budgets
        : typeof parsedBackup === 'object' && parsedBackup !== null
          ? (parsedBackup as Record<string, unknown>).budgets
          : null;
      const validTransactions = isValidBackup(backupTransactions)
        ? backupTransactions
        : null;
      const validBudgets = isLegacyBackup
        ? budgets
        : isValidBudgets(backupBudgets)
          ? backupBudgets
          : null;

      if (
        !validTransactions ||
        !validBudgets ||
        (!isLegacyBackup &&
          (typeof parsedBackup !== 'object' ||
            parsedBackup === null ||
            (parsedBackup as Record<string, unknown>).version !== 1 ||
            !isValidBudgets(backupBudgets)))
      ) {
        setBackupMessage(
          'Arquivo inválido. Selecione um backup ContaClara válido.'
        );
        return;
      }

      const normalizedTransactions = validTransactions.map((transaction) => ({
        ...transaction,
        date: dateToIso(transaction.date) ?? transaction.date,
      }));

      if (!window.confirm('Importar este backup substituirá todos os lançamentos atuais. Deseja continuar?')) {
        return;
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(normalizedTransactions));
        localStorage.setItem(budgetStorageKey, JSON.stringify(validBudgets));
        setTransactions(normalizedTransactions);
        setBudgets(validBudgets);
        setStorageError('');
        setBackupMessage('Backup importado com sucesso.');
      } catch {
        setStorageError(
          'Não foi possível salvar os dados importados neste navegador.'
        );
        setBackupMessage('Falha ao salvar o backup. Os dados atuais foram mantidos na tela.');
      }
    } catch {
      setBackupMessage('Não foi possível ler o arquivo ou salvar o backup neste navegador.');
    }
  }

  function resetForm() {
    setEditingTransactionId(null);
    setDescription('');
    setAmount('');
    setFormError('');
    setTransactionDate(today);
    setType('despesa');
    setCategory('Alimentação');
    setShowForm(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAmount = amount.trim().replace(/\s/g, '');
    const numericAmount = Number(
      normalizedAmount.includes(',')
        ? normalizedAmount.replace(/\./g, '').replace(',', '.')
        : normalizedAmount
    );

    if (!description.trim()) {
      setFormError('Informe uma descrição para a transação.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Informe um valor válido maior que zero. Exemplo: 150,00.');
      return;
    }

    if (!dateToIso(transactionDate)) {
      setFormError('Informe uma data válida para a transação.');
      return;
    }

    const savedTransaction: Transaction = {
      id: editingTransactionId ?? Date.now(),
      description: description.trim(),
      amount: numericAmount,
      category,
      type,
      date: transactionDate,
    };

    const nextTransactions =
      editingTransactionId === null
        ? [savedTransaction, ...transactions]
        : transactions.map((transaction) =>
            transaction.id === editingTransactionId ? savedTransaction : transaction
          );
    if (saveTransactions(nextTransactions)) {
      resetForm();
    }
  }

  function editTransaction(transaction: Transaction) {
    setEditingTransactionId(transaction.id);
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setTransactionDate(dateToIso(transaction.date) ?? today);
    setType(transaction.type);
    setCategory(transaction.category);
    setShowForm(true);
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
  }

  function deleteTransaction(id: number) {
    const transaction = transactions.find((item) => item.id === id);
    if (
      transaction &&
      window.confirm(`Excluir a transação "${transaction.description}"?`)
    ) {
      saveTransactions(transactions.filter((item) => item.id !== id));
    }
  }

  function restoreSampleData() {
    if (window.confirm('Restaurar os lançamentos de demonstração?')) {
      saveTransactions(initialTransactions);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">
          Conta<span>Clara</span>
        </h2>

        <nav aria-label="Navegação principal">
          <a className="active" href="#overview" aria-current="page">Visão geral</a>
          <a href="#transactions">Transações</a>
          <a href="#categories">Categorias</a>
          <a href="#settings">Configurações</a>
        </nav>

        <div className="sidebar-footer">
          Seu dinheiro, sob controle.
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <h1>Visão geral</h1>
            <p>Acompanhe sua vida financeira.</p>
          </div>

          <button
            className="add-button"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
          >
            {showForm ? 'Cancelar' : '+ Nova transação'}
          </button>
        </header>

        {showForm && (
          <section className="card form-panel">
            <h2>{editingTransactionId === null ? 'Adicionar transação' : 'Editar transação'}</h2>
            <p>
              {editingTransactionId === null
                ? 'Preencha os dados da movimentação financeira.'
                : 'Atualize os dados da movimentação financeira.'}
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="description">Descrição</label>
              <input
                id="description"
                type="text"
                placeholder="Ex.: Compra no supermercado"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setFormError('');
                }}
                required
              />

              <label htmlFor="amount">Valor (R$)</label>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 150,00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setFormError('');
                }}
                required
              />

              <label htmlFor="transaction-date">Data</label>
              <input
                id="transaction-date"
                type="date"
                value={transactionDate}
                onChange={(event) => {
                  setTransactionDate(event.target.value);
                  setFormError('');
                }}
                required
              />

              <label htmlFor="type">Tipo de transação</label>
              <select
                id="type"
                value={type}
                onChange={(event) => {
                  const newType = event.target.value as TransactionType;
                  setType(newType);
                  setCategory(newType === 'receita' ? 'Trabalho' : 'Alimentação');
                }}
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>

              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {transactionCategories[type].map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>

              <button className="add-button form-submit" type="submit">
                {editingTransactionId === null ? 'Salvar transação' : 'Salvar alterações'}
              </button>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </form>
          </section>
        )}

        <section className="card period-filter" aria-labelledby="period-title">
          <div className="period-filter-heading">
            <h2 id="period-title">Filtrar por período</h2>
            <label htmlFor="period-type">Período</label>
            <select
              id="period-type"
              value={periodType}
              onChange={(event) => setPeriodType(event.target.value as PeriodType)}
            >
              <option value="month">Mês</option>
              <option value="year">Ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {periodType === 'month' && (
            <div className="period-control">
              <label htmlFor="period-month">Mês de referência</label>
              <input
                id="period-month"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
          )}

          {periodType === 'year' && (
            <div className="period-control">
              <label htmlFor="period-year">Ano de referência</label>
              <select
                id="period-year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'custom' && (
            <div className="period-range">
              <div className="period-control">
                <label htmlFor="period-start">De</label>
                <input
                  id="period-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="period-control">
                <label htmlFor="period-end">Até</label>
                <input
                  id="period-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              {startDate && endDate && startDate > endDate && (
                <p className="period-error">A data inicial deve ser anterior à data final.</p>
              )}
            </div>
          )}
        </section>

        <section className="summary">
          <article className="card balance-card">
            <p>Saldo total</p>
            <h2>{currency.format(balance)}</h2>
            <span>Receitas menos despesas</span>
          </article>

          <article className="card">
            <p>Receitas</p>
            <h2>{currency.format(income)}</h2>
            <span className="positive">↑ Total de entradas</span>
          </article>

          <article className="card">
            <p>Despesas</p>
            <h2>{currency.format(expenses)}</h2>
            <span className="negative">↓ Total de saídas</span>
          </article>
        </section>

        <section className="card transactions" id="transactions">
          <h2>Transações do período</h2>

          <div className="transaction-filters">
            <div className="transaction-filter-control">
              <label htmlFor="transaction-search">Buscar por descrição</label>
              <input
                id="transaction-search"
                type="search"
                placeholder="Ex.: mercado"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="transaction-filter-control">
              <label htmlFor="transaction-type-filter">Tipo</label>
              <select
                id="transaction-type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as TransactionTypeFilter)
                }
              >
                <option value="todos">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>
            <div className="transaction-filter-control">
              <label htmlFor="transaction-category-filter">Categoria</label>
              <select
                id="transaction-category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="todas">Todas as categorias</option>
                {availableCategories.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>{categoryName}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 && (
            <p>
              {periodType === 'custom' && (!startDate || !endDate)
                ? 'Selecione as datas inicial e final para ver as transações.'
                : periodType === 'custom' && startDate > endDate
                  ? 'Ajuste o intervalo para ver as transações.'
                  : 'Nenhuma transação encontrada neste período.'}
            </p>
          )}

          {filteredTransactions.length > 0 && displayedTransactions.length === 0 && (
            <p>Nenhuma transação corresponde à busca e aos filtros selecionados.</p>
          )}

          {displayedTransactions.map((transaction) => (
            <div className="transaction" key={transaction.id}>
              <div className="transaction-info">
                <strong>{transaction.description}</strong>
                <p>
                  {transaction.category} · {formatTransactionDate(transaction.date)}
                </p>
              </div>

              <div className="transaction-actions">
                <span
                  className={
                    transaction.type === 'receita' ? 'positive' : 'negative'
                  }
                >
                  {transaction.type === 'receita' ? '+' : '-'}{' '}
                  {currency.format(transaction.amount)}
                </span>

                <button
                  className="edit-button"
                  type="button"
                  onClick={() => editTransaction(transaction)}
                  aria-label={`Editar ${transaction.description}`}
                  title="Editar transação"
                >
                  Editar
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() => deleteTransaction(transaction.id)}
                  aria-label={`Excluir ${transaction.description}`}
                  title="Excluir transação"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="card categories" id="categories">
          <h2>Categorias</h2>
          {sortedCategories.length === 0 ? (
            <p>Nenhuma categoria para exibir.</p>
          ) : (
            <div className="category-list">
              <div className="category-row category-heading">
                <span>Categoria</span>
                <span>Receitas</span>
                <span>Despesas</span>
              </div>
              {sortedCategories.map(([categoryName, totals]) => (
                <div className="category-row" key={categoryName}>
                  <strong>{categoryName}</strong>
                  <span className="positive">{currency.format(totals.income)}</span>
                  <span className="negative">{currency.format(totals.expenses)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card budgets" aria-labelledby="budgets-title">
          <h2 id="budgets-title">Orçamentos por categoria</h2>
          <p>
            Acompanhe as despesas de {budgetMonth.slice(5, 7)}/{budgetMonth.slice(0, 4)}.
            {periodType !== 'month' &&
              ' O orçamento é mensal e está mostrando o mês atual.'}
          </p>
          {budgetCategories.length === 0 ? (
            <p>Nenhuma categoria de despesa para acompanhar.</p>
          ) : (
            <div className="budget-list">
              {budgetCategories.map((categoryName) => {
                const spent = monthlyExpenseTotals[categoryName] ?? 0;
                const limit = budgets[categoryName];
                const percentage = limit ? Math.round((spent / limit) * 100) : 0;
                const exceeded = Boolean(limit && spent > limit);

                return (
                  <div className="budget-row" key={categoryName}>
                    <div className="budget-row-heading">
                      <strong>{categoryName}</strong>
                      <span className={exceeded ? 'negative' : ''}>
                        {currency.format(spent)}
                        {limit ? ` de ${currency.format(limit)}` : ' gastos'}
                      </span>
                    </div>
                    {limit ? (
                      <>
                        <progress
                          className={exceeded ? 'budget-progress exceeded' : 'budget-progress'}
                          max={limit}
                          value={Math.min(spent, limit)}
                          aria-label={`Orçamento de ${categoryName}`}
                        />
                        <div className="budget-row-footer">
                          <span>
                            {exceeded
                              ? `Limite ultrapassado em ${currency.format(spent - limit)}`
                              : `${percentage}% do limite utilizado`}
                          </span>
                          <button
                            className="delete-button"
                            type="button"
                            onClick={() => deleteBudget(categoryName)}
                          >
                            Remover limite
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="budget-no-limit">Ainda sem limite definido.</p>
                    )}
                    <div className="budget-editor">
                      <label htmlFor={`budget-${categoryName}`}>
                        {limit ? 'Atualizar limite mensal' : 'Definir limite mensal'}
                      </label>
                      <input
                        id={`budget-${categoryName}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex.: 800,00"
                        value={
                          Object.hasOwn(budgetInputs, categoryName)
                            ? budgetInputs[categoryName]
                            : limit
                              ? String(limit).replace('.', ',')
                              : ''
                        }
                        onChange={(event) =>
                          setBudgetInputs((current) => ({
                            ...current,
                            [categoryName]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => saveBudget(categoryName)}
                      >
                        Salvar limite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {budgetMessage && (
            <p className="backup-message" role="status">{budgetMessage}</p>
          )}
          {storageError && (
            <p className="backup-error" role="alert">{storageError}</p>
          )}
        </section>

        <section className="card settings" id="settings">
          <h2>Configurações</h2>
          <p>Os lançamentos ficam salvos neste navegador. Exporte um backup para transferi-los ou guardá-los com segurança.</p>
          <div className="backup-actions">
            <button className="secondary-button" onClick={exportBackup} type="button">
              Exportar backup
            </button>
            <button
              className="secondary-button"
              onClick={() => backupInputRef.current?.click()}
              type="button"
            >
              Importar backup
            </button>
            <input
              ref={backupInputRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              aria-label="Selecionar arquivo de backup ContaClara"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importBackup(file);
                }
                event.target.value = '';
              }}
            />
          </div>
          {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
          {storageError && <p className="backup-error" role="alert">{storageError}</p>}
          <button className="secondary-button" onClick={restoreSampleData} type="button">
            Restaurar dados de demonstração
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
