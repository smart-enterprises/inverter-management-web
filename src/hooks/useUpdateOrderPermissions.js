import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { UPDATE_ORDER_PERMISSIONS } from "../utils/updateOrderPermissions";

export const useUpdateOrderPermissions = () => {
    const { user } = useAuth();

    return useMemo(() => {
        if (!user?.role) return {};

        return UPDATE_ORDER_PERMISSIONS[user.role] || {};
    }, [user]);
};