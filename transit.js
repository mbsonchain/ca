import { segments } from './road-network.js';

// Rail alignments use the same 1024 × 1536 coordinate system as the painted map.
const rail = (from, to, geometry, status = 'running') => ({
  id: from + '~' + to, from, to, mode: 'train', geometry, status,
});
export const lines = [
  rail('amoreport', 'us-city', '168,498 178,503 194,510 203,538 204,558 193,580 180,606'),
  rail('us-city', 'flowertown', '180,606 195,635 222,654 242,688 246,723 257,758 256,794 266,829 269,862 258,898 245,929'),
  rail('flowertown', 'hollywood', '245,929 262,958 277,972 294,1000 303,1036 321,1060 333,1071 337,1110 351,1143 350,1174 361,1202 355,1224'),
  rail('hollywood', 'santamore', '355,1224 373,1244 397,1255 421,1261 444,1281 460,1302 481,1315 516,1328 549,1333 577,1326 600,1325 628,1314 650,1314 665,1310'),
  rail('santamore', 'formal-city', '665,1310 658,1295 667,1268 667,1231 660,1201 647,1180 644,1159 632,1137 630,1114 628,1084'),
  rail('formal-city', 'hollywood', '628,1084 594,1095 565,1106 538,1105 513,1113 489,1132 463,1138 436,1158 414,1168 392,1186 373,1198 355,1224', 'in-progress'),
  rail('flowertown', 'formal-city', '245,929 278,946 306,958 332,983 364,1000 390,1028 416,1041 448,1044 477,1058 520,1068 552,1067 588,1080 628,1084', 'in-progress'),
  rail('amoreport', 'camporella', '168,498 169,468 189,434 202,393 230,355 248,332 283,313 317,296 350,287 390,264 418,245 449,265 475,286 504,302 535,312 561,318 587,326', 'in-progress'),
  ...segments.filter(row => row[2] === 'ferry').map(([from, to, mode, , geometry]) => ({
    id: from + '~' + to, from, to, mode, geometry, status: 'running',
  })),
];

const links = new Map();
for (const edge of lines.filter(edge => edge.status === 'running')) {
  links.set(edge.from + '/' + edge.to, edge);
  links.set(edge.to + '/' + edge.from, edge);
}

export const dayMinutes = 24 * 60;
const stationDwell = 8;

// Terminal departures repeat on the Pacific clock. Ride times are in-world estimates.
const services = [
  { stops: ['amoreport', 'us-city', 'flowertown', 'hollywood'], rides: [130, 230, 270], first: [330, 345], last: [1290, 1305], every: 60 },
  { stops: ['hollywood', 'santamore', 'formal-city'], rides: [245, 200], first: [365, 355], last: [1325, 1315], every: 60 },
  { stops: ['camporella', 'freeport'], rides: [315], first: [360, 410], last: [1170, 1220], every: 90 },
  { stops: ['freetown', 'clifftown'], rides: [165], first: [345, 370], last: [1335, 1360], every: 45 },
  { stops: ['freetown', 'sfida'], rides: [270], first: [380, 420], last: [1260, 1300], every: 80 },
  { stops: ['goldpoint', 'greenpoint'], rides: [120], first: [390, 415], last: [1290, 1315], every: 45 },
];

const departures = new Map();
const stations = new Map();
function append(index, key, trip) {
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(trip);
}
for (const [service, definition] of services.entries()) {
  for (const direction of [0, 1]) {
    const stops = [...definition.stops];
    const rides = [...definition.rides];
    if (direction) { stops.reverse(); rides.reverse(); }
    for (let start = definition.first[direction]; start <= definition.last[direction]; start += definition.every) {
      let departure = start;
      for (const [i, minutes] of rides.entries()) {
        const from = stops[i], to = stops[i + 1];
        const key = from + '/' + to;
        // Intermediate stops after midnight belong on the next calendar day's board.
        const day = Math.floor(departure / dayMinutes);
        const boardTime = departure % dayMinutes;
        const trip = { from, to, edge: links.get(key), departure: boardTime, arrival: boardTime + minutes,
          terminus: stops.at(-1), runKey: [service, direction, start].join('-'), originDay: -day };
        append(departures, key, trip);
        append(stations, from, trip);
        departure += minutes + stationDwell;
      }
    }
  }
}
for (const events of [...departures.values(), ...stations.values()]) events.sort((a, b) => a.departure - b.departure);

function occurrence(trip, day) {
  const offset = day * dayMinutes;
  return { from: trip.from, to: trip.to, edge: trip.edge, terminus: trip.terminus,
    departure: trip.departure + offset, arrival: trip.arrival + offset,
    run: trip.runKey + '@' + (day + trip.originDay) };
}

export function nextTrip(from, to, at, allowLaterDays = false) {
  const trips = departures.get(from + '/' + to);
  if (!trips?.length || (!allowLaterDays && at >= dayMinutes)) return;
  const day = Math.floor(at / dayMinutes);
  const next = trips.find(trip => trip.departure >= at % dayMinutes);
  if (next) return occurrence(next, day);
  if (allowLaterDays) return occurrence(trips[0], day + 1);
}

export function stationDepartures(slug, at) {
  return (stations.get(slug) || []).filter(trip => trip.departure >= at).map(trip => occurrence(trip, 0));
}

const pacificClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const pacificDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric',
});
export function serviceTime(date = new Date()) {
  const [hours, minutes] = pacificClock.format(date).split(':').map(Number);
  return { minute: hours * 60 + minutes, day: pacificDay.format(date) };
}

export function clockTime(minute) {
  const hour = Math.floor(minute / 60) % 24;
  const label = (hour % 12 || 12) + ':' + String(minute % 60).padStart(2, '0') + (hour < 12 ? ' AM' : ' PM');
  const days = Math.floor(minute / dayMinutes);
  return days ? label + ' (+' + days + (days === 1 ? ' day)' : ' days)') : label;
}
export function duration(minutes) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (!hours) return rest + ' min';
  return hours + ' hr' + (rest ? ' ' + rest + ' min' : '');
}
