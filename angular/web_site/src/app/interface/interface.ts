export interface settings {
    site_title: string;
    site_url: string;
    site_address: string;
    email_address: string;
    time_zone: string;
    date_format: string;
    time_format: string;
    logo: string;
    light_logo: string;
    admin_profile?: string;
    favicon: string;
    web_google_map_key: string;
    currency_code: string;
    currency_symbol: string;
}

export interface interest {
    image: string,
    name: string,
    _id: string
};

export interface apis {
    url: string,
    method: string
};

export interface language {
    image : string,
    code: string,
    name: string,
    _id: string
};