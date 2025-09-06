import { Component, Input } from '@angular/core';

import { Grid } from '../../../lib/grid';
import { DataSource } from '../../../lib/data-source/data-source';

@Component({
  selector: '[ng2-st-checkbox-select-all]',
  template: `
    <input
      class="multi-select-checkbox"
      type="checkbox"
      [ngModel]="isAllSelected"
    />&nbsp;&nbsp;&nbsp;&nbsp;
    S.No
  `,
})
export class CheckboxSelectAllComponent {
  @Input() grid: Grid;
  @Input() source: DataSource;
  @Input() isAllSelected: boolean;
}
