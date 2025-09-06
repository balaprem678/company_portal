import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { settings } from '../interface/interface';
import { Apiconfig } from '../_helpers/api-config';
import { ApiService } from '../_services/api.service';
import { DefaultStoreService } from '../_services/default-store.service';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {

  settings: settings;
  dynamic_condent: string = 'Oops! Something went wrong!.';

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private titleService: Title,
    private store: DefaultStoreService
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
    if (this.ActivatedRoute.snapshot.paramMap.get('id') === '1') {
      this.dynamic_condent = 'Your Email verification error please contact admin';
    }
  }

  ngOnInit(): void {
  }

}
