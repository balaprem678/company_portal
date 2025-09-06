import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { ModalModalServiceService } from '../_services/modal-modal-service.service';
import { NotificationService } from '../_services/notification.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private notificatotion:NotificationService,
        private modalService: ModalModalServiceService
    ) { }

    canActivate() {
        const currentUser = this.authenticationService.currentUserValue;
        console.log(currentUser, "currentUsercurrentUser");
        const checkGuest= localStorage.getItem('guest_login')
        if (currentUser || checkGuest=='true') {
            if(checkGuest=='true'){
                return true;
            }
            if (currentUser.status === 2) {
                // User is inactive, logout and show toast
                this.notificatotion.showError("The admin has inactivated your account.")
                setTimeout(() => {   
                    this.router.navigate(['/']).then(()=> {
                        this.authenticationService.logout();
                    })
                }, 400);
                return false;   
            }

            // logged in so return true
            return true;
        }

        // not logged in so trigger modal and redirect to home
        this.modalService.triggerOpenLoginModal();
        return false;
    }
}   