import { PLATFORM } from 'aurelia-pal';

export class AppConfig {
  static routes = [
    {
      route: ['', 'home'],
      moduleId: PLATFORM.moduleName('vcs/home/home'),
      title: 'tracks',
    }
  ];
}
