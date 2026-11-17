'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

/** true, если в ID-токене есть claim owner === true. Только для UI; реальный доступ проверяет сервер/Rules. */
export function useOwner(): boolean {
  const { user } = useAuth();
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!user) {
      setOwner(false);
      return;
    }
    user
      .getIdTokenResult()
      .then((r) => alive && setOwner(r.claims.owner === true))
      .catch(() => alive && setOwner(false));
    return () => {
      alive = false;
    };
  }, [user]);
  return owner;
}
