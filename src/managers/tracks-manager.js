export class TracksManager {

  constructor(apiClient) {
    this._apiClient = apiClient;
  }

  async getTracks(page, size, playlistId) {
    const tracks = await db.getTracks(page, size, playlistId);
    return tracks;
  }

  async getTrack(trackId){
    const track = await db.getTrack(trackId);
    return track;
  }

  async jumpToTrack(trackId, size, playlistId) {
    const page = await db.jumpToTrack(trackId, size, playlistId);
    return page;
  }

  async deleteTrack(trackId) {
    const track = await db.deleteTrack(trackId);
    return track;
  }

  async nextTrack(trackId) {
    const track = await db.nextTrack(trackId);
    return track;
  }

  savePlaylist(trackId, playlist, isDelete) {
    const data = {
      name: playlist,
      isDelete: isDelete
    };
    const result = db.savePlaylist(trackId, data);
    return result;
  }

}
