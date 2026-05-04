import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import type { AuthUser } from "@workspace/api-client-react";
import {
  loadPermissions,
  savePermissions,
  type AllPerms,
  type Module,
  type Action,
} from "./permissions";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  permissions: AllPerms;
  setPermissions: (p: AllPerms) => void;
  can: (module: Module, action?: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const [permissions, setPermissionsState] = useState<AllPerms>(() => loadPermissions());

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  async function login(username: string, password: string) {
    await loginMutation.mutateAsync({ data: { username, password } });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }

  async function logout() {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    await queryClient.invalidateQueries();
  }

  function setPermissions(p: AllPerms) {
    savePermissions(p);
    setPermissionsState(p);
  }

  const resolvedUser = error ? null : (user ?? null);

  const can = useCallback(
    (module: Module, action: Action = "view"): boolean => {
      if (!resolvedUser) return false;
      return permissions[resolvedUser.role]?.[module]?.[action] ?? false;
    },
    [resolvedUser, permissions]
  );

  return (
    <AuthContext.Provider
      value={{ user: resolvedUser, isLoading, login, logout, permissions, setPermissions, can }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
