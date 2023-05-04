import { inject, bindable } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { TracksManager } from 'managers/tracks-manager';
import { PlaylistsManager } from 'managers/playlists-manager';

@inject(DialogController, EventAggregator, TracksManager, PlaylistsManager)
export class SourceCodeDisplay {

  @bindable track;
  constructor(controller, eventAggregator, tracksManager, playlistsManager) {
    this.controller = controller;
    this._eventAggregator = eventAggregator;
    this._tracksManager = tracksManager;
    this._playlistsManager = playlistsManager;
  }

  activate(model) {
    this.track = model.track;
    this.playListName = '';
    console.info('this.track', this.track);
  }

  attached() {
    this.input = document.getElementById('playlist-input');
    this.input.focus();

    this.playlistsChanged = this._eventAggregator.subscribe('playlists-changed', playlists => {
      this.playlists = playlists.filter(pl => !this.track.playlists.find(_ => _ == pl.name));
    });
    this.getPlaylists();
  }

  detached() {
    this.playlistsChanged.dispose();
  }

  getPlaylists() {
    this.loading = true;
    return this._playlistsManager.getPlaylists()
      .then(playlists => {
        this.loading = false;
        this.track._playlists = this.track.playlists
          .map(pl => {

            const item = {
              name: pl,
              count: playlists.find(_ => _.name == pl).tracks.length
            };

            return item;
          })
      })
      .catch(error => {
        this.loading = false;
        console.error('getPlaylists', error);
      });
  }

  addPlaylist(playlistName) {
    this.playListName = playlistName;
    this.addToPlaylist();

    this.input.focus();
  }

  addToPlaylist() {
    this.loading = true;
    return this._tracksManager.savePlaylist(this.track.id, this.playListName, false)
      .then(track => {
        this.loading = false;
        this.playListName = '';
        this.track.playlists = track.playlists;
        this._eventAggregator.publish('tracks-playlists-changed', this.track.playlists);

        this.getPlaylists();
      })
      .catch(error => {
        this.loading = false;
        console.error('addToPlaylist', error);
      });
  }

  removeFromPlaylist(playlist) {
    const test = confirm(`do you really want to remove "${this.track.displayTitle}" from playlist "${playlist.name}"`);
    if (test) {
      this.loading = true;
      return this._tracksManager.savePlaylist(this.track.id, playlist.name, true)
        .then(track => {
          this.loading = false;
          this.track.playlists = track.playlists;
          this._eventAggregator.publish('tracks-playlists-changed', this.track.playlists);

          this.getPlaylists();
        })
        .catch(error => {
          this.loading = false;
          console.error('removeFromPlaylist', error);
        });
    }
  }

  async openYoutube(){
    await electronAPI.openYoutube(this.track.id);
  }

  ok() {
    this.controller.ok({ track: this.track });
  }
}

export class FilterValueConverter {
  toView(playlists, search) {
    if (!search || !search.length) return playlists;
    return playlists.filter(_ => _.name.toLowerCase().startsWith(search));
  }
}
