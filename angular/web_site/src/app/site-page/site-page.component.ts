import { AfterViewInit, Component, Renderer2, Inject, OnInit, ElementRef } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../_services/api.service';
import { Apiconfig } from '../_helpers/api-config';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-site-page',
  templateUrl: './site-page.component.html',
  styleUrls: ['./site-page.component.scss']
})
export class SitePageComponent implements OnInit, AfterViewInit {
  page: any;
  pageDescription: any;
  heading: string = ''
  slug: any

  itemId: string | null = null;







  constructor(
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private titleService: Title, private renderer: Renderer2, private elRef: ElementRef,
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private meta: Meta,
  ) {
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      if (result && Array.isArray(result.response)) {
        var settigns = result.response.filter(e => Object.keys(e).includes('Settings'))
        if (settigns && settigns.length > 0) {
          var general = settigns[0].Settings && settigns[0].Settings.settings;
          this.apiService.setAppFavicon(general.favicon);
          // this.titleService.setTitle(general.site_title);
          // this.meta.updateTag({ name: 'og:title', content: general.site_title });
        }
      }
    });

    this.activatedRoute.params.subscribe(params => {
      const id = params['slug'];
      this.page = id;
      console.log(id, 'this is the slug from the page..')
      this.apiService.CommonApi(Apiconfig.Getpage.method, Apiconfig.Getpage.url, { slug: id }).subscribe(
        (result) => {
          console.log("result")
          if (result && result.status) {
            console.log(result.data, "result.dataresult.dataresult.dataresult.dataresult.data");
            this.slug = result.data.slug
            this.pageDescription = result.data ? (result.data.description ? result.data.description : '') : '';
            this.heading = result.data.Name
            if(result && result.data && result.data.seo != (undefined || null || '')){
              this.titleService.setTitle(result.data.seo.title);
              
              this.meta.updateTag({ name: 'description', content: result.data.seo.description });
              this.meta.updateTag({ name: 'keywords', content: result.data.seo.keyword });
              this.meta.updateTag({ property: 'og:title', content: result.data.seo.title });
              this.meta.updateTag({ property: 'og:description', content: result.data.seo.description });
            }
          }
        },
        (error) => {
          console.log(error);
        }
      );
    })

  }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.itemId = params['id'];
    });

    // this.scrollToSection(this.itemId);
  }


  scrollToSection(id: string | null): void {
    if (id) {
      // Use a setTimeout to ensure the DOM is updated when querying dynamically injected HTML
      setTimeout(() => {
        const element = this.renderer.selectRootElement(`#${id}`, true);
        console.log(id, element, "idddddddddddddddddddddd");
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          console.error(`Element with id ${id} not found.`);
        }
      }, 100); // Delay might be needed to allow DOM updates
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.scrollToSection(this.itemId);
    }, 500);
  }
}
