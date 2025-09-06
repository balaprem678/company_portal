
interface Settings {
    bucket_name: string;
    region: string;
    access_key: string;
    secret_key: string;
    base_url: string;
}

export interface s3RootSettings {
    _id: string;
    alias: string;
    createdAt: Date;
    settings: Settings;
    updatedAt: Date;
}