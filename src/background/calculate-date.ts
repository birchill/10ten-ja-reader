import { EraInfoDate, EraInfoTimeSpan } from '../content/dates';
import { DateArray, eraInfo } from '../utils/era-info';

export function calculateEraDateTimeSpan({
  era,
  year,
  month,
  day,
}: {
  era: string;
  year: number;
  month?: number;
  day?: number;
}): EraInfoTimeSpan | undefined {
  let dateStart: EraInfoDate | undefined = undefined;
  let dateEnd: EraInfoDate | undefined = undefined;

  if (!day) {
    const res = calculateTimeSpanOfEraYearOrMonth(era, year, month);

    if (!res) {
      return undefined;
    }

    dateStart = dateToEraInfoDate(res.dateStart);
    dateEnd = dateToEraInfoDate(res.dateEnd);
  } else if (month) {
    dateStart = dateToEraInfoDate(toGregorianDate(era, year, month, day));
  }

  if (!dateStart) {
    return undefined;
  }

  return { dateStart, dateEnd };
}

function dateToEraInfoDate(date: Date): EraInfoDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function dateArrayToDate(dateArray: DateArray, dayOffset: number = 0) {
  return new Date(dateArray[0], dateArray[1] - 1, dateArray[2] + dayOffset);
}

function toGregorianDate(
  era: string,
  year: number,
  month: number,
  day: number
): Date {
  const dateArray = eraInfo[era].years[year][month];
  const date = dateArrayToDate(dateArray, day - 1);
  return date;
}

function calculateTimeSpanOfEraYearOrMonth(
  era: string,
  year: number,
  month?: number
): { dateStart: Date; dateEnd: Date } | undefined {
  const eraData = eraInfo[era];

  const startOfEraDate = dateArrayToDate(eraData.start);
  const endOfEraDate = dateArrayToDate(eraData.end);

  if (!startOfEraDate || !endOfEraDate) {
    return undefined;
  }

  if (!(year in eraData.years)) {
    return undefined;
  }

  let startOfTimeSpan = startOfEraDate;

  if (month) {
    if (!(month in eraData.years[year])) {
      return undefined;
    }

    const startOfMonthArray = eraData.years[year][month];

    startOfTimeSpan = dateArrayToDate(startOfMonthArray);
  } else if (1 in eraData.years[year]) {
    const startOfYearArray = eraData.years[year][1];

    startOfTimeSpan = dateArrayToDate(startOfYearArray);
  }

  const laterStartDate =
    startOfEraDate > startOfTimeSpan ? startOfEraDate : startOfTimeSpan;

  let endOfTimeSpan = endOfEraDate;

  if (month) {
    const nextMonthIsLeapMonth = month > 0 && (-month) in eraData.years[year];
    const isLastMonthInYear = !nextMonthIsLeapMonth && Math.abs(month) === 12;

    let nextYear = year;
    let nextMonth = month;

    if (nextMonthIsLeapMonth) {
      nextMonth = -nextMonth;
    } else if (isLastMonthInYear) {
      nextYear++;
      nextMonth = 1;
    } else {
      nextMonth = Math.abs(nextMonth) + 1;
    }

    if (nextYear in eraData.years && nextMonth in eraData.years[nextYear]) {
      const startOfNextMonthArray = eraData.years[nextYear][nextMonth];

      endOfTimeSpan = dateArrayToDate(startOfNextMonthArray, -1);
    }
  } else {
    const notLastYearOfEra = year + 1 in eraData.years;
    if (notLastYearOfEra) {
      const startOfNextYearArray = eraData.years[year + 1][1];

      endOfTimeSpan = dateArrayToDate(startOfNextYearArray, -1);
    }
  }

  const earlierEndDate =
    endOfEraDate < endOfTimeSpan ? endOfEraDate : endOfTimeSpan;

  return { dateStart: laterStartDate, dateEnd: earlierEndDate };
}
