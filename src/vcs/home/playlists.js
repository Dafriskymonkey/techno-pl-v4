import { inject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { PlaylistsManager } from 'managers/playlists-manager';

@inject(DialogController, EventAggregator, PlaylistsManager)
export class Playlists {

    constructor(controller, eventAggregator, playlistsManager) {
        this.controller = controller;
        this._eventAggregator = eventAggregator;
        this._playlistsManager = playlistsManager;

        this.loading = false;

        this.playlists = [];
    }

    activate() {
    }

    attached() {
        this.playlistsChanged = this._eventAggregator.subscribe('playlists-changed', playlists => {
            this.playlists = playlists.map(pl => new Playlist(pl));
            console.info('---> this.playlists', this.playlists);
        });

        this.getPlaylists();
    }

    detached() {
        this.playlistsChanged.dispose();
    }

    getPlaylists() {
        this.loading = true;
        return this._playlistsManager.getPlaylists()
            .then(() => {
                this.loading = false;
            })
            .catch(error => {
                this.loading = false;
                console.error('getPlaylists', error);
            });
    }

    async savePlaylist(playlist, dontShowConfirm) {

        if (!dontShowConfirm) {
            let test = await electronAPI.showConfirm(`do you really want to edit "${playlist.name}" ??`);
            if (!test) return;
        }

        const result = await this._playlistsManager.editPlaylist(playlist.id, {
            name: playlist.name,
            active: playlist.active
        });
        console.info('editPlaylist', result);

        this._eventAggregator.publish('playlist-changed', playlist);
    }

    async saveAll() {
        const changedPls = this.playlists.filter(pl => pl.changed);
        const changedPlNames = changedPls.map(pl => pl.name).join('|');

        let test = await electronAPI.showConfirm(`do you really want to edit "${changedPlNames}" ??`);
        if (!test) return;

        for (let index = 0; index < changedPls.length; index++) {
            const playlist = changedPls[index];
            await this.savePlaylist(playlist, true);
        }
    }

    undo() {
        for (let index = 0; index < this.playlists.length; index++) {
            if (!this.playlists[index].changed) continue;
            this.playlists[index].undo();
        }
    }

    get changed() {
        return !!this.playlists.filter(pl => pl.changed).length;
    }

    ok() {
        this.controller.ok({});
    }
}

class Playlist {

    constructor(playlist) {
        this.id = playlist.id;
        this.name = playlist.name;
        this.active = playlist.active;
        this.tracks = playlist.tracks && playlist.tracks.length ? playlist.tracks.length : 0;

        this.old = JSON.stringify({
            name: playlist.name,
            active: playlist.active
        });
    }

    get changed() {
        const test = this.old !== JSON.stringify({
            name: this.name,
            active: this.active
        });
        return test;
    }

    undo() {
        const old = JSON.parse(this.old);
        this.name = old.name;
        this.active = old.active;
    }
}
