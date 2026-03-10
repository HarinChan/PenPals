import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Search } from 'lucide-react';
import { Account, Classroom } from '../../types';

interface ClassroomsListProps {
  classrooms: Classroom[];
  currentAccount: Account;
  selectedClassroom?: Classroom;
  onClassroomClick: (classroom: Classroom) => void;
}

interface ClassroomWithRelevancy extends Classroom {
  relevancy: {
    level: 'high' | 'medium' | 'low' | 'none';
    color: string;
    matchingInterests: string[];
  };
}

export default function ClassroomsList({
  classrooms,
  currentAccount,
  selectedClassroom,
  onClassroomClick,
}: ClassroomsListProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const calculateRelevancy = (classroom: Classroom) => {
    let scheduleMatches = false;
    for (const day in currentAccount.schedule) {
      const myHours = currentAccount.schedule[day] || [];
      const classroomHours = classroom.availability[day] || [];
      const hasOverlap = myHours.some(hour => classroomHours.includes(hour));
      if (hasOverlap) {
        scheduleMatches = true;
        break;
      }
    }

    const matchingInterests = classroom.interests.filter(interest =>
      currentAccount.interests.includes(interest)
    );
    const interestMatchRatio = currentAccount.interests.length > 0
      ? matchingInterests.length / currentAccount.interests.length
      : 0;

    if (scheduleMatches && interestMatchRatio === 1) {
      return { level: 'high' as const, color: 'bg-green-500', matchingInterests };
    } else if (scheduleMatches && interestMatchRatio > 0) {
      return { level: 'medium' as const, color: 'bg-yellow-500', matchingInterests };
    } else if (!scheduleMatches && interestMatchRatio > 0) {
      return { level: 'low' as const, color: 'bg-red-500', matchingInterests };
    }
    return { level: 'none' as const, color: 'bg-slate-500', matchingInterests };
  };

  const filteredClassrooms = useMemo(() => {
    return classrooms
      .map(classroom => ({
        ...classroom,
        relevancy: calculateRelevancy(classroom),
      }))
      .filter(classroom => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          classroom.name.toLowerCase().includes(query) ||
          classroom.location.toLowerCase().includes(query) ||
          classroom.interests.some(i => i.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2, none: 3 };
        return order[a.relevancy.level] - order[b.relevancy.level];
      });
  }, [searchQuery, classrooms, currentAccount.interests, currentAccount.schedule]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Search className="text-purple-600 dark:text-purple-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Find Classrooms</h3>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, location, or interest..."
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            />

            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {filteredClassrooms.map((classroom) => (
                  <button
                    key={classroom.id}
                    onClick={() => onClassroomClick(classroom)}
                    className={`w-full p-4 rounded-lg border transition-all ${selectedClassroom?.id === classroom.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${classroom.relevancy.color}`}
                        title={`Relevancy: ${classroom.relevancy.level}`}
                      ></div>

                      <div className="flex-1 text-left space-y-1">
                        <div className="text-slate-900 dark:text-slate-100">{classroom.name}</div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs">{classroom.location}</div>

                        {classroom.relevancy.matchingInterests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {classroom.relevancy.matchingInterests.map((interest) => (
                              <Badge
                                key={interest}
                                variant="outline"
                                className="text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                              >
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredClassrooms.length === 0 && (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No classrooms found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-slate-600 dark:text-slate-400 text-xs">Relevancy Legend:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-slate-700 dark:text-slate-300">Perfect</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-slate-700 dark:text-slate-300">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-slate-700 dark:text-slate-300">Partial</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
