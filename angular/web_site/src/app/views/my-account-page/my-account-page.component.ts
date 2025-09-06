import { Component, OnInit, TemplateRef, ElementRef, Renderer2, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
@Component({
  selector: 'app-my-account-page',
  templateUrl: './my-account-page.component.html',
  styleUrls: ['./my-account-page.component.scss']
})
export class MyAccountPageComponent implements OnInit {
  username: any;
  userDetails: any = '';
  settings: any;
  logo: any;
  apirUrl: any;
  firstAndLastname: any
  modalLogoutRef: BsModalRef;

  constructor( private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    private renderer: Renderer2,
    private router: Router,
    private cdr: ChangeDetectorRef) { 


    
    var userId = localStorage.getItem('userId');
    if (userId != '') {
      this.getUser()
    }
    // this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    // this.username = this.userDetails ? this.userDetails.username : '';
    

    // console.log("this.userDetails", this.userDetails)
    // if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

    //   this.firstAndLastname = this.userDetails.first_name
    // } else {
    //   this.firstAndLastname = ''
    // }
    // this.apiService.reloadObservable$.subscribe(result => {
    //   if (result) {
    //     this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    //     this.username = this.userDetails ? this.userDetails.user_name : '';
    //     if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

    //       this.firstAndLastname = this.userDetails.first_name
    //     } else {
    //       this.firstAndLastname = ''
    //     }
    //     // this.getCartCount();
    //   }
    // })
  }

  ngOnInit(): void {

    this.setUser();
    this.cdr.detectChanges()
  }
  logOutPop(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: false })
  }

  destroyPopup() {
    this.modalLogoutRef.hide();
  }
  logout() {
    localStorage.removeItem('userDetails');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('searchLocation');
    localStorage.removeItem('recently_visit');
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    this.username = this.userDetails ? this.userDetails.user_name : '';
    if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

      this.firstAndLastname = this.userDetails.first_name
    } else {
      this.firstAndLastname = ''
    }
    this.modalLogoutRef.hide();
    localStorage.removeItem('userDetails');
    this.notifyService.showSuccess("Logout Successfully.")
    setTimeout(() => {   
      this.route.navigate(['/']).then(()=> {
        window.location.reload();
      })
    }, 200);
    var data = {
      page: 'logout'
    }
    this.apiService.realoadFunction({ data: data });
    // window.location.reload()
  }
  getUser() {
    var userId = localStorage.getItem('userId');
    let data = {
      userId: userId
    }
    if (userId != ('' || null || undefined)) {
      this.apiService.CommonApi(Apiconfig.getUser.method, Apiconfig.getUser.url, data).subscribe(respon => {
        console.log(respon, 'respon');
        if (respon.status && respon) {
          localStorage.setItem('userDetails', JSON.stringify(respon.data));
          localStorage.setItem('userId', respon.data._id);
        }

      })
    }
  }

  setUser(){
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    this.username = this.userDetails ? this.userDetails.username : '';
    // this.cdr.detectChanges()
  }

}
