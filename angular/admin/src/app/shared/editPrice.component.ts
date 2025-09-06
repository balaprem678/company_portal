import { Component, Output, EventEmitter, Input, OnInit, ChangeDetectorRef } from "@angular/core";

@Component({
    selector: "edit-button-component",
    template: `
     <span tooltip-trigger="Edit Price" (click)="onModelChange()" tooltip-html-unsafe="click to Edit Price" class="btn btn-success btn-rounded ng-pristine ng-untouched ng-valid ng-empty" ng-model="status"  title="click to Edit Price" style="background-color: #3d8b3d!important;border-color: #3d8b3d!important;" tooltip="">Edit Price</span>`
})
export class EditPriceComponent {
    rowData: any;
    productDetails: any;
    constructor() {
    }

    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();
   
    onModelChange() {
        this.save.emit(this.rowData);
    }
}