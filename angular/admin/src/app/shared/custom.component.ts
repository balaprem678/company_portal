import { Component, Output, EventEmitter, Input } from "@angular/core";

@Component({
    selector: "custom-component",
    template: `
    <input class="form-control"
    value="{{ value }}"
    (change)="onModelChange($event.target.value)"
  />
  `
})
export class CustomComponent {
    rowData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();

    onModelChange(event) {
        this.rowData = {content : this.rowData.content,value : event};
        this.save.emit(this.rowData);
    }
}