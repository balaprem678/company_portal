import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { settings } from '../interface/interface';
import { Apiconfig } from '../_helpers/api-config';
import { ApiService } from '../_services/api.service';
import { DefaultStoreService } from '../_services/default-store.service';

@Component({
  selector: 'app-site-page',
  templateUrl: './site-page.component.html',
  styleUrls: ['./site-page.component.scss']
})
export class SitePageComponent implements OnInit {

  settings: settings;
  pageDescription: string = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private titleService: Title,
    private store: DefaultStoreService,
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

    this.activatedRoute.params.subscribe(params => {
      const id = params['slug'];
      this.apiService.CommonApi(Apiconfig.Getpage.method, Apiconfig.Getpage.url + id, {}).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.pageDescription = result.data ? (result.data.description ? result.data.description : '') : '';
          }
        },
        (error) => {
          console.log(error);
        }
      );
    })
  }

  ngOnInit(): void {
  }

}
