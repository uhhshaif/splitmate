import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isMockMode, supabase } from './supabase';
import { simplifyDebts, Transaction } from './debt';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  name?: string;
  avatar_url: string;
  phone?: string;
  duitnow_type?: string;
  duitnow_id?: string;
  tng_phone?: string;
  mae_account?: string;
  paypal_email?: string;
  venmo_handle?: string;
  default_currency?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  members: string[]; // Profile IDs
}

export interface ExpenseSplit {
  profile_id: string;
  amount: number;
}

export interface Expense {
  id: string;
  group_id: string;
  trip_id?: string;
  description: string;
  amount: number;
  date: string;
  paid_by_id: string;
  category: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface ItineraryItem {
  time: string;
  activity: string;
  location?: string;
  coords?: [number, number];
}

export interface Trip {
  id: string;
  group_id?: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  created_by: string;
  created_at: string;
  itinerary?: ItineraryItem[];
}

interface SplitmateState {
  currentUser: Profile | null;
  profiles: Record<string, Profile>;
  groups: Group[];
  expenses: Expense[];
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  exchangeRates: Record<string, number>;

  // Auth actions
  signInMock: (email: string, displayName: string) => void;
  signOutUser: () => Promise<void>;
  
  // Data actions
  initialize: () => Promise<void>;
  fetchExchangeRates: () => Promise<void>;
  createGroup: (name: string, description: string, memberEmails: string[]) => Promise<string | null>;
  addExpense: (
    groupId: string,
    description: string,
    amount: number,
    date: string,
    paidById: string,
    category: string,
    splits: ExpenseSplit[],
    tripId?: string,
    receiptUrl?: string
  ) => Promise<string | null>;
  deleteExpense: (id: string) => Promise<void>;
  createTrip: (groupId: string | undefined, name: string, description: string, startDate: string, endDate: string, budget: number) => Promise<string | null>;
  updateTripItinerary: (tripId: string, itinerary: ItineraryItem[]) => Promise<void>;
  settleDebt: (fromId: string, toId: string, amount: number, groupId: string) => Promise<void>;
  updateProfile: (profileData: {
    display_name: string;
    avatar_url: string;
    email?: string;
    phone?: string;
    duitnow_type?: string;
    duitnow_id?: string;
    tng_phone?: string;
    mae_account?: string;
    paypal_email?: string;
    venmo_handle?: string;
    default_currency?: string;
  }) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  inviteMemberToGroup: (groupId: string, email: string) => Promise<void>;
  updateExpense: (
    expenseId: string,
    description: string,
    amount: number,
    date: string,
    paidById: string,
    category: string,
    splits: ExpenseSplit[]
  ) => Promise<void>;
}

// Pre-populate premium mock data
const mockProfiles: Record<string, Profile> = {
  'u1': { 
    id: 'u1', 
    email: 'alex@splitmate.com', 
    display_name: 'Alex Rivera', 
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    phone: '+6012-3456789',
    duitnow_type: 'phone',
    duitnow_id: '+6012-3456789',
    tng_phone: '+6012-3456789',
    mae_account: '164012345678',
    paypal_email: 'alex@splitmate.com',
    venmo_handle: '@alex-rivera',
    default_currency: 'RM'
  },
  'u2': { 
    id: 'u2', 
    email: 'jessica@splitmate.com', 
    display_name: 'Jessica Chen', 
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    phone: '+6017-9876543',
    duitnow_type: 'phone',
    duitnow_id: '+6017-9876543',
    tng_phone: '+6017-9876543',
    mae_account: '158012348888',
    paypal_email: 'jessica@splitmate.com',
    venmo_handle: '@jessica-chen',
    default_currency: 'RM'
  },
  'u3': { 
    id: 'u3', 
    email: 'marcus@splitmate.com', 
    display_name: 'Marcus Vance', 
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    phone: '+6013-1112223',
    duitnow_type: 'phone',
    duitnow_id: '+6013-1112223',
    tng_phone: '+6013-1112223',
    mae_account: '109012349999',
    paypal_email: 'marcus@splitmate.com',
    venmo_handle: '@marcus-vance',
    default_currency: 'RM'
  },
  'u4': { 
    id: 'u4', 
    email: 'sarah@splitmate.com', 
    display_name: 'Sarah Jenkins', 
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    phone: '+6011-88889999',
    duitnow_type: 'phone',
    duitnow_id: '+6011-88889999',
    tng_phone: '+6011-88889999',
    mae_account: '112012341111',
    paypal_email: 'sarah@splitmate.com',
    venmo_handle: '@sarah-jenkins',
    default_currency: 'RM'
  },
};

const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Cozy Roommates 2026',
    description: 'Shared house expenses, groceries, utilities, and internet.',
    created_by: 'u1',
    created_at: '2026-01-10T10:00:00Z',
    members: ['u1', 'u2', 'u3'],
  },
  {
    id: 'g2',
    name: 'EuroTrip Summer',
    description: 'Travel expenses across Spain, France, and Italy!',
    created_by: 'u2',
    created_at: '2026-04-15T12:00:00Z',
    members: ['u1', 'u2', 'u3', 'u4'],
  }
];

const mockExpenses: Expense[] = [
  {
    id: 'e1',
    group_id: 'g1',
    description: 'Monthly Rent',
    amount: 1800,
    date: '2026-05-01',
    paid_by_id: 'u1',
    category: 'housing',
    created_by: 'u1',
    created_at: '2026-05-01T08:00:00Z',
    splits: [
      { profile_id: 'u1', amount: 600 },
      { profile_id: 'u2', amount: 600 },
      { profile_id: 'u3', amount: 600 },
    ]
  },
  {
    id: 'e2',
    group_id: 'g1',
    description: 'Whole Foods Groceries',
    amount: 240,
    date: '2026-05-15',
    paid_by_id: 'u2',
    category: 'food',
    created_by: 'u2',
    created_at: '2026-05-15T14:30:00Z',
    splits: [
      { profile_id: 'u1', amount: 80 },
      { profile_id: 'u2', amount: 80 },
      { profile_id: 'u3', amount: 80 },
    ]
  },
  {
    id: 'e3',
    group_id: 'g1',
    description: 'Gigabit Fiber Internet',
    amount: 90,
    date: '2026-05-18',
    paid_by_id: 'u3',
    category: 'utilities',
    created_by: 'u3',
    created_at: '2026-05-18T09:15:00Z',
    splits: [
      { profile_id: 'u1', amount: 30 },
      { profile_id: 'u2', amount: 30 },
      { profile_id: 'u3', amount: 30 },
    ]
  },
  {
    id: 'e4',
    group_id: 'g2',
    trip_id: 't1',
    description: 'AirBnB in Barcelona',
    amount: 800,
    date: '2026-05-20',
    paid_by_id: 'u2',
    category: 'lodging',
    created_by: 'u2',
    created_at: '2026-05-20T10:00:00Z',
    splits: [
      { profile_id: 'u1', amount: 200 },
      { profile_id: 'u2', amount: 200 },
      { profile_id: 'u3', amount: 200 },
      { profile_id: 'u4', amount: 200 },
    ]
  },
  {
    id: 'e5',
    group_id: 'g2',
    trip_id: 't1',
    description: 'Tapas & Sangria dinner',
    amount: 160,
    date: '2026-05-21',
    paid_by_id: 'u4',
    category: 'food',
    created_by: 'u4',
    created_at: '2026-05-21T21:40:00Z',
    splits: [
      { profile_id: 'u1', amount: 40 },
      { profile_id: 'u2', amount: 40 },
      { profile_id: 'u3', amount: 40 },
      { profile_id: 'u4', amount: 40 },
    ]
  }
];

const mockTrips: Trip[] = [
  {
    id: 't1',
    group_id: 'g2',
    name: 'Barcelona Adventure',
    description: 'Week-long getaway exploring Gaudi architectures and beaches.',
    start_date: '2026-05-20',
    end_date: '2026-05-27',
    budget: 1500,
    created_by: 'u2',
    created_at: '2026-05-10T10:00:00Z',
    itinerary: [
      { time: '14:00', activity: 'Arrive at Barcelona Airport, check into AirBnB', location: 'Josep Tarradellas Barcelona-El Prat Airport', coords: [41.2974, 2.0833] },
      { time: '17:00', activity: 'Walk around Gothic Quarter and have tapas', location: 'Gothic Quarter, Barcelona', coords: [41.3833, 2.1769] },
      { time: '10:00', activity: 'Visit La Sagrada Familia (Gaudi Tour)', location: 'La Sagrada Familia', coords: [41.4036, 2.1744] },
      { time: '15:00', activity: 'Relax at Barceloneta Beach', location: 'Barceloneta Beach', coords: [41.3784, 2.1925] },
    ]
  }
];

export const useStore = create<SplitmateState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      profiles: mockProfiles,
      groups: mockGroups,
      expenses: mockExpenses,
      trips: mockTrips,
      isLoading: true,
      error: null,
      exchangeRates: { RM: 1, MYR: 1, USD: 0.23, EUR: 0.21, SGD: 0.31 },

  signInMock: (email: string, displayName: string) => {
    const matchedProfile = Object.values(get().profiles).find(p => p.email.toLowerCase() === email.toLowerCase());
    const user: Profile = matchedProfile || {
      id: `u-${Date.now()}`,
      email,
      display_name: displayName,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
    };

    const newProfiles = { ...get().profiles, [user.id]: user };
    
    // Add user as member to all existing mock groups in local storage so they see them
    const updatedGroups = get().groups.map(group => {
      if (!group.members.includes(user.id)) {
        return { ...group, members: [...group.members, user.id] };
      }
      return group;
    });

    set({ currentUser: user, profiles: newProfiles, groups: updatedGroups });
  },

  signOutUser: async () => {
    if (isMockMode) {
      set({ currentUser: null });
    } else {
      await supabase.auth.signOut();
      set({ currentUser: null });
    }
  },

  fetchExchangeRates: async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/MYR');
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          const rates: Record<string, number> = {
            RM: 1,
            MYR: 1,
            USD: data.rates.USD || 0.23,
            EUR: data.rates.EUR || 0.21,
            SGD: data.rates.SGD || 0.31
          };
          set({ exchangeRates: rates });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live exchange rates, using cached/fallback rates:', err);
    }
  },

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      await get().fetchExchangeRates();
      if (isMockMode) {
        // Hydrated from persist storage, ensure default values are set if store is uninitialized
        if (!get().currentUser) {
          set({
            currentUser: mockProfiles['u1'],
            profiles: mockProfiles,
            groups: mockGroups,
            expenses: mockExpenses,
            trips: mockTrips,
          });
        }
        set({ isLoading: false });
      } else {
        // Load Supabase state
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userId = session.user.id;
          
          // Get or create profile in users table
          let { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (!dbUser) {
            const newUser = {
              id: userId,
              email: session.user.email || '',
              name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
              avatar_url: session.user.user_metadata?.avatar_url || ''
            };
            const { data: created } = await supabase.from('users').insert([newUser]).select().single();
            dbUser = created || newUser;
          }

          const metadata = session.user.user_metadata || {};
          const profile: Profile = {
            id: dbUser.id,
            email: dbUser.email,
            display_name: dbUser.name, // Map database name to frontend display_name
            name: dbUser.name,
            avatar_url: dbUser.avatar_url || '',
            phone: metadata.phone || '',
            duitnow_type: metadata.duitnow_type || '',
            duitnow_id: metadata.duitnow_id || '',
            tng_phone: metadata.tng_phone || '',
            mae_account: metadata.mae_account || '',
            paypal_email: metadata.paypal_email || '',
            venmo_handle: metadata.venmo_handle || '',
            default_currency: metadata.default_currency || 'RM',
          };

          // Fetch all profiles from users table
          const { data: dbProfiles } = await supabase.from('users').select('*');
          const profileMap: Record<string, Profile> = {};
          dbProfiles?.forEach(p => {
            profileMap[p.id] = {
              id: p.id,
              email: p.email,
              display_name: p.name,
              name: p.name,
              avatar_url: p.avatar_url || ''
            };
          });

          // Fetch groups
          const { data: dbGroups } = await supabase.from('groups').select('*');
          const groupsWithMembers: Group[] = [];
          if (dbGroups) {
            for (const g of dbGroups) {
              const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', g.id);
              groupsWithMembers.push({
                ...g,
                members: members?.map(m => m.user_id) || []
              });
            }
          }

          // Fetch expenses
          const { data: dbExpenses } = await supabase.from('expenses').select('*');
          const expensesWithSplits: Expense[] = [];
          if (dbExpenses) {
            for (const e of dbExpenses) {
              const { data: splits } = await supabase.from('expense_splits').select('user_id, amount_owed').eq('expense_id', e.id);
              expensesWithSplits.push({
                id: e.id,
                group_id: e.group_id,
                trip_id: e.trip_id,
                description: e.title, // Map database title to description
                amount: parseFloat(e.amount),
                date: e.date,
                paid_by_id: e.paid_by, // Map database paid_by to paid_by_id
                category: e.category,
                receipt_url: e.receipt_url,
                created_by: e.created_by,
                created_at: e.created_at,
                splits: splits?.map(s => ({
                  profile_id: s.user_id,
                  amount: parseFloat(s.amount_owed)
                })) || []
              });
            }
          }

          // Fetch trips
          const { data: dbTrips } = await supabase.from('trips').select('*');

          set({
            currentUser: profile,
            profiles: profileMap,
            groups: groupsWithMembers,
            expenses: expensesWithSplits,
            trips: dbTrips || [],
            isLoading: false
          });
        } else {
          set({ currentUser: null, isLoading: false });
        }
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  createGroup: async (name: string, description: string, memberEmails: string[]) => {
    const user = get().currentUser;
    if (!user) return null;

    if (isMockMode) {
      const groupId = `g-${Date.now()}`;
      
      // Resolve member profiles. Create mock profiles for ones that don't exist
      const resolvedMembers = [user.id];
      const newProfiles = { ...get().profiles };

      for (const email of memberEmails) {
        if (!email.trim()) continue;
        
        let existing = Object.values(newProfiles).find(p => p.email.toLowerCase() === email.toLowerCase());
        if (!existing) {
          const seedName = email.split('@')[0];
          const newId = `u-${Math.random().toString(36).substr(2, 9)}`;
          existing = {
            id: newId,
            email: email.toLowerCase(),
            display_name: seedName.charAt(0).toUpperCase() + seedName.slice(1),
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedName)}`
          };
          newProfiles[newId] = existing;
        }
        resolvedMembers.push(existing.id);
      }

      const newGroup: Group = {
        id: groupId,
        name,
        description,
        created_by: user.id,
        created_at: new Date().toISOString(),
        members: Array.from(new Set(resolvedMembers))
      };

      const updatedGroups = [...get().groups, newGroup];
      
      set({
        groups: updatedGroups,
        profiles: newProfiles
      });
      return groupId;
    } else {
      // Supabase Create Group logic
      const { data: newGroup, error: groupErr } = await supabase
        .from('groups')
        .insert([{ name, description, created_by: user.id }])
        .select()
        .single();

      if (groupErr || !newGroup) throw groupErr;

      // Add members
      const resolvedIds = [user.id];
      
      for (const email of memberEmails) {
        if (!email.trim()) continue;
        // Search if email user profile exists in DB
        const { data: found } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
        if (found) {
          resolvedIds.push(found.id);
        } else {
          const dummyId = `u-${Math.random().toString(36).substr(2, 9)}`;
          await supabase.from('users').insert([{ id: dummyId, email: email.toLowerCase(), name: email.split('@')[0] }]);
          resolvedIds.push(dummyId);
        }
      }

      // Unique member IDs
      const uniqueIds = Array.from(new Set(resolvedIds));
      const memberInserts = uniqueIds.map(pid => ({ group_id: newGroup.id, user_id: pid }));
      await supabase.from('group_members').insert(memberInserts);

      await get().initialize();
      return newGroup.id;
    }
  },

  addExpense: async (
    groupId: string,
    description: string,
    amount: number,
    date: string,
    paidById: string,
    category: string,
    splits: ExpenseSplit[],
    tripId?: string,
    receiptUrl?: string
  ) => {
    const user = get().currentUser;
    if (!user) return null;

    if (isMockMode) {
      const expenseId = `e-${Date.now()}`;
      const newExpense: Expense = {
        id: expenseId,
        group_id: groupId,
        trip_id: tripId,
        description,
        amount,
        date,
        paid_by_id: paidById,
        category,
        receipt_url: receiptUrl,
        created_by: user.id,
        created_at: new Date().toISOString(),
        splits
      };

      const updatedExpenses = [...get().expenses, newExpense];
      set({ expenses: updatedExpenses });
      return expenseId;
    } else {
      // Supabase add expense via Next.js REST API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/expenses/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({
            groupId,
            tripId,
            title: description, // description maps to title
            amount,
            date,
            paidBy: paidById,
            category,
            splits: splits.map(s => ({
              userId: s.profile_id,
              amountOwed: s.amount
            })),
            splitType: 'equal',
            receiptUrl,
            createdBy: user.id
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to record expense via API route');
        }

        const data = await response.json();
        await get().initialize();
        return data.id;
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    }
  },

  deleteExpense: async (id: string) => {
    if (isMockMode) {
      const updated = get().expenses.filter(e => e.id !== id);
      set({ expenses: updated });
    } else {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete expense from Supabase:', error);
        throw new Error(error.message || 'Failed to delete expense');
      }
      await get().initialize();
    }
  },

  createTrip: async (groupId: string | undefined, name: string, description: string, startDate: string, endDate: string, budget: number) => {
    const user = get().currentUser;
    if (!user) return null;

    if (isMockMode) {
      const tripId = `t-${Date.now()}`;
      const newTrip: Trip = {
        id: tripId,
        group_id: groupId,
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        budget,
        created_by: user.id,
        created_at: new Date().toISOString(),
        itinerary: []
      };

      const updatedTrips = [...get().trips, newTrip];
      set({ trips: updatedTrips });
      return tripId;
    } else {
      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert([{
          group_id: groupId || null,
          name,
          description,
          start_date: startDate,
          end_date: endDate,
          budget,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      await get().initialize();
      return newTrip.id;
    }
  },

  updateTripItinerary: async (tripId: string, itinerary: ItineraryItem[]) => {
    if (isMockMode) {
      const updatedTrips = get().trips.map(t => {
        if (t.id === tripId) {
          return { ...t, itinerary };
        }
        return t;
      });
      set({ trips: updatedTrips });
    } else {
      // In supabase, we can store itinerary in a jsonb field in the trips table (since we didn't specify a table for it)
      await supabase.from('trips').update({ itinerary }).eq('id', tripId);
      await get().initialize();
    }
  },

  settleDebt: async (fromId: string, toId: string, amount: number, groupId: string) => {
    const fromProfile = get().profiles[fromId];
    const toProfile = get().profiles[toId];
    const fromName = fromProfile?.display_name || 'Someone';
    const toName = toProfile?.display_name || 'Someone';

    if (isMockMode) {
      const splits = [{ profile_id: toId, amount }];
      await get().addExpense(
        groupId,
        `Settlement: ${fromName} paid ${toName}`,
        amount,
        new Date().toISOString().split('T')[0],
        fromId,
        'settlement',
        splits
      );
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/settlements/settle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({
            groupId,
            fromUser: fromId,
            toUser: toId,
            amount,
            settled: true
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to log settlement via API route');
        }

        // Add a visual expense for settlement mapping in the client feed
        const splits = [{ profile_id: toId, amount }];
        await get().addExpense(
          groupId,
          `Settlement: ${fromName} paid ${toName}`,
          amount,
          new Date().toISOString().split('T')[0],
          fromId,
          'settlement',
          splits
        );

        await get().initialize();
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    }
  },

  updateProfile: async (profileData: {
    display_name: string;
    avatar_url: string;
    email?: string;
    phone?: string;
    duitnow_type?: string;
    duitnow_id?: string;
    tng_phone?: string;
    mae_account?: string;
    paypal_email?: string;
    venmo_handle?: string;
    default_currency?: string;
  }) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedUser = { 
        ...user, 
        display_name: profileData.display_name, 
        avatar_url: profileData.avatar_url,
        email: profileData.email || user.email,
        phone: profileData.phone,
        duitnow_type: profileData.duitnow_type,
        duitnow_id: profileData.duitnow_id,
        tng_phone: profileData.tng_phone,
        mae_account: profileData.mae_account,
        paypal_email: profileData.paypal_email,
        venmo_handle: profileData.venmo_handle,
        default_currency: profileData.default_currency || 'RM'
      };
      
      const updatedProfiles = { ...get().profiles, [user.id]: updatedUser };
      set({ currentUser: updatedUser, profiles: updatedProfiles });
    } else {
      // Update Supabase Auth metadata and optionally email
      const updateData: any = {
        data: {
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone,
          duitnow_type: profileData.duitnow_type,
          duitnow_id: profileData.duitnow_id,
          tng_phone: profileData.tng_phone,
          mae_account: profileData.mae_account,
          paypal_email: profileData.paypal_email,
          venmo_handle: profileData.venmo_handle,
          default_currency: profileData.default_currency || 'RM'
        }
      };

      // Handle email change if it is different
      if (profileData.email && profileData.email.toLowerCase() !== user.email.toLowerCase()) {
        updateData.email = profileData.email.toLowerCase();
      }

      const { error: authErr } = await supabase.auth.updateUser(updateData);
      if (authErr) throw authErr;

      // Update users table in db (only updating columns that exist: name, email, avatar_url)
      const dbUpdate: any = {
        name: profileData.display_name,
        avatar_url: profileData.avatar_url
      };
      
      const { error: dbErr } = await supabase
        .from('users')
        .update(dbUpdate)
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      await get().initialize();
    }
  },

  leaveGroup: async (groupId: string) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedGroups = get().groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            members: group.members.filter(m => m !== user.id)
          };
        }
        return group;
      }).filter(group => group.members.length > 0);

      set({ groups: updatedGroups });
    } else {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      await get().initialize();
    }
  },

  deleteGroup: async (groupId: string) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedGroups = get().groups.filter(group => group.id !== groupId);
      const updatedExpenses = get().expenses.filter(e => e.group_id !== groupId);
      const updatedTrips = get().trips.filter(t => t.group_id !== groupId);

      set({ 
        groups: updatedGroups,
        expenses: updatedExpenses,
        trips: updatedTrips
      });
    } else {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      await get().initialize();
    }
  },

  inviteMemberToGroup: async (groupId: string, email: string) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const newProfiles = { ...get().profiles };
      let existing = Object.values(newProfiles).find(p => p.email.toLowerCase() === email.toLowerCase());
      if (!existing) {
        const seedName = email.split('@')[0];
        const newId = `u-${Math.random().toString(36).substr(2, 9)}`;
        existing = {
          id: newId,
          email: email.toLowerCase(),
          display_name: seedName.charAt(0).toUpperCase() + seedName.slice(1),
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedName)}`
        };
        newProfiles[newId] = existing;
      }

      const updatedGroups = get().groups.map(group => {
        if (group.id === groupId) {
          if (!group.members.includes(existing.id)) {
            return {
              ...group,
              members: [...group.members, existing.id]
            };
          }
        }
        return group;
      });

      set({ groups: updatedGroups, profiles: newProfiles });
    } else {
      // Find by email in users table
      const { data: found } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (!found) {
        throw new Error(`User with email "${email}" is not registered on Splitmate.`);
      }

      // Add to group_members
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: found.id
        }]);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error(`User "${email}" is already a member of this group.`);
        }
        throw error;
      }
      await get().initialize();
    }
  },

  updateExpense: async (
    expenseId: string,
    description: string,
    amount: number,
    date: string,
    paidById: string,
    category: string,
    splits: ExpenseSplit[]
  ) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedExpenses = get().expenses.map(e => {
        if (e.id === expenseId) {
          return {
            ...e,
            description,
            amount,
            date,
            paid_by_id: paidById,
            category,
            splits
          };
        }
        return e;
      });
      set({ expenses: updatedExpenses });
    } else {
      // 1. Update the expenses table
      const { error: expError } = await supabase
        .from('expenses')
        .update({
          title: description,
          amount,
          date,
          paid_by: paidById,
          category
        })
        .eq('id', expenseId);

      if (expError) throw expError;

      // 2. Delete existing splits
      const { error: deleteError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (deleteError) throw deleteError;

      // 3. Insert new splits
      const splitInserts = splits.map(s => ({
        expense_id: expenseId,
        user_id: s.profile_id,
        amount_owed: s.amount
      }));

      const { error: insertError } = await supabase
        .from('expense_splits')
        .insert(splitInserts);

      if (insertError) throw insertError;

      await get().initialize();
    }
  }
}), {
  name: 'splitmate-storage',
  partialize: (state) => ({
    currentUser: state.currentUser,
    profiles: state.profiles,
    groups: state.groups,
    expenses: state.expenses,
    trips: state.trips,
  }),
}));

