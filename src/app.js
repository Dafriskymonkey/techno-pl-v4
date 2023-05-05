import { inject } from 'aurelia-framework';
import { AppConfig } from "./app-config";
import { EventAggregator } from 'aurelia-event-aggregator';

@inject(EventAggregator)
export class App {

  message = 'Hello Technoooooo!!';
  marketData = [];

  constructor(eventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  attached() {
    electronAPI.getTracks((event, value) => {
      this._eventAggregator.publish('main:get-tracks', value);
    });
  }

  configureRouter(config, router) {
    config.title = 'Beathub';
    config.map(AppConfig.routes);
    config.fallbackRoute('');

    this.router = router;
  }

}
