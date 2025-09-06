import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-driversview',
  templateUrl: './driversview.component.html',
  styleUrls: ['./driversview.component.scss']
})
export class DriversviewComponent implements OnInit {
  id: string;
  data: any;
  env: any = environment.apiUrl;
  preview: any;
  imageUrl: any;
  percentDone = 0;
  imageSrc: any;
  imageName = '1649337984888.jpg';
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.apiService.CommonApi(Apiconfig.driveredit.method, Apiconfig.driveredit.url, { id: this.id }).subscribe(result => {
      this.data = result[0];
      this.preview = this.env + this.data[0].avatar;
      console.log("sdsd", this.data, this.env, this.data[0].avatar)
    })
  }

  loadImage(img) {
    this.imageSrc = this.env + img;
    var image = this.imageSrc
    let blob = new Blob([image], { type: "image/jpeg/png" });
    let url = window.URL.createObjectURL(blob);
    let pwa = window.open(url);
    if (!pwa || pwa.closed || typeof pwa.closed == 'undefined') {
      alert('Please disable your Pop-up blocker and try again.');
    }
    // this.http.get(this.imageUrl, { responseType: 'blob', reportProgress: true, observe: 'events' }).subscribe(event => {
    //     if (event.type === HttpEventType.DownloadProgress) {
    //       this.percentDone = Math.round(100 * event.loaded / event.total);
    //     }
    //     if (event.type === HttpEventType.Response) {
    //       this.imageSrc = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(event['body']));
    //     }
    //   }
    // );
  }

}
