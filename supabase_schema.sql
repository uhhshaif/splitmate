-- ==========================================
-- 1. TABLE DEFINITIONS (NO FORWARD REFERENCES)
-- ==========================================

-- Users table linked to auth.users (replaces profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT, -- Retained for visual UI descriptions
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Group Members join table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT, -- Retained for dashboard details
  start_date DATE, -- Retained for calendar filters
  end_date DATE,
  budget NUMERIC(10, 2) DEFAULT 0.00, -- Retained for trip companion metrics
  itinerary JSONB DEFAULT '[]'::jsonb, -- Retained for timeline schedule injection
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, -- Renamed from description
  amount NUMERIC(10, 2) NOT NULL,
  paid_by UUID REFERENCES users(id) ON DELETE RESTRICT, -- Renamed from paid_by_id
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  split_type TEXT NOT NULL DEFAULT 'equal', -- Added split_type
  receipt_url TEXT,
  items JSONB DEFAULT '[]'::jsonb, -- Added for itemized splits details
  category TEXT NOT NULL DEFAULT 'general', -- Retained for visual categories
  date DATE NOT NULL DEFAULT CURRENT_DATE, -- Retained for timeline logs
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Expense splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Renamed from profile_id
  amount_owed NUMERIC(10, 2) NOT NULL, -- Renamed from amount
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  from_user UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  settled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. DEFINE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Helper function to check group membership (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.check_is_group_member(group_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = check_is_group_member.group_id
      AND group_members.user_id = check_is_group_member.user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Users Policies
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profiles" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to delete their own profiles" ON users
  FOR DELETE USING (auth.uid() = id);

-- Groups Policies
CREATE POLICY "Allow read access to groups the user belongs to" ON groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR
    check_is_group_member(id, auth.uid())
  );

CREATE POLICY "Allow authenticated users to create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow group creator to update group details" ON groups
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Allow creator to delete groups" ON groups
  FOR DELETE USING (created_by = auth.uid());

-- Group Members Policies
CREATE POLICY "Allow group members to view members of their groups" ON group_members
  FOR SELECT USING (
    check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow group members to add others" ON group_members
  FOR INSERT WITH CHECK (
    check_is_group_member(group_id, auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow users to leave groups" ON group_members
  FOR DELETE USING (user_id = auth.uid());

-- Trips Policies
CREATE POLICY "Allow group members to read trips" ON trips
  FOR SELECT USING (
    group_id IS NULL OR check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow members to create trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow group members to update trips" ON trips
  FOR UPDATE USING (
    group_id IS NULL OR check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow group members to delete trips" ON trips
  FOR DELETE USING (
    group_id IS NULL OR check_is_group_member(group_id, auth.uid())
  );

-- Expenses Policies
CREATE POLICY "Allow group members to read group expenses" ON expenses
  FOR SELECT USING (
    check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow group members to create expenses" ON expenses
  FOR INSERT WITH CHECK (
    check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow creator or payer to update expenses" ON expenses
  FOR UPDATE USING (
    created_by = auth.uid()
    OR
    paid_by = auth.uid()
  );

CREATE POLICY "Allow creator or payer to delete expenses" ON expenses
  FOR DELETE USING (
    created_by = auth.uid()
    OR
    paid_by = auth.uid()
  );

-- Expense Splits Policies
CREATE POLICY "Allow group members to read splits" ON expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id AND check_is_group_member(expenses.group_id, auth.uid())
    )
  );

CREATE POLICY "Allow group members to create splits" ON expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id AND check_is_group_member(expenses.group_id, auth.uid())
    )
  );

CREATE POLICY "Allow creator or payer to delete splits" ON expense_splits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_splits.expense_id AND (expenses.created_by = auth.uid() OR expenses.paid_by = auth.uid())
    )
  );

-- Settlements Policies
CREATE POLICY "Allow group members to view settlements" ON settlements
  FOR SELECT USING (
    check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow group members to create settlements" ON settlements
  FOR INSERT WITH CHECK (
    check_is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Allow group members to delete settlements" ON settlements
  FOR DELETE USING (
    check_is_group_member(group_id, auth.uid())
  );

-- ==========================================
-- 4. SIGNUP TRIGGER DEFINITION
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger linked to Supabase auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. MIGRATION: ADD PAYMENT COLUMNS TO USERS
-- ==========================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duitnow_type TEXT DEFAULT 'phone';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duitnow_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tng_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mae_account TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS venmo_handle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'RM';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_code_label TEXT DEFAULT 'DuitNow';

-- ==========================================
-- 6. MIGRATION: ADD GROUP INVITATION SUPPORT
-- ==========================================
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted';

-- Add UPDATE policy to allow invited users to accept invitations
CREATE POLICY "Allow users to update their own membership status" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- 7. MIGRATION: UPDATE RLS POLICIES & ENABLE REALTIME
-- ==========================================

-- Allow users to select their own membership row (fixes select visibility checks during delete)
DROP POLICY IF EXISTS "Allow users to view their own membership" ON public.group_members;
CREATE POLICY "Allow users to view their own membership" ON public.group_members
  FOR SELECT USING (user_id = auth.uid());

-- Ensure the delete policy exists and allows users to leave groups
DROP POLICY IF EXISTS "Allow users to leave groups" ON public.group_members;
CREATE POLICY "Allow users to leave groups" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

-- Allow group creators to remove members from their groups
DROP POLICY IF EXISTS "Allow group creators to remove members" ON public.group_members;
CREATE POLICY "Allow group creators to remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id AND groups.created_by = auth.uid()
    )
  );

-- Enable Supabase Realtime for main tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;

-- ==========================================
-- 8. MIGRATION: ALLOW MEMBERS TO UPDATE SETTLEMENTS
-- ==========================================
DROP POLICY IF EXISTS "Allow group members to update settlements" ON public.settlements;
CREATE POLICY "Allow group members to update settlements" ON public.settlements
  FOR UPDATE USING (
    check_is_group_member(group_id, auth.uid())
  );

