import { useContext } from "react";
import NotificationContext, { NotificationContextValue } from "../contexts/NotificationContext";

export const useNotifications = (): NotificationContextValue => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error("useNotifications must be used inside <NotificationProvider>");
    }

    return context;
};

export default useNotifications;
