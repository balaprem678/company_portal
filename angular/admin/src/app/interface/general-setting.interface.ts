interface Settings {
    site_title: string;
    site_url: string;
    site_address: string;
    email_address: string;
    time_zone: string;
    date_format: string;
    time_format: string;
    logo: string;
    light_logo: string;
    admin_profile: string;
    favicon: string;
    web_google_map_key: string;
    currency_code: string;
    currency_symbol: string;
    free_trail_days: string;
    subscription: string;
}

export interface generalSettings {
    _id: string;
    alias: string;
    settings: Settings;
    updatedAt: Date;
}