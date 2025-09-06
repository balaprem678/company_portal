import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { settings } from "../interface/interface";

@Injectable({providedIn:'root'})

@Injectable({
  providedIn: 'root'
})
export class DefaultStoreService {
  public categoryList:BehaviorSubject<any>;
  public generalSettings:BehaviorSubject<any>;
  public adminSettings:BehaviorSubject<any>;
  public mainData:BehaviorSubject<any>;
  public searchData:BehaviorSubject<any>;
  public serverKey:BehaviorSubject<any>;
  public fcategory:BehaviorSubject<any>;
  public categoryDetail:BehaviorSubject<any>;
  public expensiveProduct:BehaviorSubject<any>;
  public cartdetails:BehaviorSubject<any>;
  public productDetailsSource = new BehaviorSubject<any>(null);
  productDetails$ = this.productDetailsSource.asObservable();
  constructor() { 
    this.categoryList = new BehaviorSubject<any>([]);
    this.generalSettings = new BehaviorSubject<any>({});
    this.adminSettings = new BehaviorSubject<any>({});
    this.mainData = new BehaviorSubject<any>({});
    this.searchData = new BehaviorSubject<any>([]);
    this.serverKey = new BehaviorSubject<any>({});
    this.fcategory = new BehaviorSubject<any>([]);
    this.categoryDetail = new BehaviorSubject<any>([]);
    this.expensiveProduct = new BehaviorSubject<any>({});
    this.cartdetails = new BehaviorSubject<any>({});
  }

  setProductDetails(details: any) {
    this.productDetailsSource.next(details);
  }
}
