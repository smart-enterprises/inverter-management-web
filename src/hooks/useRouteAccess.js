// useRouteAccess.js Code
import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { isRouteAllowed } from "../routes/routePermissions";

export const useRouteAccess = () => {
    const { user } = useAuth();

    const canAccess = useMemo(() => {
        return (pathnameOrPattern) => {
            if (!user?.role) return false;
            return isRouteAllowed(user.role, pathnameOrPattern);
        };
    }, [user?.role]);

    return { canAccess, role: user?.role ?? null };
};