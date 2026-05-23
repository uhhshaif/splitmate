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
import { Users, Plus, ArrowRight, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Groups() {
  const router = useRouter();
  const { currentUser, groups, profiles, createGroup, isLoading } = useStore();

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

  if (isLoading || !currentUser) return null;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-400" />
            Your Groups
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create or manage shared balance pools for housing, events, or trips.
          </p>
        </div>

        {/* Create Group Dialog Trigger */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 font-semibold" />}>
            <Plus className="h-4 w-4" />
            Create Group
          </DialogTrigger>
          
          <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Create New Group</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Give your group a name and invite members by email to start splitting bills.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label htmlFor="groupName" className="text-zinc-600 dark:text-zinc-300">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Roommates, Trip to Europe"
                  className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground dark:text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-zinc-600 dark:text-zinc-300">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group for?"
                  className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground dark:text-white focus:border-emerald-500"
                />
              </div>

              {/* Invite Members */}
              <div className="space-y-2">
                <Label className="text-zinc-600 dark:text-zinc-300">Invite Members by Email</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {memberEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(idx, e.target.value)}
                        placeholder="friend@email.com"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground dark:text-white focus:border-emerald-500 text-sm"
                      />
                      {memberEmails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmailField(idx)}
                          className="text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 h-10 w-10 shrink-0"
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
                  className="border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs flex items-center gap-1.5 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List Grid */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 rounded-3xl p-16 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Groups Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Create a splitting group with roommates or travel friends to track expenses together.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="font-semibold">
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            return (
              <Card key={group.id} className="relative overflow-hidden border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white hover:border-zinc-300 dark:hover:border-white/20 transition-all group duration-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">{group.name}</CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 min-h-8 mt-1">{group.description || 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/5 pt-4">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Group Members</span>
                    <div className="flex -space-x-2">
                      {group.members.map((mid) => (
                        <Avatar key={mid} className="h-7 w-7 ring-2 ring-white dark:ring-zinc-900 shadow-md">
                          <AvatarImage src={profiles[mid]?.avatar_url} />
                          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300">
                            {profiles[mid]?.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>

                  <Link href={`/groups/${group.id}`} className="block">
                    <Button variant="outline" className="w-full transition duration-200 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-1">
                      Enter Directory
                      <ArrowRight className="h-3.5 w-3.5" />
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

