import { useCallback, useEffect, useMemo, useState } from "react";
import api, {
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
    function handleUnauthorized() {
      setUser(null);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      return undefined;
    }

    let active = true;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) {
          setUser(data);
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ email, senha }) => {
    const { data } = await api.post("/auth/login", { email, senha });
    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);

    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      return response.data;
    } catch (error) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      throw error;
    }
  }, []);

  const register = useCallback(async ({ nome, email, senha }) => {
    await api.post("/auth/register", { nome, email, senha });
    return login({ email, senha });
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
