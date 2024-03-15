import { inject, bindable, customElement } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { TracksManager } from 'managers/tracks-manager';
import { PlaylistsManager } from 'managers/playlists-manager';

@customElement('track-info')
@inject(EventAggregator, TracksManager, PlaylistsManager)
export class SourceCodeDisplay {

  @bindable track;
  constructor(eventAggregator, tracksManager, playlistsManager) {
    this._eventAggregator = eventAggregator;
    this._tracksManager = tracksManager;
    this._playlistsManager = playlistsManager;

    this.playListName = '';
  }

  // activate(model) {
  //   this.track = model.track;
    
  //   console.info('this.track', this.track);
  // }

  attached() {
    this.input = document.getElementById('playlist-input');
    setTimeout(() => {
      this.input.focus();
    }, 10);

    this.playlistsChanged = this._eventAggregator.subscribe('playlists-changed', playlists => {
      if(!this.track) return;
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
        if(!this.track) return;
        this.track._playlists = this.track.playlists
          .map(pl => {

            const item = {
              name: pl,
              count: playlists.find(_ => _.name == pl).tracks.length
            };

            return item;
          });
      })
      .catch(error => {
        this.loading = false;
        console.error('getPlaylists', error);
      });
  }

  addPlaylist(playlistName) {
    this.playListName = playlistName;
    this.addToPlaylist();

    setTimeout(() => {
      this.input.focus();
    }, 10);
  }

  addToPlaylist() {
    if(!this.track) return;
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
    if(!this.track) return;
    const test = confirm(`do you really want to remove "${this.track.title}" from playlist "${playlist.name}"`);
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
    if(!this.track) return;
    await electronAPI.openYoutube(this.track.id);
  }

  trackChanged(){
    if(!this.track) return;
    this.getPlaylists();
  }
}

export class FilterValueConverter {
  toView(playlists, search) {
    if (!search || !search.length) return playlists;
    return playlists.filter(_ => _.name.toLowerCase().startsWith(search));
  }
}
