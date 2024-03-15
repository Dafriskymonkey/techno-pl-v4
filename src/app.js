import { inject } from 'aurelia-framework';
import { AppConfig } from "./app-config";
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogService } from 'aurelia-dialog';

@inject(EventAggregator, DialogService)
export class App {

  message = 'Hello Technoooooo!!';

  constructor(eventAggregator, dialogService) {
    this._eventAggregator = eventAggregator;
    this._dialogService = dialogService;
  }

  async activate(){
    this.missingTrackFiles = await db.init();
  }

  async attached() {
    electronAPI.getTracks((event, value) => {
      this._eventAggregator.publish('main:get-tracks', value);
    });

    electronAPI.onMessage((event, message) => {
      this._eventAggregator.publish('api:message', message);
    });

    db.onYtDlpOutput((event, output) => {
      console.info('onYtDlpOutput', output);
      this._eventAggregator.publish('yt-dlp:output', output);
    });

    console.info('this.missingTrackFiles', this.missingTrackFiles);
    if(!this.missingTrackFiles.length) return;
    this._dialogService.open({
      viewModel: PLATFORM.moduleName('vcs/home/missing-track-files'), model: {
        missingTrackFiles: this.missingTrackFiles
      }, lock: true
    }).whenClosed(response => {
      if (response.wasCancelled) return;
    });
  }

  configureRouter(config, router) {
    config.title = 'Beathub';
    config.map(AppConfig.routes);
    config.fallbackRoute('');

    this.router = router;
  }

}
