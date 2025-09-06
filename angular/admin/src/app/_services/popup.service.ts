import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  selectedDoc: any;
  constructor() { }

  openModal(rowData) {
    if (rowData) {
      this.selectedDoc = rowData;
      document.getElementById("triggerPopupModal").click();
    }
  }
  openModal1(rowData) {
    if (rowData) {
      this.selectedDoc = rowData;
      document.getElementById("triggerPopupModal1").click();
    }
  }
  confirmModal() {
    console.log(this.selectedDoc,"active")
    document.getElementById("confirmPopModal" + this.selectedDoc._id).click()
  }
  
  confirmFlagModal() {
    console.log(this.selectedDoc,"flag")
    document.getElementById("confirmPopModal1" + this.selectedDoc._id).click()
  }
}
