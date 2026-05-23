/**
 * Debt Simplification Algorithm (Greedy Balance Matching)
 * 
 * Minimizes the number of transactions needed to settle a group of debts.
 * 
 * Input:
 * - A map of member IDs to their net balances. A positive value means they are owed money,
 *   and a negative value means they owe money.
 *   Example: { "alice": 40.0, "bob": -30.0, "charlie": -10.0 }
 * 
 * Output:
 * - A list of direct payments needed to settle all debts.
 *   Example: [ { from: "bob", to: "alice", amount: 30.0 }, { from: "charlie", to: "alice", amount: 10.0 } ]
 */

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export function simplifyDebts(balances: Record<string, number>): Transaction[] {
  const transactions: Transaction[] = [];

  // Filter out members with practically zero balance and round to 2 decimal places
  const activeBalances = Object.entries(balances)
    .map(([id, val]) => ({ id, balance: Math.round(val * 100) / 100 }))
    .filter((item) => Math.abs(item.balance) >= 0.01);

  // Separate into debtors (owe money, balance < 0) and creditors (owed money, balance > 0)
  const debtors = activeBalances
    .filter((item) => item.balance < 0)
    .map((item) => ({ id: item.id, balance: Math.abs(item.balance) })); // Use absolute values for easier math

  const creditors = activeBalances
    .filter((item) => item.balance > 0);

  // Sort both in descending order to match largest debtor with largest creditor
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let dIdx = 0;
  let cIdx = 0;

  // Process and match
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    // If balances are already settled, skip
    if (debtor.balance < 0.01) {
      dIdx++;
      continue;
    }
    if (creditor.balance < 0.01) {
      cIdx++;
      continue;
    }

    // Determine transaction amount
    const amount = Math.min(debtor.balance, creditor.balance);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount >= 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: roundedAmount,
      });
    }

    // Subtract from balances
    debtor.balance -= amount;
    creditor.balance -= amount;

    // Advance pointers if balances are fully settled
    if (debtor.balance < 0.01) {
      dIdx++;
    }
    if (creditor.balance < 0.01) {
      cIdx++;
    }
  }

  return transactions;
}

