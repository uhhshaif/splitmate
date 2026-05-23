'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LayoutDashboard, Users, Plane, Coins, LogOut, Sparkles, Menu, X, FileText } from 'lucide-react';
import ThemeToggle from './theme-toggle';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, signOutUser } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not logged in, don't show the main navbar
  if (!currentUser) return null;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Expenses', href: '/expenses', icon: FileText },
    { name: 'Trips', href: '/trips', icon: Plane },
    { name: 'Settle Up', href: '/settle', icon: Coins },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-200/50 dark:border-white/5 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-sans text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span>split<span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">mate</span></span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Profile & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/settings" className="flex items-center gap-3 rounded-full bg-zinc-100/50 dark:bg-white/5 pl-3 pr-4 py-1.5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200/50 dark:hover:bg-white/10 transition duration-200">
              <div className="relative flex shrink-0">
                <Avatar className="h-7 w-7 ring-1 ring-zinc-300 dark:ring-white/20">
                  <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
                  <AvatarFallback className="bg-emerald-950 text-xs font-semibold text-emerald-300">
                    {currentUser.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-zinc-950 animate-pulse" />
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{currentUser.display_name}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOutUser()}
              className="text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-white/10 px-2 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-base font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          <div className="border-t border-zinc-200 dark:border-white/10 pt-4 mt-4 flex items-center justify-between px-4">
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition duration-200">
              <div className="relative flex shrink-0">
                <Avatar className="h-8 w-8 ring-1 ring-zinc-300 dark:ring-white/20">
                  <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
                  <AvatarFallback className="bg-emerald-950 text-xs font-semibold text-emerald-300">
                    {currentUser.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-zinc-950 animate-pulse" />
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{currentUser.display_name}</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOutUser();
                }}
                className="text-xs flex items-center gap-2 border-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

