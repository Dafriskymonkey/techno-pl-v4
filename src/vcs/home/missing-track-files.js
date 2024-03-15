import { inject, bindable } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';

@inject(DialogController, EventAggregator)
export class MissingTrackFiles {

  @bindable track;
  constructor(controller, eventAggregator) {
    this.controller = controller;
    this._eventAggregator = eventAggregator;

    this.loading = false;
    this.stopping = false;

    this.outputs = [];
  }

  activate(model) {
    this.missingTrackFiles = model.missingTrackFiles;
  }

  async attached() {
    this.ytDlpOutputEvent = this._eventAggregator.subscribe('yt-dlp:output', (output) => {
      this.outputs.push(output);

      if(this.outputs.length > 100){
        this.outputs.splice(0, this.outputs.length - 100);
      }

      this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
    });

    this.consoleElement = document.getElementById('console');
  }

  detached() {
    this.ytDlpOutputEvent.dispose();
  }

  async getMissingTracks() {
    this.missingTrackFiles = await db.getMissingTracks();
  }

  async ok() {
    await this.getMissingTracks();
    if (!this.missingTrackFiles.length) return;
    this.outputs = [];
    this.loading = true;
    await db.updateYtDlp();
    for (this.index = 0; this.index < this.missingTrackFiles.length; this.index++) {
      const trackId = this.missingTrackFiles[this.index];
      try {
        await db.downloadTrack(trackId);
        console.clear();
        if(this.stopping) {
          this.stopping = false;
          break;
        }
      } catch { }
    }
    this.loading = false;
  }

  stop(){
    this.stopping = true;
  }

}
