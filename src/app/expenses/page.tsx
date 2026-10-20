import { ExpensesManager } from "@/components/ExpensesManager";
import { ExpenseAccessGate } from "@/components/ExpenseAccessGate";

export default function ExpensesPage() { return <ExpenseAccessGate><ExpensesManager/></ExpenseAccessGate>; }
