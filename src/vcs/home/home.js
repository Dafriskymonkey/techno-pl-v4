
import { inject, bindable } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogService } from 'aurelia-dialog';
import { TracksManager } from 'managers/tracks-manager';
import { PlaylistsManager } from 'managers/playlists-manager';

@inject(DialogService, EventAggregator, TracksManager, PlaylistsManager)
export class Home {

  @bindable track = null;
  @bindable page = 1;
  @bindable playlistId = null;
  constructor(dialogService, eventAggregator, tracksManager, playlistsManager) {
    this._dialogService = dialogService;
    this._tracksManager = tracksManager;
    this._playlistsManager = playlistsManager;
    this._eventAggregator = eventAggregator;

    this.size = 10;
    this.count = 0;
    this.total = 0;
  }

  async attached() {
    await this.getTracks();
    this.track = this.tracks[0];

    this.player = document.getElementById('player');

    this.player.onloadeddata = () => {
      // this.player.currentTime = this.player.duration * 4 / 10;
      this.player.play();
    };

    this.player.onended = () => {
      this.nextTrack();
    };

    this.player.onplay = () => {
      this.playing = true;
    };

    this.player.onpause = () => {
      this.playing = false;
    };

    this.keydown = event => {
      switch (event.key) {
        case ' ':
          this.playPause();
          event.preventDefault();
          break;
        case 'm':
          this.player.muted = !this.player.muted;
          event.preventDefault();
          break;
        // case 'b':
        //   this.openTrackInfo(this.track);
        //   event.preventDefault();
        //   break;
        case 'j':
          this.openTrackInfo(this.track);
          event.preventDefault();
          break;
        case 'ArrowLeft':
          this.move(true);
          event.preventDefault();
          break;
        case 'ArrowRight':
          this.move(false);
          event.preventDefault();
          break;
        // case 'ArrowUp':
        //   this.prevTrack();
        //   event.preventDefault();
        // case 'ArrowDown':
        //   this.nextTrack();
        //   event.preventDefault();
        //   break;
        case 'd':
          if (this.track) this.deleteTrack(this.track);
          event.preventDefault();
          break;
        case 'Delete':
          if (this.track) this.deleteTrack(this.track);
          event.preventDefault();
          break;
        case 'z':
          this.prevTrack();
          event.preventDefault();
          break;
        case 'b':
          this.nextTrack();
          event.preventDefault();
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', this.keydown);

    this.trackPlaylistsChanged = this._eventAggregator.subscribe('tracks-playlists-changed', playlists => {
      if (!this.track) return;
      const index = this.tracks.map(t => t.id).indexOf(this.track.id);
      this.tracks[index].playlists = playlists;
      this.track.playlists = playlists;
    });

    this.playlistsChanged = this._eventAggregator.subscribe('playlists-changed', playlists => {
      this.playlists = playlists;
    });

    this.getTracksEvent = this._eventAggregator.subscribe('main:get-tracks', async value => {
      this.page = 1;
      this.size = 10;
      this.count = 0;
      this.total = 0;
      this.playlistId = null;
      await this.getTracks();
      if (this.tracks.length) this.track = this.tracks[0];
    });

    this.getPlaylists();
  }

  detached() {
    document.removeEventListener('keydown', this.keydown);
    this.trackPlaylistsChanged.dispose();
    this.playlistsChanged.dispose();
    this.getTracksEvent.dispose();
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

  getTracks() {
    this.loading = true;
    return this._tracksManager.getTracks(this.page, this.size, this.playlistId)
      .then(result => {
        this.loading = false;
        this.page = result.pagination.page;
        this.count = result.pagination.pageCount;
        this.size = result.pagination.size;
        this.total = result.total;
        this.tracks = result.entities;
      })
      .catch(error => {
        this.loading = false;
        console.error('getTracks', error);
      });
  }

  async playlistIdChanged(){
    this.page = 1;
    this.size = 10;
    this.count = 0;
    this.total = 0;
    await this.getTracks();
    if(this.tracks.length)this.track = this.tracks[0];
  }

  prevPage() {
    if (this.page > 1) this.page--;
    else this.page = this.count;

    return this.getTracks();
  }

  nextPage() {
    if (this.page < this.count) this.page++;
    else this.page = 1;

    return this.getTracks();
  }

  jumpToPage() {
    if (this.page < 1) {
      this.page = 1;
    }
    if (this.page > this.count) {
      this.page = this.count;
    }
    this.getTracks();
  }

  setTrack(track) {
    if (this.track && this.track.id == track.id) this.track = null;
    else this.track = track;
  }

  async trackChanged(newTrack, oldTrack) {
    console.info('trackChanged', this.track);
    if (this.track) {
      const track = await this._tracksManager.getTrack(this.track.id);
      const audioBlob = new Blob([track], { type: 'audio/mp3' });
      const audioURL = URL.createObjectURL(audioBlob);
      this.player.src = audioURL;
      this.player.load();
    }
    else {
      this.player.src = '';
      this.player.pause();
    }
  }

  async prevTrack() {
    if (!this.track) return;

    const index = this.tracks.map(t => t.id).indexOf(this.track.id);

    if (index > 0) this.track = this.tracks[index - 1];
    else {
      await this.prevPage();
      this.track = this.tracks[this.tracks.length - 1];
    }
  }

  async nextTrack() {
    if (!this.track) return;

    const index = this.tracks.map(t => t.id).indexOf(this.track.id);

    if (index < this.tracks.length - 1) this.track = this.tracks[index + 1];
    else {
      await this.nextPage();
      this.track = this.tracks[0];
    }
  }

  jumpToTrack() {
    if (!this.track) return;
    return this._tracksManager.jumpToTrack(this.track.id, this.size)
      .then(result => {
        this.page = result;
        this.getTracks();
      })
      .catch(error => {
        console.error('jumpToTrack', error);
      });
  }

  playPause() {
    if (this.playing) this.player.pause();
    else this.player.play();
  }

  // play() {
  //   this.player.play();
  // }

  // pause() {
  //   this.player.pause();
  // }

  move(back) {
    let mul = back ? -1 : 1;
    this.player.currentTime = this.player.currentTime + mul * 5;
  }

  seek(percentage) {
    this.player.currentTime = this.player.duration * percentage / 100;
  }

  async deleteTrack(track) {
    let test = confirm(`do you really want to delete "${track.title}" ??`);
    if (!test) return;

    await this._tracksManager.deleteTrack(track.id);

    await this.getTracks();
    this.track = await this._tracksManager.nextTrack(track.id);
  }

  openTrackInfo(track) {
    document.removeEventListener('keydown', this.keydown);
    this._dialogService.open({
      viewModel: PLATFORM.moduleName('vcs/home/track-info'), model: {
        track: track
      }, lock: false
    }).whenClosed(response => {
      document.addEventListener('keydown', this.keydown);
      if (response.wasCancelled) return;
      this.track.playlists = response.output.track.playlists;
    });
  }

}
