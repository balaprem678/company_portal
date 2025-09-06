import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';
import Swal from 'sweetalert2';
import { TYPE } from '../../_services/value.constant';
import { application } from 'express';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, CanActivate, NavigationEnd } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FooterComponent implements OnInit {
  widgets: any;
  maindata: any;
  settings: any;
  subscribe_email: any;
  urlData: any;
  copyrightYear = new Date();
  apiUrl: any;
  logo: any;
  footer_widgets_1: any;
  footer_widgets_2: any;
  footer_widgets_3: any;
  footer_widgets_4: any;
  socialLink: any[] = [];
  pageList: any[] = [];
  local: any;
  email: any;
  quicklinks: any;
  stayconnected: any;
  stay_connected: any;
  address: any;
  get_app: any;
  services: any;
  copy_right: any;
  account_more: any;
  all_services_foot: any;
  support: any;
  supportEmail = 'helpdesk@pillais.in';
  emailSubject = 'Support Request';
  emailBody = 'Please provide details here.';
  @ViewChild('subemail') subemail;
  subscribe_email_list: any;
  featured_categories_: any;
  constructor(
    private route: Router,
    private apiService: ApiService,
    private socketService: WebsocketService,
    public store: DefaultStoreService,
    private notifyService: NotificationService,
    private sanitizer: DomSanitizer,
    private routes: ActivatedRoute
  ) {
    this.apiUrl = environment.apiUrl;
    // this.local = environment;

    this.socketService.listen('r2e_widgets_settings_details').subscribe(result => {
      // console.log(result, 'sssocilamediaaa');

      if (result && result.err == 0 && result.settings != '') {
        this.widgets = result.settings;
        this.footer_widgets_1 = this.widgets.footer_widgets_1;
        this.footer_widgets_2 = this.widgets.footer_widgets_2;
        this.footer_widgets_3 = this.widgets.footer_widgets_3;
        this.footer_widgets_4 = this.widgets.footer_widgets_4;
      }
    })

    this.store.mainData.subscribe(result => {
      this.maindata = result
    })
    this.store.generalSettings.subscribe(result => {
      this.settings = result;
      // console.log(this.settings, "this.settingsthis.settingsthis.settings");

      this.logo = result.footer_logo
    })
  }

  ngOnInit(): void {
    this.route.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.urlData = event.url
        // this.footerData = event.url;
      });


    // this.apiService.CommonApi(Apiconfig.getSocialLink.method, Apiconfig.getSocialLink.url, {}).subscribe(result => {
    //   if (result && result.link) {
    //     this.socialLink = result.link ? result.link.filter(e => { return e.status == '1' }) : [];
    //   }
    // })

    this.featured_categories()

    this.apiService.CommonApi(Apiconfig.pagesData.method, Apiconfig.pagesData.url, {}).subscribe(result => {
      // console.log(result, 'result the dataa');

      if (result && result.status) {
        this.pageList = result.data;


      }
    })


    // this.get_widgts()
  }


  featured_categories() {
    this.apiService
      .CommonApi(
        Apiconfig.featured_categories.method,
        Apiconfig.featured_categories.url,
        {}
      )
      .subscribe((res) => {
        // if (res && res.status == 1) {
        this.featured_categories_ = res;

        // console.log('featured_categories_', res);
        // }
      });
  }
  ourStory() {
    this.route.navigate(['/our-story'])
    window.scrollTo(0, 0);
  }

  contactUs() {
    this.route.navigate(['/contact-us'])
    window.scrollTo(0, 0);
  }

  footerRouter(link: string) {
    this.route.navigate([`/page/${link}`])
    window.scrollTo(0, 0);
  }
  myaccount() {
    this.route.navigate(['/my-account-page'])
    window.scrollTo(0, 0);
  }
  wishlist() {
    this.route.navigate(['/my-wishlist'])
    window.scrollTo(0, 0);
  }
  faq() {
    this.route.navigate(['/faq'])
    window.scrollTo(0, 0);
  }

  scrollToTop(): void {
    window.scrollTo(0, 0);
  }
  allCategory() {
    // this.route.navigate(['/search?s=latest'])
    this.route.navigate(['/search'], { queryParams: { s: 'latest' } });
    window.scrollTo(0, 0);
  }
  product_catalog() {
    // this.route.navigate(['/search?s=latest'])
    this.route.navigate(['/product-catalog']);
    window.scrollTo(0, 0);
  }


  getMailToLink(): string {
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(this.emailSubject)}&body=${encodeURIComponent(this.emailBody)}`;
  }



  subscribe(typeIcon = TYPE.SUCCESS) {
    const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    var result = expression.test(this.email);
    if (!result) {
      return this.notifyService.showError('Enter valid email')
    }
    if (this.email != '' && typeof this.email != 'undefined' && this.email != null) {
      this.apiService.CommonApi(Apiconfig.subscribeUser.method, Apiconfig.subscribeUser.url, { email: this.email }).subscribe(result => {
        if (result && result.status == 1) {
          delete this.email;
          Swal.fire({
            title: 'Thank you for subscribing!!',
            // html: 'Please make yourself at home and enjoy shopping with us. <b></b> Free delivery charge & 5 days return product, product exchange size or color.',
            icon: typeIcon,
            confirmButtonText: 'Close',
            timer: 5000,
          });
        } else {
          this.notifyService.showError(result.message || 'Something went wrong');
        }
      })
    } else {
      this.notifyService.showError('Please fill the email address')
    }
  }



  // get_widgts() {
  //   this.apiService.CommonApi(Apiconfig.widgets.method, Apiconfig.widgets.url, {}).subscribe(res => {
  //     console.log(res, "rest")

  //     if (res && res != undefined) {
  //       this.address = res.footer_widgets_1
  //       this.quicklinks = res.footer_widgets_2
  //       this.services = res.footer_widgets_3
  //       this.account_more = res.footer_widgets_4
  //       this.support = res.footer_widgets_5
  //       this.get_app = res.footer_widgets_6
  //       this.all_services_foot = res.footer_widgets_7

  //     }


  //   })
  // }

  routeToContactUs() {
    this.route.navigate(['/contact-us']);
    window.scroll(0, 0);
  }


  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  //subscribeData



  subscribes() {
    const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;


    if (!expression.test(this.subscribe_email.trim())) {
      return this.notifyService.showError('Enter a valid email');
    }


    this.apiService.CommonApi(Apiconfig.subscribeDataList.method, Apiconfig.subscribeDataList.url, {}).subscribe(result => {
      if (result && result.status === true) {
        this.subscribe_email_list = result.doc;


        const emailExists = this.subscribe_email_list.some(item => item.email === this.subscribe_email.trim());
        console.log(emailExists,'emailExists');
        
        if (emailExists) {
          this.subscribe_email=""
          this.subemail.nativeElement.value = '';
          this.notifyService.showSuccess(`User with email ${this.subscribe_email.trim()} is already subscribed`);
        } else {

          this.apiService.CommonApi(Apiconfig.subscribeData.method, Apiconfig.subscribeData.url, { email: this.subscribe_email.trim() })
            .subscribe(result => {
              if (result && result.status) {
                this.subemail.nativeElement.value = '';
                this.subscribe_email=""
                this.notifyService.showSuccess(result.message);
              } else {
                this.notifyService.showError(result.message);
              }
            });
        }
      } else {
        this.notifyService.showError(result.error);
      }
    });
  }

}
