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
  styleUrls: ['./app.component.sass','../scss/new_style.scss','../scss/table.scss']
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

  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
   
      
    }
  }