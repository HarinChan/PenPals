import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Edit2, Link as LinkIcon, Video } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import type { SelectedLocation } from '../services/location';
import { WebexService } from '../services';
import { toast } from 'sonner';
import { Account } from '../types';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAccount: Account;
  accounts: Account[];
  onAccountUpdate: (account: Account) => void;
}

export default function AccountDialog({
  open,
  onOpenChange,
  currentAccount,
  accounts,
  onAccountUpdate
}: AccountDialogProps) {
  const [editingAccountLocation, setEditingAccountLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [webexConnected, setWebexConnected] = useState(false);

  useEffect(() => {
    if (open) {
      const checkWebexStatus = async () => {
        try {
          const status = await WebexService.getStatus();
          setWebexConnected(status.connected);
        } catch (e) {
          console.error("Failed to check WebEx status", e);
        }
      };
      checkWebexStatus();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Account Settings</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Manage your location, integration settings, and view account overview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1">
          {/* Account Location Management */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-slate-100 font-medium">Account Location</h3>
                <button
                  onClick={() => {
                    if (editingAccountLocation) {
                      // Save location changes
                      if (selectedLocation) {
                        // Update all classrooms with new coordinates
                        const updatedAccounts = accounts.map(account => ({
                          ...account,
                          location: selectedLocation.name,
                          x: selectedLocation.longitude,
                          y: selectedLocation.latitude,
                        }));

                        // Update each account
                        updatedAccounts.forEach(account => {
                          onAccountUpdate(account);
                        });

                        toast.success('Location updated for all classrooms');
                      }
                      setEditingAccountLocation(false);
                      setSelectedLocation(null);
                    } else {
                      setEditingAccountLocation(true);
                    }
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                >
                  {editingAccountLocation ? 'Save' : <Edit2 size={16} />}
                </button>
              </div>

              {editingAccountLocation ? (
                <div className="space-y-3">
                  <LocationAutocomplete
                    label=""
                    placeholder="Search for your location..."
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    id="account-location"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This will update the location for all your classrooms. Current: {currentAccount.location}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin size={16} />
                    <span>{currentAccount.location}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    All your classrooms are located at this address. Change this to update the location for all classrooms.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* WebEx Connection */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-slate-100 font-medium">WebEx Integration</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Connect your WebEx account to enable instant and scheduled video meetings with other classrooms.
                </p>
                <div className="pt-2">
                  {webexConnected ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800 mb-2">
                        <LinkIcon size={16} />
                        <span>Account Connected Successfully</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              const { url } = await WebexService.getAuthUrl();
                              if (url) {
                                window.location.href = url;
                              } else {
                                toast.error("WebEx configuration missing on server");
                              }
                            } catch (e) {
                              console.error(e);
                              toast.error("Failed to initiate WebEx reconnection");
                            }
                          }}
                        >
                          Reconnect
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              await WebexService.disconnect();
                              setWebexConnected(false);
                              toast.success("Disconnected from WebEx successfully");
                            } catch (e) {
                              console.error(e);
                              toast.error("Failed to disconnect WebEx");
                            }
                          }}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={async () => {
                        try {
                          const { url } = await WebexService.getAuthUrl();
                          if (url) {
                            window.location.href = url;
                          } else {
                            toast.error("WebEx configuration missing on server");
                          }
                        } catch (e) {
                          toast.error("Failed to initiate WebEx connection");
                        }
                      }}
                    >
                      <Video size={16} />
                      Connect WebEx Account
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Account Statistics */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 space-y-4">
              <h3 className="text-slate-900 dark:text-slate-100 font-medium">Account Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{accounts.length}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Classrooms</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {accounts.reduce((total, acc) => total + (acc.friends?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Friends</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
