'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export type UserPlan = 'free' | 'premium';

type UserPlanContextType = {
  plan: UserPlan;
  setPlan: (plan: UserPlan) => void;
  reportQuota: number;
  remainingQuota: number;
  decrementQuota: () => boolean;
  resetQuota: () => void;
  showUpsellModal: boolean;
  openUpsellModal: () => void;
  closeUpsellModal: () => void;
};

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

const DEFAULT_FREE_QUOTA = 5;

export function UserPlanProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<UserPlan>('free');
  const [remainingQuota, setRemainingQuota] = useState<number>(DEFAULT_FREE_QUOTA);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // Sync plan with Clerk metadata (source of truth)
  useEffect(() => {
    if (isLoaded && user) {
      const clerkPlan = user.publicMetadata?.plan;
      if (clerkPlan === 'pro' || clerkPlan === 'premium') {
        setPlan('premium');
        setRemainingQuota(Infinity);
      } else {
        setPlan('free');
        // Load remaining quota from localStorage for free users
        const storedQuota = localStorage.getItem('remainingQuota');
        if (storedQuota) {
          const parsed = parseInt(storedQuota, 10);
          if (Number.isFinite(parsed) && parsed >= 0) {
            setRemainingQuota(parsed);
          }
        }
      }
    }
  }, [isLoaded, user]);

  // Persist remainingQuota to localStorage (for free users only)
  useEffect(() => {
    if (plan === 'free') {
      localStorage.setItem('remainingQuota', remainingQuota.toString());
    }
  }, [remainingQuota, plan]);

  /**
   * Defensive function wrapper: decrementQuota()
   *
   * Attempts to consume one report quota. If remainingQuota <= 0 for free users,
   * blocks execution and opens upsell payment modal.
   *
   * @returns true if quota was successfully decremented, false if blocked
   */
  const decrementQuota = useCallback((): boolean => {
    // Premium users have unlimited quota
    if (plan === 'premium') {
      return true;
    }

    // Free users: check quota before allowing action
    if (remainingQuota <= 0) {
      // Block execution and open upsell modal
      setShowUpsellModal(true);
      return false;
    }

    // Decrement quota and allow action
    setRemainingQuota((prev) => Math.max(0, prev - 1));
    return true;
  }, [plan, remainingQuota]);

  /**
   * Reset quota to default (for testing and quota cycle resets)
   */
  const resetQuota = useCallback(() => {
    if (plan === 'free') {
      setRemainingQuota(DEFAULT_FREE_QUOTA);
    } else {
      setRemainingQuota(Infinity);
    }
  }, [plan]);

  /**
   * Modal control functions
   */
  const openUpsellModal = useCallback(() => {
    setShowUpsellModal(true);
  }, []);

  const closeUpsellModal = useCallback(() => {
    setShowUpsellModal(false);
  }, []);

  return (
    <UserPlanContext.Provider
      value={{
        plan,
        setPlan,
        reportQuota: DEFAULT_FREE_QUOTA,
        remainingQuota,
        decrementQuota,
        resetQuota,
        showUpsellModal,
        openUpsellModal,
        closeUpsellModal,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

export function useUserPlan() {
  const context = useContext(UserPlanContext);
  if (!context) {
    throw new Error('useUserPlan must be used within UserPlanProvider');
  }
  return context;
}
