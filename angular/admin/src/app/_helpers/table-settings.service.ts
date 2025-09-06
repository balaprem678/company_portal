import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class TableSettingsService {
  constructor(private router: Router) {}

  loadSettings(
    event: string,
    curentUser: any,
    url: string,
    userPrivilegeDetails: any,
    deletebtn: boolean,
    editbtn: boolean,
    viewbtn: boolean,
    managebtn?: boolean
  ) {
    var custom = [];
    if (event == 'delete') {
      if (deletebtn) {
        custom.push(
          {
            name: 'restoreaction',
            value: 'Restore',
            title:
              '<div class="action-btn btn btn-danger mb-1"><i class="fa fa-reply"></i></div>',
            type: 'html',
          },
          {
            name: 'forcedeleteaction',
            value: 'Permanent Delete',
            title:
              '<div class="action-btn btn btn-danger mb-1"><i class="fa fa-trash"></i></div>',
            type: 'html',
          }
        );
      }
      return custom;
    } else {
      if (viewbtn) {
        custom.push({
          name: 'viewaction',
          value: 'View',
          title:
            '<div class="action-btn btn mb-1"><img src="assets/image/eye.png" alt="eye"></div>',
          type: 'html',
        });
      }
      if (editbtn) {
        custom.push({
          name: 'editaction',
          value: 'Edit',
          type: 'html',
          // title: '<div class="action-btn btn btn-primary mb-1"><i class="fa fa-pencil"></i></div>',
          title:
            '<div class="action-btn btn mb-1"><img src="assets/image/green_pencil.png" alt="green_pencil"></div>',
        });
      }
      if (deletebtn) {
        custom.push(
          {
            name: 'deleteaction',
            value: 'Delete',
            title:
              '<div class="action-btn btn mb-1"><img src="assets/image/delete.png" alt="delete"></div>',
            type: 'html',
          },
          {
            name: 'restoreaction',
            value: 'Restore',
            title:
              '<div class="action-btn btn btn-danger mb-1"><i class="fa fa-reply"></i></div>',
            type: 'html',
          },
          {
            name: 'forcedeleteaction',
            value: 'Permanent Delete',
            title:
              '<div class="action-btn btn btn-danger mb-1"><i class="fa fa-trash"></i></div>',
            type: 'html',
          }
        );
      }
      if (managebtn) {
        custom.push({
          name: 'manageaction',
          value: 'Manage',
          title:
            '<div class="action-btn btn btn-primary mb-1"><i class="fa fa-envelope"></i></div>',
          type: 'html',
        });
      }
      return custom;
    }
  }
}
