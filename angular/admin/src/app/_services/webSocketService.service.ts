import { Injectable } from "@angular/core";
// import * as io from 'socket.io-client';
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { Socket } from 'ngx-socket-io';

@Injectable()
export class WebSocketService {

    constructor(private socket: Socket) {
        // this.socket = io(`${environment.apiUrl}chat`);
    }

    listen(eventname: string): Observable<any> {
        return new Observable((subscriber) => {
            this.socket.on(eventname, (data) => {
                subscriber.next(data);
            })
        })
    }

    emit(eventname: string, data: any) {
       this.socket.emit(eventname, data);
        
    }
}