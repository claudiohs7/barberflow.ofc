
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { capitalizeWords, cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/definitions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { addMonths, differenceInDays, startOfDay, getMonth, getYear } from 'date-fns';
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { ExpensesChart } from "@/components/expenses-chart";
import { fetchJson } from "@/lib/fetcher";

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  date: new Date(expense.date),
});


const expenseCategories = ["Aluguel", "Contas", "Marketing", "Produtos", "Salários", "Outros"];
const categoryColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--muted))",
];

const MAX_AMOUNT = 100_000;

const formatAmountFromNumber = (value: number) =>
  Math.min(value, MAX_AMOUNT).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numeric = Math.min(Number(digits) / 100, MAX_AMOUNT);
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseAmountToNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};


export default function ExpensesPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expenseType, setExpenseType] = useState<Expense['type']>("Variável");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setCategory(expenseToEdit.category);
      setExpenseType(expenseToEdit.type);
      setAmount(formatAmountFromNumber(expenseToEdit.amount));
      setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
    }
  }, [expenseToEdit]);

  const fetchExpenses = useCallback(async () => {
    if (!barbershopId) {
      setExpenses([]);
      return;
    }
    setIsExpensesLoading(true);
    try {
      const response = await fetchJson<{ data: Expense[] }>(
        `/api/expenses?barbershopId=${encodeURIComponent(barbershopId)}`
      );
      setExpenses(response.data?.map((exp) => ({ ...exp, date: new Date(exp.date) })) || []);
    } catch (error) {
      setExpenses([]);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as despesas.",
      });
    } finally {
      setIsExpensesLoading(false);
    }
  }, [barbershopId, toast]);

  const createExpenseApi = async (payload: Omit<Expense, "id">) =>
    fetchJson<{ data: Expense }>("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const updateExpenseApi = async (id: string, payload: Partial<Omit<Expense, "id">>) =>
    fetchJson<{ data: Expense }>(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const deleteExpenseApi = async (id: string) =>
    fetchJson<{ success: boolean }>(`/api/expenses/${id}`, { method: "DELETE" });

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const resetForm = () => {
    setDescription("");
    setCategory("");
    setExpenseType("Variável");
    setAmount("");
    setDate(new Date().toISOString().split('T')[0]);
    setExpenseToEdit(null);
    setIsEditDialogOpen(false);
  };

  const handleAmountChange = (value: string) => {
    setAmount(formatAmountInput(value));
  };

  const handleSaveExpense = async () => {
    if (!description || !category || !amount || !date || !expenseType) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha todos os campos." });
      return;
    }

    const numericAmount = parseAmountToNumber(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "Erro", description: "Informe um valor em reais válido." });
      return;
    }

    const expenseData = {
      description: capitalizeWords(description),
      category: category as Expense['category'],
      type: expenseType,
      amount: numericAmount,
      date,
    };

    if (expenseToEdit) {
      try {
        await updateExpenseApi(expenseToEdit.id, expenseData);
        toast({ title: "Despesa Atualizada!", description: "A despesa foi salva com sucesso." });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível atualizar a despesa.",
        });
      }
    } else {
      if (!barbershopId) {
        toast({ variant: "destructive", title: "Erro", description: "Barbearia não configurada." });
        return;
      }
      try {
        await createExpenseApi({ ...expenseData, barbershopId });
        toast({ title: "Despesa Adicionada!", description: "A nova despesa foi registrada." });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível criar a despesa.",
        });
      }
    }

    resetForm();
    fetchExpenses();
  };

  const handleEditClick = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseApi(expenseToDelete.id);
      toast({ title: "Despesa Excluída", description: "A despesa foi removida com sucesso." });
      fetchExpenses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível remover a despesa.",
      });
    } finally {
      setExpenseToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const formattedExpenses = useMemo(() => {
    if (!expenses) return [];
    
    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYear = getYear(today);

    return expenses.map(exp => {
        const expenseDate = exp.date instanceof Date ? exp.date : new Date(exp.date);
        let displayAmount = exp.amount;

        if (exp.type === 'Variável') {
            const expenseMonth = getMonth(expenseDate);
            const expenseYear = getYear(expenseDate);

            if (expenseYear < currentYear || (expenseYear === currentYear && expenseMonth < currentMonth)) {
                displayAmount = 0;
            }
        }

        return {
            ...exp,
            date: expenseDate,
            displayAmount: displayAmount, // Use a new field for the displayed amount
        };
    });
  }, [expenses]);
  
  const expensesForChart = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    const monthlyExpenses = formattedExpenses.filter(exp => exp.displayAmount > 0);

    for (const expense of monthlyExpenses) {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    }

    return Object.entries(categoryTotals).map(([category, total], index) => ({
        category,
        total,
        fill: categoryColors[index % categoryColors.length],
    }));
  }, [formattedExpenses]);

  const totalExpenses = useMemo(() => formattedExpenses.reduce((acc, exp) => acc + exp.displayAmount, 0), [formattedExpenses]);

  const isDueDateApproaching = (expense: Expense) => {
    if (expense.type !== 'Fixa') return false;
    
    const today = startOfDay(new Date());
    const expenseDate = new Date(expense.date);
    const expenseDayOfMonth = expenseDate.getUTCDate();

    let nextDueDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), expenseDayOfMonth));

    if (today > nextDueDate) {
        nextDueDate = addMonths(nextDueDate, 1);
    }
    
    const daysUntilDue = differenceInDays(nextDueDate, today);
    
    return daysUntilDue >= 0 && daysUntilDue <= 5;
  };
  
  const isLoading = isBarbershopIdLoading || isExpensesLoading;

  if (isBarbershopIdLoading) {
      return <div className="p-6">Carregando despesas...</div>;
  }

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold font-headline">Controle de Despesas</h1>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Cadastrar Despesa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aluguel do mês" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Despesa</Label>
                            <RadioGroup value={expenseType} onValueChange={(value: Expense['type']) => setExpenseType(value)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Fixa" id="fixa" />
                                    <Label htmlFor="fixa">Fixa</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Variável" id="variavel" />
                                    <Label htmlFor="variavel">Variável</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor (R$)</Label>
                            <Input
                              id="amount"
                              type="text"
                              inputMode="decimal"
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                              placeholder="R$ 0,00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Data de Vencimento/Compra</Label>
                            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <Button onClick={handleSaveExpense} className="w-full transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cadastrar Despesa</Button>
                    </CardContent>
                 </Card>
                 {expensesForChart.length > 0 && <ExpensesChart data={expensesForChart} />}
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Despesas</CardTitle>
                        <CardDescription>
                            Total de despesas registradas no mês: <span className="font-bold text-destructive">{formatCurrency(totalExpenses)}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead className="hidden md:table-cell">Categoria</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando despesas...</TableCell>
                            </TableRow>
                        ) : formattedExpenses.length > 0 ? formattedExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                            <TableCell className={cn("font-medium", isDueDateApproaching(expense) && "text-red-500 font-bold")}>
                                {expense.date.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{expense.category}</TableCell>
                            <TableCell>
                                <p>{expense.description}</p>
                                <div className="md:hidden text-muted-foreground text-xs space-x-2">
                                    <span>{expense.category}</span>
                                    <span className='sm:hidden'>-</span>
                                    <Badge 
                                      variant={'outline'} 
                                      className={cn("sm:hidden", 
                                        expense.type === 'Variável' && "bg-orange-500/20 text-orange-500 border-orange-500/30",
                                        expense.type === 'Fixa' && "bg-blue-500/20 text-blue-500 border-blue-500/30"
                                      )}>
                                        {expense.type}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Badge 
                                  variant={'outline'}
                                  className={cn(
                                    expense.type === 'Variável' && "bg-orange-500/20 text-orange-500 border-orange-500/30",
                                    expense.type === 'Fixa' && "bg-blue-500/20 text-blue-500 border-blue-500/30"
                                  )}
                                >
                                {expense.type}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(expense.displayAmount)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(expense)} className="text-primary hover:text-primary transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive transition-transform duration-300 hover:scale-105 hover:shadow-lg" onClick={() => handleDeleteClick(expense)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Excluir</span>
                                    </Button>
                                </div>
                            </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma despesa registrada ainda.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </div>
       </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsEditDialogOpen(isOpen); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Despesa</DialogTitle>
                    <DialogDescription>Altere os dados da despesa.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Descrição</Label>
                        <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Tipo de Despesa</Label>
                        <RadioGroup value={expenseType} onValueChange={(value: Expense['type']) => setExpenseType(value)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Fixa" id="edit-fixa" />
                                <Label htmlFor="edit-fixa">Fixa</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Variável" id="edit-variavel" />
                                <Label htmlFor="edit-variavel">Variável</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-amount">Valor (R$)</Label>
                        <Input
                          id="edit-amount"
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          placeholder="R$ 0,00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-category">Categoria</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="edit-category">
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {expenseCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-date">Data de Vencimento/Compra</Label>
                        <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button></DialogClose>
                    <Button onClick={handleSaveExpense} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a despesa de <span className='font-bold'>{expenseToDelete?.description}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

    
