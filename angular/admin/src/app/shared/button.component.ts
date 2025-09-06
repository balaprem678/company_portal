import { Component, Output, EventEmitter, Input } from "@angular/core";

@Component({
    selector: "star-button-component",
    template: `
    <span class="start-rate">
    <div class="btn app-close" *ngIf="rowData && rowData.open_close_status == 1" (click)="onModelChange()">Open</div>
    <div class="btn app-closedd" *ngIf="rowData && rowData.open_close_status != 1" style="cursor: not-allowed;">Closed</div>
    </span>
  `
})
export class ButtonComponent {
    rowData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();

    onModelChange() {
        this.save.emit(this.rowData);
    }
}
