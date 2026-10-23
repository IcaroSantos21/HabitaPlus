import { useCallback, useEffect, useMemo, useState } from "react";
import authService from "../services/authService";
import {
  AUTH_TOKEN_KEY,
  AUTH_UNAUTHORIZED_EVENT,
} from "../services/api";
import AuthContext from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() =>
    Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      return () => {
        window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      };
    }

    let active = true;

    authService
      .me()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);

    try {
      const currentUser = await authService.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(
    async ({ nome, email, senha }) => {
      await authService.register({ nome, email, senha });
      return login({ email, senha });
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
