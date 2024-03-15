import { inject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { PlaylistsManager } from 'managers/playlists-manager';
import moment from 'moment';

@inject(DialogController, EventAggregator, PlaylistsManager)
export class DownloadPlaylist {

    constructor(controller, eventAggregator, playlistsManager) {
        this.controller = controller;
        this._eventAggregator = eventAggregator;
        this._playlistsManager = playlistsManager;

        this.messages = [];

        this.loading = false;
    }

    activate(model) {
        this.playlist = model.playlist;

        this.apiMessageEvent = this._eventAggregator.subscribe('api:message', message => {
            if(message.target != 'download-playlist') return;

            if(message.type == 'started') this.loading = true;
            if(message.type == 'finished') this.loading = false;

            message.moment = moment();
            console.info('api:message', message);

            this.messages.push(message);

            const logMessagesTable = document.getElementById('log-messages-table');
            logMessagesTable.scrollTop = logMessagesTable.scrollHeight;
        });
    }

    detached() {
        this.apiMessageEvent.dispose();
    }

    async ok() {

        await this._playlistsManager.downloadPlaylist(this.playlist.id);
        this.loading = false;
        // this.controller.ok({});
    }
}
