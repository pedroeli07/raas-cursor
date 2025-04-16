"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

// Define user roles
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ADMIN_STAFF = 'ADMIN_STAFF',
  CUSTOMER = 'CUSTOMER',
  ENERGY_RENTER = 'ENERGY_RENTER',
  USER = 'USER'
}

// User type
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  image?: string | null;
}

// Auth hook that provides user information and authentication status
export function useAuth() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (session?.user) {
      // Convert session user to our User type
      setUser({
        id: session.user.id || '',
        name: session.user.name,
        email: session.user.email,
        role: (session.user.role as Role) || Role.USER,
        image: session.user.image,
      });
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [session, status]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN,
    isStaff: user?.role === Role.ADMIN_STAFF,
    isCustomer: user?.role === Role.CUSTOMER,
    isRenter: user?.role === Role.ENERGY_RENTER,
  };
} 