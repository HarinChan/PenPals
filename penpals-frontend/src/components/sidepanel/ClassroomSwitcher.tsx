import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Users, Trash2, AlertTriangle } from 'lucide-react';
import { Account } from '../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ClassroomSwitcherProps {
  accounts: Account[];
  currentAccount: Account;
  onAccountChange: (accountId: string) => void;
  onCreateNew: () => void;
  onDelete: (accountId: string) => void;
}

export default function ClassroomSwitcher({
  accounts,
  currentAccount,
  onAccountChange,
  onCreateNew,
  onDelete,
}: ClassroomSwitcherProps) {
  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-purple-600 dark:text-purple-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Classrooms</h3>
            <Badge variant="secondary" className="text-xs">
              {accounts.length}/12
            </Badge>
          </div>
          <Button
            onClick={onCreateNew}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            disabled={accounts.length >= 12}
            title={accounts.length >= 12 ? "Maximum classrooms reached" : "Add new classroom"}
          >
            <Plus size={16} />
          </Button>
        </div>

        {accounts.length >= 12 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              You've reached the maximum limit of 12 classrooms. Delete a classroom to create a new one.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select value={currentAccount.id} onValueChange={onAccountChange}>
            <SelectTrigger className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id} className="text-slate-900 dark:text-slate-100">
                  {account.classroomName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => onDelete(currentAccount.id)}
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
            disabled={accounts.length <= 1}
            title={accounts.length <= 1 ? "Cannot delete last classroom" : "Delete classroom"}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
