/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import XPToast from '../components/ui/XPToast';

const GamificationContext = createContext();

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};

export const GamificationProvider = ({ children }) => {
  // Load initial state from localStorage if available
  const [xp, setXp] = useState(() => {
    const saved = localStorage.getItem('cf_gamification_xp');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('cf_gamification_level');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [xpToNextLevel, setXpToNextLevel] = useState(() => {
    const saved = localStorage.getItem('cf_gamification_xpToNextLevel');
    return saved ? parseInt(saved, 10) : 1000;
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('cf_gamification_xp', xp.toString());
    localStorage.setItem('cf_gamification_level', level.toString());
    localStorage.setItem('cf_gamification_xpToNextLevel', xpToNextLevel.toString());
  }, [xp, level, xpToNextLevel]);

  const addXP = (amount, silent = false) => {
    setXp((prevXp) => {
      let newXp = prevXp + amount;
      let currentXpToNext = xpToNextLevel;
      let newLevel = level;
      let levelUp = false;
      let levelDown = false;

      if (amount > 0) {
        while (newXp >= currentXpToNext) {
          newXp -= currentXpToNext;
          newLevel += 1;
          currentXpToNext = Math.floor(currentXpToNext * 1.5);
          levelUp = true;
        }
      } else if (amount < 0) {
        while (newXp < 0 && newLevel > 1) {
          newLevel -= 1;
          currentXpToNext = Math.ceil(currentXpToNext / 1.5);
          newXp += currentXpToNext;
          levelDown = true;
        }
        if (newLevel === 1 && newXp < 0) {
          newXp = 0;
        }
      }

      if (levelUp || levelDown) {
        setLevel(newLevel);
        setXpToNextLevel(currentXpToNext);
        
        if (!silent) {
          if (levelUp) {
            // Trigger Level Up Toast
            toast.custom((t) => (
              <XPToast id={t} amount={amount} isLevelUp={true} newLevel={newLevel} />
            ), { duration: 4000 });
          } else if (levelDown) {
            // Toast normal para pérdida de XP que causa level down
            toast.custom((t) => (
              <XPToast id={t} amount={amount} isLevelUp={false} />
            ), { duration: 3000 });
          }
        }
      } else if (!silent) {
        // Trigger normal XP Toast
        toast.custom((t) => (
          <XPToast id={t} amount={amount} isLevelUp={false} />
        ), { duration: 3000 });
      }

      return newXp;
    });
  };

  return (
    <GamificationContext.Provider value={{ xp, level, xpToNextLevel, addXP }}>
      {children}
    </GamificationContext.Provider>
  );
};
