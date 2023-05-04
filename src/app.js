import { inject } from 'aurelia-framework';
import { AppConfig } from "./app-config";

// @inject()
export class App {

  message = 'Hello Technoooooo!!';
  marketData = [];

  constructor() {
    
  }



  configureRouter(config, router) {
    config.title = 'Beathub';
    config.map(AppConfig.routes);
    config.fallbackRoute('');

    this.router = router;
  }

}
