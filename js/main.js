/* ============================================================
   HorseShowCalendar.com — Main JavaScript
   Part of the Schneider Saddlery Equine Network
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Configuration
  ---------------------------------------------------------- */
  window.HSC_EMAIL_ENDPOINT = window.HSC_EMAIL_ENDPOINT || '';

  const LS_KEYS = {
    submissions: 'hsc_show_submissions',
    alerts: 'hsc_alert_signups'
  };

  /* ----------------------------------------------------------
     Show Data — 24 realistic horse show listings
  ---------------------------------------------------------- */
  const SHOWS = [
    {
      id: 1,
      name: 'Brandywine Horse Trials',
      dates: 'March 14-15, 2026',
      startMonth: 3,
      city: 'West Chester',
      state: 'PA',
      region: 'Northeast',
      discipline: 'Eventing',
      level: 'Recognized',
      organization: 'USEA',
      entryFees: '$175 - $350',
      stabling: true,
      website: 'https://www.brandywinehorse trials.com',
      prizeMoney: null,
      judges: 'Marilyn Payne, Capt. Mark Phillips',
      description: 'Three-phase eventing competition in the heart of Chester County. Starter through Preliminary levels available on beautiful cross-country courses.'
    },
    {
      id: 2,
      name: 'Gulf Coast Classic Hunter/Jumper',
      dates: 'February 18-22, 2026',
      startMonth: 2,
      city: 'Gulfport',
      state: 'MS',
      region: 'Southeast',
      discipline: 'Hunter/Jumper',
      level: 'Recognized',
      organization: 'USEF',
      entryFees: '$200 - $500',
      stabling: true,
      website: 'https://www.gulfcoastclassic.com',
      prizeMoney: '$50,000 Grand Prix',
      judges: 'James Harriott, Sandra Meadows',
      description: 'Premier A-rated hunter/jumper competition featuring the $50,000 Gulf Coast Grand Prix. USHJA Zone 5 qualifying classes available.'
    },
    {
      id: 3,
      name: 'Pacific Coast Dressage Championships',
      dates: 'September 10-13, 2026',
      startMonth: 9,
      city: 'Del Mar',
      state: 'CA',
      region: 'West',
      discipline: 'Dressage',
      level: 'Championship',
      organization: 'USDF',
      entryFees: '$250 - $600',
      stabling: true,
      website: 'https://www.pacificdressage.org',
      prizeMoney: '$25,000 Freestyle',
      judges: 'Dr. Katrina Wuest (GER), Lilo Fore',
      description: 'USDF Region 7 Championships. Training through Grand Prix levels. Features musical freestyle finals under the lights at the Del Mar Fairgrounds.'
    },
    {
      id: 4,
      name: 'Lone Star Reining Spectacular',
      dates: 'April 3-6, 2026',
      startMonth: 4,
      city: 'Fort Worth',
      state: 'TX',
      region: 'Southwest',
      discipline: 'Reining',
      level: 'Recognized',
      organization: 'NRHA',
      entryFees: '$100 - $400',
      stabling: true,
      website: 'https://www.lonestarreining.com',
      prizeMoney: '$75,000 Open Derby',
      judges: 'Bobby Avila Sr., Todd Bergen',
      description: 'NRHA-approved reining competition at the Will Rogers Memorial Center. Open, Non-Pro, and Youth divisions with added money classes.'
    },
    {
      id: 5,
      name: 'New England Schooling Show Series',
      dates: 'May 9-10, 2026',
      startMonth: 5,
      city: 'Sturbridge',
      state: 'MA',
      region: 'Northeast',
      discipline: 'Hunter/Jumper',
      level: 'Schooling',
      organization: 'Local',
      entryFees: '$30 - $75',
      stabling: false,
      website: 'https://www.neschoolingshows.com',
      prizeMoney: null,
      judges: 'Patricia Connolly',
      description: 'Friendly schooling show series perfect for green horses and beginner riders. Cross-rails through 3\'3" offered. Ribbons through 6th place.'
    },
    {
      id: 6,
      name: 'Bluegrass Barrel Bash',
      dates: 'June 12-14, 2026',
      startMonth: 6,
      city: 'Lexington',
      state: 'KY',
      region: 'Southeast',
      discipline: 'Barrel Racing',
      level: 'Recognized',
      organization: 'WPRA',
      entryFees: '$50 - $200',
      stabling: true,
      website: 'https://www.bluegrassbarrelbash.com',
      prizeMoney: '$30,000 Added',
      judges: 'Electronic Timing',
      description: 'Fast-paced barrel racing action at the Kentucky Horse Park. Open 4D, Youth, and Futurity divisions. Jackpot and exhibition runs available.'
    },
    {
      id: 7,
      name: 'Great Lakes Dressage Festival',
      dates: 'July 17-19, 2026',
      startMonth: 7,
      city: 'Traverse City',
      state: 'MI',
      region: 'Midwest',
      discipline: 'Dressage',
      level: 'Recognized',
      organization: 'USDF',
      entryFees: '$150 - $400',
      stabling: true,
      website: 'https://www.greatlakesdressage.com',
      prizeMoney: null,
      judges: 'Janet Foy, Anne Gribbons',
      description: 'USDF Region 2 qualifying competition. Beautiful Flintfields Horse Park venue. All levels from Introductory through Grand Prix. Scores count for year-end awards.'
    },
    {
      id: 8,
      name: 'Rocky Mountain Western Championships',
      dates: 'August 20-23, 2026',
      startMonth: 8,
      city: 'Denver',
      state: 'CO',
      region: 'West',
      discipline: 'Western',
      level: 'Championship',
      organization: 'AQHA',
      entryFees: '$125 - $450',
      stabling: true,
      website: 'https://www.rockymtnwestern.com',
      prizeMoney: '$40,000 Total',
      judges: 'Tom Powers, Becky Schooler, Mike Carter',
      description: 'AQHA Regional Championship show at the National Western Complex. Western Pleasure, Horsemanship, Trail, and Reining classes. Amateur and Youth divisions.'
    },
    {
      id: 9,
      name: 'Saratoga Springs Combined Test',
      dates: 'May 23-24, 2026',
      startMonth: 5,
      city: 'Saratoga Springs',
      state: 'NY',
      region: 'Northeast',
      discipline: 'Combined Test',
      level: 'Schooling',
      organization: 'USEA',
      entryFees: '$75 - $150',
      stabling: false,
      website: 'https://www.saratogact.com',
      prizeMoney: null,
      judges: 'William Hoos',
      description: 'Combined test (dressage and stadium jumping) at historic Saratoga venue. Starter through Training level. Great introduction to eventing for green horses and riders.'
    },
    {
      id: 10,
      name: 'Scottsdale Arabian Breed Show',
      dates: 'February 26-March 1, 2026',
      startMonth: 2,
      city: 'Scottsdale',
      state: 'AZ',
      region: 'Southwest',
      discipline: 'Breed Shows',
      level: 'Championship',
      organization: 'AHA',
      entryFees: '$200 - $500',
      stabling: true,
      website: 'https://www.scottsdaleshow.com',
      prizeMoney: '$100,000+ in prizes',
      judges: 'International Panel',
      description: 'One of the largest Arabian horse shows in the world. Halter, English, Western, and Sport Horse divisions. Draws exhibitors from over 30 countries.'
    },
    {
      id: 11,
      name: 'Virginia Gold Cup Polo Tournament',
      dates: 'October 3-4, 2026',
      startMonth: 10,
      city: 'The Plains',
      state: 'VA',
      region: 'Southeast',
      discipline: 'Polo',
      level: 'Recognized',
      organization: 'USPA',
      entryFees: 'By Invitation',
      stabling: true,
      website: 'https://www.vagoldcuppolo.com',
      prizeMoney: '$15,000',
      judges: 'USPA Officials',
      description: 'Prestigious polo tournament in Virginia horse country. 8-goal teams compete on manicured fields. Tailgating, hat contest, and terrier races add to the festive atmosphere.'
    },
    {
      id: 12,
      name: 'Midwest Driving Derby',
      dates: 'June 5-7, 2026',
      startMonth: 6,
      city: 'Lexington',
      state: 'KY',
      region: 'Southeast',
      discipline: 'Driving',
      level: 'Recognized',
      organization: 'ADS',
      entryFees: '$150 - $350',
      stabling: true,
      website: 'https://www.midwestdriving.org',
      prizeMoney: '$5,000 Marathon',
      judges: 'Hardy Zantke, Suzy Stafford',
      description: 'Combined driving event at Kentucky Horse Park. Dressage, marathon, and cones phases. Singles, pairs, and four-in-hand divisions. VSE through draft eligible.'
    },
    {
      id: 13,
      name: 'Carolina Hunter Pace',
      dates: 'March 28-29, 2026',
      startMonth: 3,
      city: 'Aiken',
      state: 'SC',
      region: 'Southeast',
      discipline: 'Hunter/Jumper',
      level: 'Schooling',
      organization: 'Local',
      entryFees: '$40 - $100',
      stabling: false,
      website: 'https://www.carolinahunterpace.com',
      prizeMoney: null,
      judges: 'Course Optimum Time',
      description: 'Scenic hunter pace through the Hitchcock Woods and surrounding Aiken trails. Teams of 2-3 navigate natural obstacles. Perfect outing for all levels.'
    },
    {
      id: 14,
      name: 'Oregon Trail Eventing Championships',
      dates: 'August 7-9, 2026',
      startMonth: 8,
      city: 'Bend',
      state: 'OR',
      region: 'West',
      discipline: 'Eventing',
      level: 'Championship',
      organization: 'USEA',
      entryFees: '$225 - $500',
      stabling: true,
      website: 'https://www.oregontraileventing.com',
      prizeMoney: '$10,000 Advanced',
      judges: 'Derek di Grazia, James Atkinson',
      description: 'Area VII Championship event in the stunning Central Oregon landscape. Beginner Novice through Advanced divisions. Cross-country course designed by Derek di Grazia.'
    },
    {
      id: 15,
      name: 'Heartland Quarter Horse Congress',
      dates: 'October 15-18, 2026',
      startMonth: 10,
      city: 'Oklahoma City',
      state: 'OK',
      region: 'Southwest',
      discipline: 'Breed Shows',
      level: 'Championship',
      organization: 'AQHA',
      entryFees: '$150 - $400',
      stabling: true,
      website: 'https://www.heartlandqhcongress.com',
      prizeMoney: '$200,000+ Total',
      judges: 'Panel of 5 AQHA Judges',
      description: 'Major AQHA show at State Fair Park. Halter, Western Pleasure, Reining, Cutting, Barrel Racing, and English classes. Over 3,000 entries expected.'
    },
    {
      id: 16,
      name: 'Lake Placid Dressage Days',
      dates: 'July 10-12, 2026',
      startMonth: 7,
      city: 'Lake Placid',
      state: 'NY',
      region: 'Northeast',
      discipline: 'Dressage',
      level: 'Recognized',
      organization: 'USDF',
      entryFees: '$125 - $350',
      stabling: true,
      website: 'https://www.lakeplaciddressage.com',
      prizeMoney: null,
      judges: 'Gary Rockwell, Debbie Rodriguez',
      description: 'Scenic dressage competition in the Adirondack Mountains. USDF/USEF recognized. All levels from Training through I-1. Musical freestyle offered on Sunday.'
    },
    {
      id: 17,
      name: 'Desert Classic Jumper Series',
      dates: 'March 4-8, 2026',
      startMonth: 3,
      city: 'Thermal',
      state: 'CA',
      region: 'West',
      discipline: 'Hunter/Jumper',
      level: 'Recognized',
      organization: 'USEF',
      entryFees: '$250 - $750',
      stabling: true,
      website: 'https://www.desertclassicjumper.com',
      prizeMoney: '$100,000 Grand Prix',
      judges: 'Linda Allen, Steve Stephens',
      description: 'Part of the acclaimed Desert Circuit. AA-rated jumper competition featuring the $100,000 HITS Grand Prix. World-class footing and international competition.'
    },
    {
      id: 18,
      name: 'Hoosier State Reining Futurity',
      dates: 'April 24-26, 2026',
      startMonth: 4,
      city: 'Indianapolis',
      state: 'IN',
      region: 'Midwest',
      discipline: 'Reining',
      level: 'Recognized',
      organization: 'NRHA',
      entryFees: '$100 - $350',
      stabling: true,
      website: 'https://www.hoosierreining.com',
      prizeMoney: '$50,000 Futurity Purse',
      judges: 'Terry Thompson, Kathy Gould',
      description: 'NRHA Futurity and Derby qualifier. 3 and 4-year-old futurity classes plus Open, Intermediate, and Non-Pro divisions. Indiana State Fairgrounds venue.'
    },
    {
      id: 19,
      name: 'Low Country Eventing Derby',
      dates: 'November 6-8, 2026',
      startMonth: 11,
      city: 'Camden',
      state: 'SC',
      region: 'Southeast',
      discipline: 'Eventing',
      level: 'Recognized',
      organization: 'USEA',
      entryFees: '$175 - $400',
      stabling: true,
      website: 'https://www.lowcountryeventing.com',
      prizeMoney: '$8,000 Open',
      judges: 'Bobby Costello, Phyllis Dawson',
      description: 'Fall eventing at the Camden training center. Modified through Advanced levels on rolling Sandhills terrain. Great fall weather and excellent footing.'
    },
    {
      id: 20,
      name: 'North Dakota Barrel Futurity',
      dates: 'September 25-27, 2026',
      startMonth: 9,
      city: 'Bismarck',
      state: 'ND',
      region: 'Midwest',
      discipline: 'Barrel Racing',
      level: 'Recognized',
      organization: 'WPRA',
      entryFees: '$75 - $250',
      stabling: true,
      website: 'https://www.ndbarrelfuturity.com',
      prizeMoney: '$20,000 Futurity',
      judges: 'Electronic Timing',
      description: 'Exciting barrel racing futurity and open competition at the Bismarck Event Center. 4D format, Youth classes, and exhibition runs. Calcutta Saturday night.'
    },
    {
      id: 21,
      name: 'Bluebonnet Western Dressage Classic',
      dates: 'May 15-17, 2026',
      startMonth: 5,
      city: 'College Station',
      state: 'TX',
      region: 'Southwest',
      discipline: 'Western',
      level: 'Recognized',
      organization: 'USEF',
      entryFees: '$100 - $275',
      stabling: true,
      website: 'https://www.bluebonnetwd.com',
      prizeMoney: null,
      judges: 'Rick Weyrauch, Sharon Schneidman',
      description: 'Western Dressage Association of America recognized show. Introductory through Level 4 tests. Open and Amateur Adult divisions. Trail In-Hand offered.'
    },
    {
      id: 22,
      name: 'Hampton Classic Horse Show',
      dates: 'August 28-September 1, 2026',
      startMonth: 8,
      city: 'Bridgehampton',
      state: 'NY',
      region: 'Northeast',
      discipline: 'Hunter/Jumper',
      level: 'Championship',
      organization: 'USEF',
      entryFees: '$300 - $1,000',
      stabling: true,
      website: 'https://www.hamptonclassic.com',
      prizeMoney: '$300,000 Grand Prix',
      judges: 'International Panel of 3',
      description: 'The premier social and equestrian event of the summer season in the Hamptons. Week-long AA-rated competition culminating in the $300,000 Hampton Classic Grand Prix.'
    },
    {
      id: 23,
      name: 'Sonoma Wine Country Polo Classic',
      dates: 'June 20-21, 2026',
      startMonth: 6,
      city: 'Santa Rosa',
      state: 'CA',
      region: 'West',
      discipline: 'Polo',
      level: 'Recognized',
      organization: 'USPA',
      entryFees: 'By Invitation',
      stabling: true,
      website: 'https://www.sonomapolo.com',
      prizeMoney: '$10,000',
      judges: 'USPA Officials',
      description: 'Polo matches set against the backdrop of Sonoma wine country. 6-goal tournament with divot stomping, wine tasting, and gourmet food. Benefits local equine rescue.'
    },
    {
      id: 24,
      name: 'Chesapeake Bay Driving Trial',
      dates: 'October 23-25, 2026',
      startMonth: 10,
      city: 'Chestertown',
      state: 'MD',
      region: 'Northeast',
      discipline: 'Driving',
      level: 'Recognized',
      organization: 'ADS',
      entryFees: '$125 - $300',
      stabling: true,
      website: 'https://www.chesapeakedriving.org',
      prizeMoney: null,
      judges: 'Bill Long, Anne Pringle',
      description: 'Combined driving event on Maryland\'s Eastern Shore. Beautiful marathon through farm fields and woodlands. Training through Advanced levels. Singles and pairs welcome.'
    }
  ];

  /* ----------------------------------------------------------
     Region mapping
  ---------------------------------------------------------- */
  const REGIONS = [
    'All',
    'Northeast',
    'Southeast',
    'Midwest',
    'Southwest',
    'West',
    'Northwest'
  ];

  const DISCIPLINES = [
    'All',
    'Hunter/Jumper',
    'Dressage',
    'Eventing',
    'Western',
    'Reining',
    'Barrel Racing',
    'Breed Shows',
    'Polo',
    'Driving',
    'Combined Test'
  ];

  const MONTHS = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  /* ----------------------------------------------------------
     DOM-ready bootstrap
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initScrollToTop();

    // Only run on homepage
    if (document.getElementById('showsGrid')) {
      initFilters();
      renderShows(SHOWS);
      initSubmitForm();
      initAlertSignup();
      initFAQ();
    }
  });

  /* ----------------------------------------------------------
     Mobile Menu
  ---------------------------------------------------------- */
  function initMobileMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      var expanded = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    // Close on link click
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ----------------------------------------------------------
     Scroll-to-top button
  ---------------------------------------------------------- */
  function initScrollToTop() {
    var btn = document.querySelector('.scroll-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ----------------------------------------------------------
     Filters
  ---------------------------------------------------------- */
  function initFilters() {
    var disciplineSelect = document.getElementById('filterDiscipline');
    var regionSelect = document.getElementById('filterRegion');
    var monthSelect = document.getElementById('filterMonth');
    var searchInput = document.getElementById('filterSearch');
    var btnFilter = document.getElementById('btnFilter');
    var btnReset = document.getElementById('btnReset');

    if (!disciplineSelect) return;

    function applyFilters() {
      var discipline = disciplineSelect.value;
      var region = regionSelect.value;
      var month = monthSelect.value;
      var search = searchInput ? searchInput.value.trim().toLowerCase() : '';

      var filtered = SHOWS.filter(function (show) {
        if (discipline !== 'All' && show.discipline !== discipline) return false;
        if (region !== 'All' && show.region !== region) return false;
        if (month !== 'all' && show.startMonth !== parseInt(month, 10)) return false;
        if (search) {
          var haystack = (show.name + ' ' + show.city + ' ' + show.state + ' ' + show.discipline + ' ' + show.organization).toLowerCase();
          if (haystack.indexOf(search) === -1) return false;
        }
        return true;
      });

      renderShows(filtered);
      updateResultsInfo(filtered.length);
    }

    btnFilter.addEventListener('click', applyFilters);

    btnReset.addEventListener('click', function () {
      disciplineSelect.value = 'All';
      regionSelect.value = 'All';
      monthSelect.value = 'all';
      if (searchInput) searchInput.value = '';
      renderShows(SHOWS);
      updateResultsInfo(SHOWS.length);
    });

    // Also filter on Enter key in search
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyFilters();
        }
      });
    }

    // View toggles
    var gridBtn = document.getElementById('viewGrid');
    var listBtn = document.getElementById('viewList');
    var grid = document.getElementById('showsGrid');
    if (gridBtn && listBtn && grid) {
      gridBtn.addEventListener('click', function () {
        grid.classList.remove('list-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
      });
      listBtn.addEventListener('click', function () {
        grid.classList.add('list-view');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
      });
    }
  }

  function updateResultsInfo(count) {
    var info = document.getElementById('resultsInfo');
    if (!info) return;
    if (count === SHOWS.length) {
      info.innerHTML = 'Showing all <strong>' + count + '</strong> upcoming shows';
    } else {
      info.innerHTML = 'Showing <strong>' + count + '</strong> of ' + SHOWS.length + ' shows';
    }
  }

  /* ----------------------------------------------------------
     Render Shows
  ---------------------------------------------------------- */
  function renderShows(shows) {
    var grid = document.getElementById('showsGrid');
    if (!grid) return;

    if (shows.length === 0) {
      grid.innerHTML =
        '<div class="no-results">' +
          '<h3>No Shows Found</h3>' +
          '<p>Try adjusting your filters or search terms. You can also submit a show if you know of one we\'re missing.</p>' +
        '</div>';
      return;
    }

    // Sort by month
    var sorted = shows.slice().sort(function (a, b) {
      return a.startMonth - b.startMonth;
    });

    var html = '';
    sorted.forEach(function (show) {
      var discClass = 'disc-' + show.discipline.toLowerCase().replace(/[\s\/]+/g, '-');
      var levelClass = show.level.toLowerCase();

      html +=
        '<article class="show-card" data-id="' + show.id + '">' +
          '<div class="show-card-header">' +
            '<span class="show-card-discipline ' + discClass + '">' + escHTML(show.discipline) + '</span>' +
            '<h3 class="show-card-title">' + escHTML(show.name) + '</h3>' +
            '<p class="show-card-dates">' + escHTML(show.dates) + '</p>' +
          '</div>' +
          '<div class="show-card-body">' +
            '<dl class="show-card-meta">' +
              '<dt>Location</dt><dd>' + escHTML(show.city) + ', ' + escHTML(show.state) + '</dd>' +
              '<dt>Region</dt><dd>' + escHTML(show.region) + '</dd>' +
              '<dt>Organization</dt><dd>' + escHTML(show.organization) + '</dd>' +
              '<dt>Entry Fees</dt><dd>' + escHTML(show.entryFees) + '</dd>' +
            '</dl>' +
          '</div>' +
          '<div class="show-card-footer">' +
            '<span class="show-level-badge ' + levelClass + '">' + escHTML(show.level) + '</span>' +
            '<button class="btn-details" aria-expanded="false" aria-controls="detail-' + show.id + '">View Details &#9662;</button>' +
          '</div>' +
          '<div class="show-card-detail" id="detail-' + show.id + '">' +
            '<dl>' +
              '<dt>Stabling</dt><dd>' + (show.stabling ? 'Available' : 'Not Available') + '</dd>' +
              (show.prizeMoney ? '<dt>Prize Money</dt><dd>' + escHTML(show.prizeMoney) + '</dd>' : '') +
              '<dt>Judge(s)</dt><dd>' + escHTML(show.judges) + '</dd>' +
              '<dt>Description</dt><dd>' + escHTML(show.description) + '</dd>' +
            '</dl>' +
            '<div class="detail-actions">' +
              '<a href="' + escHTML(show.website) + '" class="btn-website" target="_blank" rel="noopener">Visit Website</a>' +
            '</div>' +
          '</div>' +
        '</article>';
    });

    grid.innerHTML = html;

    // Bind expand/collapse
    grid.querySelectorAll('.btn-details').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var card = btn.closest('.show-card');
        var detail = card.querySelector('.show-card-detail');
        var isOpen = detail.classList.contains('open');
        detail.classList.toggle('open');
        btn.setAttribute('aria-expanded', !isOpen);
        btn.innerHTML = isOpen ? 'View Details &#9662;' : 'Hide Details &#9652;';
      });
    });

    // Click card header to expand too
    grid.querySelectorAll('.show-card-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var card = header.closest('.show-card');
        card.querySelector('.btn-details').click();
      });
    });
  }

  /* ----------------------------------------------------------
     Submit a Show form
  ---------------------------------------------------------- */
  function initSubmitForm() {
    var form = document.getElementById('submitShowForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = {
        showName: val('ssName'),
        dateStart: val('ssDateStart'),
        dateEnd: val('ssDateEnd'),
        city: val('ssCity'),
        state: val('ssState'),
        discipline: val('ssDiscipline'),
        contactEmail: val('ssEmail'),
        website: val('ssWebsite'),
        description: val('ssDescription'),
        submittedAt: new Date().toISOString()
      };

      // Basic validation
      if (!data.showName || !data.dateStart || !data.city || !data.state || !data.discipline || !data.contactEmail) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      if (!isValidEmail(data.contactEmail)) {
        showToast('Please enter a valid email address.', 'error');
        return;
      }

      // Save to localStorage
      saveToStorage(LS_KEYS.submissions, data);

      // Send to endpoint if configured
      sendToEndpoint(data, 'show_submission');

      // Show success
      form.style.display = 'none';
      var success = document.getElementById('submitSuccess');
      if (success) success.style.display = 'block';
      showToast('Show submitted successfully! We\'ll review it shortly.', 'success');
    });
  }

  /* ----------------------------------------------------------
     Alert Signup form
  ---------------------------------------------------------- */
  function initAlertSignup() {
    var form = document.getElementById('alertSignupForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Gather checked disciplines
      var checkedDiscs = [];
      form.querySelectorAll('input[name="alertDisciplines"]:checked').forEach(function (cb) {
        checkedDiscs.push(cb.value);
      });

      var data = {
        name: val('alertName'),
        email: val('alertEmail'),
        disciplines: checkedDiscs,
        region: val('alertRegion'),
        maxDistance: val('alertDistance'),
        signedUpAt: new Date().toISOString()
      };

      if (!data.name || !data.email) {
        showToast('Please enter your name and email.', 'error');
        return;
      }
      if (!isValidEmail(data.email)) {
        showToast('Please enter a valid email address.', 'error');
        return;
      }

      saveToStorage(LS_KEYS.alerts, data);
      sendToEndpoint(data, 'alert_signup');

      form.style.display = 'none';
      var success = document.getElementById('alertSuccess');
      if (success) success.style.display = 'block';
      showToast('You\'re signed up for weekly show alerts!', 'success');
    });
  }

  /* ----------------------------------------------------------
     FAQ Accordion
  ---------------------------------------------------------- */
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var isOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.faq-item').forEach(function (faq) {
          faq.classList.remove('open');
        });

        // Toggle current
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function escHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function saveToStorage(key, data) {
    try {
      var existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      // localStorage may be unavailable
    }
  }

  function sendToEndpoint(data, type) {
    var endpoint = window.HSC_EMAIL_ENDPOINT;
    if (!endpoint) return;

    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, data: data })
      }).catch(function () {
        // Silently fail for static site
      });
    } catch (e) {
      // fetch may not be available
    }
  }

  function showToast(message, type) {
    // Remove existing toast
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        toast.remove();
      }, 400);
    }, 4000);
  }

})();
