import { inject } from 'aurelia-framework';
import { OsApiClient } from 'services/os-api-client';
import { EventAggregator } from 'aurelia-event-aggregator';

let _endpoint = 'api/playlists/';

@inject(OsApiClient, EventAggregator)
export class PlaylistsManager {

  constructor(apiClient, eventAggregator) {
    this._apiClient = apiClient;
    this._eventAggregator = eventAggregator;

    this.playlists = [];
  }

  async getPlaylists() {

    const playlists = await db.getPlaylists();
    this.playlists = playlists;
    this._eventAggregator.publish('playlists-changed', this.playlists);
    return this.playlists;
  }

  async downloadPlaylist(playlistId){
    return await db.downloadPlaylist(playlistId);
  }

}
