import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {
  id: any
  status:any
  faq_details = [{ title: '', content: '' }];

  constructor(private apiService: ApiService, private notifyService: NotificationService, private router: Router,) { 
    this.apiService.CommonApi(Apiconfig.getFaq.method, Apiconfig.getFaq.url, {}).subscribe((result) => {
      console.log(result,"resultresultresult");
      if(result && result.status &&  result.status == 1){
        this.status = result.status;
        this.faq_details = result.data.doc.faq_details
        console.log(this.faq_details,"this.faq_detailsthis.faq_detailsthis.faq_details");
        
        this.id = result.data.doc._id
      }
    })
  }

  ngOnInit(): void {
  }

}
