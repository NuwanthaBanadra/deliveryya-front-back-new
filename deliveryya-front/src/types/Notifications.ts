import type { CommonIdName } from "./EntitiesTypes";

export type IncomingNotification = {
    title: string;
    message: string;
    toUser: CommonIdName;
    notifyTo: number[] | null;

}

export type NotificationTypes = "MESSAGE" | "CONFIG" | "PROMOTION" | "CONFIG" | "REQ_LOCATION" | "RES_LOCATION";
