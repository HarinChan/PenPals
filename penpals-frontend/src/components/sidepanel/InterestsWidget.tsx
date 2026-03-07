import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, BookOpen, Plus } from 'lucide-react';
import { Account } from '../../types';
import { AVAILABLE_SUBJECTS } from './constants';
import { toTitleCase } from './helpers';
import { toast } from 'sonner';
import { ClassroomService } from '../../services';

interface InterestsWidgetProps {
  currentAccount: Account;
  onAccountUpdate: (account: Account) => void;
}

export default function InterestsWidget({
  currentAccount,
  onAccountUpdate,
}: InterestsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [customInterest, setCustomInterest] = useState('');
  const [isSavingInterests, setIsSavingInterests] = useState(false);

  const cleanedInterests = useMemo(() => {
    const normalized = new Map<string, string>();
    (currentAccount.interests || []).forEach((interest) => {
      const trimmed = interest.trim();
      if (trimmed) {
        const lowercase = trimmed.toLowerCase();
        normalized.set(lowercase, trimmed);
      }
    });
    return Array.from(normalized.values());
  }, [currentAccount.interests]);

  const allInterests = useMemo(() => {
    const combined = new Set([...AVAILABLE_SUBJECTS, ...cleanedInterests]);
    return Array.from(combined);
  }, [cleanedInterests]);

  const sortedInterests = useMemo(() => {
    return [...allInterests].sort((a, b) => {
      const aChecked = currentAccount.interests.includes(a);
      const bChecked = currentAccount.interests.includes(b);
      if (aChecked !== bChecked) return aChecked ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [allInterests, currentAccount.interests]);

  const toggleInterest = async (interest: string) => {
    const newInterests = currentAccount.interests.includes(interest)
      ? currentAccount.interests.filter(i => i !== interest)
      : [...currentAccount.interests, interest];

    onAccountUpdate({ ...currentAccount, interests: newInterests });

    setIsSavingInterests(true);
    try {
      const titleCaseInterests = newInterests.map(toTitleCase);
      await ClassroomService.updateClassroom(Number(currentAccount.id), { interests: titleCaseInterests });
      toast.success('Interest updated');
    } catch (error) {
      console.error('Failed to save interest:', error);
      toast.error('Failed to save interest');
      onAccountUpdate({ ...currentAccount, interests: currentAccount.interests });
    } finally {
      setIsSavingInterests(false);
    }
  };

  const addCustomInterest = async () => {
    const trimmedInput = customInterest.trim();
    if (!trimmedInput) return;

    const titleCaseInput = toTitleCase(trimmedInput);
    
    const existingInterest = allInterests.find(
      (interest) => interest.toLowerCase() === titleCaseInput.toLowerCase()
    );

    if (existingInterest) {
      await toggleInterest(existingInterest);
    } else {
      const newInterests = [...currentAccount.interests, titleCaseInput];

      onAccountUpdate({ ...currentAccount, interests: newInterests });
      setCustomInterest('');

      setIsSavingInterests(true);
      try {
        await ClassroomService.updateClassroom(Number(currentAccount.id), { interests: newInterests });
        toast.success('Interest added');
      } catch (error) {
        console.error('Failed to save custom interest:', error);
        toast.error('Failed to save interest');
        onAccountUpdate({ ...currentAccount, interests: currentAccount.interests });
      } finally {
        setIsSavingInterests(false);
      }
    }

    setCustomInterest('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <BookOpen className="text-blue-600 dark:text-blue-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Your Interests & subjects</h3>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSavingInterests && addCustomInterest()}
                placeholder="Add or search interests..."
                disabled={isSavingInterests}
                className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              />
              <button
                onClick={addCustomInterest}
                disabled={isSavingInterests || !customInterest.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                <Plus size={16} className="text-white" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {cleanedInterests.length} interests selected
            </p>

            <ScrollArea className="h-64 border border-slate-200 dark:border-slate-700 rounded-md p-3">
              <div className="space-y-3 pr-4">
                {sortedInterests.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                    No interests found
                  </p>
                ) : (
                  sortedInterests.map((subject) => (
                    <div key={subject} className="flex items-center gap-3">
                      <Checkbox
                        id={subject}
                        checked={currentAccount.interests.includes(subject)}
                        onCheckedChange={() => !isSavingInterests && toggleInterest(subject)}
                        disabled={isSavingInterests}
                      />
                      <Label
                        htmlFor={subject}
                        className="text-slate-900 dark:text-slate-100 cursor-pointer text-sm"
                      >
                        {toTitleCase(subject)}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
