declare module 'moment-hijri' {
  import { Moment } from 'moment';
  
  interface HijriMoment extends Moment {
    iDate(): number;
    iMonth(): number;
    iYear(): number;
    iDayOfYear(): number;
    iWeek(): number;
    iWeekYear(): number;
    iWeekday(): number;
  }
  
  function moment(date?: Date | string | number): HijriMoment;
  
  export = moment;
}
