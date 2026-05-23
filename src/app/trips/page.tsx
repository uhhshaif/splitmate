'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plane, Plus, Calendar, DollarSign, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Trips() {
  const router = useRouter();
  const { currentUser, trips, groups, expenses, createTrip, isLoading } = useStore();

  // Create Trip State
  const [isOpen, setIsOpen] = useState(false);
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('none');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) return null;

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tripName.trim()) {
      setErrorMsg('Trip name is required');
      return;
    }

    const budget = parseFloat(budgetStr) || 0;
    if (budget < 0) {
      setErrorMsg('Budget must be positive');
      return;
    }

    setIsSubmitting(true);
    try {
      const gId = selectedGroupId === 'none' ? undefined : selectedGroupId;
      const id = await createTrip(gId, tripName, description, startDate, endDate, budget);
      
      if (id) {
        setTripName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setBudgetStr('');
        setSelectedGroupId('none');
        setIsOpen(false);
        router.push(`/trips/${id}`);
      } else {
        setErrorMsg('Failed to create trip. Please try again.');
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
            <Plane className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            Trip Companion
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your travel budgets, manage itineraries, and track shared journey expenses.
          </p>
        </div>

        {/* Create Trip Trigger */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 font-semibold" />}>
            <Plus className="h-4 w-4" />
            Plan New Trip
          </DialogTrigger>
          
          <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Plan Travel Trip</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Set budget details, dates, and link to a splitmate Group to easily share travel expenses.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <Label htmlFor="tripName" className="text-zinc-600 dark:text-zinc-300">Trip Name</Label>
                <Input
                  id="tripName"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Summer in Barcelona"
                  className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-foreground focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-zinc-600 dark:text-zinc-300">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explore Europe, beaches, cities..."
                  className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-foreground focus:border-emerald-500"
                />
              </div>

              {/* Grid: Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-zinc-600 dark:text-zinc-300">Start Date</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-8 text-foreground focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-zinc-600 dark:text-zinc-300">End Date</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-8 text-foreground focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Budget & Group Select */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget" className="text-zinc-600 dark:text-zinc-300">Total Budget</Label>
                  <div className="relative mt-1.5">
                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-zinc-500 dark:text-zinc-400 select-none">RM</div>
                    <Input
                      id="budget"
                      type="number"
                      value={budgetStr}
                      onChange={(e) => setBudgetStr(e.target.value)}
                      placeholder="0"
                      className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-9 text-foreground focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="linkGroup" className="text-zinc-600 dark:text-zinc-300">Link splitmate Group</Label>
                  <Select value={selectedGroupId} onValueChange={(val) => setSelectedGroupId(val || 'none')}>
                    <SelectTrigger id="linkGroup" className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-foreground text-xs">
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                      <SelectItem value="none">No Group Connection</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  {isSubmitting ? 'Planning...' : 'Plan Trip'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trips list grid */}
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 rounded-3xl p-16 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
            <Plane className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Trips Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Planning a trip? Set budgets, track dates, and keep logistics clear.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="font-semibold">
            Plan Your First Trip
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const tripExpenses = expenses.filter((e) => e.trip_id === trip.id);
            const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
            const percentSpent = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;
            const targetGroup = groups.find((g) => g.id === trip.group_id);

            return (
              <Card key={trip.id} className="relative overflow-hidden border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white hover:border-zinc-300 dark:hover:border-white/20 transition-all group duration-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate pr-2">{trip.name}</CardTitle>
                    {targetGroup && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 bg-emerald-600/10 px-2 py-0.5 rounded shrink-0">
                        {targetGroup.name}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 min-h-8 mt-1">{trip.description || 'No details provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{trip.start_date || 'TBD'} to {trip.end_date || 'TBD'}</span>
                  </div>

                  {/* Budget tracker */}
                  <div className="space-y-1.5 border-t border-zinc-200 dark:border-white/5 pt-4">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-500 dark:text-zinc-400">Spent: RM {totalSpent.toFixed(2)}</span>
                      <span className="text-zinc-400 dark:text-zinc-500">Budget: RM {trip.budget.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${percentSpent > 90 ? 'bg-rose-500' : 'bg-teal-500'}`}
                        style={{ width: `${percentSpent}%` }}
                      />
                    </div>
                  </div>

                  <Link href={`/trips/${trip.id}`} className="block">
                    <Button variant="outline" className="w-full transition duration-200 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-1">
                      Explore Trip Log
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

