import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Row } from '../../../lib/data-set/row';

import { Grid } from '../../../lib/grid';

@Component({
    selector: 'ng2-st-tbody-custom',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <span *ngFor="let action of grid.getSetting('actions.custom')">
      <a *ngIf="row.getData().status !=0 && action.name != 'restoreaction' && action.name != 'forcedeleteaction'" href="#"
         class="ng2-smart-action ng2-smart-action-custom-custom" 
         [innerHTML]="action.title" tooltip="{{action.value}}"
         (click)="onCustom(action, $event)"></a>
      <a *ngIf="row.getData().status == 0 && (action.name == 'restoreaction' || action.name == 'forcedeleteaction')" href="#"
         class="ng2-smart-action ng2-smart-action-custom-custom" 
         [innerHTML]="action.title" tooltip="{{action.value}}"
         (click)="onCustom(action, $event)"></a>
      </span>
      `
})
export class TbodyCustomComponent {

    @Input() grid: Grid;
    @Input() row: Row;
    @Input() source: any;
    @Output() custom = new EventEmitter<any>();

    onCustom(action: any, event: any) {
        event.preventDefault();
        event.stopPropagation();

        this.custom.emit({
            action: action.name,
            data: this.row.getData(),
            source: this.source
        });
    }

}
