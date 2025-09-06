import { Component, Output, EventEmitter, Input } from "@angular/core";

@Component({
    selector: "approve-component",
    template: `
    <span tooltip-trigger="Edit Price" (click)="confirmModal.show()" tooltip-html-unsafe="click to Edit Price" class="btn btn-success btn-rounded ng-pristine ng-untouched ng-valid ng-empty" ng-model="status"  title="click to Edit Price" style="background-color: #3d8b3d!important;border-color: #3d8b3d!important;" tooltip="">Approve</span>
    <div bsModal #confirmModal="bs-modal" class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content cases-model">
            <div class="modal-body">
                <h6> Do you want to apporve the  driver? </h6>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn conform-dels" (click)="onModelChange()">
                    Yes
                </button>
                <button type="button" class="btn conform-cancel" (click)="confirmModal.hide()">
                    No
                </button>
            </div>
        </div>
    </div>
</div>
  `
})
export class ApporveComponent {
    rowData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();

    onModelChange() {
        this.save.emit(this.rowData);
    }
}