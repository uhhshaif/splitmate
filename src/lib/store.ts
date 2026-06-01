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
  qr_code_url?: string;
  qr_code_label?: string;
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

export interface ExpenseItem {
  name: string;
  amount: number;
  members: string[]; // profile IDs
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
  items?: ExpenseItem[];
  splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized';
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

export interface GroupInvitation {
  id: string;
  group_id: string;
  group_name: string;
  group_description: string;
  invited_by_name: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  settled: boolean;
  created_at: string;
}

interface SplitmateState {
  currentUser: Profile | null;
  profiles: Record<string, Profile>;
  groups: Group[];
  expenses: Expense[];
  trips: Trip[];
  invitations: GroupInvitation[];
  settlements: Settlement[];
  mockInvitations: { id: string; group_id: string; user_id: string }[];
  isLoading: boolean;
  error: string | null;
  exchangeRates: Record<string, number>;

  acceptInvitation: (groupId: string) => Promise<void>;
  declineInvitation: (groupId: string) => Promise<void>;
  confirmSettlement: (settlementId: string) => Promise<void>;
  declineSettlement: (settlementId: string) => Promise<void>;

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
    receiptUrl?: string,
    items?: ExpenseItem[],
    splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized'
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
    qr_code_url?: string;
    qr_code_label?: string;
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
    splits: ExpenseSplit[],
    receiptUrl?: string,
    items?: ExpenseItem[],
    splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized'
  ) => Promise<void>;
  updateGroup: (groupId: string, name: string, description: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
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
      invitations: [],
      settlements: [],
      mockInvitations: [],
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
    
    set({ currentUser: user, profiles: newProfiles });
    get().initialize(); // Recalculate invitations for this signed-in user
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
      // Auto-cleanup other Supabase projects' cookies on localhost to prevent HTTP 431
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/);
          const currentProjectRef = projectRefMatch ? projectRefMatch[1] : '';
          
          if (document.cookie) {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              const eqIdx = cookie.indexOf('=');
              const name = eqIdx > -1 ? cookie.substring(0, eqIdx) : cookie;
              
              if (name.startsWith('sb-') && currentProjectRef && !name.includes(currentProjectRef)) {
                console.log('Cleaning up foreign Supabase cookie to prevent 431 header size error:', name);
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=127.0.0.1;`;
              }
            }
          }
        } catch (cookieErr) {
          console.warn('Failed to auto-clean Supabase cookies:', cookieErr);
        }
      }

      await get().fetchExchangeRates();
      if (isMockMode) {
        // Hydrated from persist storage, ensure default values are set if store is empty
        const currentProfiles = get().profiles || {};
        if (Object.keys(currentProfiles).length === 0) {
          set({
            profiles: mockProfiles,
            groups: mockGroups,
            expenses: mockExpenses,
            trips: mockTrips,
          });
        }
        // Removed auto-login so the app starts at the landing page for new visitors

        // Resolve mock invitations for UI
        const currentUser = get().currentUser;
        const invitations: GroupInvitation[] = [];
        if (currentUser) {
          const userMockInvites = get().mockInvitations || [];
          userMockInvites.forEach(inv => {
            if (inv.user_id === currentUser.id) {
              const group = get().groups.find(g => g.id === inv.group_id);
              if (group) {
                const creatorProfile = get().profiles[group.created_by];
                invitations.push({
                  id: inv.id,
                  group_id: inv.group_id,
                  group_name: group.name,
                  group_description: group.description || '',
                  invited_by_name: creatorProfile?.display_name || 'Someone'
                });
              }
            }
          });
        }

        set({ invitations, isLoading: false });
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
            phone: dbUser.phone || metadata.phone || '',
            duitnow_type: dbUser.duitnow_type || metadata.duitnow_type || 'phone',
            duitnow_id: dbUser.duitnow_id || metadata.duitnow_id || '',
            tng_phone: dbUser.tng_phone || metadata.tng_phone || '',
            mae_account: dbUser.mae_account || metadata.mae_account || '',
            paypal_email: dbUser.paypal_email || metadata.paypal_email || '',
            venmo_handle: dbUser.venmo_handle || metadata.venmo_handle || '',
            default_currency: dbUser.default_currency || metadata.default_currency || 'RM',
            qr_code_url: dbUser.qr_code_url || '',
            qr_code_label: dbUser.qr_code_label || metadata.qr_code_label || 'DuitNow',
          };

          // Fetch all profiles from users table
          const { data: dbProfiles, error: dbProfilesErr } = await supabase.from('users').select('*');
          if (dbProfilesErr) {
            console.error('Supabase DB: Failed to fetch all user profiles. If you enabled Row Level Security (RLS), please ensure you added a SELECT policy for public users. Error details:', dbProfilesErr.message);
          }
          
          // Merge database profiles with existing ones to avoid wiping them out
          const profileMap: Record<string, Profile> = { ...get().profiles };
          dbProfiles?.forEach(p => {
            profileMap[p.id] = {
              id: p.id,
              email: p.email,
              display_name: p.name,
              name: p.name,
              avatar_url: p.avatar_url || '',
              phone: p.phone || '',
              duitnow_type: p.duitnow_type || 'phone',
              duitnow_id: p.duitnow_id || '',
              tng_phone: p.tng_phone || '',
              mae_account: p.mae_account || '',
              paypal_email: p.paypal_email || '',
              venmo_handle: p.venmo_handle || '',
              default_currency: p.default_currency || 'RM',
              qr_code_url: p.qr_code_url || '',
              qr_code_label: p.qr_code_label || 'DuitNow'
            };
          });

          // Fetch groups
          const { data: dbGroups } = await supabase.from('groups').select('*');
          const groupsWithMembers: Group[] = [];
          if (dbGroups) {
            for (const g of dbGroups) {
              let { data: members, error: membersError } = await supabase
                .from('group_members')
                .select('user_id, status')
                .eq('group_id', g.id);

              if (membersError) {
                // Fallback if 'status' column doesn't exist yet in database
                const { data: retryMembers } = await supabase
                  .from('group_members')
                  .select('user_id')
                  .eq('group_id', g.id);
                
                members = (retryMembers || []).map(m => ({ ...m, status: 'accepted' }));
              }

              const acceptedMembers = members?.filter(m => !m.status || m.status === 'accepted').map(m => m.user_id) || [];
              const isAcceptedMember = acceptedMembers.includes(userId);
              const isCreator = g.created_by === userId;

              if (isAcceptedMember || isCreator) {
                groupsWithMembers.push({
                  ...g,
                  members: acceptedMembers
                });
              }
            }
          }

          // Fetch invitations
          let dbInvitations: any[] = [];
          try {
            const { data, error: invError } = await supabase
              .from('group_members')
              .select(`
                id,
                group_id,
                groups (
                  name,
                  description,
                  created_by
                )
              `)
              .eq('user_id', userId)
              .eq('status', 'pending');

            if (!invError && data) {
              dbInvitations = data;
            }
          } catch (e) {
            console.warn('Invitations select failed: status column might be missing from group_members table.', e);
          }

          const invitations: GroupInvitation[] = [];
          if (dbInvitations) {
            for (const inv of dbInvitations) {
              const g = inv.groups as any;
              if (g) {
                const creatorProfile = profileMap[g.created_by];
                invitations.push({
                  id: inv.id,
                  group_id: inv.group_id,
                  group_name: g.name,
                  group_description: g.description || '',
                  invited_by_name: creatorProfile?.display_name || 'Someone'
                });
              }
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
                items: e.items || [],
                created_by: e.created_by,
                created_at: e.created_at,
                splits: splits?.map(s => ({
                  profile_id: s.user_id,
                  amount: parseFloat(s.amount_owed)
                })) || [],
                splitType: e.split_type as any
              });
            }
          }

          // Fetch trips
          const { data: dbTrips } = await supabase.from('trips').select('*');

          // Fetch settlements
          const { data: dbSettlements } = await supabase.from('settlements').select('*');

          set({
            currentUser: profile,
            profiles: profileMap,
            groups: groupsWithMembers,
            expenses: expensesWithSplits,
            trips: dbTrips || [],
            invitations,
            settlements: dbSettlements?.map(s => ({
              id: s.id,
              group_id: s.group_id,
              from_user: s.from_user,
              to_user: s.to_user,
              amount: parseFloat(s.amount),
              settled: s.settled,
              created_at: s.created_at
            })) || [],
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
      const newProfiles = { ...get().profiles };
      const mockInvites = [...(get().mockInvitations || [])];

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
        
        if (existing.id !== user.id) {
          mockInvites.push({
            id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            group_id: groupId,
            user_id: existing.id
          });
        }
      }

      const newGroup: Group = {
        id: groupId,
        name,
        description,
        created_by: user.id,
        created_at: new Date().toISOString(),
        members: [user.id] // Only the creator is an active member initially
      };

      const updatedGroups = [...get().groups, newGroup];
      
      set({
        groups: updatedGroups,
        profiles: newProfiles,
        mockInvitations: mockInvites
      });
      await get().initialize(); // Recalculate invitations
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
      const creatorInsert = { group_id: newGroup.id, user_id: user.id, status: 'accepted' };
      const otherInserts: any[] = [];
      
      for (const email of memberEmails) {
        if (!email.trim()) continue;
        // Search if email user profile exists in DB
        const { data: found } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
        if (found) {
          if (found.id !== user.id) {
            otherInserts.push({ group_id: newGroup.id, user_id: found.id, status: 'pending' });
          }
        } else {
          throw new Error(`User with email "${email}" is not registered on Splitmate. They must register first before they can be added to a group.`);
        }
      }

      // Unique member inserts
      const allInserts = [creatorInsert, ...otherInserts];
      const uniqueInserts = Array.from(new Map(allInserts.map(item => [item.user_id, item])).values());
      
      let { error: insertErr } = await supabase.from('group_members').insert(uniqueInserts);

      if (insertErr && (
        insertErr.message?.includes('column "status"') || 
        insertErr.message?.includes('status') || 
        insertErr.message?.includes('schema cache')
      )) {
        console.warn('Supabase DB: "status" column does not exist in group_members. Retrying insert without it...');
        const uniqueInsertsFallback = uniqueInserts.map(({ status, ...rest }) => rest);
        const retryResult = await supabase.from('group_members').insert(uniqueInsertsFallback);
        insertErr = retryResult.error;
      }

      if (insertErr) throw insertErr;

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
    receiptUrl?: string,
    items?: ExpenseItem[],
    splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized'
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
        items,
        created_by: user.id,
        created_at: new Date().toISOString(),
        splits,
        splitType: splitType || 'equal'
      };

      const updatedExpenses = [...get().expenses, newExpense];
      set({ expenses: updatedExpenses });
      return expenseId;
    } else {
      // Supabase add expense via Next.js REST API
      try {
        const response = await fetch('/api/expenses/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
            splitType: splitType || 'equal',
            receiptUrl,
            items,
            createdBy: user.id
          })
        });

        if (!response.ok) {
          let errMsg = 'Failed to record expense via API route';
          try {
            const rawText = await response.text();
            try {
              const errData = JSON.parse(rawText);
              errMsg = errData.error || errMsg;
            } catch (_) {
              errMsg = rawText || `HTTP error ${response.status}: ${response.statusText}`;
            }
          } catch (e: any) {
            errMsg = `HTTP error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errMsg);
        }

        let data;
        try {
          data = await response.json();
        } catch (_) {
          throw new Error('Success response was not valid JSON');
        }
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
    if (isMockMode) {
      const newMockSettlement: Settlement = {
        id: 'ms_' + Math.random().toString(36).substr(2, 9),
        group_id: groupId,
        from_user: fromId,
        to_user: toId,
        amount,
        settled: false,
        created_at: new Date().toISOString()
      };
      set({ settlements: [...(get().settlements || []), newMockSettlement] });
    } else {
      try {
        const response = await fetch('/api/settlements/settle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groupId,
            fromUser: fromId,
            toUser: toId,
            amount,
            settled: false
          })
        });

        if (!response.ok) {
          let errMsg = 'Failed to log settlement';
          try {
            const rawText = await response.text();
            try {
              const errData = JSON.parse(rawText);
              errMsg = errData.error || errMsg;
            } catch (_) {
              errMsg = rawText || `HTTP error ${response.status}: ${response.statusText}`;
            }
          } catch (e: any) {
            errMsg = `HTTP error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errMsg);
        }

        await get().initialize();
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    }
  },

  confirmSettlement: async (settlementId: string) => {
    if (isMockMode) {
      const settlement = get().settlements.find(s => s.id === settlementId);
      if (!settlement) return;

      const fromProfile = get().profiles[settlement.from_user];
      const toProfile = get().profiles[settlement.to_user];
      const fromName = fromProfile?.display_name || 'Someone';
      const toName = toProfile?.display_name || 'Someone';

      // 1. Mark settlement as settled
      const updated = get().settlements.map(s => 
        s.id === settlementId ? { ...s, settled: true } : s
      );

      // 2. Add visual expense
      const splits = [{ profile_id: settlement.to_user, amount: settlement.amount }];
      await get().addExpense(
        settlement.group_id,
        `Settlement: ${fromName} paid ${toName}`,
        settlement.amount,
        new Date().toISOString().split('T')[0],
        settlement.from_user,
        'settlement',
        splits
      );

      set({ settlements: updated });
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/settlements/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({
            settlementId,
            action: 'confirm'
          })
        });

        if (!response.ok) {
          let errMsg = 'Failed to confirm settlement';
          try {
            const rawText = await response.text();
            try {
              const errData = JSON.parse(rawText);
              errMsg = errData.error || errMsg;
            } catch (_) {
              errMsg = rawText || `HTTP error ${response.status}: ${response.statusText}`;
            }
          } catch (e: any) {
            errMsg = `HTTP error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errMsg);
        }

        await get().initialize();
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    }
  },

  declineSettlement: async (settlementId: string) => {
    if (isMockMode) {
      const updated = get().settlements.filter(s => s.id !== settlementId);
      set({ settlements: updated });
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/settlements/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({
            settlementId,
            action: 'reject'
          })
        });

        if (!response.ok) {
          let errMsg = 'Failed to decline settlement';
          try {
            const rawText = await response.text();
            try {
              const errData = JSON.parse(rawText);
              errMsg = errData.error || errMsg;
            } catch (_) {
              errMsg = rawText || `HTTP error ${response.status}: ${response.statusText}`;
            }
          } catch (e: any) {
            errMsg = `HTTP error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errMsg);
        }

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
    qr_code_url?: string;
    qr_code_label?: string;
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
        default_currency: profileData.default_currency || 'RM',
        qr_code_url: profileData.qr_code_url,
        qr_code_label: profileData.qr_code_label || 'DuitNow'
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
          default_currency: profileData.default_currency || 'RM',
          qr_code_url: profileData.qr_code_url,
          qr_code_label: profileData.qr_code_label || 'DuitNow'
        }
      };

      // Handle email change if it is different
      if (profileData.email && profileData.email.toLowerCase() !== user.email.toLowerCase()) {
        updateData.email = profileData.email.toLowerCase();
      }

      const { error: authErr } = await supabase.auth.updateUser(updateData);
      if (authErr) throw authErr;

      // Update users table in db
      const dbUpdate: any = {
        name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        phone: profileData.phone,
        duitnow_type: profileData.duitnow_type,
        duitnow_id: profileData.duitnow_id,
        tng_phone: profileData.tng_phone,
        mae_account: profileData.mae_account,
        paypal_email: profileData.paypal_email,
        venmo_handle: profileData.venmo_handle,
        default_currency: profileData.default_currency || 'RM',
        qr_code_url: profileData.qr_code_url,
        qr_code_label: profileData.qr_code_label || 'DuitNow'
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
      await get().initialize();
    } else {
      const { error, count } = await supabase
        .from('group_members')
        .delete({ count: 'exact' })
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      if (count === 0) {
        throw new Error('Failed to leave the group. You might not be a member, or database security policies blocked the operation.');
      }
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

      // Check if already a member
      const group = get().groups.find(g => g.id === groupId);
      if (group?.members.includes(existing.id)) {
        throw new Error(`User with email "${email}" is already a member of this group.`);
      }

      // Check if already invited
      const alreadyInvited = (get().mockInvitations || []).some(
        inv => inv.group_id === groupId && inv.user_id === existing!.id
      );
      if (alreadyInvited) {
        throw new Error(`User with email "${email}" already has a pending invitation.`);
      }

      const newInvite = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        group_id: groupId,
        user_id: existing.id
      };

      set({
        profiles: newProfiles,
        mockInvitations: [...(get().mockInvitations || []), newInvite]
      });
      await get().initialize(); // Recalculate invitations
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
      let { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: found.id,
          status: 'pending'
        }]);

      if (error && (
        error.message?.includes('column "status"') || 
        error.message?.includes('status') || 
        error.message?.includes('schema cache')
      )) {
        console.warn('Supabase DB: "status" column does not exist in group_members. Retrying insert without it...');
        const retryResult = await supabase
          .from('group_members')
          .insert([{
            group_id: groupId,
            user_id: found.id
          }]);
        error = retryResult.error;
      }
      
      if (error) {
        if (error.code === '23505') {
          throw new Error(`User "${email}" is already a member of this group or has a pending invitation.`);
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
    splits: ExpenseSplit[],
    receiptUrl?: string,
    items?: ExpenseItem[],
    splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized'
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
            splits,
            receipt_url: receiptUrl !== undefined ? receiptUrl : e.receipt_url,
            items: items !== undefined ? items : e.items,
            splitType: splitType !== undefined ? splitType : e.splitType
          };
        }
        return e;
      });
      set({ expenses: updatedExpenses });
    } else {
      // 1. Update the expenses table with fallback for missing items column
      const updateData: any = {
        title: description,
        amount,
        date,
        paid_by: paidById,
        category,
        receipt_url: receiptUrl !== undefined ? receiptUrl : undefined,
        split_type: splitType !== undefined ? splitType : undefined,
      };

      if (items !== undefined) {
        updateData.items = items;
      }

      let { error: expError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId);

      if (expError && (
        expError.message?.includes('column "items"') || 
        expError.message?.includes('items')
      )) {
        console.warn('Supabase DB: "items" column does not exist. Retrying update without "items" column...');
        delete updateData.items;
        const retryResult = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', expenseId);
        expError = retryResult.error;
      }

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
  },

  updateGroup: async (groupId: string, name: string, description: string) => {
    if (isMockMode) {
      const updatedGroups = get().groups.map(g => {
        if (g.id === groupId) {
          return { ...g, name, description };
        }
        return g;
      });
      set({ groups: updatedGroups });
    } else {
      const { error } = await supabase
        .from('groups')
        .update({ name, description })
        .eq('id', groupId);
      if (error) throw error;
      await get().initialize();
    }
  },

  removeMemberFromGroup: async (groupId: string, memberId: string) => {
    if (isMockMode) {
      const updatedGroups = get().groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            members: g.members.filter(m => m !== memberId)
          };
        }
        return g;
      });
      set({ groups: updatedGroups });
    } else {
      const { error, count } = await supabase
        .from('group_members')
        .delete({ count: 'exact' })
        .eq('group_id', groupId)
        .eq('user_id', memberId);
      if (error) throw error;
      if (count === 0) {
        throw new Error('Failed to remove the member. You might not have permission, or the member is not in the group.');
      }
      await get().initialize();
    }
  },

  acceptInvitation: async (groupId: string) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedMockInvitations = (get().mockInvitations || []).filter(
        inv => !(inv.group_id === groupId && inv.user_id === user.id)
      );
      const updatedGroups = get().groups.map(g => {
        if (g.id === groupId) {
          if (!g.members.includes(user.id)) {
            return { ...g, members: [...g.members, user.id] };
          }
        }
        return g;
      });
      set({ mockInvitations: updatedMockInvitations, groups: updatedGroups });
      await get().initialize();
    } else {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'accepted' })
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;
      await get().initialize();
    }
  },

  declineInvitation: async (groupId: string) => {
    const user = get().currentUser;
    if (!user) return;

    if (isMockMode) {
      const updatedMockInvitations = (get().mockInvitations || []).filter(
        inv => !(inv.group_id === groupId && inv.user_id === user.id)
      );
      set({ mockInvitations: updatedMockInvitations });
      await get().initialize();
    } else {
      const { error, count } = await supabase
        .from('group_members')
        .delete({ count: 'exact' })
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;
      if (count === 0) {
        throw new Error('Failed to decline invitation. You might not have permission, or the invitation has already been actioned.');
      }
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
    mockInvitations: state.mockInvitations,
  }),
}));

