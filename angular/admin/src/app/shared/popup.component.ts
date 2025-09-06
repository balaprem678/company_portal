import { Component, Output, EventEmitter, Input, OnInit } from "@angular/core";
import { PopupService } from "../_services/popup.service";

@Component({
    selector: "popup-button-component",
    template: `
    
    <span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' *ngIf="rowData && rowData.status == 1" (click)="showModal()" >Active</span><span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1' (click)="showModal()" *ngIf="rowData && rowData.status == 2">Inactive</span>
    <span id="confirmPopModal{{rowData._id}}" (click)="onModelChange()"></span>
  `
})
export class PopupComponent {
    rowData: any;
    confirmModal: any
    selectedData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();
    constructor(
        private popupService: PopupService
    ) { }
    onModelChange() {
        console.log("statussssssssss");
        
        this.save.emit(this.rowData);
    }

    showModal() {
        this.popupService.openModal(this.rowData);
        // document.getElementById("triggerPopupModal").click();
    }
}