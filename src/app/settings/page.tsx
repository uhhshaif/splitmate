'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isMockMode, supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Sliders, 
  Trash2, 
  Lock, 
  Phone, 
  Sun, 
  Moon, 
  Wallet,
  Coins,
  Loader2,
  Plus
} from 'lucide-react';
import Link from 'next/link';

const PRESET_AVATARS = [
  { name: 'Teal Minimalist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' },
  { name: 'Warm Minimalist', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
  { name: 'Cool Slate', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
  { name: 'Forest Green', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
  { name: 'Dusk Bronze', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
  { name: 'Ocean Mist', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face' }
];

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, updateProfile, isLoading } = useStore();

  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Payment State
  const [duitnowType, setDuitnowType] = useState('phone');
  const [duitnowId, setDuitnowId] = useState('');
  const [tngPhone, setTngPhone] = useState('');
  const [maeAccount, setMaeAccount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');

  // Preferences State
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [defaultCurrency, setDefaultCurrency] = useState('RM');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Password Change, Photo Upload, & Account Deletion State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      setDisplayName(currentUser.display_name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || '');
      setAvatarUrl(currentUser.avatar_url);
      
      setDuitnowType(currentUser.duitnow_type || 'phone');
      setDuitnowId(currentUser.duitnow_id || '');
      setTngPhone(currentUser.tng_phone || '');
      setMaeAccount(currentUser.mae_account || '');
      setPaypalEmail(currentUser.paypal_email || '');
      setVenmoHandle(currentUser.venmo_handle || '');
      
      setDefaultCurrency(currentUser.default_currency || 'RM');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    // Theme sync
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setThemeMode(isDark ? 'dark' : 'light');
    }
  }, []);

  if (isLoading || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleThemeChange = (mode: 'light' | 'dark') => {
    if (mode === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setThemeMode('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setThemeMode('dark');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoMsg(null);

    if (!displayName.trim()) {
      setErrorMsg('Display name is required');
      return;
    }

    if (!email.trim()) {
      setErrorMsg('Email address is required');
      return;
    }

    setIsSaving(true);
    try {
      // Trigger profile update
      await updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        duitnow_type: duitnowType,
        duitnow_id: duitnowId.trim(),
        tng_phone: tngPhone.trim(),
        mae_account: maeAccount.trim(),
        paypal_email: paypalEmail.trim().toLowerCase(),
        venmo_handle: venmoHandle.trim(),
        default_currency: defaultCurrency
      });

      // Handle Supabase email confirmation text
      if (!isMockMode && email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
        setInfoMsg('Profile updated! A confirmation link has been sent to your new email. Please verify to finish.');
      } else {
        setSuccessMsg('Settings updated successfully!');
      }

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isMockMode) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAvatarUrl(event.target.result as string);
            setSuccessMsg('Profile picture loaded locally!');
          }
        };
        reader.readAsDataURL(file);
      } else {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw new Error('Supabase Storage: ' + uploadError.message + '. Please ensure the "avatars" bucket is created and set to public in Supabase Storage.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setAvatarUrl(publicUrl);
        setSuccessMsg('Avatar uploaded successfully! Save changes to apply.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword.length < 6) {
      setPasswordErrorMsg('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (isMockMode) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      setPasswordSuccessMsg('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setPasswordErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = isMockMode
      ? 'Are you sure you want to permanently delete your offline user profile?'
      : 'Are you sure you want to delete your account? This will permanently delete your profile, group memberships, and sign you out.';
    
    if (!confirm(confirmMessage)) return;

    setIsDeletingAccount(true);
    try {
      if (isMockMode) {
        localStorage.removeItem('splitmate_user');
        localStorage.removeItem('splitmate_profiles');
        localStorage.removeItem('splitmate_groups');
        localStorage.removeItem('splitmate_expenses');
        localStorage.removeItem('splitmate_trips');
        window.location.href = '/login';
      } else {
        const { error } = await supabase.from('users').delete().eq('id', currentUser.id);
        if (error) throw error;
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete account. Try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to clear all offline Splitmate data? This will restore original defaults and log you out.')) {
      localStorage.removeItem('splitmate_user');
      localStorage.removeItem('splitmate_profiles');
      localStorage.removeItem('splitmate_groups');
      localStorage.removeItem('splitmate_expenses');
      localStorage.removeItem('splitmate_trips');
      window.location.href = '/login';
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition duration-200">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage your personal details, payment handles, and application preferences.
        </p>
      </div>

      {/* Status Banners */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fadeIn">
          <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <span>{infoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-1 w-full justify-start grid grid-cols-4 sm:flex sm:w-auto h-auto rounded-xl">
            <TabsTrigger 
              value="profile" 
              className="text-xs font-bold py-2 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition"
            >
              <User className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Account
            </TabsTrigger>
            <TabsTrigger 
              value="payment" 
              className="text-xs font-bold py-2 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Payments
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="text-xs font-bold py-2 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Preferences
            </TabsTrigger>
            <TabsTrigger 
              value="danger" 
              className="text-xs font-bold py-2 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500 data-[state=active]:text-rose-400 transition"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Profile Details */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-emerald-500" />
                  Profile Details
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Update your avatar image and personal info.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Custom Avatar Selector (Grid) */}
                <div className="space-y-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Choose Profile Avatar</Label>
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-emerald-500/25 shrink-0">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-emerald-950 text-base font-bold text-emerald-300">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-wrap gap-2 items-center max-w-sm">
                      {PRESET_AVATARS.map((preset) => {
                        const isSelected = avatarUrl === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setAvatarUrl(preset.url)}
                            className={`relative h-10 w-10 rounded-full overflow-hidden border-2 transition duration-200 hover:scale-105 ${
                              isSelected 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                          </button>
                        );
                      })}

                      <Label
                        htmlFor="avatar-file-upload"
                        className="relative flex h-10 w-10 rounded-full items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950 transition duration-200 shrink-0"
                        title="Upload profile photo"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                        )}
                        <input
                          id="avatar-file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileUpload}
                          disabled={isUploading}
                        />
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="customAvatarUrl" className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Or Paste Custom Avatar Image URL</Label>
                    <Input
                      id="customAvatarUrl"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/your-image.jpg"
                      className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Shaif Ahmad"
                      className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Email Address</Label>
                      {!isMockMode && (
                        <span className="flex items-center text-[10px] text-zinc-400 gap-0.5">
                          <Lock className="h-2.5 w-2.5" /> Requires verification
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-foreground focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +60123456789"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-foreground focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="h-4.5 w-4.5 text-emerald-500" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Update your account login security credentials.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordSuccessMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}
                {passwordErrorMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Payment Details */}
          <TabsContent value="payment" className="space-y-6">
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4.5 w-4.5 text-emerald-500" />
                  Settlement & Payment Preferences
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Configure your payment handles. These will be shown to group members when they settle debts with you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* DuitNow config */}
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-6 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-pink-600 font-black text-[9px] text-white">DN</span>
                    DuitNow Preferences
                  </h3>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="duitnowType" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">DuitNow ID Type</Label>
                      <Select 
                        value={duitnowType} 
                        onValueChange={(val) => setDuitnowType(val || 'phone')}
                      >
                        <SelectTrigger className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500">
                          <SelectValue placeholder="Select ID Type" />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground">
                          <SelectItem value="phone">Mobile Phone Number</SelectItem>
                          <SelectItem value="nric">NRIC / IC Number</SelectItem>
                          <SelectItem value="passport">Passport Number</SelectItem>
                          <SelectItem value="business">Business Registration Number</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="duitnowId" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">DuitNow ID / Handle</Label>
                      <Input
                        id="duitnowId"
                        value={duitnowId}
                        onChange={(e) => setDuitnowId(e.target.value)}
                        placeholder={duitnowType === 'phone' ? 'e.g. +6012-3456789' : 'e.g. 960101-14-1234'}
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* E-Wallets and Global Payment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    E-Wallets & Alternative Systems
                  </h3>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* MAE */}
                    <div className="space-y-1.5">
                      <Label htmlFor="maeAccount" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">MAE (Maybank) Account Number</Label>
                      <Input
                        id="maeAccount"
                        value={maeAccount}
                        onChange={(e) => setMaeAccount(e.target.value)}
                        placeholder="e.g. 164012345678"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      />
                    </div>

                    {/* Touch n Go */}
                    <div className="space-y-1.5">
                      <Label htmlFor="tngPhone" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Touch 'n Go Phone Number</Label>
                      <Input
                        id="tngPhone"
                        value={tngPhone}
                        onChange={(e) => setTngPhone(e.target.value)}
                        placeholder="e.g. +6012-3456789"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      />
                    </div>

                    {/* PayPal */}
                    <div className="space-y-1.5">
                      <Label htmlFor="paypalEmail" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">PayPal Email Address</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="e.g. your-paypal@domain.com"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      />
                    </div>

                    {/* Venmo */}
                    <div className="space-y-1.5">
                      <Label htmlFor="venmoHandle" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Venmo Username</Label>
                      <Input
                        id="venmoHandle"
                        value={venmoHandle}
                        onChange={(e) => setVenmoHandle(e.target.value)}
                        placeholder="e.g. @your-handle"
                        className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: App Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-emerald-500" />
                  App Settings
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Customize how Splitmate looks and behaves for you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Theme Selector */}
                <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Color Theme Preference</Label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition ${
                        themeMode === 'light'
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Sun className="h-4.5 w-4.5 text-amber-500" />
                      Light Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition ${
                        themeMode === 'dark'
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Moon className="h-4.5 w-4.5 text-emerald-500" />
                      Dark Mode
                    </button>
                  </div>
                </div>

                {/* Default Currency */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Default Currency</Label>
                  <div className="max-w-xs">
                    <Select 
                      value={defaultCurrency} 
                      onValueChange={(val) => setDefaultCurrency(val || 'RM')}
                    >
                      <SelectTrigger className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground focus:border-emerald-500">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground">
                        <SelectItem value="RM">MYR (RM)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="SGD">SGD (S$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Your preferred currency symbol for viewing transactions and summaries.
                  </p>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Danger Zone */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-rose-500/20 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-rose-500/5 border-b border-rose-500/10 px-6 py-4">
                <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Trash2 className="h-4.5 w-4.5" />
                  Danger Zone
                </CardTitle>
                <p className="text-xs text-rose-500/80 mt-1">Irreversible administrative actions on your user account.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                
                {/* Reset Data Option (only for Mock Mode) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Reset Offline Local Storage</p>
                    <p className="text-[11px] text-zinc-500">
                      Clears all mock expenses, groups, and itineraries from this browser's offline storage.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetData}
                    className="border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold shrink-0 self-start sm:self-center"
                  >
                    Clear Database Cache
                  </Button>
                </div>

                {/* Account Deletion */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Permanently Delete Account</p>
                    <p className="text-[11px] text-zinc-500">
                      Delete your user profile, leave all groups, and permanently remove your data from Splitmate.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 self-start sm:self-center text-xs px-4 py-2 rounded-lg"
                  >
                    {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                  </Button>
                </div>

                {/* DB sync notice */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      {isMockMode ? 'Offline Sandbox Mode' : 'Production Sync'}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {isMockMode 
                        ? 'You are running in sandbox local mode. All settings data is encrypted and saved locally in your current browser instance.' 
                        : 'Your settings are fully synced with the live Supabase authentication portal and database.'
                      }
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Footer Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-8">
          <Link href="/dashboard">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving || !displayName.trim() || !email.trim()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-bold shadow-sm px-6 rounded-xl flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving Settings...
              </>
            ) : (
              'Save All Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
