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

    this.activeOnly = true;
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
      if (!this.track) return;
      this.playlists = playlists
        .filter(pl => !this.track.playlists.find(_ => _ == pl.name))
        .sort((a, b) => b.tracks.length - a.tracks.length);
    });

    this.playlistChanged = this._eventAggregator.subscribe('playlist-changed', async playlist => {
      if (!this.track) return;

      let oldName = null;

      let index = this.track._playlists.map(pl => pl.id).indexOf(playlist.id);
      if (index >= 0) {
        oldName = this.track._playlists[index].name;
        this.track._playlists[index].name = playlist.name;
      }

      index = this.track.playlists.indexOf(oldName);
      if (index >= 0) {
        this.track.playlists[index] = playlist.name;
      }
    });

    this.getPlaylists();
  }

  detached() {
    this.playlistsChanged.dispose();
    this.playlistChanged.dispose();
  }

  getPlaylists() {
    this.loading = true;
    return this._playlistsManager.getPlaylists()
      .then(playlists => {
        this.loading = false;
        if (!this.track) return;
        this.track._playlists = this.track.playlists
          .map(pl => {
            const playlist = playlists.find(_ => _.name == pl);

            const item = {
              id: playlist.id,
              name: pl,
              count: playlist.tracks.length,
              active: playlist.active
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

  async addToPlaylist() {
    if (!this.track) return;

    const plName = this.playListName;
    await this.savePlaylist(this.playListName);
    this.playListName = '';

    const playlist = this.playlists.find(_ => _.name == plName);
    if (!playlist || !playlist.links || !playlist.links.length) return;

    for (let index = 0; index < playlist.links.length; index++) {
      const link = playlist.links[index];
      await this.savePlaylist(link);
    }
  }

  savePlaylist(plName) {
    this.loading = true;
    return this._tracksManager.savePlaylist(this.track.id, plName, false)
      .then(track => {
        this.loading = false;
        this.track.playlists = track.playlists;
        this._eventAggregator.publish('tracks-playlists-changed', this.track.playlists);

        this.getPlaylists();
      })
      .catch(error => {
        this.loading = false;
        console.error('addToPlaylist', error);
      });
  }

  async removeFromPlaylist(playlist) {
    if (!this.track) return;
    const test = await electronAPI.showConfirm(`do you really want to remove "${this.track.title}" from playlist "${playlist.name}"`);
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

  async openYoutube() {
    if (!this.track) return;
    await electronAPI.openYoutube(this.track.id);
  }

  trackChanged() {
    if (!this.track) return;
    this.getPlaylists();
  }
}
