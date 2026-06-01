'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, ArrowRight, X, AlertCircle, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';

export default function Groups() {
  const router = useRouter();
  const { currentUser, groups, expenses, profiles, invitations, acceptInvitation, declineInvitation, createGroup, isLoading } = useStore();
  const [actioningGroupId, setActioningGroupId] = useState<string | null>(null);

  const handleAcceptInvite = async (groupId: string) => {
    setActioningGroupId(groupId);
    try {
      await acceptInvitation(groupId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningGroupId(null);
    }
  };

  const handleDeclineInvite = async (groupId: string) => {
    setActioningGroupId(groupId);
    try {
      await declineInvitation(groupId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningGroupId(null);
    }
  };

  // Create Group Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>(['']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        setIsOpen(true);
        // Clean URL search params
        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, []);

  if (isLoading || !currentUser) return null;

  const userGroups = groups.filter(g => g.members.includes(currentUser.id) || g.created_by === currentUser.id);

  const handleAddEmailField = () => {
    setMemberEmails([...memberEmails, '']);
  };

  const handleRemoveEmailField = (idx: number) => {
    if (memberEmails.length > 1) {
      setMemberEmails(memberEmails.filter((_, i) => i !== idx));
    }
  };

  const handleEmailChange = (idx: number, val: string) => {
    const updated = [...memberEmails];
    updated[idx] = val;
    setMemberEmails(updated);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!groupName.trim()) {
      setErrorMsg('Group name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const validEmails = memberEmails.filter(email => email.trim() !== '');
      const id = await createGroup(groupName, description, validEmails);
      
      if (id) {
        setGroupName('');
        setDescription('');
        setMemberEmails(['']);
        setIsOpen(false);
        router.push(`/groups/${id}`);
      } else {
        setErrorMsg('Failed to create group. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <title>Groups | Splitmate</title>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </span>
            Your Groups
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Create or manage shared balance pools for housing, events, or trips.
          </p>
        </div>

        {/* Create Group Dialog Trigger */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-650 flex items-center gap-2 font-bold px-5 py-5 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-300" />}>
            <Plus className="h-5 w-5" />
            Create Group
          </DialogTrigger>
          
          <DialogContent className="border-zinc-200/80 dark:border-zinc-800/85 bg-white dark:bg-zinc-950 text-foreground max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <DialogHeader className="space-y-1.5 pb-2">
              <DialogTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Create New Group
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                Give your group a name and invite members by email to start splitting bills.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 p-3.5 rounded-2xl">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="groupName" className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Group Name
                </Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Roommates, Trip to Europe"
                  className="mt-1 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-foreground dark:text-white focus-visible:ring-emerald-500/30 rounded-xl py-5 focus:border-emerald-500/80 transition-all duration-250"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Description <span className="text-[10px] text-zinc-400 dark:text-zinc-500 lowercase font-normal">(optional)</span>
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group for?"
                  className="mt-1 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-foreground dark:text-white focus-visible:ring-emerald-500/30 rounded-xl py-5 focus:border-emerald-500/80 transition-all duration-250"
                />
              </div>

              {/* Invite Members */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Invite Members
                  </Label>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                    Added: {memberEmails.filter(e => e.trim()).length} member(s)
                  </span>
                </div>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                  {memberEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 group/input">
                      <div className="relative flex-1">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(idx, e.target.value)}
                          placeholder="friend@email.com"
                          className="border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-foreground dark:text-white focus-visible:ring-emerald-500/30 rounded-xl py-5 focus:border-emerald-500/80 transition-all duration-250 text-sm"
                        />
                      </div>
                      {memberEmails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmailField(idx)}
                          className="text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 h-10 w-10 shrink-0 rounded-xl transition-all"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEmailField}
                  className="border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-xs flex items-center gap-1.5 py-4 px-3 rounded-xl transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-500" />
                  Add Member Field
                </Button>
              </div>

              <DialogFooter className="pt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-white rounded-xl py-5"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-650 font-bold rounded-xl py-5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group Invitations Section */}
      {invitations && invitations.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Pending Invitations ({invitations.length})
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {invitations.map((inv) => (
              <Card key={inv.id} className="relative overflow-hidden border border-emerald-500/20 dark:border-emerald-500/10 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md text-foreground dark:text-white shadow-lg shadow-emerald-500/[0.02] rounded-3xl p-5 flex flex-col justify-between min-h-[160px] group transition-all duration-300 hover:border-emerald-500/30">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-200">{inv.group_name}</h4>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                    Invited by <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{inv.invited_by_name}</span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {inv.group_description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-900/80 mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeclineInvite(inv.group_id)}
                    disabled={actioningGroupId !== null}
                    className="flex-1 text-xs font-bold text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl py-5 h-10 border border-transparent hover:border-rose-500/20 transition-all duration-200"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvite(inv.group_id)}
                    disabled={actioningGroupId !== null}
                    className="flex-1 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-650 hover:to-teal-650 rounded-2xl py-5 h-10 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Accept
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Groups List Grid */}
      {userGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/5 backdrop-blur-md rounded-3xl p-16 text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Groups Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Create a splitting group with roommates or travel friends to track expenses together.
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-650 hover:to-teal-650 font-bold rounded-2xl px-6 py-5 shadow-md">
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {userGroups.map((group) => {
            // Calculate balance for each group for the current user
            const groupExpenses = expenses.filter(e => e.group_id === group.id);
            let userNetBalance = 0;
            groupExpenses.forEach(e => {
              const isPayer = e.paid_by_id === currentUser.id;
              const userSplit = e.splits.find(s => s.profile_id === currentUser.id);
              const splitAmount = userSplit ? userSplit.amount : 0;
              
              if (isPayer) {
                userNetBalance += e.amount;
              }
              if (userSplit) {
                userNetBalance -= splitAmount;
              }
            });

            return (
              <Card key={group.id} className="relative bg-white/60 dark:bg-zinc-900/60 backdrop-blur-lg border border-zinc-200/55 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700/85 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl group overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 max-w-[80%]">
                      <CardTitle className="text-lg font-bold group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-200 truncate">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 min-h-[2rem] leading-relaxed mt-1">
                        {group.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-350 text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/50">
                      <Users className="h-3 w-3" />
                      <span>{group.members.length}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5 pt-0">
                  <div className="flex items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/60 pt-4">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Members</span>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {group.members.slice(0, 5).map((mid) => (
                        <Avatar key={mid} className="h-7 w-7 ring-2 ring-white dark:ring-zinc-900 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                          <AvatarImage src={profiles[mid]?.avatar_url} />
                          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-900 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                            {profiles[mid]?.display_name ? profiles[mid].display_name.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.members.length > 5 && (
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-900 text-[10px] font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-800 ring-2 ring-white dark:ring-zinc-900">
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/60 pt-4">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Your Balance</span>
                    
                    {userNetBalance > 0.005 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold">Owed RM {userNetBalance.toFixed(2)}</span>
                      </div>
                    ) : userNetBalance < -0.005 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs font-bold">Owe RM {Math.abs(userNetBalance).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-500 dark:text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        <span className="text-xs font-bold">Settled Up</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/groups/${group.id}`} className="block pt-1">
                    <Button variant="outline" className="w-full transition-all duration-300 border-zinc-200 dark:border-zinc-800/80 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:border-transparent hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 py-5 rounded-2xl shadow-sm hover:shadow-emerald-500/10">
                      Open Group
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

