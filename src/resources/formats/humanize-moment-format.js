import moment from 'moment';

export class HumanizeMomentFormatValueConverter {
  toView(value) {
    if (!value) return null;
    let m = moment(value, 'YYYYMMDD');
    if (!m.isValid()) return null;
    return moment.duration(moment().diff(m)).humanize();
  }
}
