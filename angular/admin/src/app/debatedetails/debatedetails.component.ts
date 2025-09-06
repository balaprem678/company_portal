import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { settings } from '../interface/interface';
import { Apiconfig } from '../_helpers/api-config';
import { ApiService } from '../_services/api.service';
import { DefaultStoreService } from '../_services/default-store.service';
import { WebSocketService } from '../_services/webSocketService.service';
import { DeviceDetectorService } from 'ngx-device-detector';
@Component({
  selector: 'app-debatedetails',
  templateUrl: './debatedetails.component.html',
  styleUrls: ['./debatedetails.component.scss']
})
export class DebatedetailsComponent implements OnInit {

  settings: settings;
  imageurl: string = environment.apiUrl;
  RootDebateDetails: any = {
    debate_video_link: '',
    topic: '',
    category_name: '',
    hastags: [],
    CommandCount: 0,
    likeCount: 0,
    shareCount: 0,
    description: '',
    postCommand: [],
    debateRequestList: []
  };
  skip: number = 0;
  limit: number = 10;
  usercroppedImage: string = 'assets/image/user.jpg';
  coverCroppedImage: string = 'assets/image/coverimg.png';
  commendLength: number = 0;
  deviceInfo: any;
  constructor(
    private apiService: ApiService,
    private titleService: Title,
    private store: DefaultStoreService,
    private ActivatedRoute: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private socket: WebSocketService,
    private deviceService: DeviceDetectorService

  ) {
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(
      (result) => {
        if (result && result.data) {
          this.settings = result.data;
          this.apiService.setAppFavicon(this.settings.favicon);
          this.titleService.setTitle(this.settings.site_title);
          this.store.generalSettings.next(this.settings);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    var data = {
      id: id,
      skip: this.skip,
      limit: this.limit
    }
    this.deviceInfo = this.deviceService.getDeviceInfo();
    const os = this.deviceInfo.os
    this.deeplink(id);
    // if (os == 'iOS') {
    //   var appstoreFail = "https://itunes.apple.com/us/app/cabily/id1035316767?mt=8";
    //   var appUrlScheme = "23V4WYN3M5.com.voizout.Voizout";
    //   //If the app is not installed the script will wait for 2sec and redirect to web.
    //   var loadedAt = +new Date;
    //   setTimeout(
    //     function () {
    //       if (+new Date - loadedAt < 2000) {
    //         window.location.href = appstoreFail;
    //       }
    //     }
    //     , 25);
    //   //Try launching the app using URL schemes
    //   // window.open(appUrlScheme, "_self");
    //   window.location.href = appUrlScheme;

    if(os=='iOS'){
      // console.log('iOS');
      var appstoreFail = "https://itunes.apple.com/us/app/cabily/id1035316767?mt=8";
      var appUrlScheme = "shareDebate://debate_id/debate_id";
      //If the app is not installed the script will wait for 2sec and redirect to web.
      var loadedAt = +new Date;
      setTimeout(
        function(){
          if (+new Date - loadedAt < 2000){
            window.location.href = appstoreFail;
          }
        }
      ,25);
      //Try launching the app using URL schemes
      window.open(appUrlScheme,"_self");
    
    }
   
    if(os=='Android'){
      // console.log('android');
      var appstoreFail = "https://play.google.com/store/apps/details?id=com.casperon.app.cabily";
      var appUrlScheme = "com.casperon.app.cabily://debate_id/";
      //If the app is not installed the script will wait for 2sec and redirect to web.
      var loadedAt = +new Date;
      setTimeout(
        function(){
          if (+new Date - loadedAt < 2000){
            window.location.href = appstoreFail;
          }
        }
      ,25);
      //Try launching the app using URL schemes
      window.open(appUrlScheme,"_self");
    }


    // this.debateData(data);
    // this.socket.listen('commandList_respo').subscribe(
    //   (result) => {
    //     if (result && result.status) {
    //       if (this.skip == 0) {
    //         this.RootDebateDetails.postCommand = result.data;
    //       } else {
    //         if (result.data) {
    //           result.data.forEach(x => {
    //             this.RootDebateDetails.postCommand.push(x);
    //           });
    //         }
    //       }
    //       if (this.RootDebateDetails.postCommand && this.RootDebateDetails.postCommand.length > 0 && (this.RootDebateDetails.postCommand.length == this.RootDebateDetails.postCommand[0].commandLength)) {
    //         this.commendLength = 1;
    //       } else if (this.RootDebateDetails.postCommand && this.RootDebateDetails.postCommand.length == 0) {
    //         this.commendLength = 1;
    //       }
    //     }
    //   }
    // )
  };

  debateData(data) {
    this.apiService.CommonApi(Apiconfig.debateViewDetails.method, Apiconfig.debateViewDetails.url, data).subscribe(
      (result) => {
        if (result && result.status) {
          this.RootDebateDetails = result.data;
          this.socket.emit('commandList', data);
          if (this.RootDebateDetails && this.RootDebateDetails.debate_video_link) {
            this.RootDebateDetails.debate_video_link = this.sanitizer.bypassSecurityTrustResourceUrl(this.RootDebateDetails.debate_video_link);
          }
          if (this.RootDebateDetails && this.RootDebateDetails.hastags) {
            this.RootDebateDetails.hastagData = '';
            this.RootDebateDetails.hastags.forEach(x => {
              this.RootDebateDetails.hastagData += ('#' + x + ', ');
            });
          }
          this.apiService.imageExists(environment.apiUrl + this.RootDebateDetails.user_avatar, (exists) => {
            if (exists) {
              this.usercroppedImage = environment.apiUrl + this.RootDebateDetails.user_avatar;
            }
          });
          this.apiService.imageExists(environment.apiUrl + this.RootDebateDetails.cover_image, (exists) => {
            if (exists) {
              this.coverCroppedImage = environment.apiUrl + this.RootDebateDetails.cover_image;
            }
          });
        }
      },
      (error) => {

      }
    )
  }

  showmore() {
    this.skip = this.skip + this.limit;
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    var data = {
      id: id,
      skip: this.skip,
      limit: this.limit
    }
    this.socket.emit('commandList', data);
  }

  timeDifference(previous) {
    var current = new Date().getTime();
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
      return Math.round(elapsed / 1000) + ' seconds ago';
    }

    else if (elapsed < msPerHour) {
      return Math.round(elapsed / msPerMinute) + ' minutes ago';
    }

    else if (elapsed < msPerDay) {
      return Math.round(elapsed / msPerHour) + ' hours ago';
    }

    else if (elapsed < msPerMonth) {
      return Math.round(elapsed / msPerDay) + ' days ago';
    }

    else if (elapsed < msPerYear) {
      return Math.round(elapsed / msPerMonth) + ' months ago';
    }

    else {
      return Math.round(elapsed / msPerYear) + ' years ago';
    }
  }

  imageCheck(url) {
    if (url && url != '') {
      this.apiService.imageExists(environment.apiUrl + url, (exists) => {
        if (exists) {
          return environment.apiUrl + url;
        } else {
          return 'assets/image/user.jpg';
        }
      });
    } else {
      return 'assets/image/user.jpg';
    }
  }
  repliesFunction(item, index) {
    if (item && item._id != '') {
      this.apiService.CommonApi(Apiconfig.replyCommandList.method, Apiconfig.replyCommandList.url, { command_id: item._id }).subscribe(
        (result) => {
          if (result && result.status) {
            this.RootDebateDetails.postCommand[index].replyList = result.data ? result.data : [];
            this.RootDebateDetails.postCommand[index].replyList.forEach(item => {
              item.date = this.timeDifference(new Date(item.createdAt).getTime());
            });
          }
        },
        (error) => {

        }
      )
    }
  }

  deeplink(id) {
    let ua = navigator.userAgent.toLowerCase();
    let isAndroid = ua.indexOf("android") > -1; // android check
    let isIphone = ua.indexOf("iphone") > -1; // ios check
    if (isIphone == true) {
      let app = {
        launchApp: function () {
          setTimeout(function () {
            window.location.href = "https://testflight.apple.com/join/Gn2r7f4P";
          }, 25);
          window.location.href = "com.voizout.Voizout://debate"; //which page to open(now from mobile, check its authorization)
        },
        openWebApp: function () {
          window.location.href = "https://testflight.apple.com/join/Gn2r7f4P";
        }
      };
      app.launchApp();
    } else if (isAndroid == true) {
      let app = {
        launchApp: function () {
          window.location.replace("com.voizout://debate"); //which page to open(now from mobile, check its authorization)
          setTimeout(this.openWebApp, 500);
        },
        openWebApp: function () {
          window.location.href = "https://play.google.com/store/apps/details?id=packagename";
        }
      };
      app.launchApp();
    } else {
      //navigate to website url
    }
  }
}
