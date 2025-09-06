import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { settings } from '../interface/interface';
import { s3RootSettings } from '../interface/s3-bucket-setting.interface';

@Injectable({ providedIn: 'root' })
export class 
DefaultStoreService {

    public generalSettings: BehaviorSubject<settings>;
    public s3BucketSettings: BehaviorSubject<s3RootSettings>;
    public categoryList: BehaviorSubject<any>;
    public brandsList: BehaviorSubject<any>;
    public cityList: BehaviorSubject<any>;

    
    constructor() {
        this.generalSettings = new BehaviorSubject<settings>(null);
        this.s3BucketSettings = new BehaviorSubject<s3RootSettings>(null);
        this.categoryList = new BehaviorSubject<s3RootSettings>(null);
        this.brandsList = new BehaviorSubject<s3RootSettings>(null);
        this.cityList=new BehaviorSubject<s3RootSettings>(null);
    }
}