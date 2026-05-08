'use client';

/**
 * C09 admin shell user menu — W12 D4 F4.2 rebuild with shadcn DropdownMenu.
 *
 * Avatar trigger (initials fallback) → dropdown with username + mock badge +
 * sign-out action. Wraps existing useAuthStore + useCurrentUser hooks.
 */

import { LogOut } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, useCurrentUser } from '@/lib/providers/auth-provider';

function getInitials(username: string): string {
  const localPart = username.split('@')[0] || username;
  const tokens = localPart.split(/[._-]/).filter(Boolean);
  return tokens
    .map((t) => t[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function UserMenu() {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <div className="text-xs text-muted-foreground">Signing in…</div>
    );
  }

  const initials = getInitials(user.preferredUsername);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-medium">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">
              {user.preferredUsername}
            </span>
            {user.isMock ? (
              <span className="text-xs text-muted-foreground">[mock]</span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
