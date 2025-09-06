import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';

import { Router } from '@angular/router';
import { socialNetworkSetting } from 'src/app/interface/social-network-setting.interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-socialnetworks',
  templateUrl: './socialnetworks.component.html',
  styleUrls: ['./socialnetworks.component.scss']
})
export class SocialnetworksComponent implements OnInit {

  @ViewChild('socialNetSettingForm') form: NgForm;
  submitebtn: boolean = false;
  socialNetSetting: socialNetworkSetting
  postheaderDetails: any;
  googleurl: any;
  appurl: any;
  socialnetwork: any;
  facebookapi: any;
  facebookicon: any;
  previewfacebookicon: any;
  previewtwittericon: any;
  previewlinkedinicon: any;
  previewpinteresticon: any;
  previewyoutubeicon: any;
  previewInstagramicon: any;
  previewgoogleplusicon: any;
  previewgoogleplayicon: any;
  previewgoogleplaylandingicon: any;
  previewgoogleplaycommingsoonicon: any;
  previewappstoreicon: any;
  previewappstorelandingicon: any;
  previewappstorecommingsoonicon: any;
  finalfacebookicon: File;
  finaltwittericon: File;
  finallinkedinicon: File;
  finalpinteresticon: File;
  finalyoutubeicon: File;
  finalinstagramicon: File;
  finalgoogleplusicon: File;
  finalgoogleplayicon: File;
  finalgoogleplaylandingicon: File;
  finalgoogleplaycommingsoonicon: File;
  finalappstoreicon: File;
  finalappstorelandingicon: File;
  finalappstorecommingsoonicon: File;
  facebookStatusOptions = [
    { label: 'Publish', value: '1' },
    { label: 'Unpublish', value: '2' }
  ];
  twitterStatusOptions = [
    { label: 'Publish', value: '1' },
    { label: 'UnPublish', value: '2' }
  ];
  instagramStatusOptions = [
    { label: 'Publish', value: '1' },
    { label: 'UnPublish', value: '2' }
  ];
  
  dropdownBorderRadius = 5;
  disableView = false;
  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private store: DefaultStoreService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.get_socialnetwork.method, Apiconfig.get_socialnetwork.url, {}).subscribe(
      (result) => {
        this.socialnetwork = result;
        this.googleurl = result.mobileapp[0].url;
        this.appurl = result.mobileapp[1].url;
        if (result) {
          this.socialNetSetting = result.data;
          this.form.form.controls['Facebookname'].setValue(this.socialnetwork.link[0].name);
          this.form.form.controls['Facebookurl'].setValue(this.socialnetwork.link[0].url);
          this.form.form.controls['Facebookstatus'].setValue(this.socialnetwork.link[0].status);
          this.form.form.controls['Twittername'].setValue(this.socialnetwork.link[1].name);
          this.form.form.controls['Twitterurl'].setValue(this.socialnetwork.link[1].url);
          this.form.form.controls['Twitterstatus'].setValue(this.socialnetwork.link[1].status);
          // this.form.form.controls['LinkedInname'].setValue(this.socialnetwork.link[2].name);
          // this.form.form.controls['LinkedInurl'].setValue(this.socialnetwork.link[2].url);
          // this.form.form.controls['LinkedInstatus'].setValue(this.socialnetwork.link[2].status);
          // this.form.form.controls['Pinterestname'].setValue(this.socialnetwork.link[3].name);
          // this.form.form.controls['Pinteresturl'].setValue(this.socialnetwork.link[3].url);
          // this.form.form.controls['Pintereststatus'].setValue(this.socialnetwork.link[3].status);
          // this.form.form.controls['Youtubename'].setValue(this.socialnetwork.link[4].name);
          // this.form.form.controls['Youtubeurl'].setValue(this.socialnetwork.link[4].url);
          // this.form.form.controls['Youtubestatus'].setValue(this.socialnetwork.link[4].status);
          this.form.form.controls['Instagramname'].setValue(this.socialnetwork.link[5].name);
          this.form.form.controls['Instagramurl'].setValue(this.socialnetwork.link[5].url);
          this.form.form.controls['Instagramstatus'].setValue(this.socialnetwork.link[5].status);
          // this.form.form.controls['Google_plusname'].setValue(this.socialnetwork.link[5].name);
          // this.form.form.controls['Google_plusurl'].setValue(this.socialnetwork.link[5].url);
          // this.form.form.controls['Google_plusstatus'].setValue(this.socialnetwork.link[5].status);
          // this.form.form.controls['googleplayname'].setValue(this.socialnetwork.mobileapp[0].name);
          // this.form.form.controls['googleplaystatus'].setValue(this.socialnetwork.mobileapp[0].status);
          // this.form.form.controls['appstorename'].setValue(this.socialnetwork.mobileapp[1].name);
          // this.form.form.controls['appstorestatus'].setValue(this.socialnetwork.mobileapp[1].status);
          this.form.form.controls['facebookapplicationid'].setValue(this.socialnetwork.facebook_api.application_id != 'undefined' ? this.socialnetwork.facebook_api.application_id : '');
          this.form.form.controls['facebookapplicationsecret'].setValue(this.socialnetwork.facebook_api.application_secret != 'undefined' ? this.socialnetwork.facebook_api.application_secret : '');
          this.form.form.controls['facebookcallback'].setValue(this.socialnetwork.facebook_api.callback != 'undefined' ? this.socialnetwork.facebook_api.callback : '');
          this.form.form.controls['googleclientid'].setValue(this.socialnetwork.google_api.client_id != 'undefined' ? this.socialnetwork.google_api.client_id : '');
          this.form.form.controls['googlesecretkey'].setValue(this.socialnetwork.google_api.secret_key != 'undefined' ? this.socialnetwork.google_api.secret_key : '');
          this.form.form.controls['googlecallback'].setValue(this.socialnetwork.google_api.callback != 'undefined' ? this.socialnetwork.google_api.callback : '');
          this.form.form.controls['mapwebsitkey'].setValue(this.socialnetwork.map_api.web_key != 'undefined' ? this.socialnetwork.map_api.web_key : '');
          // this.form.form.controls['mapandroiduserkey'].setValue(this.socialnetwork.map_api.ad_user != 'undefined' ? this.socialnetwork.map_api.ad_user : '');
          // this.form.form.controls['mapandroidoutletkey'].setValue(this.socialnetwork.map_api.ad_outlet != 'undefined' ? this.socialnetwork.map_api.ad_outlet : '');
          // this.form.form.controls['mapandroiddriverkey'].setValue(this.socialnetwork.map_api.ad_driver != 'undefined' ? this.socialnetwork.map_api.ad_driver : '');
          // this.form.form.controls['mapiosuserkey'].setValue(this.socialnetwork.map_api.ios_user != 'undefined' ? this.socialnetwork.map_api.ios_user : '');
          // this.form.form.controls['mapiosoutletkey'].setValue(this.socialnetwork.map_api.ios_outlet != 'undefined' ? this.socialnetwork.map_api.ios_outlet : '');
          // this.form.form.controls['mapiosdriverkey'].setValue(this.socialnetwork.map_api.ios_driver != 'undefined' ? this.socialnetwork.map_api.ios_driver : '');
          // this.form.form.controls['androiduserkey'].setValue(this.socialnetwork.fcm_keys.ad_user != 'undefined' ? this.socialnetwork.fcm_keys.ad_user : '');
          // this.form.form.controls['androidoutletkey'].setValue(this.socialnetwork.fcm_keys.ad_outlet != 'undefined' ? this.socialnetwork.fcm_keys.ad_outlet : '');
          // this.form.form.controls['androiddriverkey'].setValue(this.socialnetwork.fcm_keys.ad_driver != 'undefined' ? this.socialnetwork.fcm_keys.ad_driver : '');
          // this.form.form.controls['iosuserkey'].setValue(this.socialnetwork.fcm_keys.ios_user != 'undefined' ? this.socialnetwork.fcm_keys.ios_user : '');
          // this.form.form.controls['iosoutletkey'].setValue(this.socialnetwork.fcm_keys.ios_outlet != 'undefined' ? this.socialnetwork.fcm_keys.ios_outlet : '');
          // this.form.form.controls['iosdriverkey'].setValue(this.socialnetwork.fcm_keys.ios_driver != 'undefined' ? this.socialnetwork.fcm_keys.ios_driver : '');
          if (this.socialnetwork.link[0].img != null) {
            this.finalfacebookicon = this.socialnetwork.link[0].img;
            this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[0].img, (exists) => {
              this.previewfacebookicon = environment.apiUrl + this.socialnetwork.link[0].img;
            })
          }
          if (this.socialnetwork.link[1].img != null) {
            this.finaltwittericon = this.socialnetwork.link[1].img;
            this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[1].img, (exists) => {
              this.previewtwittericon = environment.apiUrl + this.socialnetwork.link[1].img;
            })
          } 
          // if (this.socialnetwork.link[2].img != null) {
          //   this.finallinkedinicon = this.socialnetwork.link[2].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[2].img, (exists) => {
          //     this.previewlinkedinicon = environment.apiUrl + this.socialnetwork.link[2].img;
          //   })
          // } 
          // if (this.socialnetwork.link[3].img != null) {
          //   this.finalpinteresticon = this.socialnetwork.link[3].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[3].img, (exists) => {
          //     this.previewpinteresticon = environment.apiUrl + this.socialnetwork.link[3].img;
          //   })
          // }
          //  if (this.socialnetwork.link[4].img != null) {
          //   this.finalyoutubeicon = this.socialnetwork.link[4].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[4].img, (exists) => {
          //     this.previewyoutubeicon = environment.apiUrl + this.socialnetwork.link[4].img;
          //   })
          // } 
          if (this.socialnetwork.link[5].img != null) {
            this.finalinstagramicon = this.socialnetwork.link[5].img;
            this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[5].img, (exists) => {
              this.previewInstagramicon = environment.apiUrl + this.socialnetwork.link[5].img;
            })
          }
          // if (this.socialnetwork.link[6].img != null) {
          //   this.finalgoogleplusicon = this.socialnetwork.link[6].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.link[6].img, (exists) => {
          //     this.previewgoogleplusicon = environment.apiUrl + this.socialnetwork.link[6].img;
          //   })
          // }
          // if (this.socialnetwork.mobileapp[0].img != null) {
          //   this.finalgoogleplayicon = this.socialnetwork.mobileapp[0].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[0].img, (exists) => {
          //     this.previewgoogleplayicon = environment.apiUrl + this.socialnetwork.mobileapp[0].img;
          //   })
          // }
          // if (this.socialnetwork.mobileapp[0].landingimg != null) {
          //   this.finalgoogleplaylandingicon = this.socialnetwork.mobileapp[0].landingimg;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[0].landingimg, (exists) => {
          //     this.previewgoogleplaylandingicon = environment.apiUrl + this.socialnetwork.mobileapp[0].landingimg;
          //   })
          // }
          // if (this.socialnetwork.mobileapp[0].comming_soon_img != null) {
          //   this.finalgoogleplaycommingsoonicon = this.socialnetwork.mobileapp[0].comming_soon_img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[0].comming_soon_img, (exists) => {
          //     this.previewgoogleplaycommingsoonicon =environment.apiUrl + this.socialnetwork.mobileapp[0].comming_soon_img;
          // })
          // }
          // if (this.socialnetwork.mobileapp[1].img != null) {
          //   this.finalappstoreicon = this.socialnetwork.mobileapp[1].img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[1].img, (exists) => {
          //     this.previewappstoreicon = environment.apiUrl + this.socialnetwork.mobileapp[1].img;
          //   })
          // }
          // if (this.socialnetwork.mobileapp[1].landingimg != null) {
          //   this.finalappstorelandingicon = this.socialnetwork.mobileapp[1].landingimg;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[1].landingimg, (exists) => {
          //     this.previewappstorelandingicon = environment.apiUrl + this.socialnetwork.mobileapp[1].landingimg;
          //   })
          // }
          // if (this.socialnetwork.mobileapp[1].comming_soon_img != null) {
          //   this.finalappstorecommingsoonicon= this.socialnetwork.mobileapp[1].comming_soon_img;
          //   this.apiService.imageExists(environment.apiUrl + this.socialnetwork.mobileapp[1].comming_soon_img, (exists) => {
          //     this.previewappstorecommingsoonicon = environment.apiUrl + this.socialnetwork.mobileapp[1].comming_soon_img;
          //   })
          // }

        }
      }, (error) => {
        console.log(error);
      })
  }
  reloadComponent() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([currentUrl]));
  }
  filechange(event, name, flag) {
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0]
    if (file.size < 1000000) {
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var reader = new FileReader();
        reader.onload = (evt) => {
          var img = new Image();
          var objectUrl = _URL.createObjectURL(file);
          img.onload = () => {
            if (flag == 1) {
              if (img.height < 101 && img.width < 101) {
                if (name == "facebook_icon") {
                  this.previewfacebookicon = evt.target.result;
                  this.finalfacebookicon = this.dataURLtoFile(this.previewfacebookicon, 'facebookimage.png');
                }
                if (name == "twitter_icon") {
                  this.previewtwittericon = evt.target.result;
                  this.finaltwittericon = this.dataURLtoFile(this.previewtwittericon, 'twitterimage.png');
                }
                if (name == "LinkedIn_icon") {
                  this.previewlinkedinicon = evt.target.result;
                  this.finallinkedinicon = this.dataURLtoFile(this.previewlinkedinicon, 'linkedinimage.png');
                }
                if (name == "Pinterest_icon") {
                  this.previewpinteresticon = evt.target.result;
                  this.finalpinteresticon = this.dataURLtoFile(this.previewpinteresticon, 'pinterestimage.png');
                }
                if (name == "Youtube_icon") {
                  this.previewyoutubeicon = evt.target.result;
                  this.finalyoutubeicon = this.dataURLtoFile(this.previewyoutubeicon, 'youtubeimage.png');
                }
                if (name == "Instagram_icon") {
                  this.previewInstagramicon = evt.target.result;
                  this.finalinstagramicon = this.dataURLtoFile(this.previewInstagramicon, 'instagramimage.png');
                }
                if (name == "Google_plus_icon") {
                  this.previewgoogleplusicon = evt.target.result;
                  this.finalgoogleplusicon = this.dataURLtoFile(this.previewgoogleplusicon, 'googleimage.png');
                }
              } else {
                this.notifyService.showError(' Image maximum dimension 100 * 100 in pixels.');
              }
            } else {
              if (name == "googleplayicon") {
                this.previewgoogleplayicon = evt.target.result;
                this.finalgoogleplayicon = this.dataURLtoFile(this.previewgoogleplayicon, 'googleplayimage.png');
              }
              if (name == "googleplaylandingicon") {
                this.previewgoogleplaylandingicon = evt.target.result;
                this.finalgoogleplaylandingicon = this.dataURLtoFile(this.previewgoogleplaylandingicon, 'googleplaylandingimage.png');
              }
              if (name == "googleplaycommingsoonicon") {
                this.previewgoogleplaycommingsoonicon = evt.target.result;
                this.finalgoogleplaycommingsoonicon = this.dataURLtoFile(this.previewgoogleplaycommingsoonicon, 'googplycommingsoonimage.png');
              }
              if (name == "appstoreicon") {
                this.previewappstoreicon = evt.target.result;
                this.finalappstoreicon = this.dataURLtoFile(this.previewappstoreicon, 'appstoreimage.png');
              }
              if (name == "appstorelandingicon") {
                this.previewappstorelandingicon = evt.target.result;
                this.finalappstorelandingicon = this.dataURLtoFile(this.previewappstorelandingicon, 'appstorelandingimage.png');
              }
              if (name == "appstorecommingsoonicon") {
                this.previewappstorecommingsoonicon = evt.target.result;
                this.finalappstorecommingsoonicon = this.dataURLtoFile(this.previewappstorecommingsoonicon, 'appstorecommingsoonimage.png');
              }
            }
          };
          img.src = objectUrl;
        }
        reader.readAsDataURL(file);
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG  ');
      }
    } else {
      this.notifyService.showError('Max file size less than 1Mb ');
    }
  }
  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  public onFormSubmit(socialNetSettingForm: UntypedFormGroup) {
    this.submitebtn = true;
    var data = socialNetSettingForm.value;
    let formData = new FormData();
    formData.append('facebookname', data.Facebookname);
    formData.append('facebookurl', data.Facebookurl);
    formData.append('facebookstatus', data.Facebookstatus);
    formData.append('facebookimage', this.finalfacebookicon);
    formData.append('twittername', data.Twittername);
    formData.append('twitterurl', data.Twitterurl);
    formData.append('twitterstatus', data.Twitterstatus);
    formData.append('twitterimage', this.finaltwittericon);
    // formData.append('linkedinname', data.LinkedInname);
    // formData.append('linkedinurl', data.LinkedInurl);
    // formData.append('linkedinstatus', data.LinkedInstatus);
    // formData.append('linkedinimage', this.finallinkedinicon);
    // formData.append('pinterestname', data.Pinterestname);
    // formData.append('pinteresturl', data.Pinteresturl);
    // formData.append('pintereststatus', data.Pintereststatus);
    // formData.append('pinterestimage', this.finalpinteresticon);
    // formData.append('youtubename', data.Youtubename);
    // formData.append('youtubeurl', data.Youtubeurl);
    // formData.append('youtubestatus', data.Youtubestatus);
    // formData.append('youtubeimage', this.finalyoutubeicon);
    formData.append('instagramname', data.Instagramname);
    formData.append('instagramurl', data.Instagramurl);
    formData.append('instagramstatus', data.Instagramstatus);
    formData.append('instagramimage', this.finalinstagramicon);
    // formData.append('googlename', data.Google_plusname);
    // formData.append('googleurl', data.Google_plusurl);
    // formData.append('googlestatus', data.Google_plusstatus);
    // formData.append('googleimage', this.finalgoogleplusicon);
    // formData.append('googleplayname', data.googleplayname);
    // formData.append('googleplaystatus', data.googleplaystatus);
    // formData.append('googleplayimage', this.finalgoogleplayicon);
    // formData.append('googleplaylandingimage', this.finalgoogleplaylandingicon);
    // formData.append('googplycommingsoonimage', this.finalgoogleplaycommingsoonicon);
    // formData.append('appstorename', data.appstorename);
    // formData.append('appstorestatus', data.appstorestatus);
    // formData.append('appstoreimage', this.finalappstoreicon);
    // formData.append('appstorelandingimage', this.finalappstorelandingicon);
    // formData.append('appstorecommingsoonimage', this.finalappstorecommingsoonicon);
    formData.append('facebook_api[application_id]', data.facebookapplicationid);
    formData.append('facebook_api[application_secret]', data.facebooksecret);
    formData.append('facebook_api[callback]', data.facebookapplicationid);
    formData.append('google_api[client_id]', data.googleclientid);
    formData.append('google_api[secret_key]', data.googlesecretkey);
    formData.append('google_api[callback]', data.googlecallback);
    formData.append('map_api[web_key]', data.mapwebsitkey);
    // formData.append('map_api[ad_user]', data.mapandroiduserkey);
    // formData.append('map_api[ad_outlet]', data.mapandroidoutletkey);
    // formData.append('map_api[ad_driver]', data.mapandroiddriverkey);
    // formData.append('map_api[ios_user]', data.mapiosuserkey);
    // formData.append('map_api[ios_driver]', data.mapiosdriverkey);
    // formData.append('map_api[ios_outlet]', data.mapiosoutletkey);
    // formData.append('fcm_keys[ad_user]', data.androiduserkey);
    // formData.append('fcm_keys[ad_outlet]', data.androidoutletkey);
    // formData.append('fcm_keys[ad_driver]', data.androiddriverkey);
    // formData.append('fcm_keys[ios_user]', data.iosuserkey);
    // formData.append('fcm_keys[ios_driver]', data.iosdriverkey);
    // formData.append('fcm_keys[ios_outlet]', data.iosoutletkey);
    // for (let index = 0; index < this.googleurl.length; index++) {
    //   formData.append(`googleplayurl[${index}][name]`, this.googleurl[index].name);
    //   formData.append(`googleplayurl[${index}][url]`, this.googleurl[index].url);
    //   formData.append(`googleplayurl[${index}][status]`, this.googleurl[index].status);
    // }
    // for (let index = 0; index < this.appurl.length; index++) {
    //   formData.append(`appstoreurl[${index}][name]`, this.appurl[index].name);
    //   formData.append(`appstoreurl[${index}][url]`, this.appurl[index].url);
    //   formData.append(`appstoreurl[${index}][status]`, this.appurl[index].status);
    // }
    this.apiService.CommonApi(Apiconfig.save_socialnetwork.method, Apiconfig.save_socialnetwork.url, formData).subscribe(
      (result) => {
        if (result.status) {
          this.reloadComponent();
          this.notifyService.showSuccess("Succesfully Updated");
        } else {
          this.notifyService.showError("Not Updated");
        }
        this.submitebtn = false;
      }, (error) => {
        this.submitebtn = false;
      }
    )
  }
}
