interface FcmKeys {
    ad_user: string;
    ios_user: string;
}

interface Settings {
    fcm_keys: FcmKeys;
}

export interface socialNetworkSetting {
    _id: string;
    alias: string;
    createdAt: Date;
    settings: Settings;
    updatedAt: Date;
}