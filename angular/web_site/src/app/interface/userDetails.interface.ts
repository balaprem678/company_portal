interface Phone {
    code: string;
    number: string;
}

interface Activity {
    last_login: Date;
    last_logout: Date;
}

interface UserDetails {
    name: string;
    email: string;
    username: string;
    phone: Phone;
    about: string;
    avatar: string;
    cover_image: string;
    intrested: string;
    languages: string;
    activity: Activity;
    status: number;
    createdAt: Date;
    updatedAt: Date;
    address:{
        fulladres:string;
    }
}

interface FromPhone {
    code: string;
    number: string;
}

interface ToPhone {
    code: string;
    number: string;
}

interface BlockDetail {
    _id: string;
    from: string;
    to: string;
    from_username: string;
    from_email: string;
    from_avatar: string;
    from_phone: FromPhone;
    to_username: string;
    to_email: string;
    to_avatar: string;
    to_phone: ToPhone;
    createdAt: Date;
    updatedAt: Date;
}

interface FromPhone2 {
    code: string;
    number: string;
}

interface ToPhone2 {
    code: string;
    number: string;
}

interface FollowingDetail {
    _id: string;
    from: string;
    to: string;
    from_username: string;
    from_email: string;
    from_avatar: string;
    from_phone: FromPhone2;
    to_username: string;
    to_email: string;
    to_avatar: string;
    to_phone: ToPhone2;
    createdAt: Date;
    updatedAt: Date;
}

export interface RootUserDetails {
    userDetails: UserDetails;
    blockDetails: BlockDetail[];
    blockCount: number;
    followingDetails: FollowingDetail[];
    followingCount: number;
    followerDetails: FollowingDetail[];
    followerCount: number;
}