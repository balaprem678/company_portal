import { Component, Inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../_services/api.service';
import { Apiconfig } from '../../_helpers/api-config';
import { DOCUMENT } from '@angular/common';
@Component({
  selector: 'app-terms-and-conditions',
  templateUrl: './terms-and-conditions.component.html',
  styleUrls: ['./terms-and-conditions.component.scss']
})
export class TermsAndConditionsComponent implements OnInit {
  pageDescription: any;
  page: any;
  constructor(    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private titleService: Title,
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private meta: Meta,) {
      this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
        if (result && Array.isArray(result.response)) {
          var settigns = result.response.filter(e => Object.keys(e).includes('Settings'))
          if (settigns && settigns.length > 0) {
            var general = settigns[0].Settings && settigns[0].Settings.settings;
            this.apiService.setAppFavicon(general.favicon);
            this.titleService.setTitle(general.site_title);
            this.meta.updateTag({ name: 'og:title', content: general.site_title });
          }
        }
      });
  console.log(window.location.href.split('/')[3],"window. location. href.");
  
      this.activatedRoute.params.subscribe(params => {
        
        const id = window.location.href.split('/')[3];
        this.page = id;
        this.apiService.CommonApi(Apiconfig.Getpage.method, Apiconfig.Getpage.url, {slug: id}).subscribe(
          (result) => {
            console.log("result")
            if (result && result.status) {
              this.pageDescription = result.data ? (result.data.description ? result.data.description : '') : '';
              console.log(this.pageDescription,"this.pageDescriptionthis.pageDescription");
              
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
