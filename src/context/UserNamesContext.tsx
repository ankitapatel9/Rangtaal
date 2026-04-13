import React, { createContext, useContext, useMemo } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useAuth } from "../hooks/useAuth";
import { useUser } from "../hooks/useUser";

interface UserNamesContextValue {
  userNameMap: Record<string, string>;
}

const UserNamesContext = createContext<UserNamesContextValue>({ userNameMap: {} });

export function UserNamesProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { users } = useAllUsers();

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (authUser?.uid && userDoc?.name) map[authUser.uid] = userDoc.name;
    users.forEach((u) => { map[u.uid] = u.name; });
    return map;
  }, [users, authUser?.uid, userDoc?.name]);

  return (
    <UserNamesContext.Provider value={{ userNameMap }}>
      {children}
    </UserNamesContext.Provider>
  );
}

export function useUserNames(): Record<string, string> {
  return useContext(UserNamesContext).userNameMap;
}
