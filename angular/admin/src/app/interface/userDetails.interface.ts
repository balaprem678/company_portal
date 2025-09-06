interface Phone {
    code: string;
    number: string;
}

interface Activity {
    last_login: Date;
    last_logout: Date;
}

interface UserDetails {
    last_name: string;
    email: string;
    username: string;
    phone: Phone;
    avatar: string;
    activity: Activity;
    status: number;
    current_points: number,
    createdAt: Date;
    updatedAt: Date;
    address:{
        fulladres:string;
    }
    appliedreferoffer: [],
    card_details:[],
    favourite: [],
    mark_status: number,
    next_points: number,
    reached_points: number,
    refer_activity: [],
    role: string,
    start_time: number,
    unique_code: string,
    user_type: string,
    verification: {},
    verify_otp: string
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