import moment from 'moment';

export class MomentFormatValueConverter {
  toView(value) {
    if (!value) return null;
    let m = moment(value);
    if (!m.isValid()) return null;
    let format = 'DD/MM/YYYY';
    let result = m.format(format);
    return result;
  }
}
