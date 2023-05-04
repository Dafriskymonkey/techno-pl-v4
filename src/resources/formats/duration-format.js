import moment from 'moment';

export class DurationFormatValueConverter {
  toView(value) {
    if (!value) return null;

    let duration = moment.duration(value, 'seconds');
    if (!duration.isValid()) return null;
    return moment.utc(duration.asMilliseconds()).format("mm:ss");
  }
}
