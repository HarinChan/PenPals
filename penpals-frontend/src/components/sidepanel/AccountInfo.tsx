import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Edit2, MapPin, Users } from 'lucide-react';
import { Account } from '../../types';
import { COMMON_EMOJIS } from './constants';

interface AccountInfoProps {
  currentAccount: Account;
  accounts: Account[];
  onSave: (formData: {
    classroomName: string;
    location: string;
    size: number;
    description: string;
    avatar: string;
  }) => void;
}

export default function AccountInfo({
  currentAccount,
  accounts,
  onSave,
}: AccountInfoProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    classroomName: currentAccount.classroomName,
    location: currentAccount.location,
    size: currentAccount.size,
    description: currentAccount.description || '',
    avatar: currentAccount.avatar || '',
  });

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      handleSave();
    } else {
      setFormData({
        classroomName: currentAccount.classroomName,
        location: currentAccount.location,
        size: currentAccount.size,
        description: currentAccount.description || '',
        avatar: currentAccount.avatar || '',
      });
      setIsEditing(true);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-slate-700 dark:text-slate-300">
              <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
              <h3 className="text-slate-900 dark:text-slate-100">Classroom Information</h3>
            </CollapsibleTrigger>
            <button
              onClick={handleEditToggle}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
            >
              {isEditing ? 'Save' : <Edit2 size={16} />}
            </button>
          </div>

          <CollapsibleContent>
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300">Classroom Name</Label>
                  <Input
                    value={formData.classroomName}
                    onChange={(e) => setFormData({ ...formData, classroomName: e.target.value })}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300">Class Size</Label>
                  <Input
                    type="number"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) || 0 })}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300">Avatar</Label>
                  <div className="grid gap-2 pt-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                    {COMMON_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setFormData({ ...formData, avatar: emoji })}
                        className={`h-10 w-10 text-xl rounded-md flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${formData.avatar === emoji ? 'ring-2 ring-primary bg-primary/10' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin size={16} />
                  <span>{currentAccount.location}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">(Account location)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Users size={16} />
                  <span>{currentAccount.size} students</span>
                </div>
                {currentAccount.description && (
                  <p className="text-slate-700 dark:text-slate-300 text-sm">{currentAccount.description}</p>
                )}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
