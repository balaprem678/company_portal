interface Settings {
    mode: string;
    smtp_host: string;
    smtp_password: string;
    smtp_port: string
    smtp_username: string
}

export interface smtpSettings {
    _id: string;
    alias: string;
    settings: Settings;
    updatedAt: Date;
}