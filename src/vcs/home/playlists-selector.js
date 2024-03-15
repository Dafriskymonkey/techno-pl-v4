import { inject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { PlaylistsManager } from 'managers/playlists-manager';

@inject(DialogController, EventAggregator, PlaylistsManager)
export class PlaylistsSelector {

    constructor(controller, eventAggregator, playlistsManager) {
        this.controller = controller;
        this._eventAggregator = eventAggregator;
        this._playlistsManager = playlistsManager;

        this.loading = false;
    }

    activate() {
    }

    detached() {
    }

    ok() {
        this.controller.ok({});
    }
}
