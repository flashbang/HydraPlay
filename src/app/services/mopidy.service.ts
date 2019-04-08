import { Injectable, EventEmitter } from '@angular/core';
import Mopidy from 'mopidy';
import { environment } from './../../environments/environment';
import {MessageService} from './message.service';

class MopidyEvent {
    constructor(public streamId: string, public label: string, public data: any) {}
}

class MopidyPlayer {
  private socket: Mopidy;
  private id: string;
  private tracks: any[];
  private isPlaying: boolean;

  public mopidyOnline$: EventEmitter<MopidyPlayer>;


  constructor(instance: any, private messageService: MessageService) {
    this.id = instance.id;
    this.socket = new Mopidy({webSocketUrl: `ws://${instance.ip}:${instance.port}/mopidy/ws/`});
    this.isPlaying = false;

    this.socket.on('websocket:open', () => {
        let event = new MopidyEvent(instance.id, 'event', {});

        event.streamId = instance.id;

        this.socket.on('state:online',  () => {
            event.label = `event:online`;
            this.triggerEvent(event);
        });

        this.socket.on('event', (_event) => {
            event.label = `${_event}`;
            this.triggerEvent(event);
        });
    });

    this.socket.on('websocket:close', () =>{
      this.socket.off();
    });
  }

  public triggerEvent(event: MopidyEvent) {
      this.messageService.broadcast('Mopidy', event );
  }

  public getId(): string {
    return this.id;
  }

  public getSocket(): Mopidy {
    return this.socket;
  }

  public getCurrentTrack(): any {
    return this.socket.playback.getCurrentTrack().then(track => {
        return track;
    });
  }

  public getCurrentState(): any {
    return this.socket.playback.getState().then(state => {
      return state;
    });
  }

  public search(query): any {
    var queryElements = query.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
    queryElements = queryElements.map(function (el) {
      return el.replace(/"/g, '');
    });

    return this.socket.library.search({'any': `${queryElements}`}).then(result => {
        return result;
    });

  }

  public playTrack(track) {
    console.log(track)
    let tracklist = [];
    tracklist.push(track.uri);
    this.socket.tracklist.add({uris: tracklist}).then(tltracks => {
      this.socket.playback.play(tltracks => {
          let event = new MopidyEvent(this.id, 'event:streamTitleChanged', {});
          this.messageService.broadcast('Mopidy', {label:'event:streamTitleChanged', data:{}, })
        this.isPlaying = true;
      });
    });

  }

  public play(value): void {
    if (value) {
      this.socket.playback.play(value).then(result => {
        this.isPlaying = true;
        console.log('Playing');
      });
    } else {
      this.socket.playback.play().then(result => {
        this.isPlaying = true;
        console.log('Playing');
      });
    }
    this.isPlaying = true;
  }

  public pause(): void {
    this.socket.playback.pause().then(result => {
      this.isPlaying = false;
      console.log('Pause');
    });
  }

  public nextTrack(): void {
    this.socket.playback.next().then(result =>{
      //this.isPlaying = false;
      console.log('Next Track');
    });
  }

  public previousTrack(): void {
    this.socket.playback.previous().then(result =>{
      //this.isPlaying = false;
      console.log('Previous Track');
    });
  }
}


@Injectable({
  providedIn: 'root'
})
export class MopidyService {

  public mopidies: MopidyPlayer[];

  constructor(private messageService: MessageService) {
    this.mopidies = [];

    environment.mopidy.forEach(mpInstance => {
        let _mopidy = new MopidyPlayer(mpInstance, this.messageService)
        this.mopidies.push(_mopidy);
    });

  }

  public getStreamById(id: string) {
    return this.mopidies.find(mopidy => {return mopidy.getId() === id});
  }

}
