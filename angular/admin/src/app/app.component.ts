import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenticationService } from './_services/authentication.service';
import { NotificationService } from './_services/notification.service';
import { DeviceDetectorService } from 'ngx-device-detector';
import * as Bowser from "bowser";



@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  title = '';
  deviceInfo: any;
  constructor(
    private router: Router,
    private metaTagService: Meta,
    private notifyService: NotificationService,
    private authService: AuthenticationService,
    private deviceService: DeviceDetectorService,
  ) {
    this.metaTagService.addTags([
      { name: 'keywords', content: 'Social Media, Online Debate, Angular' },
      { name: 'author', content: ' Technology' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { charset: 'UTF-8' }
    ]);

    // window.onbeforeunload = function (e) {
    //   window.localStorage.unloadTime = JSON.stringify(new Date());
    // };
    // window.onload = () => {
    //   let loadTime = new Date();
    //   let unloadTime = new Date(JSON.parse(window.localStorage.unloadTime));
    //   let refreshTime = loadTime.getTime() - unloadTime.getTime();
    //   if (refreshTime > 10000)//10000 milliseconds
    //   {
    //     window.localStorage.removeItem("currentAdmin");
    //     this.notifyService.showWarning('Your session has expired! \n You will be automatically redirected after 5 seconds...', true);
    //     setTimeout(() => {
    //       this.authService.logout();
    //       this.router.navigate(['/auth']);
    //     }, 5000);
    //   }
    // }
  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
    // this.epicFunction()
    // const userAgent =Bowser.getParser( window.navigator.userAgent);
    // console.log(userAgent.getOS());
   
      
    }
  }
  // epicFunction() {
  //   console.log('hello `Home` component');
  //   this.deviceInfo = this.deviceService.getDeviceInfo();
  //   const isMobile = this.deviceService.isMobile();
  //   const isTablet = this.deviceService.isTablet();
  //   const isDesktopDevice = this.deviceService.isDesktop();
  //   console.log(this.deviceInfo.os);
  //   console.log(isMobile,'isMobile');  // returns if the device is a mobile device (android / iPhone / windows-phone etc)
  //   console.log(isTablet,'isTablet');  // returns if the device us a tablet (iPad etc)
  //   console.log(isDesktopDevice,'isDesktopDevice'); // returns if the app is running on a Desktop browser.
   
  // }
// }
