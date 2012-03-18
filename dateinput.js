/**
 * jQuery DateInput
 * *jQuery plugin that provides calendar-based date entry widget*
 *
 * @author Monwara LLC / Branko Vukelic <branko@herdhound.com>
 * @version 0.0.2
 */

(function(define) {
  
  define(function(require) {
    // DEPS
    
    var $ = require('jquery');

    // TEMPLATES
  
    var tCalendarCell = '<a href="JavaScript:void(0);" ' +
      'class="dateinput-calendar-cell $PAST $TODAY $SUNDAY" ' +
      'data-year="$YEAR" ' +
      'data-month="$MONTH" ' +
      'data-date="$DATE"' +
      '>$LABEL</a>';

    var tOtherMonthCell = '<a href="JavaScript:void(0);" ' +
      'class="dateinput-calendar-cell ' +
      'dateinput-calendar-othermonth $PAST $TODAY $SUNDAY" ' +
      'data-year="$YEAR" ' +
      'data-month="$MONTH" ' +
      'data-date="$DATE"' +
      '>$LABEL</a>';

    var tCalendarWeek = '<div class="dateinput-calendar-week">$CELLS</div>';

    var tWeeknameCell = '<span class="dateinput-weekname $SUNDAY">$LABEL</span>';

    var tWidget = [
      '<div class="dateinput-container">',
      '<div class="dateinput-inner">',

      '<div class="dateinput-monthbar">',

      '<span class="dateinput-monthbar-month">$MONTH</span>',

      '<span class="dateinput-monthbar-button dateinput-prevmonth">',
      '<a class="dateinput-prevmonth" href="JavaScript:void(0)">&lt;</a>',
      '</span>',

      '<span class="dateinput-monthbar-button dateinput-nextmonth">',
      '<a class="dateinput-nextmonth" href="JavaScript:void(0)">&gt;</a>',
      '</span>',

      '</div>', // Closes monthbar
      
      '<div class="dateinput-calendar">' +

      '<div class="dateinput-weeknames">',
      '$WEEKNAMES',
      '</div>',

      '<div class="dateinput-calendar-weeks">$CALENDAR</div>',

      '</div>', // Closes calendar

      '<div class="dateinput-help">$HELP</div>',

      '</div></div>' // Closes inner and outer containers
    ].join('');

    // CONSTANTS

    var DAYS = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var PAST_CLASS = 'dateinput-past';
    var TODAY_CLASS = 'dateinput-today';
    var SUNDAY_CLASS = 'dateinput-sunday';
    var SEL_CLASS = 'dateinput-selected';
    var WEEK_MAPPINGS = 'ssun smon stue swed sthu sfri ssat'.split(' ');
    var MONTH_MAPPINGS = 'jan feb mar apr may jun jul aug sep oct nov dec'.
      split(' ');
    var MONTHS = 'ljan lfeb lmar lapr lmay ljun ljul laug lsep loct lnov ldec'.
      split(' ');
    var MNTH = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
    var LDY = 'lsun lmon ltue lwed lthu lfri lsat'.split(' ');
    var DY = 'sun mon tue wed thu fri sat'.split(' ');
    var DAYMS = 24 * 60 * 60 * 1000;

    // UTILITY FUNCTIONS
    
    /**
     * Divisibility test
     *
     * @param {Number} n Numerator
     * @param {Number} d Divisor
     * @return {Boolean} Returns true if divisible
     */
    function isDiv(n, d) {
      return n % d === 0;
    }

    /**
     * Leap year test
     *
     * @param {Number} year
     * @return {Boolean} Returns true if leap year
     */
    function isLeap(year) {
      return isDiv(year, 4) || (!isDiv(year, 100) || isDiv(year, 400)) ? 
        true : false;
    }

    /**
     * Get number of days in month
     *
     * @param {Number} month Month number where 1 is January
     * @param {Number} year Year of the month
     * @return {Number} Number of days in the month
     */
    function getDIM(month, year) {
      month = month - 1; // Convert to 0-index first
      return DAYS[month] ? DAYS[month] : isLeap(year) ? 29 : 28;
    }

    /**
     * Returns today's date in local time
     *
     * @return {Date} Today's date with hours reset to 0:00:00.000
     */
    function getToday() {
      return function(d) {
        return new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        );
      }(new Date());
    }

    /**
     * Check if supplied year, month, and date are today
     *
     * @param {Number} y Year
     * @param {Number} m Month
     * @param {Number} d Date
     * @return {Boolean} Returns true if supplied date is today
     */
    function isToday(y, m, d) {
      var today = getToday();
      return today.getFullYear() === y &&
        today.getMonth() + 1 === m &&
        today.getDate() === d;
    }

    /**
     * Check if supplied year, month, and date are past
     *
     * @param {Number} y Year
     * @param {Number} m Month
     * @param {Number} d Date
     * @return {Boolean} Returns true if specified date is in the past
     */
    function isPast(y, m, d) {
      var today = getToday();
      var date = new Date(y, m - 1, d);
      return date - today < 0;
    }

    /**
     * Shift date by specified number of monts
     *
     * @param {Date} date Date to shift
     * @param {Number} months Integer number of months (positive or negative)
     * @return {Date} Shifted date
     */
    function shiftMonths(date, months) {
      var mon0AD = date.getFullYear() * 12 + (date.getMonth() + 1);
      var newMon0AD = mon0AD + months;
      return new Date(~~(newMon0AD / 12), (newMon0AD % 12) -1, date.getDate());
    }

    /**
     * Shift date by specified number of days
     *
     * @param {Date} date Date to shift
     * @param {Number} days Integer number of days (positive or negative)
     * @return {Date} Shifted date
     */
    function shiftDays(date, days) {
      // Use 12pm as time, to avoid mixup due to daylight savings
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
      date.setTime(date.getTime() + (days * DAYMS));
      // Reset hours back to 12am
      date.setHours(0);
      return date;
    }

    /**
     * Build month-worth of cells for a given month and given year
     *
     * @param {Number} month Month number where 1 is January
     * @param {Number} [year] Year for which to construct calendar (default: 
     * current year)
     * @param {Boolean} [sundayFirst] Whether Sunday is first day of week 
     * (default: true)
     * @param {Boolean} [noPast] Disable dates in past (default: false)
     */
    function buildMonth(month, year, sundayFirst, noPast) {
      year = typeof year === 'number' ? year : new Date().getFullYear();
      sundayFirst = typeof sundayFirst === 'boolean' ? sundayFirst : true;
      noPast = typeof noPast === 'boolean' ? noPast : false;

      var i; // index to be used in for loops
      var l; // length holders to be used in for loops

      // How many days in a month?
      var dim = getDIM(month, year);

      // Previous and next month

      var prevM;
      var prevY; // year of the previous month
      var dimPrev;

      var nextM;
      var nextY; // year of the next month
      var dimNext;

      switch(month) {
        case 1:
          prevM = 12;
          prevY = year - 1;
          nextM = 2;
          nextY = year;
          break;

        case 12:
          prevM = 11;
          prevY = year;
          nextM = 1;
          nextY = year + 1;
          break;
        
        default:
          prevM = month - 1;
          prevY = nextY = year;
          nextM = month + 1;
      }

      dimPrev = getDIM(prevM, prevY);
      dimNext = getDIM(nextM, nextY);

      // What day of week does this month start on?
      var firstWeekDay = (new Date(year, month - 1, 1)).getDay();
      var firstCellPos = sundayFirst ? firstWeekDay : firstWeekDay - 1;
      firstCellPos = firstCellPos === -1 ? 6 : firstCellPos;

      // Week matrix
      var weeks = [[]];

      // Previous month row:
      // Create an empty array that is just short of `firstCellPos`, and 
      // populate it with last days from the previous months.
      for (i = firstCellPos; i; i--) {
        var d = dimPrev - i + 1;
        weeks[0].push(
          tOtherMonthCell.
            replace('$PAST', noPast && isPast(prevY, prevM, d) ? PAST_CLASS : '').
            replace('$TODAY', isToday(prevY, prevM, d) ? TODAY_CLASS : '').
            replace('$YEAR', prevY).
            replace('$MONTH', prevM).
            replace('$DATE', d).
            replace('$LABEL', d)
        );
      }

      // Complete first week:
      // Fill the firstWeek array with first few days of current month 
      // in order to complete the length of 7.
      for (i = 1; i <= 7 - firstCellPos; i++) {
        weeks[0].push(
          tCalendarCell.
            replace('$PAST', noPast && isPast(year, month, i) ? PAST_CLASS : '').
            replace('$TODAY', isToday(year, month, i) ? TODAY_CLASS : '').
            replace('$YEAR', year).
            replace('$MONTH', month).
            replace('$DATE', i).
            replace('$LABEL', i)
        );
      }

      // Calculate the number of remaining weeks
      var weeksRemaining = ~~((dim - 7 + firstCellPos) / 7);
      if ((dim - 7 + firstCellPos) % 7) {
        weeksRemaining++;
      }

      function buildWeek(firstDay) {
        var week = [];
        var d;
        var c;
        if (firstDay > dim) {
          return;
        }
        for (c = 0; c < 7; c++) {
          d = firstDay + c + 1; // Currently processing
          if (d > dim) { return week; }
          week.push(
            tCalendarCell.
              replace('$PAST', noPast && isPast(year, month, d) ? PAST_CLASS : '').
              replace('$TODAY', isToday(year, month, d) ? TODAY_CLASS : '').
              replace('$YEAR', year).
              replace('$MONTH', month).
              replace('$DATE', d).
              replace('$LABEL', d)
          );
        }
        return week;
      }

      function pushIfAny(w) {
        return w && weeks.push(w);
      }

      for (i = 0; i < weeksRemaining; i++) {
        pushIfAny(buildWeek(7 - firstCellPos + i * 7));
      }

      // Add next month:
      // Calculate the days remaining to fill the last week and add that many 
      // days of the next month.
      var lastWeekIdx = weeks.length - 1;
      var daysRemaining = 7 - weeks[lastWeekIdx].length;
      for (i = 1; i <= daysRemaining; i++) {
        weeks[lastWeekIdx].push(
          tOtherMonthCell.
            replace('$PAST', noPast && isPast(nextY, nextM, i) ? PAST_CLASS : '').
            replace('$TODAY', isToday(nextY, nextM, i) ? TODAY_CLASS : '').
            replace('$YEAR', nextY).
            replace('$MONTH', nextM).
            replace('$DATE', i).
            replace('$LABEL', i)
        );
      }

      // Fill the calendar up to six weeks
      (function addMore(weeksRemaining, startDay, idx) {
        if (!weeksRemaining) return;

        startDay++;
        weeks[idx] = [];

        for (i = 0; i < 7; i++) {
          startDay += i;
          weeks[idx].push(
            tOtherMonthCell.
            replace('$PAST', noPast && isPast(nextY, nextM, i) ? PAST_CLASS : '').
            replace('$TODAY', isToday(nextY, nextM, i) ? TODAY_CLASS : '').
            replace('$YEAR', nextY).
            replace('$MONTH', nextM).
            replace('$DATE', startDay).
            replace('$LABEL', startDay)
          );
        }

        addMore(6 - weeks.length, startDay, weeks.length);
      }(6 - weeks.length, daysRemaining, weeks.length));


      // Add sunday classes for each week
      var sundayPos = sundayFirst ? 0 : 6;
      weeks = weeks.map(function(week) {
        return week.map(function(day, idx) {
          return day.replace(
            '$SUNDAY',
            sundayPos === idx ? SUNDAY_CLASS : ''
          );
        });
      });

      return weeks.map(function(week) {
        return tCalendarWeek.
          replace('$CELLS', week.join(''));
      }).join('');
    }

    /**
     * Zero-pad a number
     *
     * @param {Number} i The number to zero-pad
     * @param {Number} digits Total number of digits
     */
    var zeroPad = function(i, digits) {
      digits = digits > 0 ? digits : 3;
      return (new Array(1 + digits).join('0') + i).slice(-digits);
    };

    /**
     * Calculate the number within 0- or 1-max cycle
     *
     * For example, in a 1 to 12 cycle, 1 is 1, 5 is 5, 12 is 12, and 13 is 1 
     * again, 14 is 2, and so on...
     *
     * @param {Number} i Number to convert to number in a cycle
     * @param {Number} max Maximum value of the cycle
     * @param {Boolean} zeroIndex Whether cycle starts at 0
     */
    var cycle = function(i, max, zeroIndex) {
      zeroIndex = typeof zeroIndex === 'undefined' ? false : zeroIndex;
      return i % max || zeroIndex ? 0 : max;
    };

    /**
     * Format date using standard strf format strings
     *
     * @param {Date} d Date object
     * @param {String} format Format string
     * @param {Object} lang Language mappings
     */
    function dateFormat(d, format, lang) {
      var tokens = {
        '%a': lang[DY[d.getDay()]],
        '%A': lang[LDY[d.getDay()]],
        '%b': lang[MNTH[d.getMonth()]],
        '%B': lang[MONTHS[d.getMonth()]],
        '%c': d.toLocaleString(),
        '%d': zeroPad(d.getDate(), 2),
        '%D': d.getDate().toString(),
        '%H': zeroPad(d.getHours(), 2, true),
        '%i': cycle(d.getHours(), 12),
        '%I': zeroPad(cycle(d.getHours(), 12), 2),
        '%m': zeroPad(d.getMonth() + 1, 2),
        '%M': zeroPad(d.getMinutes(), 2, true),
        '%N': d.getMinutes().toString(),
        '%p': d.getHours() > 0 && d.getHours() < 13 ? 'am' : 'pm',
        '%s': d.getSeconds().toString(),
        '%S': zeroPad(d.getSeconds(), 2, true),
        '%w': d.getDay().toString(),
        '%y': d.getFullYear().toString().slice(-2),
        '%Y': d.getFullYear().toString(),
        '%x': d.toLocaleDateString(),
        '%X': d.toLocaleTimeString(),
        '%z': '' + Math.floor(d.getTimezoneOffset() / 60) + d.getTimezoneOffset() % 60,
        '%%': '%'
      };

      for (var token in tokens) {
        format = format.replace(token, tokens[token]);
      };

      return format;
    };


    // MAIN PLUGIN

    /**
     * # $.fn.dateInput(opts)
     *
     * To use the jQuery dateInput plugin, simply select elements with jQuery, 
     * and call the `dateInput()` method on the selection. You can optionally 
     * pass configuration parameters as a single object to the method.
     *
     * ## Configuration options
     *
     * Following options are available:
     *
     *  + `format` (String) The date format used to populate the input when 
     *    calendar cell is clicked. The format strings are more or less the 
     *    same ones used by `strftime` from C and Python. (default: '%D %b %Y')
     *  + `autoClose` (Boolean) Used with pop-up version, automatically closes
     *    the widget once user selects a date. (default: false)
     *  + `inline` (Boolean) Whether to replace the input, or pop-up when input
     *    is focused. The inline version creates a new hidden input that 
     *    replaces the original input, and copies `id`, `name`, and `value`
     *    attributes from it. (default: false)
     *  + `noPast` (Boolean) Do not allow selection of dates in the past. 
     *    (default: false)
     *  + `startDate` (Date) Date at which to initiate the calendar if the 
     *    input control has no value. Only month and year are used from the 
     *    date, so you can set day and time to any value. (default: current 
     *    date)
     *  + `sudayFirst` (Boolean) Whether Sunday will be displayed as first day 
     *    of the week or not (default: true)
     *  + `offset` (Number) Vertical offset from the input in px. (default: 4)
     *  + `zindex` (Any valid CSS z-index value) Sets the z-index value for
     *    calendar widget if supplied. (default: null)
     *  + `fadeOut` (Number) Fade out length in ms when closing pop-up 
     *    calendar. (default: 200)
     *  + `labels` (Object) Key-value pair of label identifiers and labels. 
     *    This defaults to English labels, and you can supply a traslated
     *    version of labels in any language. (default: English labels)
     *
     * ## Date formats
     *
     * When using the `format` option, you can supply any string as format. 
     * Special charactes prefixed with `%` can be used to modify date format.
     * Those are:
     *
     *  + `%a`: Abbreviated week day name (e.g., Sun)
     *  + `%A`: Full week day name (e.g., Sunday)
     *  + `%b`: Abbreviated month name (e.g., Aug)
     *  + `%B`: Full month name (e.g., August)
     *  + `%c`: Locale-specific format (uses `Date.prototype.toLocaleString()`)
     *  + `%d`: 2-digit date (e.g., 05)
     *  + `%D`: Non-zero-padded date (e.g., 5)
     *  + `%H`: 2-digit hour in 24-hour format (e.g., 18)
     *  + `%i`: Non-zero-padded hour in 12-hour format (e.g., 6)
     *  + `%I`: Zero-padded hour in 12-hour format (e.g., 06)
     *  + `%m`: 2-digit month (e.g., 08)
     *  + `%M`: Zero-padded minutes (e.g., 06)
     *  + `%N`: Non-zero-padded minutes (e.g., 6)
     *  + `%p`: 'am' / 'pm'
     *  + `%s`: Non-zero-padded seconds (e.g., 8)
     *  + `%S`: Zero-padded seconds (e.g., 08)
     *  + `%w`: 0-indexed week day
     *  + `%y`: 2-digit year (without century, e.g., 13)
     *  + `%Y`: 4-digit year (e.g., 2013)
     *  + `%x`: Same as %c, implemented for compatibility reasons
     *  + `%X`: Same as %c, implemented for compatibility reasons
     *  + `%z`: Timezone offset
     *  + '%%': Literal '%' character
     *
     * Note that week day / month names are not hard-coded. You can change the 
     * strings used for names by supplying alternatives as `label` option.
     *
     * ## Labels
     *
     * jQuery dateInput is fully translatable. The key-value pair of label 
     * identifiers and translated strings can be passed in as `label` option. 
     * Label identifiers are constructed according to these rules:
     *
     *  + Each identifier is a 3-letter abbreviation (e.g., 'mon', 'oct')
     *  + Default 3-letter abbreviation is the abbreviated version (e.g., 
     *    'mon' maps to 'Mon', and 'oct' maps to 'Oct').
     *  + Long versions have a 'l' prefix. (e.g., 'lmon' maps to 'Monday', and
     *    'loct' maps to 'October')
     *  + Short versions have 's'  prefix (applies only to week names. 
     *    (e.g., 'smon' maps to 'M')
     *
     * Example:
     *
     *   $('#mydate').dateInput();
     *
     * @param {Object} opts Configuration options
     *
     */
    $.fn.dateInput = function(opts) {

      // Attach widget to each matched element
      $(this).each(function(idx, elem) {

        // Refer to element as $input
        var $input = $(elem);

        // Default options
        var defaultOpts = {
          format: '%D %b %Y',
          autoClose: false,
          inline: false, 
          noPast: false,
          startDate: new Date(),
          sundayFirst: true,
          offset: 4,
          fadeOut: 200,
          labels: {
            'ssun': 'S',
            'smon': 'M',
            'stue': 'T',
            'swed': 'W',
            'sthu': 'T',
            'sfri': 'F',
            'ssat': 'S',
            'sun': 'Sun',
            'mon': 'Mon',
            'tue': 'Tue',
            'wed': 'Wed',
            'thu': 'Thu',
            'fri': 'Fri',
            'sat': 'Sat',
            'lsun': 'Sunday',
            'lmon': 'Monday',
            'ltue': 'Tuesday',
            'lwed': 'Wednesday',
            'lthu': 'Thursday',
            'lfri': 'Friday',
            'lsat': 'Saturday',
            'jan': 'Jan',
            'feb': 'Feb',
            'mar': 'Mar',
            'apr': 'Apr',
            'may': 'May',
            'jun': 'Jun',
            'jul': 'Jul',
            'aug': 'Aug',
            'sep': 'Sep',
            'oct': 'Oct',
            'nov': 'Nov',
            'dec': 'Dec',
            'ljan': 'January',
            'lfeb': 'February',
            'lmar': 'March',
            'lapr': 'April',
            'ljun': 'Jun',
            'ljul': 'July',
            'laug': 'August',
            'lsep': 'September',
            'loct': 'October',
            'lnov': 'November',
            'ldec': 'December',
            'help': 'Use Ctrl + arrow keys to navigate'
          }
        };

        // Override defaults with user-specified options
        opts = $.extend(true, {}, defaultOpts, opts);

        // Calculate the date
        var date = $input.val() ? new Date($input.val()) : opts.startDate;

        // Put Sunday in last position of not sundayFirst
        if (opts.sundayFirst) {
          weekDays = WEEK_MAPPINGS;
        } else {
          weekDays = WEEK_MAPPINGS.slice(1);
          weekDays.push(WEEK_MAPPINGS[0]);
        }

        // Build the HTML for week days row
        var sundayIdx = opts.sundayFirst ? 0 : 6;
        weekDays = weekDays.map(function(key, idx) {
          return tWeeknameCell.
            replace('$LABEL', opts.labels[key]).
            replace(
              '$SUNDAY', 
              sundayIdx === idx ? SUNDAY_CLASS : ''
            );
        }).join('');

        /**
         * Builds the entire calendar HTML from scratch and returns a string
         *
         * @param {Date} date Date for which to build the calendar
         */
        function calendarHTML(date) {
          var monthLabel = opts.labels[MONTH_MAPPINGS[date.getMonth()]];
          return tWidget.
            replace('$WEEKNAMES', weekDays).
            replace('$MONTH', monthLabel + ' ' + date.getFullYear()).
            replace('$CALENDAR', buildMonth(
              date.getMonth() + 1, 
              date.getFullYear(), 
              opts.sundayFirst,
              opts.noPast
            ));
        }

        /**
         * Internal click handler
         *
         * This function is called whenever a calendar cell is clicked
         *
         * @param {Date} val New date
         */
        function onClick(val) {
          val = dateFormat(val, opts.format, opts.labels);
          $input.val(val);
        }

        var instance; // existing instance of calendar widget

        /**
         * Go through the cells in the calendar and mark cell as selected
         *
         * @param {Date} date Date to select
         */
        function selectDate(date) {
          if (!instance) {
            return;
          }

          // First remove 'selected' class from all selected items
          instance.find('.' + SEL_CLASS).removeClass(SEL_CLASS);

          if (!date) {
            return;
          }

          // Go through cells and mark matching cell as selected
          instance.find('.dateinput-calendar-cell').each(function(idx, item) {
            item = $(item);
            if (item.hasClass(PAST_CLASS)) return;
            if (item.data('year') != date.getFullYear()) return;
            if (item.data('month') != date.getMonth() + 1) return;
            if (item.data('date') != date.getDate()) return;
            item.addClass(SEL_CLASS);
          });
        };

        var blurTimeout;

        function drawCalendar(d) {
          // If it already exists, only update it
          if (instance && d) {
            // Update month in the monthbar
            instance.find('.dateinput-monthbar-month').text(
              opts.labels[MONTH_MAPPINGS[d.getMonth()]] + ' ' + d.getFullYear()
            );

            // Update the calendarium
            instance.find('.dateinput-calendar-weeks').html(
              buildMonth(
                d.getMonth() + 1, 
                d.getFullYear(),
                opts.sundayFirst,
                opts.noPast
              )
            );

            // Update instance state
            instance.displayMonth = d.getMonth() + 1;
            instance.displayYear = d.getFullYear();

          } else {
            // Create a new widget instance
            instance = $(
              calendarHTML(d || date).
                replace('$HELP', opts.inline ? '' : opts.labels.help)
            );
            instance.displayMonth = date.getMonth() + 1;
            instance.displayYear = date.getFullYear();

            // Give date input widget an ID calculated from input's own id or 
            // name attribute with a -dateinput suffix.
            instance.attr(
              'id', 
              ($input.attr('id') || $input.attr('name')) + '-dateinput'
            );

            if (opts.zindex) {
              instance.css('z-index', opts.zindex);
            }

            // Store the input and instance objects in instance data attribute
            instance.data('input', $input);
            instance.data('widget', instance);

            // If inline, make it inline-block
            if (opts.inline) {
              instance.css('display', 'inline-block');
            }

            instance.on('contextmenu', function(e) {
              e.preventDefault();
              e.stopPropagation();

              var t = getToday();
              drawCalendar(t);
              selectDate(t);
              $input.val(dateFormat(t, opts.format, opts.labels));
              if (blurTimeout) clearTimeout(blurTimeout);
              $input.focus();
            });

            // Date selection
            instance.on('click', '.dateinput-calendar-cell', function(e) {
              e.stopPropagation();
              e.preventDefault();

              if ($(this).hasClass(PAST_CLASS)) {
                if (blurTimeout) clearTimeout(blurTimeout);
                $input.focus();
                return;
              }

              var cellDate = new Date(
                $(this).data('year'),
                $(this).data('month') - 1,
                $(this).data('date')
              );

              if (!opts.autoClose) {
                // Clear the blurTimeout so that input doesn't blur.
                // Also focus the input, so that an actual blur can be 
                // triggered later.
                if (blurTimeout) clearTimeout(blurTimeout);
                $input.focus();
              } else {
                // Focus next input
                var inputs = $input.closest('form').find(':input');
                inputs.eq(inputs.index($input)+ 1 ).focus();
              }

              selectDate(cellDate);
              if (typeof opts.click === 'funciton' && opts.click(cellDate)) {
                onClick(cellDate);
              } else {
                onClick(cellDate);
              }
            });

            // Month selection
            instance.on('click', '.dateinput-monthbar-button a', function(e) {
              e.stopPropagation();
              e.preventDefault();

              var $button = $(this);

              // Detremine the direction:
              var dir = $button.hasClass('dateinput-prevmonth') ? -1 : 1;
              
              // Get the display year and month, and shift date in `dir` 
              // direction.
              (function(newDate) {
                drawCalendar(newDate);
              }(shiftMonths(new Date(
                instance.displayYear, 
                instance.displayMonth - 1, 
                1
              ), dir)));

              selectDate($input.val() ? new Date($input.val()) : null);

              if (typeof opts.monthChange === 'function') {
                opts.month(newDate.getMonth() + 1, newDate.getFullYear());
              }

              if (!opts.inline) {
                clearTimeout(blurTimeout);
                $input.focus();
              }
            });

          }

          selectDate(d);
        }
        
        // Handle inline and pop-up calendars differently
        if (opts.inline) {
          // Create a hidden field and replace normal field with it
          var hidden = $(
            '<input type="hidden" name="$NAME" id="$ID" value="$VAL">'.
              replace('$NAME', $input.attr('name')).
              replace('$ID', $input.attr('id')).
              replace('$VAL', $input.val())
          );
          $input.replaceWith(hidden);
          $input = hidden;

          // Draw the instance and put it next to hidden input
          drawCalendar($input.val() ? new Date($input.val()) : null)
          $input.after(instance);

        } else {
          $input.on('focus', function(e) {
            // Draw instance and attach to document body
            if (instance) return true;

            (function(d) {
              drawCalendar(d);
              selectDate(d);
            }($input.val() ? new Date($input.val()) : null));

            instance.appendTo(document.body);
            instance.css({
              position: 'absolute',
              display: 'block'
            });

            // Reposition the instance

            var docOffsetX = $(document).scrollLeft();
            var docOffsetY = $(document).scrollTop();
            var calW = instance.outerWidth();
            var calH = instance.outerHeight();
            var inputX = $input.offset().left - docOffsetX;
            var inputY = $input.offset().top - docOffsetY;
            var inputW = $input.outerWidth();
            var inputH = $input.outerHeight();
            var winW = $(window).width();
            var winH = $(window).height();

            var x = 0;
            var y = 0;

            if (calH + inputY + inputH + opts.offset > winH && 
                inputY - calH - opts.offset > 0) {
              // Calendar must be above the input
              y = inputY - calH - opts.offset + docOffsetY;
            } else {
              // Calendar must be below input
              y = inputY + inputH + opts.offset + docOffsetY;
            }

            if (inputX + calW > winW) {
              // Calendar must align with right edge of input
              x = inputX + inputW - calW + docOffsetX;
            } else {
              // Calendar must align with left edge
              x = inputX + docOffsetX;
            }

            instance.css({
              left: x,
              top: y
            });
          });

          $input.on('blur', function(e) {
            blurTimeout = setTimeout(function() {
              if (!instance) return;
              instance.fadeOut(opts.fadeOut, function() {
                instance.remove();
                instance = undefined;
              });
            }, 150);
          });

          $input.on('keydown', function(e) {

            // Helper function to redraw the calendar with new date
            function redraw(d) {
              if (!instance) return;
              e.preventDefault();
              e.stopPropagation();

              $input.val(dateFormat(d, opts.format, opts.labels));
              drawCalendar(d);
              selectDate(d);
            }

            // Handle PgUp/PgDn keys
            function shift(dir) {
              var d = new Date($input.val());
              if (d.toString() === 'Invalid Date') return;
              redraw(shiftMonths(d, dir));
            }

            // Handle Ctrl+Arrow shortcuts
            function shiftDate(days) {
              if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.modKey) {
                var d = new Date($input.val());
                if (d.toString() === 'Invalid Date') {
                  redraw(getToday());
                } else {
                  var sd = shiftDays(d, days);
                  if (opts.noPast && sd - getToday() < 0) return;
                  console.log(sd);
                  redraw(sd);
                }
              }
            }

            switch (e.which) {
              case 13: // Enter
                if (!instance) return;

                // Close the calendar if any
                e.preventDefault();
                e.stopPropagation();
                instance.fadeOut(opts.fadeOut, function() {
                  instance.remove();
                  instance = null;
                });
                break;

              case 27: // Esc
                if (!instance) return;

                // Close the instance
                e.stopPropagation();
                e.preventDefault();
                instance.fadeOut(opts.fadeOut, function() {
                  instance.remove();
                  instance = undefined;
                });
                break;

              case 33: // PgUp
                shift(-1);
                break;

              case 34: // PgDn
                shift(1);
                break;

              case 37: // Left
                shiftDate(-1);
                break;
              
              case 38: // Up
                shiftDate(-7);
                break;

              case 39: // Right
                shiftDate(1);
                break;

              case 40: // Down
                shiftDate(7);
                break;
            }
          });

          $input.on('keyup', function(e) {
            if (!instance) return;

            switch (e.which) {
              // Ignore some of the more common special keys
              case 8:
              case 9:
              case 13:
              case 16:
              case 17:
              case 18:
              case 20:
              case 27:
              case 32:
              case 35:
              case 36:
              case 37:
              case 38:
              case 39:
              case 40:
              case 45:
              case 144:
                return;
                break;

              default:
                var d = new Date($input.val());
                if (d.toString() === 'Invalid Date') {
                  selectDate();
                } else {
                  drawCalendar(d);
                }
            }
          });
        }

      }); // Finished attaching widgets to matched elements

    }; // End plugin definition
    
  });

})(typeof define === 'function' && define.amd ? define : function(factory){
  factory(function() { return jQuery; });
});
