import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from "rxjs";
import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
 
  
  constructor(private socket: Socket) { 
    // this.socket = io(`${environment.apiUrl}chat`);
  }

  eventEmitter: EventEmitter<any> = new EventEmitter();
  myComponentUpdated = new EventEmitter<string>();

  listen(eventname: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on(eventname, (data: any) => {
        subscriber.next(data);
      })
    })
  }
  emit(eventname: string, data: any) {
    this.socket.emit(eventname, data);

  }
  socketCall(eventname: string, data: any): Observable<any>{
    // console.log(eventname,'event name...');
    // console.log('data++++++++++++++++++++',data)
    
    this.socket.emit(eventname, data);
    return new Observable((subscriber) => {
      this.socket.once(eventname, (data: any) => {
        subscriber.next(data);  
      })
    })
  }

}
