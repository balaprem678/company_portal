import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { settings } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { filter, map } from 'rxjs/operators';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { CookieService } from 'ngx-cookie-service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'site';
  private crypto: Crypto = window.crypto || (<any>window).msCrypto;

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private apiService: ApiService,
    private titleService: Title,
    private store: DefaultStoreService,
    private notifyService: NotificationService,
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private meta: Meta,
    private activatedRoute: ActivatedRoute,
    private socketService: WebsocketService,
    private cookiesservice: CookieService,
  ) {

    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      if (result && Array.isArray(result.response)) {
        var settigns = result.response.filter(e => Object.keys(e).includes('Settings'))
        if (settigns && settigns.length > 0) {
          var general = settigns[0].Settings && settigns[0].Settings.settings;
          this.store.generalSettings.next(general);
          this.apiService.setAppFavicon(general.favicon);
          this.titleService.setTitle(general.site_title);
          this.meta.updateTag({ name: 'og:title', content: general.site_title });
        }
      }
    });

    this.apiService.CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {}).subscribe(result => {

      if (result && result.err == 0) {
        this.store.adminSettings.next(result.settings)
      }
    })

    // this.apiService.CommonApi(Apiconfig.allSearchData.method, Apiconfig.allSearchData.url, {}).subscribe(result => {
    //   if (result && result.status == 1) {
    //     this.store.searchData.next(result.sear_product)
    //   }
    // })

    this.apiService.CommonApi(Apiconfig.mainData.method, Apiconfig.mainData.url, {}).subscribe(result => {
      if (result && result.response) {
        var arrayData = result.response;
        const singleObject = arrayData.reduce((acc, obj) => {
          return { ...acc, ...obj };
        }, {});
        this.store.mainData.next(singleObject)
      }
    })

    // this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url,{}).subscribe(result=>{
    //   if(result && result.status == 1){
    //     this.store.categoryList.next(result.categoryList)
    //   }
    // })

    // this.apiService.CommonApi(Apiconfig.getExpensiveProd.method, Apiconfig.getExpensiveProd.url, {}).subscribe(res => {
    //   if (res && res.status == 1) {
    //     this.store.expensiveProduct.next(res.product_detail)
    //   }
    // })

    this.apiService.CommonApi(Apiconfig.fCategory.method, Apiconfig.fCategory.url, {}).subscribe(result => {
      if (result && result.status == 1) {
        this.store.fcategory.next(result.list);
      }
    })
    // this.socketService.emit('r2e_widgets_settings_details', {});


    // var cookieValue = JSON.parse(sessionStorage.getItem('searchLocation'));
    // if (!cookieValue) {
    //   navigator.geolocation.getCurrentPosition((pos) => {
    //     if (pos) {
    //       var lat = pos.coords.latitude;
    //       var long = pos.coords.longitude;
    //       this.socketService.socketCall('r2e_get_location', { lat: lat, lon: long }).subscribe(response => {
    //         if (response && response.err == 0) {
    //           var searchObj = {
    //             cityname: response.result.address.city,
    //             cityid: response.result.cityid,
    //             name: response.result.address.formattedAddress,
    //             loader: false,
    //             permission: 'ALLOWED',
    //             lat: lat,
    //             long: long
    //           };
    //           sessionStorage.setItem('searchLocation', JSON.stringify(searchObj))
    //         }
    //       })
    //     }
    //   })
    // }
    var apikey = sessionStorage.getItem('serverKey');
    var user_key = localStorage.getItem('user_key');
    if (!apikey) {
      var randomkey = uuidv4();
      sessionStorage.setItem('serverKey', randomkey);
    }
    if (!user_key) {
      var random_userkey = uuidv4();
      localStorage.setItem('user_key', random_userkey)
    }
  }
  ngOnInit(): void {

    // console.log("site url", this.router.url)


  }


}
