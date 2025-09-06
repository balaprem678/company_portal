interface Settings {
    twilio: Twilio,
    firebase: Firebase
}

export interface Twilio {
    apikey: string,
    sender: string,
    mode: string
}

interface Firebase {
    mode: string
}

export interface smsSettings {
    twilio: Twilio,
}