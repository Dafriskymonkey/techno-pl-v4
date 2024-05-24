export class FilterValueConverter {
    toView(playlists, search) {
      if (!search || !search.length) return playlists;
      return playlists.filter(_ => _.name.toLowerCase().startsWith(search));
    }
  }