import { Injectable } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalModalServiceService {
  private modalRef: BsModalRef | null = null;
  private openLoginModalSubject = new Subject<void>();
  constructor(private modalService: BsModalService) {}
  openLoginModal$ = this.openLoginModalSubject.asObservable();

  openModal(template: any, config?: any) {
    this.modalRef = this.modalService.show(template, config);
  }


  triggerOpenLoginModal() {
    this.openLoginModalSubject.next();
}

  closeModal() {
    if (this.modalRef) {
      this.modalRef.hide();
    }
  }
}
